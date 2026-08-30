import React from 'react';
import { Format, Player, PlayerRole, Team, Match, PlayerStats, Sponsorship, MatchResult, NewsArticle, GameData, Standing, BowlingSubType } from './types';
import { BRANDS, SPONSOR_THRESHOLDS, generateSingleFormatInitialStats, TV_CHANNELS, TOURNAMENT_LOGOS } from './data';
import { EXPANDED_COMMENTARY_BANK, getRandomExpandedLine, CommentaryContext } from './data/commentaryBank';
import { generateFullYearSchedule, getYearTournamentConfig } from './utils/fourYearCalendar';
export { getAutomatedWeakness, initializePlayersWithWeaknesses } from './utils/playerRegistry';

export type Category = 'T20' | 'List A' | 'First Class';

export const getFormatsForCategory = (cat: Category): Format[] => {
    switch(cat) {
        case 'T20': return [Format.T20];
        case 'List A': return [Format.ODI];
        case 'First Class': return [Format.SHIELD];
        default: return [Format.T20];
    }
};

export const getCategoryForFormat = (format: Format): Category => {
    switch(format) {
        case Format.T20: return 'T20';
        case Format.ODI: return 'List A';
        case Format.SHIELD: return 'First Class';
        default: return 'T20';
    }
};

export const resolveMatch = (match: Match, gameData: GameData, format: Format) => {
    let resolvedMatch = { ...match };
    if (resolvedMatch.group !== 'Round-Robin') {
        const standings = gameData.standings[format] || [];
        const getTeamName = (pos: number) => standings.length >= pos ? standings[pos - 1]?.teamName : `TBD`;
        
        const resolvePlaceholder = (placeholder: string): string => {
            if (!placeholder) return 'TBD';
            if (['1st', '2nd', '3rd', '4th', '5th', '6th'].includes(placeholder)) {
                return getTeamName(parseInt(placeholder[0], 10)) || 'TBD';
            }
            if (placeholder.startsWith('SF') || placeholder.startsWith('Playoff') || placeholder.startsWith('P1') || placeholder.startsWith('P2')) {
                let matchNumStr = placeholder.split(' ')[0];
                if (placeholder.includes('Playoff 1')) matchNumStr = 'Playoff 1';
                else if (placeholder.includes('Playoff 2')) matchNumStr = 'Playoff 2';

                const formatResults = gameData.matchResults[format] || [];
                const matchResult = formatResults.find(r => 
                    String(r.matchNumber) === matchNumStr || 
                    String(r.matchNumber) === matchNumStr.replace('Playoff ', 'P') ||
                    (matchNumStr === 'Playoff 1' && String(r.matchNumber) === 'P1') ||
                    (matchNumStr === 'Playoff 2' && String(r.matchNumber) === 'P2')
                );

                if (placeholder.toLowerCase().includes('winner')) {
                    if (matchResult?.winnerId) {
                        return gameData.teams.find(t => t.id === matchResult.winnerId)?.name || 'TBD';
                    }
                    return `Winner of ${matchNumStr}`;
                }
                if (placeholder.toLowerCase().includes('loser') || placeholder.toLowerCase().includes('looser')) {
                    if (matchResult?.loserId) {
                        return gameData.teams.find(t => t.id === matchResult.loserId)?.name || 'TBD';
                    }
                    return `Loser of ${matchNumStr}`;
                }

                if (matchResult?.winnerId) {
                    return gameData.teams.find(t => t.id === matchResult.winnerId)?.name || 'TBD';
                }
            }
            return placeholder;
        };
        resolvedMatch.teamA = resolvePlaceholder(resolvedMatch.teamA);
        resolvedMatch.teamB = resolvePlaceholder(resolvedMatch.teamB);
    }
    return resolvedMatch;
};

export const PITCH_MODIFIERS = {
  "50m Action Track": { [Format.T20]: { runRate: 4.20, wicketChance: 1.20 }, [Format.ODI]: { runRate: 2.80, wicketChance: 1.10 }, [Format.SHIELD]: { runRate: 1.2, wicketChance: 0.90 }, [Format.WLT20]: { runRate: 4.30, wicketChance: 1.15 }, paceBonus: 0.05, spinBonus: 0, chasePenalty: 1.0, deterioration: 0.01, unpredictability: 0 },
  "Balanced Sporting Pitch": { [Format.T20]: { runRate: 3.85, wicketChance: 1.20 }, [Format.ODI]: { runRate: 2.45, wicketChance: 1.15 }, [Format.SHIELD]: { runRate: 1.0, wicketChance: 1.0 }, [Format.WLT20]: { runRate: 3.90, wicketChance: 1.20 }, paceBonus: 0, spinBonus: 0, chasePenalty: 1.0, deterioration: 0.02, unpredictability: 0 },
  "Dusty Spinner’s Haven": { [Format.T20]: { runRate: 3.10, wicketChance: 1.40 }, [Format.ODI]: { runRate: 2.10, wicketChance: 1.25 }, [Format.SHIELD]: { runRate: 0.9, wicketChance: 1.15 }, [Format.WLT20]: { runRate: 3.15, wicketChance: 1.38 }, paceBonus: -0.05, spinBonus: 0.15, chasePenalty: 0.95, deterioration: 0.1, unpredictability: 0.005 },
  "Green Top": { [Format.T20]: { runRate: 3.30, wicketChance: 1.45 }, [Format.ODI]: { runRate: 2.20, wicketChance: 1.30 }, [Format.SHIELD]: { runRate: 0.85, wicketChance: 1.2 }, [Format.WLT20]: { runRate: 3.35, wicketChance: 1.42 }, paceBonus: 0.15, spinBonus: -0.05, chasePenalty: 1.0, deterioration: 0.05, unpredictability: 0 },
  "Batting Paradise": { [Format.T20]: { runRate: 4.40, wicketChance: 1.0 }, [Format.ODI]: { runRate: 2.85, wicketChance: 1.0 }, [Format.SHIELD]: { runRate: 1.2, wicketChance: 0.85 }, [Format.WLT20]: { runRate: 4.50, wicketChance: 1.00 }, paceBonus: 0, spinBonus: 0, chasePenalty: 1.0, deterioration: 0, unpredictability: 0 },
  "Dead Slow Track": { [Format.T20]: { runRate: 2.75, wicketChance: 1.30 }, [Format.ODI]: { runRate: 2.0, wicketChance: 1.20 }, [Format.SHIELD]: { runRate: 0.8, wicketChance: 1.1 }, [Format.WLT20]: { runRate: 2.80, wicketChance: 1.30 }, paceBonus: -0.05, spinBonus: 0.1, chasePenalty: 1.0, deterioration: 0.05, unpredictability: 0 },
  "Cracked Worn Surface": { [Format.T20]: { runRate: 3.30, wicketChance: 1.40 }, [Format.ODI]: { runRate: 2.20, wicketChance: 1.30 }, [Format.SHIELD]: { runRate: 0.75, wicketChance: 1.25 }, [Format.WLT20]: { runRate: 3.30, wicketChance: 1.40 }, paceBonus: 0.05, spinBonus: 0.1, chasePenalty: 0.98, deterioration: 0.15, unpredictability: 0.015 },
};

export const COMMENTARY_TEMPLATES = {
    '0': ["Defended solidly back to the bowler.", "No run, straight to the fielder.", "Beaten! Lovely delivery.", "Leaves it alone outside off.", "Solid defense, respects the good ball."],
    '1': ["Pushed into the gap for a single.", "Quick single taken.", "Worked away to square leg for one.", "Edged but safe, they take a run.", "Tapped to mid-on for a sharp single."],
    '2': ["Driven through covers, they'll come back for two.", "Good running, two runs added.", "Flicked away, easy couple.", "Punched off the back foot for a brace."],
    '3': ["Great placement! They push hard for three.", "Stopped just inside the boundary, three runs saved.", "Timed well, but the outfield is slow. Three runs."],
    '4': ["FOUR! Glorious shot through the covers!", "Smashed down the ground for FOUR!", "Edged and four! Lucky boundary.", "FOUR! Pulled away with power.", "Beautiful drive, races to the fence for FOUR!"],
    '6': ["SIX! That's huge! Out of the ground!", "SIX! Clean strike over long-on!", "Maximum! He's picked the length early.", "Top edge... and it flies for SIX!", "Launched into the stands! massive hit!"],
    'W': ["OUT! Clean bowled! What a delivery!", "Caught! Straight to the fielder.", "LBW! That looked plumb.", "Run out! Mix up in the middle!", "Edged and taken! The keeper makes no mistake."],
    'Wd': ["Wide ball, too far outside off.", "Drifting down leg, called wide.", "Wayward delivery, signaled wide."],
    'Nb': ["No ball! Overstepping.", "No ball for height, free hit coming up."],
};

export const getCommentary = (
    runs: number, 
    isOut: boolean, 
    batterName: string, 
    bowlerName: string, 
    extraType?: string,
    ctx?: CommentaryContext
): string => {
    const fullCtx: CommentaryContext = {
        batsman: batterName,
        bowler: bowlerName,
        runs: runs,
        ...ctx
    };

    if (isOut) {
        if (fullCtx.wickets_down === 1 || fullCtx.wickets_down === 0) {
            if (Math.random() < 0.5) {
                return getRandomExpandedLine(EXPANDED_COMMENTARY_BANK.bowling.first_wicket, fullCtx);
            }
        }
        if (fullCtx.wickets_down && fullCtx.wickets_down >= 7 && Math.random() < 0.6) {
            return getRandomExpandedLine(EXPANDED_COMMENTARY_BANK.match_situation.hard_to_win_wickets_down, fullCtx);
        }
        const templates = COMMENTARY_TEMPLATES['W'];
        return templates[Math.floor(Math.random() * templates.length)];
    }

    if (extraType === 'Wd') return COMMENTARY_TEMPLATES['Wd'][Math.floor(Math.random() * COMMENTARY_TEMPLATES['Wd'].length)];
    if (extraType === 'Nb') return COMMENTARY_TEMPLATES['Nb'][Math.floor(Math.random() * COMMENTARY_TEMPLATES['Nb'].length)];

    // Check for Milestones in context
    if (fullCtx.runs && fullCtx.runs >= 100 && Math.random() < 0.8) {
        return getRandomExpandedLine(EXPANDED_COMMENTARY_BANK.milestones.hundred, fullCtx);
    }
    if (fullCtx.runs && fullCtx.runs >= 50 && fullCtx.runs < 54 && Math.random() < 0.8) {
        return getRandomExpandedLine(EXPANDED_COMMENTARY_BANK.milestones.fifty, fullCtx);
    }

    // Boundaries with bank
    if (runs === 4) {
        if (Math.random() < 0.6) {
            return getRandomExpandedLine(EXPANDED_COMMENTARY_BANK.boundaries.single_four, fullCtx);
        }
    } else if (runs === 6) {
        if (Math.random() < 0.7) {
            return getRandomExpandedLine(EXPANDED_COMMENTARY_BANK.boundaries.single_six, fullCtx);
        }
    }

    // Match Situations
    if (fullCtx.remaining_runs && fullCtx.remaining_balls && fullCtx.remaining_balls <= 36 && Math.random() < 0.4) {
        const reqRate = Number(((fullCtx.remaining_runs / fullCtx.remaining_balls) * 6).toFixed(2));
        fullCtx.rate = reqRate;
        if (reqRate >= 10) {
            return getRandomExpandedLine(EXPANDED_COMMENTARY_BANK.match_situation.required_run_rate_high, fullCtx);
        } else if (reqRate <= 6) {
            return getRandomExpandedLine(EXPANDED_COMMENTARY_BANK.match_situation.required_run_rate_low, fullCtx);
        } else {
            return getRandomExpandedLine(EXPANDED_COMMENTARY_BANK.match_situation.remaining_target, fullCtx);
        }
    }

    if (fullCtx.partnership_runs && fullCtx.partnership_runs >= 50 && fullCtx.partnership_runs <= 54 && Math.random() < 0.5) {
        return getRandomExpandedLine(EXPANDED_COMMENTARY_BANK.match_situation.good_partnership, fullCtx);
    }

    const key = runs > 6 ? '6' : runs.toString() as keyof typeof COMMENTARY_TEMPLATES;
    const templates = COMMENTARY_TEMPLATES[key] || COMMENTARY_TEMPLATES['0'];
    return templates[Math.floor(Math.random() * templates.length)];
};

export const getRoleColor = (role: PlayerRole) => {
  switch (role) {
    case PlayerRole.BATSMAN: return 'text-blue-500 dark:text-blue-400';
    case PlayerRole.WICKET_KEEPER: return 'text-green-600 dark:text-green-400';
    case PlayerRole.ALL_ROUNDER: return 'text-yellow-600 dark:text-yellow-400';
    case PlayerRole.SPIN_BOWLER: return 'text-purple-600 dark:text-purple-400';
    case PlayerRole.FAST_BOWLER: return 'text-red-600 dark:text-red-400';
    default: return 'text-gray-500 dark:text-gray-400';
  }
};

export const getRoleFullName = (role: PlayerRole) => {
    switch (role) {
        case PlayerRole.BATSMAN: return 'Batsman';
        case PlayerRole.WICKET_KEEPER: return 'Wicket-Keeper';
        case PlayerRole.ALL_ROUNDER: return 'All-Rounder';
        case PlayerRole.SPIN_BOWLER: return 'Spin Bowler';
        case PlayerRole.FAST_BOWLER: return 'Bowler';
        default: return 'Player';
    }
};

export const getBattingStyleLabel = (style: string) => {
    switch (style) {
        case 'A': return 'Aggressive';
        case 'D': return 'Defensive';
        case 'N': return 'Balanced';
        case 'NA': return 'N/A';
        default: return style;
    }
};

export const BATTING_STYLE_OPTIONS = ['A', 'D', 'N', 'NA'];

export const formatOvers = (balls: number) => {
    const overs = Math.floor(balls / 6);
    const remainingBalls = balls % 6;
    return `${overs}.${remainingBalls}`;
}

export const getPlayerById = (id: string, allPlayers: Player[]) => {
    const player = allPlayers.find(p => p.id === id);
    if (!player) {
      return { id: 'unknown', name: 'Unknown Player', role: PlayerRole.BATSMAN, battingSkill: 30, secondarySkill: 30, style: 'N' } as any as Player;
    }
    return player;
};

export const generateAutoXI = (squad: Player[], format: Format) => {
    const activeSquad = squad.filter(p => !p.injury).length >= 11 ? squad.filter(p => !p.injury) : squad;
    const selectedIds = new Set<string>();

    const tryAdd = (p: Player): boolean => {
        if (!p || selectedIds.has(p.id)) return false;
        selectedIds.add(p.id);
        return true;
    };

    // 1. Pick 2 Openers (#1 and #2)
    const openersList = [...activeSquad]
        .filter(p => p.isOpener || p.role === PlayerRole.BATSMAN)
        .sort((a, b) => {
            const scoreA = (a.isOpener ? 25 : 0) + a.battingSkill + ((a.form || 70) * 0.15);
            const scoreB = (b.isOpener ? 25 : 0) + b.battingSkill + ((b.form || 70) * 0.15);
            return scoreB - scoreA;
        });

    let pos1: Player | undefined;
    let pos2: Player | undefined;

    for (const op of openersList) {
        if (!pos1) {
            if (tryAdd(op)) pos1 = op;
        } else if (!pos2) {
            if (tryAdd(op)) {
                pos2 = op;
                break;
            }
        }
    }

    // 2. Pick 1 Wicketkeeper (WK) guaranteed in XI
    const wkList = [...activeSquad]
        .filter(p => p.role === PlayerRole.WICKET_KEEPER)
        .sort((a, b) => (b.battingSkill + ((b.form || 70) * 0.2)) - (a.battingSkill + ((a.form || 70) * 0.2)));
    
    let selectedWK: Player | undefined;
    for (const wk of wkList) {
        if (tryAdd(wk)) {
            selectedWK = wk;
            break;
        }
    }

    // 3. Top / Middle Batters: Fill slots among positions #3, #4, #5
    const topBattersPool = [...activeSquad]
        .filter(p => (p.role === PlayerRole.BATSMAN || p.role === PlayerRole.WICKET_KEEPER) && !selectedIds.has(p.id))
        .sort((a, b) => (b.battingSkill + ((b.form || 70) * 0.2)) - (a.battingSkill + ((a.form || 70) * 0.2)));

    const selectedBatters: Player[] = [];
    for (const b of topBattersPool) {
        if (selectedBatters.length >= 3) break;
        if (tryAdd(b)) {
            selectedBatters.push(b);
        }
    }

    // 4. All-Rounders: 1 to 3 All-rounders (AR)
    const arPool = [...activeSquad]
        .filter(p => p.role === PlayerRole.ALL_ROUNDER && !selectedIds.has(p.id))
        .sort((a, b) => (b.battingSkill + b.secondarySkill + ((b.form || 70) * 0.2)) - (a.battingSkill + a.secondarySkill + ((a.form || 70) * 0.2)));

    const selectedARs: Player[] = [];
    for (const ar of arPool) {
        if (selectedARs.length >= 3) break;
        if (tryAdd(ar)) {
            selectedARs.push(ar);
        }
    }

    // 5. Bowlers: 3 to 5 Specialist Bowlers (Pace & Spin mix)
    const fastBowlers = [...activeSquad]
        .filter(p => p.role === PlayerRole.FAST_BOWLER && !selectedIds.has(p.id))
        .sort((a, b) => (b.secondarySkill + ((b.form || 70) * 0.2)) - (a.secondarySkill + ((a.form || 70) * 0.2)));

    const spinBowlers = [...activeSquad]
        .filter(p => p.role === PlayerRole.SPIN_BOWLER && !selectedIds.has(p.id))
        .sort((a, b) => (b.secondarySkill + ((b.form || 70) * 0.2)) - (a.secondarySkill + ((a.form || 70) * 0.2)));

    // Try to pick at least 2 Fast and 1 Spin if available
    const selectedBowlers: Player[] = [];
    for (const fb of fastBowlers) {
        if (selectedBowlers.length >= 3) break;
        if (tryAdd(fb)) selectedBowlers.push(fb);
    }
    for (const sb of spinBowlers) {
        if (selectedBowlers.length >= 5) break;
        if (tryAdd(sb)) selectedBowlers.push(sb);
    }

    // 6. Fill remaining slots to reach exactly 11 players
    const targetCount = Math.min(11, activeSquad.length);
    if (selectedIds.size < targetCount) {
        const fillPool = [...activeSquad]
            .filter(p => !selectedIds.has(p.id))
            .sort((a, b) => (Math.max(b.battingSkill, b.secondarySkill) + ((b.form || 70) * 0.2)) - (Math.max(a.battingSkill, a.secondarySkill) + ((a.form || 70) * 0.2)));

        for (const p of fillPool) {
            if (selectedIds.size >= targetCount) break;
            tryAdd(p);
        }
    }

    // Combine all selected players with realistic batting order structure
    const allXI = activeSquad.filter(p => selectedIds.has(p.id));
    const selectedOrdered: Player[] = [];
    const addedIds = new Set<string>();

    const addUnique = (p: Player) => {
        if (p && !addedIds.has(p.id)) {
            addedIds.add(p.id);
            selectedOrdered.push(p);
        }
    };

    // 1-2: Openers
    if (pos1) addUnique(pos1);
    if (pos2) addUnique(pos2);
    allXI.filter(p => p.isOpener && !addedIds.has(p.id)).forEach(addUnique);

    // 3-5: Specialist Batters & WK
    const finalBattersAndWK = allXI
        .filter(p => (p.role === PlayerRole.BATSMAN || p.role === PlayerRole.WICKET_KEEPER) && !addedIds.has(p.id))
        .sort((a, b) => (b.battingSkill + ((b.form || 70) * 0.1)) - (a.battingSkill + ((a.form || 70) * 0.1)));
    finalBattersAndWK.forEach(addUnique);

    // 6-7: All-Rounders
    const finalARs = allXI
        .filter(p => p.role === PlayerRole.ALL_ROUNDER && !addedIds.has(p.id))
        .sort((a, b) => (b.battingSkill + b.secondarySkill) - (a.battingSkill + a.secondarySkill));
    finalARs.forEach(addUnique);

    // 8-11: Bowlers
    const finalBowlers = allXI
        .filter(p => (p.role === PlayerRole.FAST_BOWLER || p.role === PlayerRole.SPIN_BOWLER) && !addedIds.has(p.id))
        .sort((a, b) => b.secondarySkill - a.secondarySkill);
    finalBowlers.forEach(addUnique);

    // Any remaining selected players in allXI not yet added
    allXI.filter(p => !addedIds.has(p.id)).forEach(addUnique);

    return selectedOrdered.slice(0, 11);
};

export const getBatterTier = (battingSkill: number) => {
    if (battingSkill >= 80) return 'tier1';
    if (battingSkill >= 65) return 'tier2';
    if (battingSkill >= 50) return 'tier3';
    if (battingSkill >= 30) return 'tier4';
    return 'tier5';
};

const T20_PROFILES = {
    tier1: { NA: { avg: 40, sr: 135 }, N: { avg: 40, sr: 125 }, D: { avg: 30, sr: 110 }, A: { avg: 25, sr: 155 } },
    tier2: { NA: { avg: 32, sr: 125 }, N: { avg: 32, sr: 115 }, D: { avg: 25, sr: 100 }, A: { avg: 22, sr: 140 } },
    tier3: { NA: { avg: 25, sr: 115 }, N: { avg: 25, sr: 105 }, D: { avg: 20, sr: 95 }, A: { avg: 18, sr: 125 } },
    tier4: { NA: { avg: 18, sr: 100 }, N: { avg: 18, sr: 90 }, D: { avg: 15, sr: 85 }, A: { avg: 15, sr: 110 } },
    tier5: { NA: { avg: 12, sr: 85 }, N: { avg: 12, sr: 80 }, D: { avg: 10, sr: 70 }, A: { avg: 10, sr: 95 } },
};
const ODI_PROFILES = {
    tier1: { NA: { avg: 45, sr: 95 }, N: { avg: 45, sr: 90 }, D: { avg: 40, sr: 80 }, A: { avg: 35, sr: 105 } },
    tier2: { NA: { avg: 38, sr: 90 }, N: { avg: 38, sr: 85 }, D: { avg: 32, sr: 75 }, A: { avg: 28, sr: 100 } },
    tier3: { NA: { avg: 30, sr: 85 }, N: { avg: 30, sr: 80 }, D: { avg: 25, sr: 70 }, A: { avg: 22, sr: 90 } },
    tier4: { NA: { avg: 22, sr: 75 }, N: { avg: 22, sr: 70 }, D: { avg: 18, sr: 65 }, A: { avg: 16, sr: 85 } },
    tier5: { NA: { avg: 15, sr: 70 }, N: { avg: 15, sr: 65 }, D: { avg: 12, sr: 60 }, A: { avg: 12, sr: 75 } },
};
const FC_PROFILES = {
    tier1: { NA: { avg: 45, sr: 55 }, N: { avg: 45, sr: 50 }, D: { avg: 48, sr: 45 }, A: { avg: 40, sr: 65 } },
    tier2: { NA: { avg: 38, sr: 50 }, N: { avg: 38, sr: 45 }, D: { avg: 40, sr: 40 }, A: { avg: 32, sr: 60 } },
    tier3: { NA: { avg: 30, sr: 45 }, N: { avg: 30, sr: 40 }, D: { avg: 32, sr: 38 }, A: { avg: 25, sr: 55 } },
    tier4: { NA: { avg: 22, sr: 40 }, N: { avg: 22, sr: 38 }, D: { avg: 25, sr: 35 }, A: { avg: 18, sr: 48 } },
    tier5: { NA: { avg: 15, sr: 35 }, N: { avg: 15, sr: 32 }, D: { avg: 18, sr: 30 }, A: { avg: 12, sr: 40 } },
};

export const getBattingProfilesForFormat = (format?: string | Format) => {
    if (!format) return T20_PROFILES;
    const fStr = String(format).toLowerCase();
    if (format === Format.ODI || fStr.includes('odi') || fStr.includes('one-day') || fStr.includes('cup') || fStr.includes('50')) {
        return ODI_PROFILES;
    }
    if (format === Format.SHIELD || fStr.includes('shield') || fStr.includes('first-class') || fStr.includes('fc') || fStr.includes('test')) {
        return FC_PROFILES;
    }
    return T20_PROFILES;
};

const rawBattingProfiles: Record<string, typeof T20_PROFILES> = {
  [Format.T20]: T20_PROFILES,
  [Format.ODI]: ODI_PROFILES,
  [Format.SHIELD]: FC_PROFILES,
  [Format.WLT20]: T20_PROFILES,
  'T20': T20_PROFILES,
  'ODI': ODI_PROFILES,
  'SHIELD': FC_PROFILES,
  'World League': T20_PROFILES,
  'Champions League': T20_PROFILES,
};

export const BATTING_PROFILES = new Proxy(rawBattingProfiles, {
    get(target, prop: string) {
        if (prop in target) {
            return target[prop];
        }
        return getBattingProfilesForFormat(prop);
    }
});

export const getBatterProfile = (format: string | Format | undefined, tier: string = 'tier3', style: string = 'N') => {
    const formatProfiles = getBattingProfilesForFormat(format);
    const tierProfile = (formatProfiles as any)[tier] || (formatProfiles as any)['tier3'] || T20_PROFILES.tier3;
    return tierProfile[style] || tierProfile['N'] || tierProfile['NA'] || tierProfile['D'] || tierProfile['A'] || { avg: 30, sr: 120 };
};

export const LoadingSpinner = () => (
    React.createElement("div", { className: "flex justify-center items-center h-full w-full" },
        React.createElement("div", { className: "animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-teal-500 dark:border-teal-400" })
    )
);

export const aggregateStats = (player: Player, formats: (Format | string)[]): PlayerStats => {
    const total = generateSingleFormatInitialStats();
    if (!player) return total;

    const processedStatObjects = new Set<any>();

    formats.forEach(f => {
        const fStr = String(f).toLowerCase();
        const candidates: any[] = [];

        // Direct key lookups
        if (player.stats?.[f as Format]) candidates.push(player.stats[f as Format]);
        if (player.domesticStats?.[f]) candidates.push(player.domesticStats[f]);
        if (player.internationalStats?.[f]) candidates.push(player.internationalStats[f]);

        // Specific alias mapping for International / Domestic formats
        if (fStr === 'test' || fStr === 'shield' || fStr.includes('first-class') || fStr.includes('fc')) {
            if (player.internationalStats?.['Test']) candidates.push(player.internationalStats['Test']);
            if (player.stats?.[Format.SHIELD]) candidates.push(player.stats[Format.SHIELD]);
            if (player.stats?.['First-Class / Multi-Day Shield' as Format]) candidates.push(player.stats?.['First-Class / Multi-Day Shield' as Format]);
        }

        if (fStr === 'odi' || fStr === 'list a' || fStr.includes('one-day')) {
            if (player.internationalStats?.['ODI']) candidates.push(player.internationalStats['ODI']);
            if (player.stats?.[Format.ODI]) candidates.push(player.stats[Format.ODI]);
            if (player.stats?.['Premier One-Day Cup' as Format]) candidates.push(player.stats?.['Premier One-Day Cup' as Format]);
        }

        if (fStr === 't20' || fStr === 't20i' || fStr === 't20-i' || fStr.includes('world league') || fStr.includes('premier league')) {
            if (player.internationalStats?.['T20i']) candidates.push(player.internationalStats['T20i']);
            if (player.internationalStats?.['T20I']) candidates.push(player.internationalStats['T20I']);
            if (player.stats?.[Format.T20]) candidates.push(player.stats[Format.T20]);
            if (player.stats?.[Format.WLT20]) candidates.push(player.stats[Format.WLT20]);
            if (player.stats?.['T20 Premier League' as Format]) candidates.push(player.stats?.['T20 Premier League' as Format]);
        }

        candidates.forEach(s => {
            if (!s || processedStatObjects.has(s)) return;
            processedStatObjects.add(s);

            total.matches += s.matches || 0;
            total.runs += s.runs || 0;
            total.ballsFaced += s.ballsFaced || 0;
            total.dismissals += s.dismissals || 0;
            if ((s.highestScore || 0) > total.highestScore) total.highestScore = s.highestScore;
            total.hundreds += s.hundreds || 0;
            total.fifties += s.fifties || 0;
            total.thirties += s.thirties || 0;
            total.fours += s.fours || 0;
            total.sixes += s.sixes || 0;
            if (s.fastestFifty > 0 && (total.fastestFifty === 0 || s.fastestFifty < total.fastestFifty)) total.fastestFifty = s.fastestFifty;
            if (s.fastestHundred > 0 && (total.fastestHundred === 0 || s.fastestHundred < total.fastestHundred)) total.fastestHundred = s.fastestHundred;
            total.wickets += s.wickets || 0;
            total.ballsBowled += s.ballsBowled || 0;
            total.runsConceded += s.runsConceded || 0;
            total.threeWicketHauls += s.threeWicketHauls || 0;
            total.fiveWicketHauls += s.fiveWicketHauls || 0;
            total.catches += s.catches || 0;
            total.runOuts += s.runOuts || 0;
            total.manOfTheMatchAwards += s.manOfTheMatchAwards || 0;
            if ((s.bestBowlingWickets || 0) > total.bestBowlingWickets || ((s.bestBowlingWickets || 0) === total.bestBowlingWickets && (s.bestBowlingRuns || 999) < total.bestBowlingRuns)) {
                total.bestBowlingWickets = s.bestBowlingWickets || 0;
                total.bestBowlingRuns = s.bestBowlingRuns || 0;
                total.bestBowling = s.bestBowling || `${s.bestBowlingWickets || 0}/${s.bestBowlingRuns || 0}`;
            }

            // Aggregate phase-wise stats safely
            if (s.phaseStats && total.phaseStats) {
                const tpb = total.phaseStats.batting;
                const spb = s.phaseStats.batting;
                if (spb) {
                    tpb.pp.runs += spb.pp?.runs || 0;
                    tpb.pp.balls += spb.pp?.balls || 0;
                    tpb.pp.dismissals += spb.pp?.dismissals || 0;
                    tpb.mo.runs += spb.mo?.runs || 0;
                    tpb.mo.balls += spb.mo?.balls || 0;
                    tpb.mo.dismissals += spb.mo?.dismissals || 0;
                    tpb.do.runs += spb.do?.runs || 0;
                    tpb.do.balls += spb.do?.balls || 0;
                    tpb.do.dismissals += spb.do?.dismissals || 0;
                }

                const tpw = total.phaseStats.bowling;
                const spw = s.phaseStats.bowling;
                if (spw) {
                    tpw.pp.wickets += spw.pp?.wickets || 0;
                    tpw.pp.runsConceded += spw.pp?.runsConceded || 0;
                    tpw.pp.ballsBowled += spw.pp?.ballsBowled || 0;
                    tpw.mo.wickets += spw.mo?.wickets || 0;
                    tpw.mo.runsConceded += spw.mo?.runsConceded || 0;
                    tpw.mo.ballsBowled += spw.mo?.ballsBowled || 0;
                    tpw.do.wickets += spw.do?.wickets || 0;
                    tpw.do.runsConceded += spw.do?.runsConceded || 0;
                    tpw.do.ballsBowled += spw.do?.ballsBowled || 0;
                }
            }

            // Aggregate batting position-wise stats safely
            if (s.positionStats && total.positionStats) {
                for (let pos = 1; pos <= 11; pos++) {
                    const tpos = total.positionStats[pos];
                    const spos = s.positionStats[pos];
                    if (spos && tpos) {
                        tpos.innings += spos.innings || 0;
                        tpos.runs += spos.runs || 0;
                        tpos.balls += spos.balls || 0;
                        tpos.dismissals += spos.dismissals || 0;
                        tpos.thirties += spos.thirties || 0;
                        tpos.fifties += spos.fifties || 0;
                        tpos.hundreds += spos.hundreds || 0;
                    }
                }
            }
        });
    });

    total.average = total.dismissals > 0 ? parseFloat((total.runs / total.dismissals).toFixed(2)) : total.runs;
    total.strikeRate = total.ballsFaced > 0 ? parseFloat(((total.runs / total.ballsFaced) * 100).toFixed(2)) : 0;
    total.bowlingAverage = total.wickets > 0 ? parseFloat((total.runsConceded / total.wickets).toFixed(2)) : 0; 
    total.economy = total.ballsBowled > 0 ? parseFloat(((total.runsConceded / (total.ballsBowled / 6))).toFixed(2)) : 0;
    return total;
};

export const aggregateDomesticStats = (player: Player): PlayerStats => {
    const total = generateSingleFormatInitialStats();
    if (!player) return total;
    ['T20', 'List A', 'FC'].forEach(f => {
        const s = player.domesticStats?.[f];
        if (s) {
            total.matches += s.matches || 0;
            total.runs += s.runs || 0;
            total.ballsFaced += s.ballsFaced || 0;
            total.dismissals += s.dismissals || 0;
            if ((s.highestScore || 0) > total.highestScore) total.highestScore = s.highestScore;
            total.hundreds += s.hundreds || 0;
            total.fifties += s.fifties || 0;
            total.thirties += s.thirties || 0;
            total.fours += s.fours || 0;
            total.sixes += s.sixes || 0;
            total.wickets += s.wickets || 0;
            total.ballsBowled += s.ballsBowled || 0;
            total.runsConceded += s.runsConceded || 0;
            total.threeWicketHauls += s.threeWicketHauls || 0;
            total.fiveWicketHauls += s.fiveWicketHauls || 0;
            if ((s.bestBowlingWickets || 0) > total.bestBowlingWickets) {
                total.bestBowlingWickets = s.bestBowlingWickets;
                total.bestBowlingRuns = s.bestBowlingRuns;
                total.bestBowling = s.bestBowling;
            }
        }
    });
    total.average = total.dismissals > 0 ? parseFloat((total.runs / total.dismissals).toFixed(2)) : total.runs;
    total.strikeRate = total.ballsFaced > 0 ? parseFloat(((total.runs / total.ballsFaced) * 100).toFixed(2)) : 0;
    total.bowlingAverage = total.wickets > 0 ? parseFloat((total.runsConceded / total.wickets).toFixed(2)) : 0; 
    total.economy = total.ballsBowled > 0 ? parseFloat(((total.runsConceded / (total.ballsBowled / 6))).toFixed(2)) : 0;
    return total;
};

export const aggregateInternationalStats = (player: Player): PlayerStats => {
    return aggregateStats(player, ['Test', 'ODI', 'T20i', Format.SHIELD, Format.ODI, Format.T20, Format.WLT20]);
};

export const calculatePopularityPoints = (result: MatchResult, format: Format, userTeamId: string): number => {
    let points = 0;
    const userInnings = [result.firstInning, result.secondInning, result.thirdInning, result.fourthInning].filter(i => i?.teamId === userTeamId);
    userInnings.forEach(ing => { if (ing && ing.score >= 200) points += 1; });
    if (result.winnerId === userTeamId) points += 2;
    return points;
};

export const getFormatDateRange = (format: Format, season: number = 1) => {
    const isOdd = season % 2 !== 0;
    const year = 2026 + (season - 1);

    if (isOdd) {
        switch (format) {
            case Format.T20: return { start: new Date(year, 4, 8), end: new Date(year, 5, 15) }; // 8 May - 15 June
            case Format.ODI: return { start: new Date(year, 5, 25), end: new Date(year, 6, 30) }; // 25 June - 30 July
            case Format.SHIELD: return { start: new Date(year, 7, 3), end: new Date(year, 8, 30) }; // 3 August - 30 September
            case Format.WLT20: return { start: new Date(year, 9, 1), end: new Date(year, 9, 25) }; // 1 October - 25 October
            default: return { start: new Date(year, 4, 8), end: new Date(year, 5, 15) };
        }
    } else {
        switch (format) {
            case Format.T20: return { start: new Date(year, 10, 6), end: new Date(year, 11, 15) }; // 6 November - 15 December
            case Format.ODI: return { start: new Date(year, 11, 25), end: new Date(year + 1, 1, 1) }; // 25 December - 1 February
            case Format.SHIELD: return { start: new Date(year + 1, 1, 5), end: new Date(year + 1, 2, 30) }; // 5 February - 30 March
            case Format.WLT20: return { start: new Date(year + 1, 3, 1), end: new Date(year + 1, 3, 25) }; // 1 April - 25 April
            default: return { start: new Date(year, 10, 6), end: new Date(year, 11, 15) };
        }
    }
};

export const generateLeagueSchedule = (teams: Team[], format: Format, doubleRoundRobin: boolean = true, season: number = 1): Match[] => {
    // If format is standard international format (T20, ODI, SHIELD), use the 4-year international cycle schedule
    if (format === Format.T20 || format === Format.ODI || format === Format.SHIELD) {
        const fullYear = generateFullYearSchedule(season);
        const matchesForFormat = fullYear.scheduleByFormat[format] || [];
        if (matchesForFormat.length > 0) {
            return matchesForFormat.map(m => ({
                ...m,
                teamAId: teams.find(t => t.name.toLowerCase() === m.teamA.toLowerCase())?.id,
                teamBId: teams.find(t => t.name.toLowerCase() === m.teamB.toLowerCase())?.id,
            }));
        }
    }

    const matches: Match[] = [];
    if (teams.length < 2) return [];

    let matchCounter = 1;

    if (teams.length > 8) {
        // Group Stage (2 groups) -> Semifinals -> Final for capped schedule
        const groupA = teams.filter((_, idx) => idx % 2 === 0).slice(0, 5);
        const groupB = teams.filter((_, idx) => idx % 2 === 1).slice(0, 5);

        for (let i = 0; i < groupA.length; i++) {
            for (let j = i + 1; j < groupA.length; j++) {
                matches.push({ matchNumber: matchCounter++, teamA: groupA[i].name, teamAId: groupA[i].id, vs: 'vs', teamB: groupA[j].name, teamBId: groupA[j].id, date: `Match Day ${matchCounter}`, group: 'Group A' });
            }
        }
        for (let i = 0; i < groupB.length; i++) {
            for (let j = i + 1; j < groupB.length; j++) {
                matches.push({ matchNumber: matchCounter++, teamA: groupB[i].name, teamAId: groupB[i].id, vs: 'vs', teamB: groupB[j].name, teamBId: groupB[j].id, date: `Match Day ${matchCounter}`, group: 'Group B' });
            }
        }
        matches.push({ matchNumber: 'SF1', teamA: '1st', vs: 'vs', teamB: '4th', date: 'Semi-Final Day', group: 'Semi-Finals' });
        matches.push({ matchNumber: 'SF2', teamA: '2nd', vs: 'vs', teamB: '3rd', date: 'Semi-Final Day', group: 'Semi-Finals' });
        matches.push({ matchNumber: 'Final', teamA: 'SF1 Winner', vs: 'vs', teamB: 'SF2 Winner', date: 'Finals Day', group: 'Final' });
    } else {
            // Basic round-robin pairs for small leagues
            const pairs: [Team, Team][] = [];
            for(let i=0; i<teams.length; i++) {
                for(let j=i+1; j<teams.length; j++) {
                    pairs.push([teams[i], teams[j]]);
                }
            }

            pairs.forEach(([tA, tB]) => {
                matches.push({ matchNumber: matchCounter++, teamA: tA.name, teamAId: tA.id, vs: 'vs', teamB: tB.name, teamBId: tB.id, date: `Match Day ${matchCounter}`, group: 'Round-Robin' });
            });

            if (doubleRoundRobin && teams.length <= 6) {
                pairs.forEach(([tA, tB]) => {
                    matches.push({ matchNumber: matchCounter++, teamA: tB.name, teamAId: tB.id, vs: 'vs', teamB: tA.name, teamBId: tA.id, date: `Match Day ${matchCounter}`, group: 'Round-Robin' });
                });
            }

            // Add knockouts
            if (teams.length >= 4) {
                matches.push({ matchNumber: 'SF1', teamA: '1st', vs: 'vs', teamB: '4th', date: 'Semi-Final Day', group: 'Semi-Finals' });
                matches.push({ matchNumber: 'SF2', teamA: '2nd', vs: 'vs', teamB: '3rd', date: 'Semi-Final Day', group: 'Semi-Finals' });
                matches.push({ matchNumber: 'Final', teamA: 'SF1 Winner', vs: 'vs', teamB: 'SF2 Winner', date: 'Finals Day', group: 'Final' });
            } else if (teams.length >= 2) {
                matches.push({ matchNumber: 'Final', teamA: '1st', vs: 'vs', teamB: '2nd', date: 'Finals Day', group: 'Final' });
            }
        }

    // Interpolate calendar dates based on season schedule specification
    const { start, end } = getFormatDateRange(format, season);
    const totalMatches = matches.length;
    matches.forEach((m, idx) => {
        const fraction = totalMatches > 1 ? idx / (totalMatches - 1) : 0;
        const matchTime = start.getTime() + fraction * (end.getTime() - start.getTime());
        const matchDate = new Date(matchTime);
        m.date = matchDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    });

    return matches;
};

export const restartTournament = (gameData: GameData, formatToRestart: Format | 'ALL'): GameData => {
    const isDoubleRoundRobin = gameData.settings?.isDoubleRoundRobin ?? true;
    
    const initialStandings = (teams: Team[]) => teams.map(team => ({ 
        teamId: team.id, 
        teamName: team.name, 
        played: 0, 
        won: 0, 
        lost: 0, 
        drawn: 0, 
        points: 0, 
        netRunRate: 0, 
        runsFor: 0, 
        runsAgainst: 0 
    }));

    const formatsToReset: Format[] = formatToRestart === 'ALL' 
        ? [Format.T20, Format.ODI, Format.SHIELD, Format.WLT20] 
        : [formatToRestart];

    const updatedSchedule = { ...gameData.schedule };
    const updatedMatchIndex = { ...gameData.currentMatchIndex };
    const updatedStandings = { ...gameData.standings };
    const updatedMatchResults = { ...gameData.matchResults };

    formatsToReset.forEach(f => {
        updatedSchedule[f] = generateLeagueSchedule(gameData.teams, f, isDoubleRoundRobin, gameData.currentSeason);
        updatedMatchIndex[f] = 0;
        updatedStandings[f] = initialStandings(gameData.teams);
        updatedMatchResults[f] = [];
    });

    let newActiveMatch = gameData.activeMatch;
    if (newActiveMatch) {
        newActiveMatch = null;
    }

    // Filter out awards history for reset formats in the current season so end of season can trigger again
    const updatedAwards = (gameData.awardsHistory || []).filter(a => {
        if (a.season === gameData.currentSeason) {
            if (formatToRestart === 'ALL' || a.format === formatToRestart) {
                return false;
            }
        }
        return true;
    });

    const targetFormat = formatToRestart === 'ALL' ? gameData.currentFormat : formatToRestart;

    return {
        ...gameData,
        currentFormat: targetFormat,
        schedule: updatedSchedule,
        currentMatchIndex: updatedMatchIndex,
        standings: updatedStandings,
        matchResults: updatedMatchResults,
        activeMatch: newActiveMatch,
        awardsHistory: updatedAwards,
    };
};

export const negotiateSponsorships = (popularity: number): Record<Format, Sponsorship> => {
    const newSponsorships: any = {};
    Object.values(Format).forEach(f => {
        newSponsorships[f] = { sponsorName: BRANDS[0].name, tournamentName: "Cup", logoColor: "text-teal-500", tournamentLogo: TOURNAMENT_LOGOS[0].svg, tvChannel: TV_CHANNELS[0].name, tvLogo: TV_CHANNELS[0].logo };
    });
    return newSponsorships;
};

export const generateMatchNews = (result: MatchResult, format: string, sponsorship: Sponsorship): NewsArticle => ({
    id: `news-${(Date.now())}`, headline: `Match Result: ${result.summary}`, date: new Date().toLocaleDateString(), excerpt: result.summary, content: result.summary, type: 'match'
});

export const generatePreMatchNews = (match: Match, gameData: GameData): NewsArticle => ({
    id: `news-pre-${(Date.now())}`, headline: `Upcoming: ${match.teamA} vs ${match.teamB}`, date: new Date().toLocaleDateString(), excerpt: "Pre-match preview.", content: "Full preview content.", type: 'match'
});

export interface PlayerRanking {
    player: Player;
    points: number;
    teamName: string;
}

export const calculatePlayerRankings = (players: Player[], format: Format, teams: Team[]) => {
    const scoredPlayers = players.map(p => ({ player: p, points: p.stats[format]?.runs || 0, teamName: "Team" }));
    return { batters: scoredPlayers, bowlers: scoredPlayers, allRounders: scoredPlayers };
};

export const getPlayerBasePrice = (player: Player): number => {
    const isBowler = [PlayerRole.FAST_BOWLER, PlayerRole.SPIN_BOWLER, PlayerRole.ALL_ROUNDER].includes(player.role);
    const attr = Math.max(player.battingSkill, player.secondarySkill);
    
    if (attr >= 80) return isBowler ? 3.0 : 2.0;
    if (attr >= 70) return isBowler ? 2.0 : 1.5;
    if (attr >= 60) return isBowler ? 1.0 : 0.7;
    return 0.35; // 35 lac average (30-40 range)
};

export const getPlayerMarketPrice = (player: Player): number => {
    const base = getPlayerBasePrice(player);
    const attr = Math.max(player.battingSkill, player.secondarySkill);
    // Market price (estimated auction end price)
    if (attr >= 80) return base * 5;
    if (attr >= 70) return base * 4;
    return base * 3;
};

export const getPlayerBadges = (player: Player): string[] => {
    const badges: string[] = [];
    if (player.isFinisher) badges.push("Finisher");
    if (player.isPowerHitter) badges.push("Power Hitter");

    // Phase Badges (Powerplay, Middle Overs, Finisher/Death Overs)
    // We check T20 stats or ODI stats for phase performance!
    const t20Stats = player.stats[Format.T20];
    const odiStats = player.stats[Format.T20] || player.stats[Format.ODI];

    // Check Batting Phase Badges
    if (t20Stats?.phaseStats?.batting) {
        const p = t20Stats.phaseStats.batting;
        // PP Batter: High SR or runs inside PP
        if (p.pp.runs > 30 && (p.pp.runs / (p.pp.balls || 1)) * 100 > 130) {
            badges.push("Powerplay Batter");
        }
        // MO Batter: High runs inside MO and low rate of dismissals (anchor)
        if (p.mo.runs > 50 && p.mo.balls > 30 && (p.mo.runs / (p.mo.dismissals || 1)) > 30) {
            badges.push("Middle Overs Anchor");
        }
        // Finisher: High Death Overs strike rate and runs
        if (p.do.runs > 30 && (p.do.runs / (p.do.balls || 1)) * 100 > 145) {
            badges.push("Death Overs Finisher");
        }
    }

    // Check Bowling Phase Badges
    if (t20Stats?.phaseStats?.bowling) {
        const b = t20Stats.phaseStats.bowling;
        if (b.pp.ballsBowled > 18 && (b.pp.runsConceded / (b.pp.ballsBowled / 6)) < 7.5) {
            badges.push("PP Swing Specialist");
        }
        if (b.mo.wickets > 3 && (b.mo.runsConceded / (b.mo.ballsBowled / 6)) < 7.8) {
            badges.push("MO Spin Wizard");
        }
        if (b.do.wickets > 3 && (b.do.runsConceded / (b.do.ballsBowled / 6)) < 9.8) {
            badges.push("Death Specialist");
        }
    }

    const batRating = player.battingSkill;
    const bowlRating = player.secondarySkill;

    // Define star badges: King, Prince, Run Machine, Boom Boom, Chase Master, The Wall
    if (player.role === PlayerRole.BATSMAN && batRating >= 73) {
        badges.push("King");
    } else if (player.role === PlayerRole.BATSMAN && player.style === 'D' && batRating >= 65) {
        badges.push("The Wall");
    } else if (player.role === PlayerRole.BATSMAN && batRating >= 68 && batRating < 73) {
        badges.push("Prince");
    }

    if ((t20Stats?.runs || 0) > 150 || ((odiStats?.runs || 0) > 200)) {
        badges.push("Run Machine");
    }

    if (player.role === PlayerRole.BATSMAN && player.style === 'A' && batRating >= 65) {
        badges.push("Boom Boom");
    }

    if (player.role === PlayerRole.BATSMAN && batRating >= 71) {
        badges.push("Chase Master");
    }

    // Custom named badge
    const firstName = player.name.split(' ')[0];
    if (batRating >= 70) {
        badges.push(`Super ${firstName}`);
    } else if (bowlRating >= 70) {
        badges.push(`${firstName} Express`);
    } else if (batRating >= 60 || bowlRating >= 60) {
        badges.push(`${firstName} Warrior`);
    }

    // Default badges if none
    if (badges.length === 0) {
        if (player.role === PlayerRole.BATSMAN) badges.push("Classic Legend");
        else if (player.role === PlayerRole.FAST_BOWLER) badges.push("Pace Warrior");
        else if (player.role === PlayerRole.SPIN_BOWLER) badges.push("Spin Doctor");
        else badges.push("Team Champion");
    }

    return Array.from(new Set(badges));
};

export const generateScoutReport = (player: Player, format: Format): string => {
    const stats = player.stats[format];
    if (!stats || stats.matches === 0) return `${player.name} is a developing talent. Early data suggests a ${player.style} approach with core potential in ${player.role === PlayerRole.BATSMAN ? 'top-order stability' : player.role === PlayerRole.FAST_BOWLER ? 'raw pace execution' : 'tactical discipline'}.`;

    const reports: string[] = [];
    
    // Strengths
    if (player.battingSkill > 75) reports.push(`CORE STRENGTH: An elite ${player.style === 'A' ? 'aggressive' : 'technical'} run-machine. Capable of dictating terms on any surface.`);
    else if (player.battingSkill > 60) reports.push(`CORE STRENGTH: Reliable middle-order presence with solid boundary-hitting capability.`);
    
    if (player.secondarySkill > 75) reports.push(`BOWLING THREAT: A frontline weapon. Exhibits ${player.role === PlayerRole.FAST_BOWLER ? 'terrifying pace' : 'deceptive flight and turn'} that frequently induces errors.`);
    
    // Position/Role Fit
    if (player.isOpener) reports.push(`TACTICAL FIT: Optimized for the new ball. Prefers pace on the bat and excels in the Powerplay.`);
    if (player.isFinisher) reports.push(`TACTICAL FIT: Pure finisher. Maintains exceptional composure in high-pressure death-overs situations.`);
    if (player.isPowerHitter) reports.push(`POWER RATING: Exceptional raw power. Can clear any boundary when the sweet-spot is found.`);

    // Weaknesses
    if (player.weaknesses && player.weaknesses.length > 0) {
        const wLabels = player.weaknesses.map(w => w === 'fb' ? 'Extra Pace' : w === 'ls' ? 'Leg Spin' : w === 'lac' ? 'Chinaman' : w);
        reports.push(`VULNERABILITY: Struggles heavily against ${wLabels.join(' and ')}. Tactical opposition will exploit this entry logic.`);
    }

    // Recent Form (Heuristic)
    if (stats.runs > 200 && stats.average > 40) reports.push(`FORM: Currently in a golden patch. Confidence is sky-high.`);
    else if (stats.wickets > 10 && stats.economy < 7.5) reports.push(`FORM: Bowling rhythm is perfect. Consistently hitting the right channels.`);

    return reports.join(' ');
};

export const getMatchRainImpact = (matchNumber: number | string, format: Format, season: number = 1) => {
    const num = typeof matchNumber === 'number' ? matchNumber : parseInt(matchNumber as string, 10) || 1;
    const seed = (num * 17 + season * 31) % 100;
    const isAffected = (format === Format.T20) ? (seed < 25) : (seed < 20);
    
    const maxOvers = format === Format.T20 ? 20 : 50;
    const minOvers = format === Format.T20 ? 5 : 23;

    return {
        willRain: isAffected,
        rainProb: isAffected ? 60 + (seed % 35) : Math.max(0, seed % 20),
        reducedOversA: isAffected ? Math.max(minOvers, maxOvers - (seed % (maxOvers / 2))) : maxOvers,
        reducedOversB: isAffected ? Math.max(minOvers, maxOvers - (seed % (maxOvers / 2 + 2))) : maxOvers
    };
};

export const getUnsoldPlayerTransferPrice = (player: Player): number => {
    const attr = Math.max(player.battingSkill, player.secondarySkill);
    if (attr >= 85) {
        const p = 1.70 + ((attr - 85) / 15) * 0.25;
        return Number(Math.min(1.95, p).toFixed(2));
    }
    if (attr >= 75) {
        const p = 1.20 + ((attr - 75) / 10) * 0.45;
        return Number(Math.min(1.65, p).toFixed(2));
    }
    if (attr >= 65) {
        const p = 0.70 + ((attr - 65) / 10) * 0.45;
        return Number(Math.min(1.15, p).toFixed(2));
    }
    const p = 0.20 + (Math.max(0, attr - 40) / 25) * 0.45;
    return Number(Math.min(0.65, p).toFixed(2));
};
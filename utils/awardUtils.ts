import { 
    BattingPerformance, 
    BowlingPerformance, 
    Inning, 
    MatchResult, 
    Player, 
    Format, 
    Award, 
    GameData, 
    Team, 
    PlayerRole,
    SeasonHallOfFame,
    HallOfFameInductee,
    SeasonTeamsOfTournament,
    TeamOfTheSeasonPlayer,
    SkillProgressionReport,
    SkillProgressionSummary
} from '../types';
import { calculatePlayerSeasonEvaluation } from './seasonEvaluation';

/**
 * Calculates a performance score for a player in a specific match.
 * Used for Player of the Match (POTM) identification.
 */
export const calculatePlayerMatchScore = (
    batter: BattingPerformance | null,
    bowler: BowlingPerformance | null,
    isWinner: boolean
): number => {
    let score = 0;

    // Batting Points
    if (batter) {
        score += batter.runs;
        // Bonus for milestones
        if (batter.runs >= 100) score += 50;
        else if (batter.runs >= 50) score += 25;
        
        // Strike rate bonus (min 10 balls)
        if (batter.balls >= 10) {
            const sr = (batter.runs / batter.balls) * 100;
            if (sr > 150) score += 15;
            else if (sr > 200) score += 30;
        }

        // Boundaries
        score += (batter.fours * 1) + (batter.sixes * 2);
    }

    // Bowling Points
    if (bowler) {
        score += (bowler.wickets * 25);
        // Bonus for hauls
        if (bowler.wickets >= 5) score += 50;
        else if (bowler.wickets >= 3) score += 20;

        // Economy bonus (min 2 overs)
        if (bowler.ballsBowled >= 12) {
            const econ = (bowler.runsConceded / bowler.ballsBowled) * 6;
            if (econ < 6) score += 20;
            else if (econ < 4.5) score += 40;
        }
    }

    // Winner bonus
    if (isWinner) {
        score *= 1.25;
    }

    return score;
};

/**
 * Identifies the Player of the Match for a finished match.
 */
export const getPlayerOfTheMatch = (result: MatchResult): { playerId: string, playerName: string, teamId: string, summary: string } => {
    const allInnings = [result.firstInning, result.secondInning, result.thirdInning, result.fourthInning].filter(Boolean) as Inning[];
    
    let bestScore = -1;
    let potm = { playerId: '', playerName: '', teamId: '', summary: '' };

    allInnings.forEach((inning) => {
        const isWinner = inning.teamId === result.winnerId;
        
        // Check Batters
        inning.batting.forEach(bat => {
            let bowlPerf: BowlingPerformance | null = null;
            allInnings.forEach(inn => {
                const found = inn.bowling.find(b => b.playerId === bat.playerId);
                if (found) bowlPerf = found;
            });

            const score = calculatePlayerMatchScore(bat, bowlPerf, isWinner);
            if (score > bestScore) {
                bestScore = score;
                potm = {
                    playerId: bat.playerId,
                    playerName: bat.playerName,
                    teamId: inning.teamId,
                    summary: bat.runs > 0 
                        ? `${bat.runs}(${bat.balls})${bowlPerf && bowlPerf.wickets > 0 ? ` & ${bowlPerf.wickets}/${bowlPerf.runsConceded}` : ''}`
                        : `${bowlPerf!.wickets}/${bowlPerf!.runsConceded}`
                };
            }
        });

        // Check Bowlers
        inning.bowling.forEach(bowl => {
            const batPerf = inning.batting.find(b => b.playerId === bowl.playerId) || null;
            const score = calculatePlayerMatchScore(batPerf, bowl, isWinner);
            if (score > bestScore) {
                bestScore = score;
                potm = {
                    playerId: bowl.playerId,
                    playerName: bowl.playerName,
                    teamId: (inning.teamId === result.firstInning.teamId) ? result.secondInning.teamId : result.firstInning.teamId,
                    summary: `${bowl.wickets}/${bowl.runsConceded}${batPerf && batPerf.runs > 0 ? ` & ${batPerf.runs}(${batPerf.balls})` : ''}`
                };
            }
        });
    });

    return potm;
};

/**
 * Helper to get cumulative season statistics for a player in a given format or across formats.
 */
export const getPlayerSeasonStats = (player: Player, format?: Format) => {
    const s = (format && player.stats?.[format]) ? player.stats[format] : null;
    if (s) {
        const dismissals = s.dismissals || 0;
        const runs = s.runs || 0;
        const wickets = s.wickets || 0;
        const ballsFaced = s.ballsFaced || 0;
        const ballsBowled = s.ballsBowled || 0;
        const runsConceded = s.runsConceded || 0;
        const average = dismissals > 0 ? parseFloat((runs / dismissals).toFixed(2)) : runs;
        const strikeRate = ballsFaced > 0 ? parseFloat(((runs / ballsFaced) * 100).toFixed(2)) : 0;
        const bowlingAverage = wickets > 0 ? parseFloat((runsConceded / wickets).toFixed(2)) : 0;
        const economy = ballsBowled > 0 ? parseFloat(((runsConceded / ballsBowled) * 6).toFixed(2)) : (s.economy || 0);

        return {
            runs,
            wickets,
            matches: s.matches || 0,
            ballsFaced,
            ballsBowled,
            runsConceded,
            dismissals,
            sixes: s.sixes || 0,
            fours: s.fours || 0,
            fifties: s.fifties || 0,
            hundreds: s.hundreds || 0,
            motms: s.manOfTheMatchAwards || 0,
            average,
            strikeRate,
            bowlingAverage,
            economy
        };
    }

    // Aggregate across all formats
    const formats = Object.values(Format);
    let runs = 0, wickets = 0, matches = 0, ballsFaced = 0, ballsBowled = 0, runsConceded = 0, dismissals = 0, sixes = 0, fours = 0, fifties = 0, hundreds = 0, motms = 0;
    formats.forEach(f => {
        const st = player.stats?.[f];
        if (st) {
            runs += st.runs || 0;
            wickets += st.wickets || 0;
            matches += st.matches || 0;
            ballsFaced += st.ballsFaced || 0;
            ballsBowled += st.ballsBowled || 0;
            runsConceded += st.runsConceded || 0;
            dismissals += st.dismissals || 0;
            sixes += st.sixes || 0;
            fours += st.fours || 0;
            fifties += st.fifties || 0;
            hundreds += st.hundreds || 0;
            motms += st.manOfTheMatchAwards || 0;
        }
    });

    const average = dismissals > 0 ? parseFloat((runs / dismissals).toFixed(2)) : runs;
    const strikeRate = ballsFaced > 0 ? parseFloat(((runs / ballsFaced) * 100).toFixed(2)) : 0;
    const bowlingAverage = wickets > 0 ? parseFloat((runsConceded / wickets).toFixed(2)) : 0;
    const economy = ballsBowled > 0 ? parseFloat(((runsConceded / ballsBowled) * 6).toFixed(2)) : 0;

    return {
        runs,
        wickets,
        matches,
        ballsFaced,
        ballsBowled,
        runsConceded,
        dismissals,
        sixes,
        fours,
        fifties,
        hundreds,
        motms,
        average,
        strikeRate,
        bowlingAverage,
        economy
    };
};

/**
 * Calculates End of Season Awards for a format.
 */
export const calculateSeasonAwards = (gameData: GameData, format: Format = gameData.currentFormat || Format.T20): Award => {
    const standings = gameData.standings[format] || [];
    const winnerTeam = standings[0] || { teamId: 'team1', teamName: 'Champion' };
    
    const allPlayers = gameData.allPlayers || [];
    
    // 1. Best Batter (Orange Cap)
    const bestBatterPlayer = [...allPlayers].sort((a, b) => (b.stats?.[format]?.runs || 0) - (a.stats?.[format]?.runs || 0))[0] || allPlayers[0];
    
    // 2. Best Bowler (Purple Cap)
    const bestBowlerPlayer = [...allPlayers].sort((a, b) => (b.stats?.[format]?.wickets || 0) - (a.stats?.[format]?.wickets || 0))[0] || allPlayers[0];
    
    // 3. Power Hitter (Most Sixes)
    const powerHitterPlayer = [...allPlayers].sort((a, b) => (b.stats?.[format]?.sixes || 0) - (a.stats?.[format]?.sixes || 0))[0] || allPlayers[0];
    
    // 4. Player of the Season (MVP)
    const mvpPlayer = [...allPlayers].sort((a, b) => {
        const getPoints = (p: Player) => {
            const s = p.stats?.[format];
            if (!s) return 0;
            return (s.runs || 0) + ((s.wickets || 0) * 20) + ((s.sixes || 0) * 2) + ((s.catches || 0) * 10) + ((s.manOfTheMatchAwards || 0) * 50);
        };
        return getPoints(b) - getPoints(a);
    })[0] || allPlayers[0];

    const getTeamName = (p?: Player) => p?.teamName || 'Free Agent';

    return {
        season: gameData.currentSeason,
        format,
        winnerTeamId: winnerTeam.teamId,
        winnerTeamName: winnerTeam.teamName,
        playerOfSeason: {
            playerId: mvpPlayer?.id || 'p-mvp',
            playerName: mvpPlayer?.name || 'MVP',
            teamName: getTeamName(mvpPlayer),
            impact: (mvpPlayer?.stats?.[format]?.runs || 0) + ((mvpPlayer?.stats?.[format]?.wickets || 0) * 20)
        },
        bestBatter: {
            playerId: bestBatterPlayer?.id || 'p-bat',
            playerName: bestBatterPlayer?.name || 'Top Batter',
            teamName: getTeamName(bestBatterPlayer),
            runs: bestBatterPlayer?.stats?.[format]?.runs || 0
        },
        bestBowler: {
            playerId: bestBowlerPlayer?.id || 'p-bowl',
            playerName: bestBowlerPlayer?.name || 'Top Bowler',
            teamName: getTeamName(bestBowlerPlayer),
            wickets: bestBowlerPlayer?.stats?.[format]?.wickets || 0
        },
        powerHitter: {
            playerId: powerHitterPlayer?.id || 'p-hit',
            playerName: powerHitterPlayer?.name || 'Power Hitter',
            teamName: getTeamName(powerHitterPlayer),
            sixes: powerHitterPlayer?.stats?.[format]?.sixes || 0
        }
    };
};

/**
 * Calculates Hall of Fame Inductees for a Season.
 * Exact specification: 1 Best Batter, 1 Best Bowler, 1 Best All-Rounder, 1 Best Foreign player.
 */
export const generateSeasonHallOfFame = (
    gameData: GameData,
    seasonNumber: number,
    format: Format = gameData.currentFormat || Format.T20
): SeasonHallOfFame => {
    const allPlayers = gameData.allPlayers || [];

    const getScore = (p: Player) => {
        const ev = calculatePlayerSeasonEvaluation(p, seasonNumber);
        return ev.totalScore;
    };

    // 1. Best Batter (Batsman or Wicket Keeper)
    const batterCandidates = allPlayers.filter(p => p.role === PlayerRole.BATSMAN || p.role === PlayerRole.WICKET_KEEPER);
    const sortedBatters = [...batterCandidates].sort((a, b) => {
        const statsA = getPlayerSeasonStats(a, format);
        const statsB = getPlayerSeasonStats(b, format);
        const scoreA = statsA.runs * 1.5 + (statsA.fifties * 25) + (statsA.hundreds * 60) + (statsA.strikeRate * 0.3) + getScore(a);
        const scoreB = statsB.runs * 1.5 + (statsB.fifties * 25) + (statsB.hundreds * 60) + (statsB.strikeRate * 0.3) + getScore(b);
        return scoreB - scoreA;
    });
    const topBatter = sortedBatters[0] || allPlayers[0];
    const topBatStats = getPlayerSeasonStats(topBatter, format);

    // 2. Best Bowler (Fast Bowler or Spin Bowler)
    const bowlerCandidates = allPlayers.filter(p => p.role === PlayerRole.FAST_BOWLER || p.role === PlayerRole.SPIN_BOWLER);
    const sortedBowlers = [...bowlerCandidates].sort((a, b) => {
        const statsA = getPlayerSeasonStats(a, format);
        const statsB = getPlayerSeasonStats(b, format);
        const scoreA = statsA.wickets * 35 - (statsA.economy * 8) + getScore(a);
        const scoreB = statsB.wickets * 35 - (statsB.economy * 8) + getScore(b);
        return scoreB - scoreA;
    });
    const topBowler = sortedBowlers[0] || allPlayers[1] || allPlayers[0];
    const topBowlStats = getPlayerSeasonStats(topBowler, format);

    // 3. Best All-Rounder
    const arCandidates = allPlayers.filter(p => p.role === PlayerRole.ALL_ROUNDER);
    const sortedARs = [...arCandidates].sort((a, b) => {
        const statsA = getPlayerSeasonStats(a, format);
        const statsB = getPlayerSeasonStats(b, format);
        const scoreA = statsA.runs + (statsA.wickets * 25) + (statsA.sixes * 3) + getScore(a);
        const scoreB = statsB.runs + (statsB.wickets * 25) + (statsB.sixes * 3) + getScore(b);
        return scoreB - scoreA;
    });
    const topAR = sortedARs[0] || allPlayers[2] || allPlayers[0];
    const topARStats = getPlayerSeasonStats(topAR, format);

    // 4. Best Foreign Player (Any role with isForeign = true)
    const foreignCandidates = allPlayers.filter(p => p.isForeign);
    const sortedForeign = [...foreignCandidates].sort((a, b) => {
        const statsA = getPlayerSeasonStats(a, format);
        const statsB = getPlayerSeasonStats(b, format);
        const scoreA = statsA.runs + (statsA.wickets * 25) + (statsA.motms * 30) + getScore(a);
        const scoreB = statsB.runs + (statsB.wickets * 25) + (statsB.motms * 30) + getScore(b);
        return scoreB - scoreA;
    });
    const topForeign = sortedForeign[0] || foreignCandidates[0] || allPlayers[0];
    const topForeignStats = getPlayerSeasonStats(topForeign, format);

    const createInductee = (
        p: Player,
        roleCat: 'BATTER' | 'BOWLER' | 'ALL_ROUNDER' | 'FOREIGN',
        stats: ReturnType<typeof getPlayerSeasonStats>,
        badge: string
    ): HallOfFameInductee => {
        const achievements: string[] = [];
        if (stats.runs > 0) achievements.push(`${stats.runs} Runs (Avg: ${stats.average}, SR: ${stats.strikeRate})`);
        if (stats.wickets > 0) achievements.push(`${stats.wickets} Wickets (Econ: ${stats.economy})`);
        if (stats.hundreds > 0) achievements.push(`${stats.hundreds}x Centuries`);
        if (stats.fifties > 0) achievements.push(`${stats.fifties}x Fifties`);
        if (stats.motms > 0) achievements.push(`${stats.motms}x Player of the Match`);
        achievements.push(`Season Rating: ${getScore(p)}/100`);

        let summary = '';
        let highlight = '';
        if (roleCat === 'BATTER') {
            summary = `Dominant batting titan with ${stats.runs} runs, leading the tournament run-scoring charts.`;
            highlight = `${stats.runs} Runs @ Avg ${stats.average}`;
        } else if (roleCat === 'BOWLER') {
            summary = `Premier strike bowler claiming ${stats.wickets} wickets with deadly ${stats.economy} economy.`;
            highlight = `${stats.wickets} Wickets @ Econ ${stats.economy}`;
        } else if (roleCat === 'ALL_ROUNDER') {
            summary = `Ultimate two-way weapon contributing ${stats.runs} runs & ${stats.wickets} crucial breakthroughs.`;
            highlight = `${stats.runs} Runs & ${stats.wickets} Wickets`;
        } else {
            summary = `Sensational overseas import hailing from ${p.nationality}, lighting up the season with world-class mastery.`;
            highlight = stats.runs > 100 ? `${stats.runs} Runs` : `${stats.wickets} Wickets`;
        }

        return {
            season: seasonNumber,
            roleCategory: roleCat,
            playerId: p.id,
            playerName: p.name,
            teamName: p.teamName || 'Free Agent',
            nationality: p.nationality || 'National',
            isForeign: !!p.isForeign,
            role: p.role,
            statsSummary: summary,
            achievements,
            seasonRuns: stats.runs,
            seasonWickets: stats.wickets,
            battingAverage: stats.average,
            bowlingEconomy: stats.economy,
            evaluationScore: getScore(p),
            achievementHighlight: highlight,
            skillSnapshot: {
                battingSkill: p.battingSkill,
                bowlingSkill: p.secondarySkill
            },
            iconBadge: badge
        };
    };

    return {
        season: seasonNumber,
        bestBatter: createInductee(topBatter, 'BATTER', topBatStats, '👑 Batting Hall of Fame'),
        bestBowler: createInductee(topBowler, 'BOWLER', topBowlStats, '⚡ Bowling Hall of Fame'),
        bestAllRounder: createInductee(topAR, 'ALL_ROUNDER', topARStats, '🌟 All-Round Hall of Fame'),
        bestForeign: createInductee(topForeign, 'FOREIGN', topForeignStats, '✈️ Global Icon Hall of Fame')
    };
};

/**
 * Generates the Auto Team of the Tournament (Official Best 11).
 * Standard franchise cricket composition:
 * - 2 Openers
 * - 3 Top/Middle-Order Batters
 * - 1 Wicket-Keeper
 * - 2 All-Rounders
 * - 3 Specialist Bowlers
 * - Maximum 4 Foreign Players!
 */
export const generateAutoTeamOfTheTournament = (
    gameData: GameData,
    seasonNumber: number,
    format: Format = gameData.currentFormat || Format.T20
): SeasonTeamsOfTournament['autoTeamOfTheTournament'] => {
    const allPlayers = gameData.allPlayers || [];

    // Helper score
    const scorePlayer = (p: Player) => {
        const s = getPlayerSeasonStats(p, format);
        const ev = calculatePlayerSeasonEvaluation(p, seasonNumber);
        return s.runs * 1.5 + (s.wickets * 30) + (s.fifties * 20) + (s.hundreds * 50) + (s.motms * 25) + ev.totalScore;
    };

    const selectedIds = new Set<string>();
    const selectedList: TeamOfTheSeasonPlayer[] = [];
    let foreignCount = 0;

    const tryPick = (
        candidateList: Player[],
        roleLabel: TeamOfTheSeasonPlayer['assignedRole'],
        position: number,
        isWK: boolean = false
    ): boolean => {
        for (const p of candidateList) {
            if (selectedIds.has(p.id)) continue;
            if (p.isForeign && foreignCount >= 4) continue; // Respect 4 foreign limit

            const s = getPlayerSeasonStats(p, format);
            selectedIds.add(p.id);
            if (p.isForeign) foreignCount++;

            selectedList.push({
                player: p,
                position,
                assignedRole: roleLabel,
                isWicketKeeper: isWK,
                isForeign: p.isForeign,
                seasonRuns: s.runs,
                seasonWickets: s.wickets,
                seasonAvg: s.average,
                seasonSrOrEcon: isWK || roleLabel.includes('Bowler') ? s.economy : s.strikeRate,
                seasonScore: calculatePlayerSeasonEvaluation(p, seasonNumber).totalScore
            });
            return true;
        }
        return false;
    };

    // 1. Position 1-2: Top 2 Openers
    const openerCandidates = [...allPlayers]
        .filter(p => p.isOpener || p.role === PlayerRole.BATSMAN || p.role === PlayerRole.WICKET_KEEPER)
        .sort((a, b) => scorePlayer(b) - scorePlayer(a));
    tryPick(openerCandidates, 'Opener', 1);
    tryPick(openerCandidates, 'Opener', 2);

    // 2. Position 3-4: Top Order Batters
    const topOrderCandidates = [...allPlayers]
        .filter(p => (p.role === PlayerRole.BATSMAN || p.role === PlayerRole.WICKET_KEEPER) && !selectedIds.has(p.id))
        .sort((a, b) => scorePlayer(b) - scorePlayer(a));
    tryPick(topOrderCandidates, 'Top Order', 3);
    tryPick(topOrderCandidates, 'Top Order', 4);

    // 3. Position 5: Middle Order Batter
    const middleOrderCandidates = [...allPlayers]
        .filter(p => p.role === PlayerRole.BATSMAN && !selectedIds.has(p.id))
        .sort((a, b) => scorePlayer(b) - scorePlayer(a));
    tryPick(middleOrderCandidates, 'Middle Order', 5);

    // 4. Position 6: Wicket Keeper
    const wkCandidates = [...allPlayers]
        .filter(p => p.role === PlayerRole.WICKET_KEEPER && !selectedIds.has(p.id))
        .sort((a, b) => scorePlayer(b) - scorePlayer(a));
    tryPick(wkCandidates, 'Wicket Keeper', 6, true);

    // 5. Position 7-8: 2 All-Rounders
    const arCandidates = [...allPlayers]
        .filter(p => p.role === PlayerRole.ALL_ROUNDER && !selectedIds.has(p.id))
        .sort((a, b) => scorePlayer(b) - scorePlayer(a));
    tryPick(arCandidates, 'All-Rounder', 7);
    tryPick(arCandidates, 'All-Rounder', 8);

    // 6. Position 9-11: 3 Specialist Bowlers
    const paceCandidates = [...allPlayers]
        .filter(p => p.role === PlayerRole.FAST_BOWLER && !selectedIds.has(p.id))
        .sort((a, b) => scorePlayer(b) - scorePlayer(a));
    const spinCandidates = [...allPlayers]
        .filter(p => p.role === PlayerRole.SPIN_BOWLER && !selectedIds.has(p.id))
        .sort((a, b) => scorePlayer(b) - scorePlayer(a));

    tryPick(paceCandidates, 'Pace Bowler', 9);
    tryPick(spinCandidates, 'Spin Bowler', 10);
    
    // Remaining bowler (pace or spin)
    const anyBowlerCandidates = [...allPlayers]
        .filter(p => (p.role === PlayerRole.FAST_BOWLER || p.role === PlayerRole.SPIN_BOWLER) && !selectedIds.has(p.id))
        .sort((a, b) => scorePlayer(b) - scorePlayer(a));
    tryPick(anyBowlerCandidates, anyBowlerCandidates[0]?.role === PlayerRole.FAST_BOWLER ? 'Pace Bowler' : 'Spin Bowler', 11);

    // If still under 11, backfill
    if (selectedList.length < 11) {
        const leftovers = [...allPlayers]
            .filter(p => !selectedIds.has(p.id))
            .sort((a, b) => scorePlayer(b) - scorePlayer(a));
        for (const p of leftovers) {
            if (selectedList.length >= 11) break;
            tryPick([p], 'Middle Order', selectedList.length + 1);
        }
    }

    // Designate Captain
    const captainCandidate = [...selectedList].sort((a, b) => (b.seasonScore || 0) - (a.seasonScore || 0))[0];
    if (captainCandidate) {
        captainCandidate.isCaptain = true;
    }

    const wkCandidate = selectedList.find(p => p.isWicketKeeper) || selectedList[5];
    if (wkCandidate) {
        wkCandidate.isWicketKeeper = true;
    }

    // Sort by position 1-11
    selectedList.sort((a, b) => a.position - b.position);

    return {
        players: selectedList,
        captainId: captainCandidate?.player.id || selectedList[0]?.player.id || '',
        wicketKeeperId: wkCandidate?.player.id || selectedList[5]?.player.id || '',
        foreignCount
    };
};

/**
 * Dynamic Skill Gains & Losses Every Season:
 * - 10 Batters Gain (+1 or +2) & 10 Batters Lose (-1 or -2)
 * - 10 Bowlers Gain (+1 or +2) & 10 Bowlers Lose (-1 or -2)
 * - 10 All-Rounders Gain (+1 to +3 in both batting & bowling) & 10 All-Rounders Lose (-1 to -3 in both)
 * - Others remain unchanged.
 */
export const calculateDynamicSkillProgression = (
    gameData: GameData,
    seasonNumber: number
): SkillProgressionSummary => {
    const allPlayers = gameData.allPlayers || [];

    // Helper score functions
    const evalBattingScore = (p: Player) => {
        const ev = calculatePlayerSeasonEvaluation(p, seasonNumber);
        const stats = getPlayerSeasonStats(p);
        return ev.battingScore * 1.5 + (stats.runs * 0.8) + (stats.fifties * 15) + (stats.hundreds * 40) + (stats.strikeRate * 0.2);
    };

    const evalBowlingScore = (p: Player) => {
        const ev = calculatePlayerSeasonEvaluation(p, seasonNumber);
        const stats = getPlayerSeasonStats(p);
        return ev.bowlingScore * 1.5 + (stats.wickets * 20) - (stats.economy * 5) + (stats.matches * 2);
    };

    const evalAllRoundScore = (p: Player) => {
        const ev = calculatePlayerSeasonEvaluation(p, seasonNumber);
        const stats = getPlayerSeasonStats(p);
        return (ev.battingScore + ev.bowlingScore) + (stats.runs * 0.5) + (stats.wickets * 18) + (stats.sixes * 2);
    };

    // 1. Process Batters (BATSMAN & WICKET_KEEPER)
    const batters = allPlayers.filter(p => p.role === PlayerRole.BATSMAN || p.role === PlayerRole.WICKET_KEEPER);
    batters.sort((a, b) => evalBattingScore(b) - evalBattingScore(a));

    const gainingBatters: SkillProgressionReport[] = [];
    const losingBatters: SkillProgressionReport[] = [];

    // Top 10 Batters Gain (Top 5 gain +2, 6-10 gain +1)
    const top10Batters = batters.slice(0, 10);
    top10Batters.forEach((p, idx) => {
        const delta = idx < 5 ? 2 : 1;
        const oldBat = p.battingSkill;
        const newBat = Math.min(99, oldBat + delta);
        gainingBatters.push({
            playerId: p.id,
            playerName: p.name,
            teamName: p.teamName || 'Free Agent',
            role: p.role,
            roleCategory: 'BATTER',
            changeType: 'GAIN',
            rank: idx + 1,
            battingSkillDelta: delta,
            bowlingSkillDelta: 0,
            oldBattingSkill: oldBat,
            newBattingSkill: newBat,
            oldBowlingSkill: p.secondarySkill,
            newBowlingSkill: p.secondarySkill,
            reason: `Top #${idx + 1} Batsman of Season ${seasonNumber} (+${delta} Batting Skill)`,
            age: p.age,
            isForeign: !!p.isForeign,
            seasonEvaluationScore: Math.round(evalBattingScore(p))
        });
    });

    // Bottom 10 Batters Lose (Worst 5 lose -2, 6-10 lose -1)
    const bottom10Batters = batters.slice(-10).reverse();
    bottom10Batters.forEach((p, idx) => {
        const delta = idx < 5 ? -2 : -1;
        const oldBat = p.battingSkill;
        const newBat = Math.max(30, oldBat + delta);
        losingBatters.push({
            playerId: p.id,
            playerName: p.name,
            teamName: p.teamName || 'Free Agent',
            role: p.role,
            roleCategory: 'BATTER',
            changeType: 'LOSS',
            rank: idx + 1,
            battingSkillDelta: delta,
            bowlingSkillDelta: 0,
            oldBattingSkill: oldBat,
            newBattingSkill: newBat,
            oldBowlingSkill: p.secondarySkill,
            newBowlingSkill: p.secondarySkill,
            reason: `Underperforming Batsman in Season ${seasonNumber} (${delta} Batting Skill)`,
            age: p.age,
            isForeign: !!p.isForeign,
            seasonEvaluationScore: Math.round(evalBattingScore(p))
        });
    });

    // 2. Process Bowlers (FAST_BOWLER & SPIN_BOWLER)
    const bowlers = allPlayers.filter(p => p.role === PlayerRole.FAST_BOWLER || p.role === PlayerRole.SPIN_BOWLER);
    bowlers.sort((a, b) => evalBowlingScore(b) - evalBowlingScore(a));

    const gainingBowlers: SkillProgressionReport[] = [];
    const losingBowlers: SkillProgressionReport[] = [];

    // Top 10 Bowlers Gain (Top 5 gain +2, 6-10 gain +1)
    const top10Bowlers = bowlers.slice(0, 10);
    top10Bowlers.forEach((p, idx) => {
        const delta = idx < 5 ? 2 : 1;
        const oldBowl = p.secondarySkill;
        const newBowl = Math.min(99, oldBowl + delta);
        gainingBowlers.push({
            playerId: p.id,
            playerName: p.name,
            teamName: p.teamName || 'Free Agent',
            role: p.role,
            roleCategory: 'BOWLER',
            changeType: 'GAIN',
            rank: idx + 1,
            battingSkillDelta: 0,
            bowlingSkillDelta: delta,
            oldBattingSkill: p.battingSkill,
            newBattingSkill: p.battingSkill,
            oldBowlingSkill: oldBowl,
            newBowlingSkill: newBowl,
            reason: `Top #${idx + 1} Strike Bowler of Season ${seasonNumber} (+${delta} Bowling Skill)`,
            age: p.age,
            isForeign: !!p.isForeign,
            seasonEvaluationScore: Math.round(evalBowlingScore(p))
        });
    });

    // Bottom 10 Bowlers Lose (Worst 5 lose -2, 6-10 lose -1)
    const bottom10Bowlers = bowlers.slice(-10).reverse();
    bottom10Bowlers.forEach((p, idx) => {
        const delta = idx < 5 ? -2 : -1;
        const oldBowl = p.secondarySkill;
        const newBowl = Math.max(30, oldBowl + delta);
        losingBowlers.push({
            playerId: p.id,
            playerName: p.name,
            teamName: p.teamName || 'Free Agent',
            role: p.role,
            roleCategory: 'BOWLER',
            changeType: 'LOSS',
            rank: idx + 1,
            battingSkillDelta: 0,
            bowlingSkillDelta: delta,
            oldBattingSkill: p.battingSkill,
            newBattingSkill: p.battingSkill,
            oldBowlingSkill: oldBowl,
            newBowlingSkill: newBowl,
            reason: `Struggling Bowling Campaign in Season ${seasonNumber} (${delta} Bowling Skill)`,
            age: p.age,
            isForeign: !!p.isForeign,
            seasonEvaluationScore: Math.round(evalBowlingScore(p))
        });
    });

    // 3. Process All-Rounders (ALL_ROUNDER)
    const allRounders = allPlayers.filter(p => p.role === PlayerRole.ALL_ROUNDER);
    allRounders.sort((a, b) => evalAllRoundScore(b) - evalAllRoundScore(a));

    const gainingAllRounders: SkillProgressionReport[] = [];
    const losingAllRounders: SkillProgressionReport[] = [];

    // Top 10 All-Rounders Gain (+1 to +3 in both batting and bowling)
    const top10ARs = allRounders.slice(0, 10);
    top10ARs.forEach((p, idx) => {
        const delta = idx < 3 ? 3 : idx < 7 ? 2 : 1;
        const oldBat = p.battingSkill;
        const oldBowl = p.secondarySkill;
        const newBat = Math.min(99, oldBat + delta);
        const newBowl = Math.min(99, oldBowl + delta);
        gainingAllRounders.push({
            playerId: p.id,
            playerName: p.name,
            teamName: p.teamName || 'Free Agent',
            role: p.role,
            roleCategory: 'ALL_ROUNDER',
            changeType: 'GAIN',
            rank: idx + 1,
            battingSkillDelta: delta,
            bowlingSkillDelta: delta,
            oldBattingSkill: oldBat,
            newBattingSkill: newBat,
            oldBowlingSkill: oldBowl,
            newBowlingSkill: newBowl,
            reason: `Elite All-Round Performer #${idx + 1} (+${delta} Batting & +${delta} Bowling Skills)`,
            age: p.age,
            isForeign: !!p.isForeign,
            seasonEvaluationScore: Math.round(evalAllRoundScore(p))
        });
    });

    // Bottom 10 All-Rounders Lose (-1 to -3 in both)
    const bottom10ARs = allRounders.slice(-10).reverse();
    bottom10ARs.forEach((p, idx) => {
        const delta = idx < 3 ? -3 : idx < 7 ? -2 : -1;
        const oldBat = p.battingSkill;
        const oldBowl = p.secondarySkill;
        const newBat = Math.max(30, oldBat + delta);
        const newBowl = Math.max(30, oldBowl + delta);
        losingAllRounders.push({
            playerId: p.id,
            playerName: p.name,
            teamName: p.teamName || 'Free Agent',
            role: p.role,
            roleCategory: 'ALL_ROUNDER',
            changeType: 'LOSS',
            rank: idx + 1,
            battingSkillDelta: delta,
            bowlingSkillDelta: delta,
            oldBattingSkill: oldBat,
            newBattingSkill: newBat,
            oldBowlingSkill: oldBowl,
            newBowlingSkill: newBowl,
            reason: `Sub-par All-Round Campaign (${delta} Batting & ${delta} Bowling Skills)`,
            age: p.age,
            isForeign: !!p.isForeign,
            seasonEvaluationScore: Math.round(evalAllRoundScore(p))
        });
    });

    return {
        season: seasonNumber,
        gainingBatters,
        losingBatters,
        gainingBowlers,
        losingBowlers,
        gainingAllRounders,
        losingAllRounders
    };
};

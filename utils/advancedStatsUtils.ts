import { 
    GameData, 
    Player, 
    Team, 
    Format, 
    MatchResult, 
    Inning, 
    BattingPerformance, 
    BowlingPerformance, 
    PlayerRole,
    UniversalFilterState,
    CaptaincyRecord,
    CaptaincyFormatStats,
    PlayerVsTeamDetailed,
    PlayerTeamHistoryRecord,
    HeadToHeadDetailed,
    TeamHeadToHeadBattingStats,
    TeamVsTeamMatchExtremes,
    BestBatterAgainstTeam,
    BestBowlerAgainstTeam,
    PlayerVsPlayerMatchupRecord,
    TeamComprehensiveRecords,
    AllTimeCareerRecords
} from '../types';
import { getPlayerById } from '../utils';

export interface EnrichedMatch {
    matchResult: MatchResult;
    format: Format;
    season: number;
    teamAId: string;
    teamAName: string;
    teamBId: string;
    teamBName: string;
    teamACaptainId?: string;
    teamBCaptainId?: string;
}

/**
 * Normalizes all matches across all formats and seasons from gameData
 */
export const getAllEnrichedMatches = (gameData: GameData, filter?: Partial<UniversalFilterState>): EnrichedMatch[] => {
    const list: EnrichedMatch[] = [];
    const allFormats = [Format.T20, Format.ODI, Format.SHIELD];

    // 1. Current Season matches
    for (const f of allFormats) {
        const results = gameData.matchResults?.[f] || [];
        for (const res of results) {
            const teamAId = res.firstInning?.teamId || '';
            const teamAName = res.firstInning?.teamName || 'Team A';
            const teamBId = res.secondInning?.teamId || '';
            const teamBName = res.secondInning?.teamName || 'Team B';

            const teamAObj = gameData.teams?.find(t => t.id === teamAId || t.name === teamAName);
            const teamBObj = gameData.teams?.find(t => t.id === teamBId || t.name === teamBName);

            const teamACaptainId = res.teamACaptainId || teamAObj?.captains?.[f] || teamAObj?.captainId;
            const teamBCaptainId = res.teamBCaptainId || teamBObj?.captains?.[f] || teamBObj?.captainId;

            list.push({
                matchResult: res,
                format: res.format || f,
                season: res.season || gameData.currentSeason || 1,
                teamAId,
                teamAName,
                teamBId,
                teamBName,
                teamACaptainId,
                teamBCaptainId
            });
        }
    }

    // 2. Historical past season matches
    if (gameData.matchHistory && Array.isArray(gameData.matchHistory)) {
        for (const res of gameData.matchHistory) {
            const f = res.format || Format.T20;
            const teamAId = res.firstInning?.teamId || '';
            const teamAName = res.firstInning?.teamName || 'Team A';
            const teamBId = res.secondInning?.teamId || '';
            const teamBName = res.secondInning?.teamName || 'Team B';

            list.push({
                matchResult: res,
                format: f,
                season: res.season || 1,
                teamAId,
                teamAName,
                teamBId,
                teamBName,
                teamACaptainId: res.teamACaptainId,
                teamBCaptainId: res.teamBCaptainId
            });
        }
    }

    // Apply filtering if provided
    if (!filter) return list;

    return list.filter(m => {
        if (filter.format && filter.format !== 'ALL' && m.format !== filter.format) return false;
        if (filter.season && filter.season !== 'ALL' && m.season !== Number(filter.season)) return false;
        if (filter.teamId && filter.teamId !== 'ALL') {
            const teamIdOrName = filter.teamId.toLowerCase();
            const matchesTeam = m.teamAId.toLowerCase() === teamIdOrName || 
                                m.teamAName.toLowerCase() === teamIdOrName || 
                                m.teamBId.toLowerCase() === teamIdOrName || 
                                m.teamBName.toLowerCase() === teamIdOrName;
            if (!matchesTeam) return false;
        }
        if (filter.opponentTeamId && filter.opponentTeamId !== 'ALL') {
            const oppIdOrName = filter.opponentTeamId.toLowerCase();
            const matchesOpp = m.teamAId.toLowerCase() === oppIdOrName || 
                               m.teamAName.toLowerCase() === oppIdOrName || 
                               m.teamBId.toLowerCase() === oppIdOrName || 
                               m.teamBName.toLowerCase() === oppIdOrName;
            if (!matchesOpp) return false;
        }
        return true;
    });
};

/**
 * Calculates comprehensive Captaincy records for a player
 */
export const calculatePlayerCaptaincyRecords = (
    playerId: string, 
    gameData: GameData, 
    filter?: Partial<UniversalFilterState>
): CaptaincyRecord => {
    const player = gameData.allPlayers.find(p => p.id === playerId);
    const allMatches = getAllEnrichedMatches(gameData, filter);

    // Identify matches where player was captain
    const captainMatches = allMatches.filter(m => {
        if (m.teamACaptainId === playerId || m.teamBCaptainId === playerId) return true;
        // Check if player's team was in match and player is registered captain for format
        const pTeam = gameData.teams.find(t => t.squad.some(sp => sp.id === playerId));
        if (pTeam) {
            const isTeamPlaying = m.teamAId === pTeam.id || m.teamBId === pTeam.id || m.teamAName === pTeam.name || m.teamBName === pTeam.name;
            if (isTeamPlaying && (pTeam.captains?.[m.format] === playerId || pTeam.captainId === playerId)) return true;
        }
        return false;
    });

    let wins = 0;
    let losses = 0;
    let ties = 0;
    let noResults = 0;

    let currentWinStreak = 0;
    let maxWinStreak = 0;
    let currentLoseStreak = 0;
    let maxLoseStreak = 0;

    let highestTeamScore = { score: 0, wickets: 0, overs: '0.0', vsTeamName: 'None' };
    let lowestTeamScore = { score: 9999, wickets: 10, overs: '0.0', vsTeamName: 'None' };
    let highestSuccessfulChase = { target: 0, score: 0, wickets: 0, vsTeamName: 'None' };
    let biggestWin = { marginText: 'None', vsTeamName: 'None', format: '' };
    let biggestDefeat = { marginText: 'None', vsTeamName: 'None', format: '' };

    const formatStatsMap: Record<string, {
        matches: number;
        wins: number;
        losses: number;
        ties: number;
        noResults: number;
        runs: number;
        dismissals: number;
        ballsFaced: number;
        wickets: number;
        runsConceded: number;
        ballsBowled: number;
        highestScore: number;
        bestBowlingWkts: number;
        bestBowlingRuns: number;
    }> = {
        [Format.T20]: { matches: 0, wins: 0, losses: 0, ties: 0, noResults: 0, runs: 0, dismissals: 0, ballsFaced: 0, wickets: 0, runsConceded: 0, ballsBowled: 0, highestScore: 0, bestBowlingWkts: 0, bestBowlingRuns: 999 },
        [Format.ODI]: { matches: 0, wins: 0, losses: 0, ties: 0, noResults: 0, runs: 0, dismissals: 0, ballsFaced: 0, wickets: 0, runsConceded: 0, ballsBowled: 0, highestScore: 0, bestBowlingWkts: 0, bestBowlingRuns: 999 },
        [Format.SHIELD]: { matches: 0, wins: 0, losses: 0, ties: 0, noResults: 0, runs: 0, dismissals: 0, ballsFaced: 0, wickets: 0, runsConceded: 0, ballsBowled: 0, highestScore: 0, bestBowlingWkts: 0, bestBowlingRuns: 999 }
    };

    for (const m of captainMatches) {
        const res = m.matchResult;
        const isTeamA = m.teamACaptainId === playerId || (m.teamAName && (gameData.teams.find(t => t.name === m.teamAName)?.captains?.[m.format] === playerId || gameData.teams.find(t => t.name === m.teamAName)?.captainId === playerId));
        const myTeamId = isTeamA ? m.teamAId : m.teamBId;
        const myTeamName = isTeamA ? m.teamAName : m.teamBName;
        const oppTeamName = isTeamA ? m.teamBName : m.teamAName;

        const myInning1 = isTeamA ? res.firstInning : res.secondInning;
        const oppInning1 = isTeamA ? res.secondInning : res.firstInning;
        const myInning2 = isTeamA ? res.thirdInning : res.fourthInning;
        const oppInning2 = isTeamA ? res.fourthInning : res.thirdInning;

        const fKey = m.format;
        if (!formatStatsMap[fKey]) {
            formatStatsMap[fKey] = { matches: 0, wins: 0, losses: 0, ties: 0, noResults: 0, runs: 0, dismissals: 0, ballsFaced: 0, wickets: 0, runsConceded: 0, ballsBowled: 0, highestScore: 0, bestBowlingWkts: 0, bestBowlingRuns: 999 };
        }
        formatStatsMap[fKey].matches += 1;

        // Check winner
        const isWin = res.winnerId === myTeamId;
        const isLoss = res.loserId === myTeamId;
        const isTieOrDraw = !res.winnerId || res.summary?.toLowerCase().includes('drawn') || res.summary?.toLowerCase().includes('tied');

        if (isWin) {
            wins++;
            formatStatsMap[fKey].wins++;
            currentWinStreak++;
            maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
            currentLoseStreak = 0;
        } else if (isLoss) {
            losses++;
            formatStatsMap[fKey].losses++;
            currentLoseStreak++;
            maxLoseStreak = Math.max(maxLoseStreak, currentLoseStreak);
            currentWinStreak = 0;
        } else if (isTieOrDraw) {
            ties++;
            formatStatsMap[fKey].ties++;
            currentWinStreak = 0;
            currentLoseStreak = 0;
        } else {
            noResults++;
            formatStatsMap[fKey].noResults++;
        }

        // Team scores
        const innings = [myInning1, myInning2].filter(Boolean) as Inning[];
        for (const inn of innings) {
            if (inn.score > highestTeamScore.score) {
                highestTeamScore = { score: inn.score, wickets: inn.wickets, overs: inn.overs, vsTeamName: oppTeamName };
            }
            if (inn.score > 0 && inn.score < lowestTeamScore.score) {
                lowestTeamScore = { score: inn.score, wickets: inn.wickets, overs: inn.overs, vsTeamName: oppTeamName };
            }

            // Player batting stats while captain
            const bat = inn.batting.find(b => b.playerId === playerId);
            if (bat) {
                formatStatsMap[fKey].runs += bat.runs;
                formatStatsMap[fKey].ballsFaced += bat.balls;
                if (bat.isOut) formatStatsMap[fKey].dismissals += 1;
                if (bat.runs > formatStatsMap[fKey].highestScore) formatStatsMap[fKey].highestScore = bat.runs;
            }

            // Bowling stats
            const bowl = inn.bowling.find(b => b.playerId === playerId);
            if (bowl) {
                formatStatsMap[fKey].wickets += bowl.wickets;
                formatStatsMap[fKey].runsConceded += bowl.runsConceded;
                formatStatsMap[fKey].ballsBowled += bowl.ballsBowled;
                if (bowl.wickets > formatStatsMap[fKey].bestBowlingWkts || 
                   (bowl.wickets === formatStatsMap[fKey].bestBowlingWkts && bowl.runsConceded < formatStatsMap[fKey].bestBowlingRuns)) {
                    formatStatsMap[fKey].bestBowlingWkts = bowl.wickets;
                    formatStatsMap[fKey].bestBowlingRuns = bowl.runsConceded;
                }
            }
        }

        // Check chase
        if (isWin && !isTeamA && myInning1 && oppInning1) {
            if (oppInning1.score > highestSuccessfulChase.target) {
                highestSuccessfulChase = {
                    target: oppInning1.score + 1,
                    score: myInning1.score,
                    wickets: myInning1.wickets,
                    vsTeamName: oppTeamName
                };
            }
        }

        // Win/Defeat margins
        if (isWin && (biggestWin.marginText === 'None' || res.summary)) {
            biggestWin = { marginText: res.summary, vsTeamName: oppTeamName, format: m.format };
        }
        if (isLoss && (biggestDefeat.marginText === 'None' || res.summary)) {
            biggestDefeat = { marginText: res.summary, vsTeamName: oppTeamName, format: m.format };
        }
    }

    if (lowestTeamScore.score === 9999) {
        lowestTeamScore = { score: 0, wickets: 0, overs: '0.0', vsTeamName: 'None' };
    }

    const totalMatches = captainMatches.length;
    const winPct = totalMatches > 0 ? Number(((wins / totalMatches) * 100).toFixed(1)) : 0;
    const lossPct = totalMatches > 0 ? Number(((losses / totalMatches) * 100).toFixed(1)) : 0;

    const byFormat: Record<string, CaptaincyFormatStats> = {};
    for (const [fName, st] of Object.entries(formatStatsMap)) {
        const fWinPct = st.matches > 0 ? Number(((st.wins / st.matches) * 100).toFixed(1)) : 0;
        const fLossPct = st.matches > 0 ? Number(((st.losses / st.matches) * 100).toFixed(1)) : 0;
        const avg = st.dismissals > 0 ? Number((st.runs / st.dismissals).toFixed(2)) : st.runs;
        const sr = st.ballsFaced > 0 ? Number(((st.runs / st.ballsFaced) * 100).toFixed(2)) : 0;
        const bowlAvg = st.wickets > 0 ? Number((st.runsConceded / st.wickets).toFixed(2)) : 0;
        const econ = st.ballsBowled > 0 ? Number(((st.runsConceded / st.ballsBowled) * 6).toFixed(2)) : 0;
        const bestBowl = st.bestBowlingWkts > 0 ? `${st.bestBowlingWkts}/${st.bestBowlingRuns}` : '-';

        byFormat[fName] = {
            formatName: fName,
            matches: st.matches,
            wins: st.wins,
            losses: st.losses,
            ties: st.ties,
            noResults: st.noResults,
            winPct: fWinPct,
            lossPct: fLossPct,
            runs: st.runs,
            battingAverage: avg,
            strikeRate: sr,
            wickets: st.wickets,
            bowlingAverage: bowlAvg,
            economy: econ,
            highestScore: st.highestScore,
            bestBowling: bestBowl
        };
    }

    return {
        totalMatches,
        wins,
        losses,
        ties,
        noResults,
        winPct,
        lossPct,
        winningStreak: maxWinStreak,
        losingStreak: maxLoseStreak,
        highestTeamScore,
        lowestTeamScore,
        highestSuccessfulChase,
        biggestWin,
        biggestDefeat,
        byFormat
    };
};

/**
 * Calculates Player vs Teams detailed records (Only teams faced)
 */
export const calculatePlayerVsTeamRecords = (
    playerId: string, 
    gameData: GameData, 
    filter?: Partial<UniversalFilterState>
): PlayerVsTeamDetailed[] => {
    const allMatches = getAllEnrichedMatches(gameData, filter);
    const existingTeams = gameData.teams || [];

    const statsByTeam: Record<string, {
        teamId: string;
        teamName: string;
        batMatches: Set<string>;
        bowlMatches: Set<string>;
        allMatches: Set<string>;
        innings: number;
        runs: number;
        dismissals: number;
        ballsFaced: number;
        highestScore: number;
        lowestScore: number;
        fifties: number;
        hundreds: number;
        fours: number;
        sixes: number;
        notOuts: number;
        ballsBowled: number;
        runsConceded: number;
        wickets: number;
        bestBowlingWkts: number;
        bestBowlingRuns: number;
        threeWickets: number;
        fiveWickets: number;
        captainMatches: number;
        captainWins: number;
        captainLosses: number;
    }> = {};

    for (const team of existingTeams) {
        statsByTeam[team.id] = {
            teamId: team.id,
            teamName: team.name,
            batMatches: new Set(),
            bowlMatches: new Set(),
            allMatches: new Set(),
            innings: 0,
            runs: 0,
            dismissals: 0,
            ballsFaced: 0,
            highestScore: 0,
            lowestScore: 9999,
            fifties: 0,
            hundreds: 0,
            fours: 0,
            sixes: 0,
            notOuts: 0,
            ballsBowled: 0,
            runsConceded: 0,
            wickets: 0,
            bestBowlingWkts: 0,
            bestBowlingRuns: 999,
            threeWickets: 0,
            fiveWickets: 0,
            captainMatches: 0,
            captainWins: 0,
            captainLosses: 0
        };
    }

    for (const m of allMatches) {
        const res = m.matchResult;
        const matchId = String(res.matchNumber || Math.random());
        const innings = [res.firstInning, res.secondInning, res.thirdInning, res.fourthInning].filter(Boolean) as Inning[];

        for (const inn of innings) {
            const isPlayerBatting = inn.batting.some(b => b.playerId === playerId);
            const isPlayerBowling = inn.bowling.some(b => b.playerId === playerId);

            if (isPlayerBatting) {
                // The opponent is the bowling team (or opposite inning team)
                const oppTeamId = (inn.teamId === m.teamAId ? m.teamBId : m.teamAId) || '';
                const targetStat = statsByTeam[oppTeamId];
                if (targetStat) {
                    targetStat.allMatches.add(matchId);
                    targetStat.batMatches.add(matchId);
                    const bat = inn.batting.find(b => b.playerId === playerId);
                    if (bat) {
                        targetStat.innings++;
                        targetStat.runs += bat.runs;
                        targetStat.ballsFaced += bat.balls;
                        targetStat.fours += bat.fours || 0;
                        targetStat.sixes += bat.sixes || 0;
                        if (bat.isOut) {
                            targetStat.dismissals++;
                        } else {
                            targetStat.notOuts++;
                        }
                        if (bat.runs > targetStat.highestScore) targetStat.highestScore = bat.runs;
                        if (bat.runs < targetStat.lowestScore) targetStat.lowestScore = bat.runs;
                        if (bat.runs >= 100) targetStat.hundreds++;
                        else if (bat.runs >= 50) targetStat.fifties++;
                    }
                }
            }

            if (isPlayerBowling) {
                // Opponent is batting team in this inning
                const oppTeamId = inn.teamId;
                const targetStat = statsByTeam[oppTeamId];
                if (targetStat) {
                    targetStat.allMatches.add(matchId);
                    targetStat.bowlMatches.add(matchId);
                    const bowl = inn.bowling.find(b => b.playerId === playerId);
                    if (bowl) {
                        targetStat.ballsBowled += bowl.ballsBowled;
                        targetStat.runsConceded += bowl.runsConceded;
                        targetStat.wickets += bowl.wickets;
                        if (bowl.wickets >= 5) targetStat.fiveWickets++;
                        else if (bowl.wickets >= 3) targetStat.threeWickets++;

                        if (bowl.wickets > targetStat.bestBowlingWkts || 
                           (bowl.wickets === targetStat.bestBowlingWkts && bowl.runsConceded < targetStat.bestBowlingRuns)) {
                            targetStat.bestBowlingWkts = bowl.wickets;
                            targetStat.bestBowlingRuns = bowl.runsConceded;
                        }
                    }
                }
            }
        }

        // Captaincy against this team
        if (m.teamACaptainId === playerId || m.teamBCaptainId === playerId) {
            const isCaptainA = m.teamACaptainId === playerId;
            const oppId = isCaptainA ? m.teamBId : m.teamAId;
            const myTeamId = isCaptainA ? m.teamAId : m.teamBId;
            const targetStat = statsByTeam[oppId];
            if (targetStat) {
                targetStat.captainMatches++;
                if (res.winnerId === myTeamId) targetStat.captainWins++;
                else if (res.loserId === myTeamId) targetStat.captainLosses++;
            }
        }
    }

    // Filter out teams NEVER faced (0 total matches & 0 innings & 0 balls bowled)
    const results: PlayerVsTeamDetailed[] = [];

    for (const team of existingTeams) {
        const st = statsByTeam[team.id];
        const matchCount = Math.max(st.allMatches.size, st.batMatches.size, st.bowlMatches.size, st.captainMatches);

        if (matchCount === 0 && st.runs === 0 && st.wickets === 0) {
            continue; // Skip teams never faced
        }

        const avg = st.dismissals > 0 ? Number((st.runs / st.dismissals).toFixed(2)) : st.runs;
        const sr = st.ballsFaced > 0 ? Number(((st.runs / st.ballsFaced) * 100).toFixed(2)) : 0;
        const overs = `${Math.floor(st.ballsBowled / 6)}.${st.ballsBowled % 6}`;
        const bowlAvg = st.wickets > 0 ? Number((st.runsConceded / st.wickets).toFixed(2)) : 0;
        const econ = st.ballsBowled > 0 ? Number(((st.runsConceded / st.ballsBowled) * 6).toFixed(2)) : 0;
        const bestBowl = st.bestBowlingWkts > 0 ? `${st.bestBowlingWkts}/${st.bestBowlingRuns}` : '-';

        results.push({
            vsTeamId: st.teamId,
            vsTeamName: st.teamName,
            batting: {
                matches: matchCount,
                innings: st.innings,
                runs: st.runs,
                average: avg,
                strikeRate: sr,
                highestScore: st.highestScore,
                lowestScore: st.lowestScore === 9999 ? 0 : st.lowestScore,
                fifties: st.fifties,
                hundreds: st.hundreds,
                fours: st.fours,
                sixes: st.sixes,
                notOuts: st.notOuts
            },
            bowling: {
                matches: matchCount,
                overs,
                ballsBowled: st.ballsBowled,
                runsConceded: st.runsConceded,
                wickets: st.wickets,
                bowlingAverage: bowlAvg,
                economy: econ,
                bestBowling: bestBowl,
                threeWickets: st.threeWickets,
                fiveWickets: st.fiveWickets
            },
            captaincy: {
                matches: st.captainMatches,
                wins: st.captainWins,
                losses: st.captainLosses
            }
        });
    }

    return results;
};

/**
 * Calculates "Teams Played For" history for a player
 */
export const calculatePlayerTeamHistory = (
    playerId: string, 
    gameData: GameData, 
    filter?: Partial<UniversalFilterState>
): PlayerTeamHistoryRecord[] => {
    const allMatches = getAllEnrichedMatches(gameData, filter);
    const player = gameData.allPlayers.find(p => p.id === playerId);
    if (!player) return [];

    // Current team
    const currentTeam = gameData.teams.find(t => t.squad.some(p => p.id === playerId));
    const historyMap: Record<string, {
        teamId: string;
        teamName: string;
        seasons: Set<number>;
        matchIds: Set<string>;
        runs: number;
        dismissals: number;
        ballsFaced: number;
        wickets: number;
        runsConceded: number;
        ballsBowled: number;
        captainMatches: number;
        captainWins: number;
        captainLosses: number;
    }> = {};

    if (currentTeam) {
        historyMap[currentTeam.id] = {
            teamId: currentTeam.id,
            teamName: currentTeam.name,
            seasons: new Set([gameData.currentSeason || 1]),
            matchIds: new Set(),
            runs: 0,
            dismissals: 0,
            ballsFaced: 0,
            wickets: 0,
            runsConceded: 0,
            ballsBowled: 0,
            captainMatches: 0,
            captainWins: 0,
            captainLosses: 0
        };
    }

    for (const m of allMatches) {
        const res = m.matchResult;
        const matchId = String(res.matchNumber || Math.random());
        const innings = [res.firstInning, res.secondInning, res.thirdInning, res.fourthInning].filter(Boolean) as Inning[];

        for (const inn of innings) {
            const bat = inn.batting.find(b => b.playerId === playerId);
            if (bat) {
                const teamId = inn.teamId;
                const teamName = inn.teamName || gameData.teams.find(t => t.id === teamId)?.name || 'Team';
                if (!historyMap[teamId]) {
                    historyMap[teamId] = {
                        teamId,
                        teamName,
                        seasons: new Set(),
                        matchIds: new Set(),
                        runs: 0,
                        dismissals: 0,
                        ballsFaced: 0,
                        wickets: 0,
                        runsConceded: 0,
                        ballsBowled: 0,
                        captainMatches: 0,
                        captainWins: 0,
                        captainLosses: 0
                    };
                }
                historyMap[teamId].seasons.add(m.season);
                historyMap[teamId].matchIds.add(matchId);
                historyMap[teamId].runs += bat.runs;
                historyMap[teamId].ballsFaced += bat.balls;
                if (bat.isOut) historyMap[teamId].dismissals++;
            }

            const bowl = inn.bowling.find(b => b.playerId === playerId);
            if (bowl) {
                // Bowling team is the other team
                const bowlingTeamId = (inn.teamId === m.teamAId ? m.teamBId : m.teamAId);
                const bowlingTeamName = (inn.teamId === m.teamAId ? m.teamBName : m.teamAName);
                if (bowlingTeamId) {
                    if (!historyMap[bowlingTeamId]) {
                        historyMap[bowlingTeamId] = {
                            teamId: bowlingTeamId,
                            teamName: bowlingTeamName,
                            seasons: new Set(),
                            matchIds: new Set(),
                            runs: 0,
                            dismissals: 0,
                            ballsFaced: 0,
                            wickets: 0,
                            runsConceded: 0,
                            ballsBowled: 0,
                            captainMatches: 0,
                            captainWins: 0,
                            captainLosses: 0
                        };
                    }
                    historyMap[bowlingTeamId].seasons.add(m.season);
                    historyMap[bowlingTeamId].matchIds.add(matchId);
                    historyMap[bowlingTeamId].wickets += bowl.wickets;
                    historyMap[bowlingTeamId].runsConceded += bowl.runsConceded;
                    historyMap[bowlingTeamId].ballsBowled += bowl.ballsBowled;
                }
            }
        }

        // Captaincy tracking
        if (m.teamACaptainId === playerId || m.teamBCaptainId === playerId) {
            const isCaptainA = m.teamACaptainId === playerId;
            const capTeamId = isCaptainA ? m.teamAId : m.teamBId;
            if (historyMap[capTeamId]) {
                historyMap[capTeamId].captainMatches++;
                if (res.winnerId === capTeamId) historyMap[capTeamId].captainWins++;
                else if (res.loserId === capTeamId) historyMap[capTeamId].captainLosses++;
            }
        }
    }

    return Object.values(historyMap).map(h => {
        const matches = h.matchIds.size || 1;
        const batAvg = h.dismissals > 0 ? Number((h.runs / h.dismissals).toFixed(2)) : h.runs;
        const bowlAvg = h.wickets > 0 ? Number((h.runsConceded / h.wickets).toFixed(2)) : 0;

        return {
            teamId: h.teamId,
            teamName: h.teamName,
            seasons: Array.from(h.seasons).sort((a, b) => a - b),
            matches,
            runs: h.runs,
            wickets: h.wickets,
            battingAverage: batAvg,
            bowlingAverage: bowlAvg,
            captaincyMatches: h.captainMatches,
            captaincyWins: h.captainWins,
            captaincyLosses: h.captainLosses
        };
    });
};

/**
 * Calculates Head-to-Head and Batting Records between two teams
 */
export const calculateTeamHeadToHead = (
    teamAId: string, 
    teamBId: string, 
    gameData: GameData, 
    filter?: Partial<UniversalFilterState>
): HeadToHeadDetailed => {
    const teamA = gameData.teams.find(t => t.id === teamAId) || { id: teamAId, name: 'Team A' };
    const teamB = gameData.teams.find(t => t.id === teamBId) || { id: teamBId, name: 'Team B' };

    const allMatches = getAllEnrichedMatches(gameData, filter);
    const h2hMatches = allMatches.filter(m => {
        const matchesA = m.teamAId === teamAId || m.teamAName.toLowerCase() === teamA.name.toLowerCase();
        const matchesB = m.teamBId === teamBId || m.teamBName.toLowerCase() === teamB.name.toLowerCase();
        const matchesARev = m.teamBId === teamAId || m.teamBName.toLowerCase() === teamA.name.toLowerCase();
        const matchesBRev = m.teamAId === teamBId || m.teamAName.toLowerCase() === teamB.name.toLowerCase();
        return (matchesA && matchesB) || (matchesARev && matchesBRev);
    });

    let winsA = 0;
    let winsB = 0;
    let ties = 0;
    let noResults = 0;

    let curStreakA = 0;
    let maxStreakA = 0;
    let curStreakB = 0;
    let maxStreakB = 0;
    let lastWinner = '';

    const statsA: TeamHeadToHeadBattingStats = {
        teamId: teamA.id,
        teamName: teamA.name,
        highestScore: { score: 0, wickets: 0, overs: '0.0' },
        lowestScore: { score: 9999, wickets: 10, overs: '0.0' },
        highestSuccessfulChase: { target: 0, score: 0, wickets: 0 },
        mostRunsInOneInnings: { score: 0, wickets: 0 },
        biggestTeamTotal: 0
    };

    const statsB: TeamHeadToHeadBattingStats = {
        teamId: teamB.id,
        teamName: teamB.name,
        highestScore: { score: 0, wickets: 0, overs: '0.0' },
        lowestScore: { score: 9999, wickets: 10, overs: '0.0' },
        highestSuccessfulChase: { target: 0, score: 0, wickets: 0 },
        mostRunsInOneInnings: { score: 0, wickets: 0 },
        biggestTeamTotal: 0
    };

    const extremes: TeamVsTeamMatchExtremes = {
        highestScoringMatch: { totalRuns: 0, teamAScore: '', teamBScore: '', summary: '' },
        lowestScoringMatch: { totalRuns: 9999, teamAScore: '', teamBScore: '', summary: '' },
        biggestWinByRuns: { winnerName: 'None', margin: 0, summary: 'None' },
        biggestWinByWickets: { winnerName: 'None', margin: 0, summary: 'None' },
        closestWin: { winnerName: 'None', marginText: 'None', summary: 'None' }
    };

    for (const m of h2hMatches) {
        const res = m.matchResult;
        const isWinA = res.winnerId === teamA.id || res.winnerId === m.teamAId;
        const isWinB = res.winnerId === teamB.id || res.winnerId === m.teamBId;

        if (isWinA) {
            winsA++;
            curStreakA++;
            maxStreakA = Math.max(maxStreakA, curStreakA);
            curStreakB = 0;
            lastWinner = teamA.name;
        } else if (isWinB) {
            winsB++;
            curStreakB++;
            maxStreakB = Math.max(maxStreakB, curStreakB);
            curStreakA = 0;
            lastWinner = teamB.name;
        } else {
            ties++;
            curStreakA = 0;
            curStreakB = 0;
        }

        const inn1 = res.firstInning;
        const inn2 = res.secondInning;
        const totalRuns = (inn1?.score || 0) + (inn2?.score || 0);

        if (totalRuns > extremes.highestScoringMatch.totalRuns) {
            extremes.highestScoringMatch = {
                totalRuns,
                teamAScore: `${inn1?.teamName}: ${inn1?.score}/${inn1?.wickets}`,
                teamBScore: `${inn2?.teamName}: ${inn2?.score}/${inn2?.wickets}`,
                summary: res.summary
            };
        }

        if (totalRuns > 0 && totalRuns < extremes.lowestScoringMatch.totalRuns) {
            extremes.lowestScoringMatch = {
                totalRuns,
                teamAScore: `${inn1?.teamName}: ${inn1?.score}/${inn1?.wickets}`,
                teamBScore: `${inn2?.teamName}: ${inn2?.score}/${inn2?.wickets}`,
                summary: res.summary
            };
        }

        // Innings analysis
        const allInns = [res.firstInning, res.secondInning, res.thirdInning, res.fourthInning].filter(Boolean) as Inning[];
        for (const inn of allInns) {
            const isTeamAInning = inn.teamId === teamA.id || inn.teamName.toLowerCase() === teamA.name.toLowerCase();
            const targetStat = isTeamAInning ? statsA : statsB;

            if (inn.score > targetStat.highestScore.score) {
                targetStat.highestScore = { score: inn.score, wickets: inn.wickets, overs: inn.overs };
                targetStat.biggestTeamTotal = inn.score;
            }
            if (inn.score > 0 && inn.score < targetStat.lowestScore.score) {
                targetStat.lowestScore = { score: inn.score, wickets: inn.wickets, overs: inn.overs };
            }
            if (inn.score > targetStat.mostRunsInOneInnings.score) {
                targetStat.mostRunsInOneInnings = { score: inn.score, wickets: inn.wickets };
            }
        }

        // Check chase
        if (inn1 && inn2) {
            if (isWinA && inn2.teamId === teamA.id && inn1.score > statsA.highestSuccessfulChase.target) {
                statsA.highestSuccessfulChase = { target: inn1.score + 1, score: inn2.score, wickets: inn2.wickets };
            }
            if (isWinB && inn2.teamId === teamB.id && inn1.score > statsB.highestSuccessfulChase.target) {
                statsB.highestSuccessfulChase = { target: inn1.score + 1, score: inn2.score, wickets: inn2.wickets };
            }
        }

        // Win margins
        if (res.summary.includes('runs')) {
            const matchRuns = parseInt(res.summary.replace(/.*?(\d+)\s+runs.*/, '$1'), 10) || 0;
            if (matchRuns > extremes.biggestWinByRuns.margin) {
                extremes.biggestWinByRuns = {
                    winnerName: isWinA ? teamA.name : teamB.name,
                    margin: matchRuns,
                    summary: res.summary
                };
            }
        } else if (res.summary.includes('wickets')) {
            const matchWkts = parseInt(res.summary.replace(/.*?(\d+)\s+wickets.*/, '$1'), 10) || 0;
            if (matchWkts > extremes.biggestWinByWickets.margin) {
                extremes.biggestWinByWickets = {
                    winnerName: isWinA ? teamA.name : teamB.name,
                    margin: matchWkts,
                    summary: res.summary
                };
            }
        }
    }

    if (statsA.lowestScore.score === 9999) statsA.lowestScore = { score: 0, wickets: 0, overs: '0.0' };
    if (statsB.lowestScore.score === 9999) statsB.lowestScore = { score: 0, wickets: 0, overs: '0.0' };
    if (extremes.lowestScoringMatch.totalRuns === 9999) extremes.lowestScoringMatch.totalRuns = 0;

    const totalMatches = h2hMatches.length;
    const winPctA = totalMatches > 0 ? Number(((winsA / totalMatches) * 100).toFixed(1)) : 0;
    const winPctB = totalMatches > 0 ? Number(((winsB / totalMatches) * 100).toFixed(1)) : 0;

    return {
        teamA: { id: teamA.id, name: teamA.name },
        teamB: { id: teamB.id, name: teamB.name },
        totalMatches,
        winsA,
        winsB,
        ties,
        noResults,
        winPctA,
        winPctB,
        currentWinningStreak: {
            teamName: curStreakA > 0 ? teamA.name : curStreakB > 0 ? teamB.name : 'None',
            count: Math.max(curStreakA, curStreakB)
        },
        longestStreakA: maxStreakA,
        longestStreakB: maxStreakB,
        battingRecordsA: statsA,
        battingRecordsB: statsB,
        extremes
    };
};

/**
 * Calculates Best Batters & Best Bowlers against a specific team
 */
export const calculateBestPlayersAgainstTeam = (
    teamId: string, 
    gameData: GameData, 
    filter?: Partial<UniversalFilterState>
): { batters: BestBatterAgainstTeam[]; bowlers: BestBowlerAgainstTeam[] } => {
    const allMatches = getAllEnrichedMatches(gameData, filter);
    const targetTeam = gameData.teams.find(t => t.id === teamId || t.name.toLowerCase() === teamId.toLowerCase());
    const targetTeamId = targetTeam?.id || teamId;
    const targetTeamName = targetTeam?.name || 'Team';

    const batterMap: Record<string, {
        playerId: string;
        playerName: string;
        teamName: string;
        matches: Set<string>;
        innings: number;
        runs: number;
        dismissals: number;
        ballsFaced: number;
        highestScore: number;
        fifties: number;
        hundreds: number;
        fours: number;
        sixes: number;
    }> = {};

    const bowlerMap: Record<string, {
        playerId: string;
        playerName: string;
        teamName: string;
        matches: Set<string>;
        ballsBowled: number;
        runsConceded: number;
        wickets: number;
        bestBowlingWkts: number;
        bestBowlingRuns: number;
        fourWickets: number;
        fiveWickets: number;
    }> = {};

    for (const m of allMatches) {
        const isTeamPlaying = m.teamAId === targetTeamId || m.teamBId === targetTeamId || 
                             m.teamAName.toLowerCase() === targetTeamName.toLowerCase() || 
                             m.teamBName.toLowerCase() === targetTeamName.toLowerCase();
        if (!isTeamPlaying) continue;

        const res = m.matchResult;
        const matchId = String(res.matchNumber || Math.random());
        const innings = [res.firstInning, res.secondInning, res.thirdInning, res.fourthInning].filter(Boolean) as Inning[];

        for (const inn of innings) {
            // Batters playing AGAINST targetTeam
            const isBattingAgainstTarget = inn.teamId !== targetTeamId && inn.teamName.toLowerCase() !== targetTeamName.toLowerCase();
            if (isBattingAgainstTarget) {
                for (const bat of inn.batting) {
                    if (bat.runs === 0 && bat.balls === 0 && !bat.isOut) continue;
                    if (!batterMap[bat.playerId]) {
                        const pObj = gameData.allPlayers.find(p => p.id === bat.playerId);
                        const pTeam = gameData.teams.find(t => t.squad.some(sp => sp.id === bat.playerId));
                        batterMap[bat.playerId] = {
                            playerId: bat.playerId,
                            playerName: bat.playerName || pObj?.name || 'Player',
                            teamName: pTeam?.name || 'Free Agent',
                            matches: new Set(),
                            innings: 0,
                            runs: 0,
                            dismissals: 0,
                            ballsFaced: 0,
                            highestScore: 0,
                            fifties: 0,
                            hundreds: 0,
                            fours: 0,
                            sixes: 0
                        };
                    }
                    batterMap[bat.playerId].matches.add(matchId);
                    batterMap[bat.playerId].innings++;
                    batterMap[bat.playerId].runs += bat.runs;
                    batterMap[bat.playerId].ballsFaced += bat.balls;
                    batterMap[bat.playerId].fours += bat.fours || 0;
                    batterMap[bat.playerId].sixes += bat.sixes || 0;
                    if (bat.isOut) batterMap[bat.playerId].dismissals++;
                    if (bat.runs > batterMap[bat.playerId].highestScore) batterMap[bat.playerId].highestScore = bat.runs;
                    if (bat.runs >= 100) batterMap[bat.playerId].hundreds++;
                    else if (bat.runs >= 50) batterMap[bat.playerId].fifties++;
                }
            }

            // Bowlers bowling AGAINST targetTeam (i.e. bowling when target team is batting)
            const isBowlingAgainstTarget = inn.teamId === targetTeamId || inn.teamName.toLowerCase() === targetTeamName.toLowerCase();
            if (isBowlingAgainstTarget) {
                for (const bowl of inn.bowling) {
                    if (bowl.ballsBowled === 0) continue;
                    if (!bowlerMap[bowl.playerId]) {
                        const pObj = gameData.allPlayers.find(p => p.id === bowl.playerId);
                        const pTeam = gameData.teams.find(t => t.squad.some(sp => sp.id === bowl.playerId));
                        bowlerMap[bowl.playerId] = {
                            playerId: bowl.playerId,
                            playerName: bowl.playerName || pObj?.name || 'Player',
                            teamName: pTeam?.name || 'Free Agent',
                            matches: new Set(),
                            ballsBowled: 0,
                            runsConceded: 0,
                            wickets: 0,
                            bestBowlingWkts: 0,
                            bestBowlingRuns: 999,
                            fourWickets: 0,
                            fiveWickets: 0
                        };
                    }
                    bowlerMap[bowl.playerId].matches.add(matchId);
                    bowlerMap[bowl.playerId].ballsBowled += bowl.ballsBowled;
                    bowlerMap[bowl.playerId].runsConceded += bowl.runsConceded;
                    bowlerMap[bowl.playerId].wickets += bowl.wickets;
                    if (bowl.wickets >= 5) bowlerMap[bowl.playerId].fiveWickets++;
                    else if (bowl.wickets === 4) bowlerMap[bowl.playerId].fourWickets++;

                    if (bowl.wickets > bowlerMap[bowl.playerId].bestBowlingWkts || 
                       (bowl.wickets === bowlerMap[bowl.playerId].bestBowlingWkts && bowl.runsConceded < bowlerMap[bowl.playerId].bestBowlingRuns)) {
                        bowlerMap[bowl.playerId].bestBowlingWkts = bowl.wickets;
                        bowlerMap[bowl.playerId].bestBowlingRuns = bowl.runsConceded;
                    }
                }
            }
        }
    }

    const batters: BestBatterAgainstTeam[] = Object.values(batterMap)
        .map(b => {
            const avg = b.dismissals > 0 ? Number((b.runs / b.dismissals).toFixed(2)) : b.runs;
            const sr = b.ballsFaced > 0 ? Number(((b.runs / b.ballsFaced) * 100).toFixed(2)) : 0;
            return {
                playerId: b.playerId,
                playerName: b.playerName,
                teamName: b.teamName,
                matches: b.matches.size,
                innings: b.innings,
                runs: b.runs,
                average: avg,
                strikeRate: sr,
                highestScore: b.highestScore,
                fifties: b.fifties,
                hundreds: b.hundreds,
                fours: b.fours,
                sixes: b.sixes
            };
        })
        .sort((a, b) => b.runs - a.runs);

    const bowlers: BestBowlerAgainstTeam[] = Object.values(bowlerMap)
        .map(b => {
            const overs = `${Math.floor(b.ballsBowled / 6)}.${b.ballsBowled % 6}`;
            const bowlAvg = b.wickets > 0 ? Number((b.runsConceded / b.wickets).toFixed(2)) : 0;
            const econ = b.ballsBowled > 0 ? Number(((b.runsConceded / b.ballsBowled) * 6).toFixed(2)) : 0;
            const bestBowl = b.bestBowlingWkts > 0 ? `${b.bestBowlingWkts}/${b.bestBowlingRuns}` : '-';
            return {
                playerId: b.playerId,
                playerName: b.playerName,
                teamName: b.teamName,
                matches: b.matches.size,
                overs,
                ballsBowled: b.ballsBowled,
                runsConceded: b.runsConceded,
                wickets: b.wickets,
                bowlingAverage: bowlAvg,
                economy: econ,
                bestBowling: bestBowl,
                fourWicketHauls: b.fourWickets,
                fiveWicketHauls: b.fiveWickets
            };
        })
        .sort((a, b) => b.wickets - a.wickets || a.bowlingAverage - b.bowlingAverage);

    return { batters, bowlers };
};

/**
 * Calculates Batter vs Bowler Matchup
 */
export const calculatePlayerVsPlayerMatchup = (
    batterId: string, 
    bowlerId: string, 
    gameData: GameData
): PlayerVsPlayerMatchupRecord | null => {
    const allMatches = getAllEnrichedMatches(gameData);
    let ballsFaced = 0;
    let runs = 0;
    let boundaries = 0;
    let sixes = 0;
    let dotBalls = 0;
    let dismissals = 0;

    const batter = gameData.allPlayers.find(p => p.id === batterId);
    const bowler = gameData.allPlayers.find(p => p.id === bowlerId);

    if (!batter || !bowler) return null;

    for (const m of allMatches) {
        const res = m.matchResult;
        const innings = [res.firstInning, res.secondInning, res.thirdInning, res.fourthInning].filter(Boolean) as Inning[];

        for (const inn of innings) {
            const bat = inn.batting.find(b => b.playerId === batterId);
            const bowl = inn.bowling.find(b => b.playerId === bowlerId);

            if (bat && bowl) {
                // If batter was dismissed by this bowler
                if (bat.dismissal?.bowlerId === bowlerId) {
                    dismissals++;
                }
                // Estimate proportional balls faced based on bowler overs vs innings total overs
                const bowlerBalls = bowl.ballsBowled;
                const totalInningBalls = inn.batting.reduce((sum, b) => sum + b.balls, 0) || 1;
                const fraction = Math.min(1, bowlerBalls / totalInningBalls);
                const estimatedBalls = Math.round(bat.balls * fraction);
                const estimatedRuns = Math.round(bat.runs * fraction);

                ballsFaced += estimatedBalls;
                runs += estimatedRuns;
                boundaries += Math.round((bat.fours || 0) * fraction);
                sixes += Math.round((bat.sixes || 0) * fraction);
                dotBalls += Math.max(0, estimatedBalls - Math.round(estimatedRuns / 1.5));
            }
        }
    }

    if (ballsFaced === 0 && dismissals === 0) return null;

    const strikeRate = ballsFaced > 0 ? Number(((runs / ballsFaced) * 100).toFixed(1)) : 0;

    return {
        batterId,
        batterName: batter.name,
        bowlerId,
        bowlerName: bowler.name,
        ballsFaced,
        runs,
        boundaries,
        sixes,
        dotBalls,
        strikeRate,
        dismissals
    };
};

/**
 * Calculates Team Records for a specific franchise
 */
export const calculateTeamRecords = (
    teamId: string, 
    gameData: GameData, 
    filter?: Partial<UniversalFilterState>
): TeamComprehensiveRecords => {
    const team = gameData.teams.find(t => t.id === teamId || t.name.toLowerCase() === teamId.toLowerCase()) || { id: teamId, name: 'Team' };
    const allMatches = getAllEnrichedMatches(gameData, filter);
    const teamMatches = allMatches.filter(m => 
        m.teamAId === team.id || m.teamBId === team.id || 
        m.teamAName.toLowerCase() === team.name.toLowerCase() || 
        m.teamBName.toLowerCase() === team.name.toLowerCase()
    );

    let highestScore = { score: 0, wickets: 0, overs: '0.0', vsTeam: 'None' };
    let lowestScore = { score: 9999, wickets: 10, overs: '0.0', vsTeam: 'None' };
    let highestSuccessfulChase = { target: 0, score: 0, wickets: 0, vsTeam: 'None' };
    let mostRunsInASeason = { runs: 0, season: 1 };
    let mostTeam6s = 0;
    let mostTeam4s = 0;
    let highestIndividualScore = { runs: 0, playerName: 'None', vsTeam: 'None' };
    let highestPartnership = { runs: 0, player1: 'None', player2: 'None', vsTeam: 'None' };

    let bestBowlingInnings = { figures: '0/0', playerName: 'None', vsTeam: 'None' };
    let mostWicketsInMatch = { wickets: 0, playerName: 'None', vsTeam: 'None' };
    let mostWicketsInASeason = { wickets: 0, season: 1 };
    let bestEconomy = { economy: 99, playerName: 'None', overs: '0.0', vsTeam: 'None' };
    let most5WicketHauls = { count: 0, playerName: 'None' };

    let biggestWinByRuns = { margin: 0, vsTeam: 'None', summary: 'None' };
    let biggestWinByWickets = { margin: 0, vsTeam: 'None', summary: 'None' };
    let biggestDefeat = { marginText: 'None', vsTeam: 'None', summary: 'None' };
    let closestVictory = { marginText: 'None', vsTeam: 'None', summary: 'None' };
    let longestWinningStreak = 0;
    let longestLosingStreak = 0;

    let curWinStreak = 0;
    let curLoseStreak = 0;

    const seasonRunsMap: Record<number, number> = {};
    const seasonWktsMap: Record<number, number> = {};
    const player5WktMap: Record<string, { count: number; name: string }> = {};

    for (const m of teamMatches) {
        const res = m.matchResult;
        const isTeamA = m.teamAId === team.id || m.teamAName.toLowerCase() === team.name.toLowerCase();
        const oppName = isTeamA ? m.teamBName : m.teamAName;
        const isWin = res.winnerId === team.id || (isTeamA && res.winnerId === m.teamAId) || (!isTeamA && res.winnerId === m.teamBId);
        const isLoss = res.loserId === team.id || (isTeamA && res.loserId === m.teamAId) || (!isTeamA && res.loserId === m.teamBId);

        if (isWin) {
            curWinStreak++;
            longestWinningStreak = Math.max(longestWinningStreak, curWinStreak);
            curLoseStreak = 0;
        } else if (isLoss) {
            curLoseStreak++;
            longestLosingStreak = Math.max(longestLosingStreak, curLoseStreak);
            curWinStreak = 0;
        }

        const myInning1 = isTeamA ? res.firstInning : res.secondInning;
        const oppInning1 = isTeamA ? res.secondInning : res.firstInning;
        const myInning2 = isTeamA ? res.thirdInning : res.fourthInning;

        const myInnings = [myInning1, myInning2].filter(Boolean) as Inning[];

        for (const inn of myInnings) {
            if (inn.score > highestScore.score) {
                highestScore = { score: inn.score, wickets: inn.wickets, overs: inn.overs, vsTeam: oppName };
            }
            if (inn.score > 0 && inn.score < lowestScore.score) {
                lowestScore = { score: inn.score, wickets: inn.wickets, overs: inn.overs, vsTeam: oppName };
            }

            seasonRunsMap[m.season] = (seasonRunsMap[m.season] || 0) + inn.score;

            for (const bat of inn.batting) {
                mostTeam4s += bat.fours || 0;
                mostTeam6s += bat.sixes || 0;
                if (bat.runs > highestIndividualScore.runs) {
                    highestIndividualScore = { runs: bat.runs, playerName: bat.playerName, vsTeam: oppName };
                }
            }

            // Estimate highest partnership from top two batters
            const sortedBatters = [...inn.batting].sort((a, b) => b.runs - a.runs);
            if (sortedBatters.length >= 2) {
                const pRuns = Math.round(sortedBatters[0].runs * 0.7 + sortedBatters[1].runs * 0.7);
                if (pRuns > highestPartnership.runs) {
                    highestPartnership = {
                        runs: pRuns,
                        player1: sortedBatters[0].playerName,
                        player2: sortedBatters[1].playerName,
                        vsTeam: oppName
                    };
                }
            }
        }

        // Bowling records for team
        const oppInnings = [oppInning1, isTeamA ? res.fourthInning : res.thirdInning].filter(Boolean) as Inning[];
        for (const oppInn of oppInnings) {
            seasonWktsMap[m.season] = (seasonWktsMap[m.season] || 0) + oppInn.wickets;

            for (const bowl of oppInn.bowling) {
                if (bowl.ballsBowled >= 12) {
                    const econ = Number(((bowl.runsConceded / bowl.ballsBowled) * 6).toFixed(2));
                    if (econ < bestEconomy.economy) {
                        bestEconomy = { economy: econ, playerName: bowl.playerName, overs: bowl.overs, vsTeam: oppName };
                    }
                }
                if (bowl.wickets > mostWicketsInMatch.wickets) {
                    mostWicketsInMatch = { wickets: bowl.wickets, playerName: bowl.playerName, vsTeam: oppName };
                    bestBowlingInnings = { figures: `${bowl.wickets}/${bowl.runsConceded}`, playerName: bowl.playerName, vsTeam: oppName };
                }
                if (bowl.wickets >= 5) {
                    if (!player5WktMap[bowl.playerId]) player5WktMap[bowl.playerId] = { count: 0, name: bowl.playerName };
                    player5WktMap[bowl.playerId].count++;
                }
            }
        }

        // Successful chase
        if (isWin && !isTeamA && myInning1 && oppInning1) {
            if (oppInning1.score > highestSuccessfulChase.target) {
                highestSuccessfulChase = { target: oppInning1.score + 1, score: myInning1.score, wickets: myInning1.wickets, vsTeam: oppName };
            }
        }

        // Win and Defeat extremes
        if (isWin) {
            if (res.summary.includes('runs')) {
                const runs = parseInt(res.summary.replace(/.*?(\d+)\s+runs.*/, '$1'), 10) || 0;
                if (runs > biggestWinByRuns.margin) biggestWinByRuns = { margin: runs, vsTeam: oppName, summary: res.summary };
            } else if (res.summary.includes('wickets')) {
                const wkts = parseInt(res.summary.replace(/.*?(\d+)\s+wickets.*/, '$1'), 10) || 0;
                if (wkts > biggestWinByWickets.margin) biggestWinByWickets = { margin: wkts, vsTeam: oppName, summary: res.summary };
            }
            if (closestVictory.marginText === 'None' || res.summary.includes('1 run') || res.summary.includes('1 wicket') || res.summary.includes('Super Over')) {
                closestVictory = { marginText: res.summary, vsTeam: oppName, summary: res.summary };
            }
        } else if (isLoss) {
            if (biggestDefeat.marginText === 'None' || res.summary.includes('runs') || res.summary.includes('wickets')) {
                biggestDefeat = { marginText: res.summary, vsTeam: oppName, summary: res.summary };
            }
        }
    }

    if (lowestScore.score === 9999) lowestScore = { score: 0, wickets: 0, overs: '0.0', vsTeam: 'None' };
    if (bestEconomy.economy === 99) bestEconomy = { economy: 0, playerName: 'None', overs: '0.0', vsTeam: 'None' };

    for (const [s, r] of Object.entries(seasonRunsMap)) {
        if (r > mostRunsInASeason.runs) mostRunsInASeason = { runs: r, season: Number(s) };
    }
    for (const [s, w] of Object.entries(seasonWktsMap)) {
        if (w > mostWicketsInASeason.wickets) mostWicketsInASeason = { wickets: w, season: Number(s) };
    }
    for (const p of Object.values(player5WktMap)) {
        if (p.count > most5WicketHauls.count) most5WicketHauls = { count: p.count, playerName: p.name };
    }

    return {
        teamId: team.id,
        teamName: team.name,
        batting: {
            highestScore,
            lowestScore,
            highestSuccessfulChase,
            mostRunsInASeason,
            mostTeam6s,
            mostTeam4s,
            highestPartnership,
            highestIndividualScore
        },
        bowling: {
            bestBowlingInnings,
            mostWicketsInMatch,
            mostWicketsInASeason,
            bestEconomy,
            most5WicketHauls
        },
        match: {
            biggestWinByRuns,
            biggestWinByWickets,
            biggestDefeat,
            closestVictory,
            longestWinningStreak,
            longestLosingStreak
        }
    };
};

/**
 * Calculates Career Mode All-Time Records across all players and teams
 */
export const calculateAllTimeRecords = (
    gameData: GameData, 
    filter?: Partial<UniversalFilterState>
): AllTimeCareerRecords => {
    const allMatches = getAllEnrichedMatches(gameData, filter);
    const existingPlayers = gameData.allPlayers || [];
    const existingTeams = gameData.teams || [];

    // Aggregations
    const playerCareerRuns: Record<string, { name: string; team: string; runs: number; seasonRuns: Record<number, number>; highestScore: number; hsVsTeam: string; centuries: number; fifties: number; sixes: number; fours: number }> = {};
    const playerCareerBowling: Record<string, { name: string; team: string; wickets: number; seasonWkts: Record<number, number>; bestWkts: number; bestRuns: number; bestVsTeam: string; fiveWickets: number }> = {};
    const captainRecords: Record<string, { name: string; team: string; matches: number; wins: number; trophies: number }> = {};
    const teamStats: Record<string, { name: string; wins: number; titles: number; longestStreak: number; seasonPoints: Record<number, { points: number; played: number; won: number }> }> = {};

    for (const t of existingTeams) {
        teamStats[t.id] = { name: t.name, wins: 0, titles: 0, longestStreak: 0, seasonPoints: {} };
    }

    for (const p of existingPlayers) {
        const pTeam = existingTeams.find(t => t.squad.some(sp => sp.id === p.id))?.name || 'Free Agent';
        playerCareerRuns[p.id] = { name: p.name, team: pTeam, runs: 0, seasonRuns: {}, highestScore: 0, hsVsTeam: 'None', centuries: 0, fifties: 0, sixes: 0, fours: 0 };
        playerCareerBowling[p.id] = { name: p.name, team: pTeam, wickets: 0, seasonWkts: {}, bestWkts: 0, bestRuns: 999, bestVsTeam: 'None', fiveWickets: 0 };
        captainRecords[p.id] = { name: p.name, team: pTeam, matches: 0, wins: 0, trophies: 0 };
    }

    // Process awards history for titles and trophies
    if (gameData.awardsHistory && Array.isArray(gameData.awardsHistory)) {
        for (const award of gameData.awardsHistory) {
            if (teamStats[award.winnerTeamId]) {
                teamStats[award.winnerTeamId].titles++;
            }
            // Check winning captain
            const team = existingTeams.find(t => t.id === award.winnerTeamId);
            const capId = (award.format && team?.captains?.[award.format]) || team?.captainId;
            if (capId && captainRecords[capId]) {
                captainRecords[capId].trophies++;
            }
        }
    }

    // Process matches
    for (const m of allMatches) {
        const res = m.matchResult;
        if (res.winnerId && teamStats[res.winnerId]) {
            teamStats[res.winnerId].wins++;
        }

        // Captains
        if (m.teamACaptainId && captainRecords[m.teamACaptainId]) {
            captainRecords[m.teamACaptainId].matches++;
            if (res.winnerId === m.teamAId) captainRecords[m.teamACaptainId].wins++;
        }
        if (m.teamBCaptainId && captainRecords[m.teamBCaptainId]) {
            captainRecords[m.teamBCaptainId].matches++;
            if (res.winnerId === m.teamBId) captainRecords[m.teamBCaptainId].wins++;
        }

        const innings = [res.firstInning, res.secondInning, res.thirdInning, res.fourthInning].filter(Boolean) as Inning[];
        for (const inn of innings) {
            const oppTeamName = inn.teamId === m.teamAId ? m.teamBName : m.teamAName;

            for (const bat of inn.batting) {
                if (!playerCareerRuns[bat.playerId]) {
                    playerCareerRuns[bat.playerId] = { name: bat.playerName, team: 'Free Agent', runs: 0, seasonRuns: {}, highestScore: 0, hsVsTeam: 'None', centuries: 0, fifties: 0, sixes: 0, fours: 0 };
                }
                const b = playerCareerRuns[bat.playerId];
                b.runs += bat.runs;
                b.seasonRuns[m.season] = (b.seasonRuns[m.season] || 0) + bat.runs;
                b.fours += bat.fours || 0;
                b.sixes += bat.sixes || 0;
                if (bat.runs > b.highestScore) {
                    b.highestScore = bat.runs;
                    b.hsVsTeam = oppTeamName;
                }
                if (bat.runs >= 100) b.centuries++;
                else if (bat.runs >= 50) b.fifties++;
            }

            for (const bowl of inn.bowling) {
                if (!playerCareerBowling[bowl.playerId]) {
                    playerCareerBowling[bowl.playerId] = { name: bowl.playerName, team: 'Free Agent', wickets: 0, seasonWkts: {}, bestWkts: 0, bestRuns: 999, bestVsTeam: 'None', fiveWickets: 0 };
                }
                const w = playerCareerBowling[bowl.playerId];
                w.wickets += bowl.wickets;
                w.seasonWkts[m.season] = (w.seasonWkts[m.season] || 0) + bowl.wickets;
                if (bowl.wickets >= 5) w.fiveWickets++;

                if (bowl.wickets > w.bestWkts || (bowl.wickets === w.bestWkts && bowl.runsConceded < w.bestRuns)) {
                    w.bestWkts = bowl.wickets;
                    w.bestRuns = bowl.runsConceded;
                    w.bestVsTeam = oppTeamName;
                }
            }
        }
    }

    // Sort batting records
    const mostCareerRuns = Object.entries(playerCareerRuns)
        .map(([id, p]) => ({ playerId: id, playerName: p.name, teamName: p.team, runs: p.runs }))
        .sort((a, b) => b.runs - a.runs)
        .slice(0, 10);

    const seasonRunsList: { playerId: string; playerName: string; teamName: string; season: number; runs: number }[] = [];
    for (const [id, p] of Object.entries(playerCareerRuns)) {
        for (const [s, runs] of Object.entries(p.seasonRuns)) {
            seasonRunsList.push({ playerId: id, playerName: p.name, teamName: p.team, season: Number(s), runs });
        }
    }
    const mostRunsInASeason = seasonRunsList.sort((a, b) => b.runs - a.runs).slice(0, 10);

    const highestScore = Object.entries(playerCareerRuns)
        .filter(([, p]) => p.highestScore > 0)
        .map(([id, p]) => ({ playerId: id, playerName: p.name, teamName: p.team, score: p.highestScore, vsTeam: p.hsVsTeam }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

    const mostCenturies = Object.entries(playerCareerRuns)
        .filter(([, p]) => p.centuries > 0)
        .map(([id, p]) => ({ playerId: id, playerName: p.name, teamName: p.team, count: p.centuries }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    const mostFifties = Object.entries(playerCareerRuns)
        .filter(([, p]) => p.fifties > 0)
        .map(([id, p]) => ({ playerId: id, playerName: p.name, teamName: p.team, count: p.fifties }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    const mostSixes = Object.entries(playerCareerRuns)
        .filter(([, p]) => p.sixes > 0)
        .map(([id, p]) => ({ playerId: id, playerName: p.name, teamName: p.team, count: p.sixes }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    const mostFours = Object.entries(playerCareerRuns)
        .filter(([, p]) => p.fours > 0)
        .map(([id, p]) => ({ playerId: id, playerName: p.name, teamName: p.team, count: p.fours }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    // Sort bowling records
    const mostCareerWickets = Object.entries(playerCareerBowling)
        .map(([id, p]) => ({ playerId: id, playerName: p.name, teamName: p.team, wickets: p.wickets }))
        .sort((a, b) => b.wickets - a.wickets)
        .slice(0, 10);

    const seasonWktsList: { playerId: string; playerName: string; teamName: string; season: number; wickets: number }[] = [];
    for (const [id, p] of Object.entries(playerCareerBowling)) {
        for (const [s, wickets] of Object.entries(p.seasonWkts)) {
            seasonWktsList.push({ playerId: id, playerName: p.name, teamName: p.team, season: Number(s), wickets });
        }
    }
    const mostWicketsInASeason = seasonWktsList.sort((a, b) => b.wickets - a.wickets).slice(0, 10);

    const bestBowlingFigures = Object.entries(playerCareerBowling)
        .filter(([, p]) => p.bestWkts > 0)
        .map(([id, p]) => ({ playerId: id, playerName: p.name, teamName: p.team, figures: `${p.bestWkts}/${p.bestRuns}`, vsTeam: p.bestVsTeam }))
        .sort((a, b) => {
            const wA = parseInt(a.figures.split('/')[0], 10);
            const wB = parseInt(b.figures.split('/')[0], 10);
            if (wB !== wA) return wB - wA;
            const rA = parseInt(a.figures.split('/')[1], 10);
            const rB = parseInt(b.figures.split('/')[1], 10);
            return rA - rB;
        })
        .slice(0, 10);

    const most5WicketHauls = Object.entries(playerCareerBowling)
        .filter(([, p]) => p.fiveWickets > 0)
        .map(([id, p]) => ({ playerId: id, playerName: p.name, teamName: p.team, count: p.fiveWickets }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    // Captaincy records
    const mostMatchesAsCaptain = Object.entries(captainRecords)
        .filter(([, c]) => c.matches > 0)
        .map(([id, c]) => ({ playerId: id, playerName: c.name, teamName: c.team, matches: c.matches }))
        .sort((a, b) => b.matches - a.matches)
        .slice(0, 10);

    const mostWinsAsCaptain = Object.entries(captainRecords)
        .filter(([, c]) => c.wins > 0)
        .map(([id, c]) => ({ playerId: id, playerName: c.name, teamName: c.team, wins: c.wins }))
        .sort((a, b) => b.wins - a.wins)
        .slice(0, 10);

    const bestCaptaincyWinPct = Object.entries(captainRecords)
        .filter(([, c]) => c.matches >= 2)
        .map(([id, c]) => ({ playerId: id, playerName: c.name, teamName: c.team, winPct: Number(((c.wins / c.matches) * 100).toFixed(1)), matches: c.matches }))
        .sort((a, b) => b.winPct - a.winPct || b.matches - a.matches)
        .slice(0, 10);

    const mostTrophiesAsCaptain = Object.entries(captainRecords)
        .filter(([, c]) => c.trophies > 0)
        .map(([id, c]) => ({ playerId: id, playerName: c.name, teamName: c.team, trophies: c.trophies }))
        .sort((a, b) => b.trophies - a.trophies)
        .slice(0, 10);

    // Team records
    const mostWins = Object.entries(teamStats)
        .map(([id, t]) => ({ teamId: id, teamName: t.name, wins: t.wins }))
        .sort((a, b) => b.wins - a.wins);

    const mostTitles = Object.entries(teamStats)
        .map(([id, t]) => ({ teamId: id, teamName: t.name, titles: t.titles }))
        .sort((a, b) => b.titles - a.titles);

    const longestWinningStreak = Object.entries(teamStats)
        .map(([id, t]) => ({ teamId: id, teamName: t.name, streak: t.longestStreak || 0 }))
        .sort((a, b) => b.streak - a.streak);

    const mostSuccessfulSeason = Object.entries(teamStats)
        .map(([id, t]) => ({ teamId: id, teamName: t.name, season: 1, winPct: t.wins > 0 ? 66.7 : 0, points: t.wins * 2 }))
        .sort((a, b) => b.points - a.points);

    return {
        batting: {
            mostCareerRuns,
            mostRunsInASeason,
            highestScore,
            mostCenturies,
            mostFifties,
            mostSixes,
            mostFours
        },
        bowling: {
            mostCareerWickets,
            mostWicketsInASeason,
            bestBowlingFigures,
            most5WicketHauls
        },
        captaincy: {
            mostMatchesAsCaptain,
            mostWinsAsCaptain,
            bestCaptaincyWinPct,
            mostTrophiesAsCaptain
        },
        team: {
            mostWins,
            mostTitles,
            longestWinningStreak,
            mostSuccessfulSeason
        }
    };
};

import { 
    GameData, 
    Team, 
    Player, 
    Format, 
    PlayerRole, 
    SeasonTransitionReport, 
    Award, 
    Standing, 
    NewsArticle,
    SeasonHallOfFame,
    SeasonTeamsOfTournament,
    SkillProgressionSummary
} from '../types';
import { calculatePlayerSeasonEvaluation } from './seasonEvaluation';
import { 
    calculateSeasonAwards, 
    generateSeasonHallOfFame, 
    generateAutoTeamOfTheTournament, 
    calculateDynamicSkillProgression 
} from './awardUtils';
import { analyzeSquadComposition } from './draftAiEngine';
import { getCountryForeignLimit, FOREIGN_COUNTRY_RULES, getPlayerSubRole } from './foreignPlayerSystem';
import { populateStatsForInactivePlayers, autoAssignTeamCaptainsAndViceCaptains, advanceYearlyDomesticStats } from './domesticStatsGenerator';
import { auditAndEnforceAllSquads } from './squadAuditor';
import { generateLeagueSchedule } from '../utils';
import { generateFullYearSchedule, getYearTournamentConfig } from './fourYearCalendar';
import { 
    DRAFT_SQUAD_SIZE, 
    DRAFT_FOREIGN_PLAYERS, 
    DRAFT_NATIONAL_PLAYERS, 
    INITIAL_SPONSORSHIPS,
    MAX_RETAINED_NATIONAL_PLAYERS,
    MAX_RETAINED_FOREIGN_PLAYERS,
    MAX_RETAINED_TOTAL_PLAYERS
} from '../data';

export interface PlayerEvaluationCategory {
    category: 'EXCELLENT' | 'AVERAGE' | 'POOR';
    score: number;
    grade: string;
    action: 'RETAIN' | 'CONSIDER' | 'RELEASE';
    reason: string;
    ratingDelta: number;
    draftValueMultiplier: number;
}

/**
 * Evaluates an individual player for season-end retention, release, and progression.
 */
export const evaluatePlayerForEndSeason = (
    player: Player,
    team: Team,
    seasonNumber: number
): PlayerEvaluationCategory => {
    const evalData = calculatePlayerSeasonEvaluation(player, seasonNumber);
    const score = evalData.totalScore;
    const grade = evalData.grade;
    const age = player.age || 26;
    const potential = player.potential || (age < 24 ? 88 : 75);
    const primarySkill = Math.max(player.battingSkill, player.secondarySkill);

    let category: 'EXCELLENT' | 'AVERAGE' | 'POOR' = 'AVERAGE';
    let action: 'RETAIN' | 'CONSIDER' | 'RELEASE' = 'CONSIDER';
    let reason = '';
    let ratingDelta = 0;
    let draftValueMultiplier = 1.0;

    // 1. Excellent Performers (Score >= 75 or S+/S/A+)
    if (score >= 75 || grade === 'S+' || grade === 'S' || grade === 'A+') {
        category = 'EXCELLENT';
        action = 'RETAIN';
        draftValueMultiplier = 1.35 + ((score - 75) * 0.02); // 1.35x to 1.8x draft value

        // Potential rating progression: Young or developing players get skill boosts
        if (age <= 25 && primarySkill < potential) {
            ratingDelta = Math.min(3, Math.max(1, Math.round((potential - primarySkill) * 0.25) + 1));
            reason = `Outstanding season (${score} pts, Grade ${grade})! Emerging star developed +${ratingDelta} rating boost.`;
        } else if (age <= 29) {
            ratingDelta = 1;
            reason = `Prime elite performer (${score} pts, Grade ${grade})! Retained as franchise cornerstone.`;
        } else {
            ratingDelta = 0;
            reason = `Veteran masterclass (${score} pts, Grade ${grade}) maintaining elite championship form.`;
        }
    } 
    // 2. Average / Reliable Performers (Score 40 - 74 or A/B+/B/C)
    else if (score >= 40 || grade === 'A' || grade === 'B+' || grade === 'B') {
        category = 'AVERAGE';
        draftValueMultiplier = 0.95 + ((score - 40) * 0.01);

        if (age <= 23 && primarySkill < potential) {
            action = 'RETAIN';
            ratingDelta = 1;
            reason = `Promising youngster (${score} pts, Grade ${grade}) continuing steady development (+1 rating).`;
        } else if (age >= 34) {
            action = 'CONSIDER';
            ratingDelta = -1;
            reason = `Aging veteran (${score} pts, Grade ${grade}) facing physical decline (-1 rating).`;
        } else {
            action = 'CONSIDER';
            ratingDelta = 0;
            reason = `Reliable squad contributor (${score} pts, Grade ${grade}). Subject to squad composition.`;
        }
    } 
    // 3. Poor Performers (Score < 40 or D/E/F)
    else {
        category = 'POOR';
        draftValueMultiplier = Math.max(0.6, 0.9 - ((40 - score) * 0.01));

        if (age >= 32) {
            action = 'RELEASE';
            ratingDelta = -2;
            reason = `Sharp physical and technical decline (${score} pts, Grade ${grade}). Released (-2 rating).`;
        } else if (score < 40) {
            action = 'RELEASE';
            reason = `Sub-par campaign (${score} pts, Grade ${grade}). Released to re-enter draft.`;
        } else {
            action = 'RELEASE';
            reason = `Underperformed expectations (${score} pts). Released into draft pool.`;
        }
    }

    return {
        category,
        score,
        grade,
        action,
        reason,
        ratingDelta,
        draftValueMultiplier
    };
};

/**
 * Evaluates all squads for AI teams, retaining top performers and releasing poor/redundant players.
 * Applies the user-requested dynamic 10 Best Gainers & 10 Worst Losers per role.
 */
export const executeEndSeasonSquadEvaluations = (
    gameData: GameData,
    userRetainedIds?: Set<string>
): {
    updatedTeams: Team[];
    updatedAllPlayers: Player[];
    retentionReports: SeasonTransitionReport['retentions'];
    progressionHighlights: SeasonTransitionReport['progressionHighlights'];
    skillProgressionSummary: SkillProgressionSummary;
} => {
    const currentSeason = gameData.currentSeason;
    const retentionReports: SeasonTransitionReport['retentions'] = [];
    const progressionHighlights: SeasonTransitionReport['progressionHighlights'] = [];

    // Calculate dynamic 10 Gaining and 10 Losing per role (Batters, Bowlers, All-Rounders)
    const skillProgressionSummary = calculateDynamicSkillProgression(gameData, currentSeason);

    // Build lookup map for exact skill modifications
    const skillDeltaMap = new Map<string, { batDelta: number; bowlDelta: number; reason: string }>();

    const registerProgression = (
        list: typeof skillProgressionSummary.gainingBatters
    ) => {
        list.forEach(item => {
            skillDeltaMap.set(item.playerId, {
                batDelta: item.battingSkillDelta,
                bowlDelta: item.bowlingSkillDelta,
                reason: item.reason
            });
            progressionHighlights.push({
                playerId: item.playerId,
                playerName: item.playerName,
                teamName: item.teamName,
                ratingChange: item.battingSkillDelta !== 0 ? item.battingSkillDelta : item.bowlingSkillDelta,
                reason: item.reason
            });
        });
    };

    registerProgression(skillProgressionSummary.gainingBatters);
    registerProgression(skillProgressionSummary.losingBatters);
    registerProgression(skillProgressionSummary.gainingBowlers);
    registerProgression(skillProgressionSummary.losingBowlers);
    registerProgression(skillProgressionSummary.gainingAllRounders);
    registerProgression(skillProgressionSummary.losingAllRounders);

    // Map of updated players with ratings/form updates
    const playerUpdateMap = new Map<string, Player>();

    // 0. Ensure all players (including those who didn't play a match) have 5-match auto-generated baseline stats for each format
    const playersWithPopulatedStats = populateStatsForInactivePlayers(gameData.allPlayers);

    // 1. Process all players globally
    playersWithPopulatedStats.forEach(player => {
        const dummyTeam: Team = { id: '', name: '', squad: [], captains: {}, purse: 50 };
        const evalResult = evaluatePlayerForEndSeason(player, dummyTeam, currentSeason);
        const evalStats = calculatePlayerSeasonEvaluation(player, currentSeason);

        let newBattingSkill = player.battingSkill;
        let newSecondarySkill = player.secondarySkill;

        // Apply strict 10-gain / 10-loss progression if player is among the top/bottom 10
        const explicitDelta = skillDeltaMap.get(player.id);
        if (explicitDelta) {
            newBattingSkill = Math.min(99, Math.max(30, player.battingSkill + explicitDelta.batDelta));
            newSecondarySkill = Math.min(99, Math.max(30, player.secondarySkill + explicitDelta.bowlDelta));
        }

        // Update Base Price / Draft Value
        const currentBase = player.basePrice || (Math.max(player.battingSkill, player.secondarySkill) * 0.05);
        const newBasePrice = parseFloat((currentBase * evalResult.draftValueMultiplier).toFixed(2));

        // Form update
        let newForm = Math.min(99, Math.max(50, Math.round(evalResult.score * 0.85 + (player.age < 26 ? 10 : 5))));

        // Injury decrement
        let updatedInjury = player.injury;
        if (updatedInjury && updatedInjury.durationType === 'seasons') {
            const nextVal = updatedInjury.durationValue - 1;
            updatedInjury = nextVal <= 0 ? null : { ...updatedInjury, durationValue: nextVal };
        }

        const history = player.seasonEvaluationsHistory || {};
        history[currentSeason] = evalStats;

        // Incrementally add domestic stats for the year (5-40 T20, 5-35 List A, 2-20 FC)
        const updatedDomesticStats = advanceYearlyDomesticStats(player);

        const updatedPlayer: Player = {
            ...player,
            age: player.age + 1, // Advance age by 1 year
            battingSkill: newBattingSkill,
            secondarySkill: newSecondarySkill,
            basePrice: newBasePrice,
            form: newForm,
            domesticStats: updatedDomesticStats,
            injury: updatedInjury,
            healthStatus: updatedInjury ? 'injured' : 'fit',
            seasonPerformanceScore: evalStats,
            seasonEvaluationsHistory: history,
            previousSeasonPerformance: evalStats.totalScore
        };

        playerUpdateMap.set(player.id, updatedPlayer);
    });

    // 2. Evaluate Team Squads (Retain Core / Release Underperformers)
    const updatedTeams = gameData.teams.map(team => {
        const isUserTeam = team.id === gameData.userTeamId;
        const currentSquad = team.squad.map(p => playerUpdateMap.get(p.id) || p);

        const retained: { playerId: string; playerName: string; score: number; reason: string }[] = [];
        const released: { playerId: string; playerName: string; score: number; reason: string }[] = [];

        let finalSquad: Player[] = [];

        // International Tournament Squad Model:
        // National teams retain their full squad across seasons with skill progressions,
        // dynamic recalibrations, and health recoveries.
        currentSquad.forEach(p => {
            const evalResult = evaluatePlayerForEndSeason(p, team, currentSeason);
            retained.push({ 
                playerId: p.id, 
                playerName: p.name, 
                score: evalResult.score, 
                reason: `${p.nationality} National Squad member (${evalResult.grade})` 
            });
            finalSquad.push(p);
        });

        retentionReports.push({
            teamId: team.id,
            teamName: team.name,
            retained,
            released
        });

        return {
            ...team,
            squad: finalSquad,
            firstAidKits: (team.firstAidKits || 0) + 1
        };
    });

    const rawUpdatedAllPlayers = Array.from(playerUpdateMap.values());

    // Enforce 18-25 squad depth and full role coverage (2 WK, 6-7 BT, 5-6 BL, 3-4 SB, 4-5 AR) across all teams
    const { auditedTeams: finalAuditedTeams, auditedAllPlayers: finalAuditedAllPlayers } = auditAndEnforceAllSquads(
        updatedTeams,
        rawUpdatedAllPlayers
    );

    return {
        updatedTeams: autoAssignTeamCaptainsAndViceCaptains(finalAuditedTeams),
        updatedAllPlayers: finalAuditedAllPlayers,
        retentionReports,
        progressionHighlights,
        skillProgressionSummary
    };
};

/**
 * Organizes players into distinct categorized draft pools for the upcoming draft.
 * Enforces foreign nationality restrictions based on completed seasons.
 */
export const generateDraftPools = (
    allPlayers: Player[],
    teams: Team[],
    seasonNumber: number
): {
    batters: Player[];
    bowlers: Player[];
    allRounders: Player[];
    wicketKeepers: Player[];
    foreignPlayers: Player[];
    nationalPlayers: Player[];
    expiredCountryPlayers: Player[];
    availableDraftPool: Player[];
} => {
    // Find all players already retained by any team
    const retainedIds = new Set<string>();
    teams.forEach(t => t.squad.forEach(p => retainedIds.has(p.id) ? null : retainedIds.add(p.id)));

    // Available uncontracted players
    const freeAgents = allPlayers.filter(p => !retainedIds.has(p.id));

    const expiredCountryPlayers: Player[] = [];
    const eligibleFreeAgents: Player[] = [];

    // Enforce Nationality availability rules
    freeAgents.forEach(p => {
        if (p.isForeign) {
            const limitCheck = getCountryForeignLimit(p.nationality, seasonNumber);
            if (limitCheck.isExpired || limitCheck.limit <= 0) {
                expiredCountryPlayers.push(p);
                return;
            }
        }
        eligibleFreeAgents.push(p);
    });

    const batters = eligibleFreeAgents.filter(p => p.role === PlayerRole.BATSMAN);
    const bowlers = eligibleFreeAgents.filter(p => p.role === PlayerRole.FAST_BOWLER || p.role === PlayerRole.SPIN_BOWLER);
    const allRounders = eligibleFreeAgents.filter(p => p.role === PlayerRole.ALL_ROUNDER);
    const wicketKeepers = eligibleFreeAgents.filter(p => p.role === PlayerRole.WICKET_KEEPER);
    const foreignPlayers = eligibleFreeAgents.filter(p => p.isForeign);
    const nationalPlayers = eligibleFreeAgents.filter(p => !p.isForeign);

    return {
        batters,
        bowlers,
        allRounders,
        wicketKeepers,
        foreignPlayers,
        nationalPlayers,
        expiredCountryPlayers,
        availableDraftPool: eligibleFreeAgents
    };
};

/**
 * Completely executes the Year-to-Year transition into the new season.
 */
export const completeSeasonTransition = (
    gameData: GameData,
    userRetainedIds?: Set<string>,
    userTeamOfSeason?: SeasonTeamsOfTournament['userTeamOfTheSeason']
): {
    updatedGameData: GameData;
    transitionReport: SeasonTransitionReport;
} => {
    const currentSeason = gameData.currentSeason;
    const nextSeason = currentSeason + 1;

    // 1. Calculate Season Awards for the finished season
    const seasonAwards = calculateSeasonAwards(gameData);

    // 2. Generate Hall of Fame (1 Best Batter, 1 Best Bowler, 1 Best All-Rounder, 1 Best Foreign)
    const seasonHallOfFame = generateSeasonHallOfFame(gameData, currentSeason, Format.T20);

    // 3. Generate Auto Team of the Tournament (11 Players, max 4 foreign)
    const autoTeamOfTournament = generateAutoTeamOfTheTournament(gameData, currentSeason, Format.T20);

    const teamsOfTournament: SeasonTeamsOfTournament = {
        season: currentSeason,
        format: Format.T20,
        autoTeamOfTheTournament: autoTeamOfTournament,
        userTeamOfTheSeason: userTeamOfSeason
    };

    // 4. Perform Squad Evaluations, Dynamic 10 Skill Gains & 10 Skill Losses per role, & Retentions
    const { 
        updatedTeams, 
        updatedAllPlayers, 
        retentionReports, 
        progressionHighlights,
        skillProgressionSummary
    } = executeEndSeasonSquadEvaluations(gameData, userRetainedIds);

    // 5. Collect expired countries for next season
    const expiredCountries: string[] = [];
    Object.entries(FOREIGN_COUNTRY_RULES).forEach(([country, rule]) => {
        const check = getCountryForeignLimit(country, nextSeason);
        if (check.isExpired) {
            expiredCountries.push(`${country} (Quota expired after Year ${rule.maxCompletedSeasons})`);
        }
    });

    const transitionReport: SeasonTransitionReport = {
        season: currentSeason,
        completedAt: new Date().toLocaleDateString(),
        awards: seasonAwards,
        hallOfFame: seasonHallOfFame,
        teamsOfTournament,
        skillProgressionSummary,
        worldLeagueWinner: 'N/A',
        championsLeagueWinner: 'N/A',
        retentions: retentionReports,
        progressionHighlights,
        expiredCountries
    };

    const initialStandings = (teams: Team[]): Standing[] => teams.map(team => ({
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

    const fullYearSchedule = generateFullYearSchedule(nextSeason);
    const tournamentConfig = getYearTournamentConfig(nextSeason);

    const seasonNews: NewsArticle = {
        id: `s${nextSeason}-welcome`,
        headline: `International Season ${nextSeason} Tournaments Begin: ${tournamentConfig.name}!`,
        date: new Date().toLocaleDateString(),
        excerpt: `Season ${nextSeason} Major Event: ${tournamentConfig.name} in ${tournamentConfig.hostCountry}. Hall of Fame honors ${seasonHallOfFame.bestBatter.playerName} & ${seasonHallOfFame.bestBowler.playerName}. Top players earn skill upgrades!`,
        content: `Season ${currentSeason} has concluded. Legends inducted into the prestigious Hall of Fame: Batter ${seasonHallOfFame.bestBatter.playerName}, Bowler ${seasonHallOfFame.bestBowler.playerName}, All-Rounder ${seasonHallOfFame.bestAllRounder.playerName}, and International MVP ${seasonHallOfFame.bestForeign.playerName}. International skill progression upgraded top performers and recalibrated rosters. Season ${nextSeason} major tournament spotlight is on the ${tournamentConfig.name} (${tournamentConfig.format}) taking place in ${tournamentConfig.hostCountry}. Bilateral series and tournament fixtures are generated and ready!`,
        type: 'league'
    };

    const updatedGameData: GameData = {
        ...gameData,
        currentSeason: nextSeason,
        currentFormat: Format.T20,
        gameDate: { year: nextSeason, month: 1, day: 1 },
        seriesList: fullYearSchedule.seriesList,
        scheduledEvents: fullYearSchedule.scheduledEvents,
        transfersMadeThisSeason: 0,
        currentMatchIndex: { [Format.T20]: 0, [Format.ODI]: 0, [Format.SHIELD]: 0, [Format.WLT20]: 0 } as Record<Format, number>,
        matchResults: { [Format.T20]: [], [Format.ODI]: [], [Format.SHIELD]: [], [Format.WLT20]: [] } as Record<Format, any[]>,
        standings: {
            [Format.T20]: initialStandings(updatedTeams),
            [Format.ODI]: initialStandings(updatedTeams),
            [Format.SHIELD]: initialStandings(updatedTeams),
            [Format.WLT20]: []
        },
        schedule: {
            [Format.T20]: fullYearSchedule.scheduleByFormat[Format.T20] || generateLeagueSchedule(updatedTeams, Format.T20, true, nextSeason),
            [Format.ODI]: fullYearSchedule.scheduleByFormat[Format.ODI] || generateLeagueSchedule(updatedTeams, Format.ODI, true, nextSeason),
            [Format.SHIELD]: fullYearSchedule.scheduleByFormat[Format.SHIELD] || generateLeagueSchedule(updatedTeams, Format.SHIELD, true, nextSeason),
            [Format.WLT20]: []
        },
        teams: autoAssignTeamCaptainsAndViceCaptains(updatedTeams),
        allPlayers: updatedAllPlayers,
        awardsHistory: [...(gameData.awardsHistory || []), seasonAwards],
        seasonTransitionReports: [...(gameData.seasonTransitionReports || []), transitionReport],
        hallOfFameHistory: [...(gameData.hallOfFameHistory || []), seasonHallOfFame],
        teamOfTheSeasonHistory: {
            ...(gameData.teamOfTheSeasonHistory || {}),
            [currentSeason]: teamsOfTournament
        },
        skillProgressionHistory: {
            ...(gameData.skillProgressionHistory || {}),
            [currentSeason]: skillProgressionSummary
        },
        news: [seasonNews, ...(gameData.news || [])].slice(0, 50),
        worldLeague: undefined, // Reset for new season
        championsLeague: undefined
    };

    return {
        updatedGameData,
        transitionReport
    };
};

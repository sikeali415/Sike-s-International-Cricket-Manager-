import { Player, Format, PlayerRole, PlayerSeasonEvaluation, GameData, MatchResult } from '../types';

/**
 * Computes the Season Performance Evaluation for a player across all formats played in a season.
 * Evaluates Batters, Bowlers, All-rounders, and Fielders with composite ratings and creates a 0-100 Performance Score.
 */
export const calculatePlayerSeasonEvaluation = (
    player: Player,
    seasonNumber: number,
    matchResultsThisSeason?: MatchResult[]
): PlayerSeasonEvaluation => {
    const formats: Format[] = [Format.T20, Format.ODI, Format.SHIELD, Format.WLT20];

    // Aggregate stats across formats for the current season
    let totalMatches = 0;
    let totalRuns = 0;
    let totalBallsFaced = 0;
    let totalDismissals = 0;
    let highestScore = 0;
    let totalFifties = 0;
    let totalHundreds = 0;
    let totalFours = 0;
    let totalSixes = 0;
    let totalPOTMs = 0;

    let totalWickets = 0;
    let totalBallsBowled = 0;
    let totalRunsConceded = 0;
    let total3W = 0;
    let total5W = 0;

    let totalCatches = 0;
    let totalRunOuts = 0;

    // Phase aggregates
    let ppBatRuns = 0, ppBatBalls = 0, ppBatOuts = 0;
    let doBatRuns = 0, doBatBalls = 0, doBatOuts = 0;
    let ppBowlWkts = 0, ppBowlRuns = 0, ppBowlBalls = 0;
    let doBowlWkts = 0, doBowlRuns = 0, doBowlBalls = 0;

    formats.forEach(f => {
        const s = player.stats[f];
        if (!s) return;

        totalMatches += s.matches || 0;
        totalRuns += s.runs || 0;
        totalBallsFaced += s.ballsFaced || 0;
        totalDismissals += s.dismissals || 0;
        if ((s.highestScore || 0) > highestScore) highestScore = s.highestScore;
        totalFifties += s.fifties || 0;
        totalHundreds += s.hundreds || 0;
        totalFours += s.fours || 0;
        totalSixes += s.sixes || 0;
        totalPOTMs += s.manOfTheMatchAwards || 0;

        totalWickets += s.wickets || 0;
        totalBallsBowled += s.ballsBowled || 0;
        totalRunsConceded += s.runsConceded || 0;
        total3W += s.threeWicketHauls || 0;
        total5W += s.fiveWicketHauls || 0;

        totalCatches += s.catches || 0;
        totalRunOuts += s.runOuts || 0;

        if (s.phaseStats) {
            ppBatRuns += s.phaseStats.batting.pp.runs || 0;
            ppBatBalls += s.phaseStats.batting.pp.balls || 0;
            ppBatOuts += s.phaseStats.batting.pp.dismissals || 0;

            doBatRuns += s.phaseStats.batting.do.runs || 0;
            doBatBalls += s.phaseStats.batting.do.balls || 0;
            doBatOuts += s.phaseStats.batting.do.dismissals || 0;

            ppBowlWkts += s.phaseStats.bowling.pp.wickets || 0;
            ppBowlRuns += s.phaseStats.bowling.pp.runsConceded || 0;
            ppBowlBalls += s.phaseStats.bowling.pp.ballsBowled || 0;

            doBowlWkts += s.phaseStats.bowling.do.wickets || 0;
            doBowlRuns += s.phaseStats.bowling.do.runsConceded || 0;
            doBowlBalls += s.phaseStats.bowling.do.ballsBowled || 0;
        }
    });

    // Also integrate player.worldLeagueStats if player participated in World League T20
    if (player.worldLeagueStats && player.worldLeagueStats.matches > 0) {
        const ws = player.worldLeagueStats;
        totalMatches += ws.matches;
        totalRuns += ws.runs;
        totalBallsFaced += ws.ballsFaced;
        totalDismissals += ws.dismissals;
        if (ws.highestScore > highestScore) highestScore = ws.highestScore;
        totalFifties += ws.fifties;
        totalHundreds += ws.hundreds;
        totalFours += ws.fours;
        totalSixes += ws.sixes;
        totalPOTMs += ws.manOfTheMatchAwards;

        totalWickets += ws.wickets;
        totalBallsBowled += ws.ballsBowled;
        totalRunsConceded += ws.runsConceded;
        total3W += ws.threeWicketHauls;
        total5W += ws.fiveWicketHauls;

        totalCatches += ws.catches;
        totalRunOuts += ws.runOuts;
    }

    // Batting Calculations
    const battingAverage = totalDismissals > 0 ? (totalRuns / totalDismissals) : totalRuns;
    const battingSR = totalBallsFaced > 0 ? (totalRuns / totalBallsFaced) * 100 : (player.battingSkill > 60 ? 120 : 90);

    // Consistency rating: Ratio of runs to innings and milestone frequency
    const totalInnings = Math.max(1, totalDismissals > 0 ? totalDismissals : Math.ceil(totalMatches * 0.8));
    const runsPerInning = totalRuns / totalInnings;
    const milestoneBonus = (totalFifties * 10) + (totalHundreds * 25);
    const consistencyRating = Math.min(100, Math.round(
        (Math.min(60, battingAverage) / 60) * 45 +
        (Math.min(50, runsPerInning) / 50) * 35 +
        (Math.min(50, milestoneBonus) / 50) * 20
    ));

    // Match Winning Innings (POTMs or significant scores)
    const matchWinningInnings = totalPOTMs + Math.floor(totalHundreds * 0.8) + Math.floor(totalFifties * 0.4);

    // Batting Score (0 - 100)
    // Weighted: Runs (30%), Average (25%), Strike Rate (20%), Milestones (15%), Match-winning impact (10%)
    let rawBattingScore = 0;
    if (totalRuns > 0 || player.role === PlayerRole.BATSMAN || player.role === PlayerRole.WICKET_KEEPER || player.role === PlayerRole.ALL_ROUNDER) {
        const runComponent = Math.min(100, (totalRuns / 450) * 100);
        const avgComponent = Math.min(100, (battingAverage / 45) * 100);
        const srComponent = Math.min(100, (battingSR / 160) * 100);
        const milestoneComponent = Math.min(100, ((totalFifties * 20 + totalHundreds * 45) / 150) * 100);
        const impactComponent = Math.min(100, (matchWinningInnings / 4) * 100);

        rawBattingScore = (runComponent * 0.30) + (avgComponent * 0.25) + (srComponent * 0.20) + (milestoneComponent * 0.15) + (impactComponent * 0.10);
        
        // Base baseline if player was lightly played but has strong skill
        if (totalMatches === 0) {
            rawBattingScore = Math.max(30, player.battingSkill * 0.85);
        }
    } else {
        rawBattingScore = Math.max(10, player.battingSkill * 0.5);
    }
    const battingScore = Math.min(100, Math.max(10, Math.round(rawBattingScore)));

    // Bowling Calculations
    const bowlingEconomy = totalBallsBowled > 0 ? (totalRunsConceded / totalBallsBowled) * 6 : 8.0;
    const bowlingAverage = totalWickets > 0 ? (totalRunsConceded / totalWickets) : (totalRunsConceded > 0 ? totalRunsConceded : 30.0);
    const bowlingSR = totalWickets > 0 ? (totalBallsBowled / totalWickets) : (totalBallsBowled > 0 ? totalBallsBowled : 24.0);
    const fourWicketHauls = total3W; // using 3W+ / 4W haul trackers
    const fiveWicketHauls = total5W;

    // Powerplay & Death over ratings
    const ppEcon = ppBowlBalls > 0 ? (ppBowlRuns / ppBowlBalls) * 6 : 7.2;
    const powerplayRating = Math.min(100, Math.max(20, Math.round(
        Math.max(0, 100 - (ppEcon * 8)) + (ppBowlWkts * 6)
    )));

    const doEcon = doBowlBalls > 0 ? (doBowlRuns / doBowlBalls) * 6 : 9.5;
    const deathOverRating = Math.min(100, Math.max(20, Math.round(
        Math.max(0, 100 - (doEcon * 7)) + (doBowlWkts * 8)
    )));

    // Bowling Score (0 - 100)
    // Weighted: Wickets (35%), Economy (25%), Average/SR (20%), Hauls (10%), Phase rating (10%)
    let rawBowlingScore = 0;
    if (totalWickets > 0 || totalBallsBowled > 0 || player.role === PlayerRole.FAST_BOWLER || player.role === PlayerRole.SPIN_BOWLER || player.role === PlayerRole.ALL_ROUNDER) {
        const wicketComponent = Math.min(100, (totalWickets / 22) * 100);
        const econComponent = Math.min(100, Math.max(0, 100 - (bowlingEconomy - 5.0) * 16));
        const avgSrComponent = Math.min(100, Math.max(0, 100 - (bowlingAverage - 15) * 2.5));
        const haulsComponent = Math.min(100, (fourWicketHauls * 30 + fiveWicketHauls * 60));
        const phaseComponent = (powerplayRating * 0.5) + (deathOverRating * 0.5);

        rawBowlingScore = (wicketComponent * 0.35) + (econComponent * 0.25) + (avgSrComponent * 0.20) + (haulsComponent * 0.10) + (phaseComponent * 0.10);
        
        if (totalMatches === 0) {
            rawBowlingScore = Math.max(30, player.secondarySkill * 0.85);
        }
    } else {
        rawBowlingScore = Math.max(10, player.secondarySkill * 0.4);
    }
    const bowlingScore = Math.min(100, Math.max(10, Math.round(rawBowlingScore)));

    // Fielding Calculations
    const stumpings = (player.role === PlayerRole.WICKET_KEEPER) ? Math.floor(totalCatches * 0.35) : 0;
    const totalDismissalsFielding = totalCatches + totalRunOuts + stumpings;
    const fieldingEfficiency = Math.min(99, Math.max(50, 70 + (totalDismissalsFielding * 2.5) + (player.age < 27 ? 6 : -4)));
    const fieldingScore = Math.min(100, Math.max(30, Math.round((totalDismissalsFielding * 6) + (fieldingEfficiency * 0.4))));

    // Composite Total Season Performance Score based on Role
    let compositeTotal = 50;
    if (player.role === PlayerRole.BATSMAN) {
        compositeTotal = (battingScore * 0.80) + (fieldingScore * 0.20);
    } else if (player.role === PlayerRole.WICKET_KEEPER) {
        compositeTotal = (battingScore * 0.65) + (fieldingScore * 0.35);
    } else if (player.role === PlayerRole.FAST_BOWLER || player.role === PlayerRole.SPIN_BOWLER) {
        compositeTotal = (bowlingScore * 0.80) + (fieldingScore * 0.15) + (battingScore * 0.05);
    } else if (player.role === PlayerRole.ALL_ROUNDER) {
        // Combined All-Rounder Performance
        compositeTotal = (battingScore * 0.46) + (bowlingScore * 0.46) + (fieldingScore * 0.08);
    }

    const totalScore = Math.min(99, Math.max(35, Math.round(compositeTotal)));

    // Assign Letter Grade
    let grade: 'S+' | 'S' | 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' = 'B';
    if (totalScore >= 92) grade = 'S+';
    else if (totalScore >= 85) grade = 'S';
    else if (totalScore >= 78) grade = 'A+';
    else if (totalScore >= 70) grade = 'A';
    else if (totalScore >= 62) grade = 'B+';
    else if (totalScore >= 52) grade = 'B';
    else if (totalScore >= 42) grade = 'C';
    else grade = 'D';

    return {
        season: seasonNumber,
        totalScore,
        battingScore,
        bowlingScore,
        fieldingScore,
        runs: totalRuns,
        average: parseFloat(battingAverage.toFixed(2)),
        strikeRate: parseFloat(battingSR.toFixed(2)),
        fifties: totalFifties,
        hundreds: totalHundreds,
        highestScore,
        consistencyRating,
        matchWinningInnings,
        wickets: totalWickets,
        economy: parseFloat(bowlingEconomy.toFixed(2)),
        bowlingAverage: parseFloat(bowlingAverage.toFixed(2)),
        bowlingStrikeRate: parseFloat(bowlingSR.toFixed(2)),
        fourWicketHauls,
        fiveWicketHauls,
        powerplayRating,
        deathOverRating,
        catches: totalCatches,
        runOuts: totalRunOuts,
        stumpings,
        fieldingEfficiency: parseFloat(fieldingEfficiency.toFixed(1)),
        grade
    };
};

/**
 * Runs full league evaluation on all players at season end.
 * Attaches evaluations to each player and updates previousSeasonPerformance & Champions League scores.
 */
export const evaluateAllPlayersForSeason = (
    allPlayers: Player[],
    seasonNumber: number,
    matchResults?: MatchResult[]
): Player[] => {
    return allPlayers.map(player => {
        const evaluation = calculatePlayerSeasonEvaluation(player, seasonNumber, matchResults);
        
        // Compute Champions League performance score (based on top tier matches / T20 performance)
        const t20Stats = player.stats[Format.T20];
        let clScore = evaluation.totalScore;
        if (t20Stats && t20Stats.matches > 0) {
            const clRuns = t20Stats.runs || 0;
            const clWkts = t20Stats.wickets || 0;
            clScore = Math.min(99, Math.round((clRuns * 0.15) + (clWkts * 3.5) + (evaluation.totalScore * 0.6)));
        }

        const history = player.seasonEvaluationsHistory || {};
        history[seasonNumber] = evaluation;

        return {
            ...player,
            seasonPerformanceScore: evaluation,
            seasonEvaluationsHistory: history,
            previousSeasonPerformance: evaluation.totalScore,
            championsLeaguePerformance: Math.max(40, clScore),
            form: Math.min(99, Math.max(45, Math.round(evaluation.totalScore * 0.85 + (player.age < 26 ? 10 : 5))))
        };
    });
};

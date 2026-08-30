import { Player, PlayerRole, PlayerStats, DomesticFormat, InternationalFormat, Format, Team } from '../types';
import { generateSingleFormatInitialStats } from '../data';

/**
 * Deterministic pseudo-random generator based on player ID, format, and seed index
 * ensures stats are completely consistent across initial creation.
 */
const getSeededRandom = (seedStr: string, index: number): number => {
    let hash = 0;
    const combined = `${seedStr}_${index}_dom_salt_v2`;
    for (let i = 0; i < combined.length; i++) {
        hash = (hash << 5) - hash + combined.charCodeAt(i);
        hash |= 0;
    }
    const val = Math.sin(hash) * 10000;
    return Math.abs(val - Math.floor(val));
};

/**
 * Generates single-year incremental domestic statistics for a player:
 * - Domestic T20: 5 to 40 matches each year
 * - Domestic List A: 5 to 35 matches each year
 * - Domestic FC (First-Class): 2 to 20 matches each year
 */
export const generateYearlyDomesticAddition = (
    player: {
        id: string;
        name: string;
        age?: number;
        role: PlayerRole;
        battingSkill: number;
        secondarySkill: number;
        style?: string;
        isOpener?: boolean;
        isFinisher?: boolean;
        isPowerHitter?: boolean;
        form?: number;
    },
    format: 'T20' | 'List A' | 'FC' | string,
    seedSuffix: string = `${Date.now()}`
): PlayerStats => {
    const base = generateSingleFormatInitialStats();

    const isBatter = player.role === PlayerRole.BATSMAN || player.role === PlayerRole.WICKET_KEEPER;
    const isAllRounder = player.role === PlayerRole.ALL_ROUNDER;
    const isBowler = player.role === PlayerRole.FAST_BOWLER || player.role === PlayerRole.SPIN_BOWLER;
    const isKeeper = player.role === PlayerRole.WICKET_KEEPER;

    const batSkill = Math.max(25, Math.min(99, player.battingSkill || 50));
    const bowlSkill = Math.max(20, Math.min(99, player.secondarySkill || 30));
    const batNorm = batSkill / 100;
    const bowlNorm = bowlSkill / 100;

    const seed = `${player.id}_${format}_${seedSuffix}`;
    const rand1 = getSeededRandom(seed, 1);
    const rand2 = getSeededRandom(seed, 2);
    const rand3 = getSeededRandom(seed, 3);
    const rand4 = getSeededRandom(seed, 4);

    let matches = 0;
    let inningsBatting = 0;
    let runs = 0;
    let ballsFaced = 0;
    let dismissals = 0;
    let highestScore = 0;
    let fours = 0;
    let sixes = 0;
    let thirties = 0;
    let fifties = 0;
    let hundreds = 0;

    let inningsBowling = 0;
    let ballsBowled = 0;
    let runsConceded = 0;
    let wickets = 0;
    let bestBowlingWickets = 0;
    let bestBowlingRuns = 0;
    let threeWicketHauls = 0;
    let fiveWicketHauls = 0;

    if (format === 'T20' || format === DomesticFormat.T20 || format.includes('T20')) {
        // --- Domestic T20: 2 to 8 matches each year (realistic slow progression) ---
        matches = Math.min(8, Math.max(2, Math.round(2 + rand1 * 6)));

        if (isBatter || isAllRounder) {
            inningsBatting = Math.max(1, Math.round(matches * (isBatter ? 0.94 : 0.85)));
            const notOutRate = isBatter ? 0.16 : 0.25;
            dismissals = Math.max(1, Math.round(inningsBatting * (1 - notOutRate)));
            const avgVal = 18 + batNorm * 26 + (player.isOpener ? 3 : 0);
            runs = Math.round(dismissals * avgVal);
            const sr = 120 + batNorm * 40 + (player.style === 'A' ? 14 : player.style === 'D' ? -12 : 0);
            ballsFaced = Math.max(runs, Math.round((runs / sr) * 100));
            highestScore = Math.min(runs, Math.round(35 + batNorm * 50 + rand2 * 15));
            fours = Math.max(1, Math.round(runs * 0.105));
            sixes = Math.max(0, Math.round(runs * (player.isPowerHitter ? 0.055 : 0.035)));
            hundreds = highestScore >= 100 ? 1 : 0;
            fifties = highestScore >= 50 ? Math.max(1, Math.round(matches * 0.2 * batNorm)) : 0;
            thirties = Math.max(0, Math.round(matches * 0.3 * batNorm));
        } else {
            inningsBatting = Math.max(0, Math.round(matches * 0.38));
            dismissals = Math.max(0, Math.round(inningsBatting * 0.75));
            runs = Math.round(inningsBatting * (5 + batNorm * 9));
            ballsFaced = Math.round(runs * 0.95);
            highestScore = Math.min(runs, Math.round(10 + batNorm * 16));
            fours = Math.max(0, Math.round(runs * 0.08));
            sixes = 0;
        }

        if (isBowler || isAllRounder) {
            inningsBowling = Math.max(1, Math.round(matches * (isBowler ? 0.96 : 0.78)));
            ballsBowled = inningsBowling * (isBowler ? 22 : 16);
            const economy = parseFloat((8.8 - bowlNorm * 2.2 + rand4 * 0.4).toFixed(2));
            runsConceded = Math.round((ballsBowled / 6) * economy);
            wickets = Math.max(1, Math.round(inningsBowling * (0.9 + bowlNorm * 0.85)));
            bestBowlingWickets = Math.min(wickets, Math.max(1, Math.round(1 + bowlNorm * 2.2)));
            bestBowlingRuns = Math.max(10, Math.round(bestBowlingWickets * 6 + rand2 * 8));
            threeWicketHauls = bestBowlingWickets >= 3 ? 1 : 0;
            fiveWicketHauls = bestBowlingWickets >= 5 ? 1 : 0;
        }
    } else if (format === 'List A' || format === DomesticFormat.LIST_A || format.includes('List A') || format.includes('ODI')) {
        // --- Domestic List A: 2 to 6 matches each year ---
        matches = Math.min(6, Math.max(2, Math.round(2 + rand1 * 4)));

        if (isBatter || isAllRounder) {
            inningsBatting = Math.max(1, Math.round(matches * (isBatter ? 0.95 : 0.86)));
            const notOutRate = isBatter ? 0.14 : 0.22;
            dismissals = Math.max(1, Math.round(inningsBatting * (1 - notOutRate)));
            const avgVal = 24 + batNorm * 32;
            runs = Math.round(dismissals * avgVal);
            const sr = 80 + batNorm * 28 + (player.style === 'A' ? 10 : player.style === 'D' ? -8 : 0);
            ballsFaced = Math.round((runs / sr) * 100);
            highestScore = Math.min(runs, Math.round(55 + batNorm * 75 + rand2 * 18));
            fours = Math.max(1, Math.round(runs * 0.095));
            sixes = Math.max(0, Math.round(runs * 0.018));
            hundreds = highestScore >= 100 ? 1 : 0;
            fifties = highestScore >= 50 ? Math.max(1, Math.round(matches * 0.25 * batNorm)) : 0;
        } else {
            inningsBatting = Math.max(0, Math.round(matches * 0.45));
            dismissals = Math.max(0, Math.round(inningsBatting * 0.82));
            runs = Math.round(inningsBatting * (8 + batNorm * 14));
            ballsFaced = Math.round(runs * 1.25);
            highestScore = Math.min(runs, Math.round(18 + batNorm * 22));
            fours = Math.max(0, Math.round(runs * 0.08));
            sixes = 0;
        }

        if (isBowler || isAllRounder) {
            inningsBowling = Math.max(1, Math.round(matches * (isBowler ? 0.96 : 0.80)));
            ballsBowled = inningsBowling * (isBowler ? 50 : 38);
            const economy = parseFloat((5.6 - bowlNorm * 1.5 + rand4 * 0.35).toFixed(2));
            runsConceded = Math.round((ballsBowled / 6) * economy);
            wickets = Math.max(1, Math.round(inningsBowling * (1.1 + bowlNorm * 1.05)));
            bestBowlingWickets = Math.min(wickets, Math.max(2, Math.round(2 + bowlNorm * 2.5)));
            bestBowlingRuns = Math.max(15, Math.round(bestBowlingWickets * 7 + rand2 * 10));
            threeWicketHauls = bestBowlingWickets >= 3 ? 1 : 0;
            fiveWicketHauls = bestBowlingWickets >= 5 ? 1 : 0;
        }
    } else {
        // --- Domestic First-Class (FC): 1 to 4 matches each year ---
        matches = Math.min(4, Math.max(1, Math.round(1 + rand1 * 3)));

        if (isBatter || isAllRounder) {
            inningsBatting = Math.max(1, Math.round(matches * (isBatter ? 1.75 : 1.52)));
            const notOutRate = isBatter ? 0.10 : 0.16;
            dismissals = Math.max(1, Math.round(inningsBatting * (1 - notOutRate)));
            const avgVal = 28 + batNorm * 36;
            runs = Math.round(dismissals * avgVal);
            const sr = 46 + batNorm * 20 + (player.style === 'A' ? 8 : player.style === 'D' ? -8 : 0);
            ballsFaced = Math.round((runs / sr) * 100);
            highestScore = Math.min(runs, Math.round(75 + batNorm * 110 + rand2 * 25));
            fours = Math.max(2, Math.round(runs * 0.115));
            sixes = Math.max(0, Math.round(runs * 0.008));
            hundreds = highestScore >= 100 ? 1 : 0;
            fifties = highestScore >= 50 ? Math.max(1, Math.round(matches * 0.35 * batNorm)) : 0;
        } else {
            inningsBatting = Math.max(0, Math.round(matches * 1.15));
            dismissals = Math.max(0, Math.round(inningsBatting * 0.85));
            runs = Math.round(inningsBatting * (12 + batNorm * 18));
            ballsFaced = Math.round(runs * 1.85);
            highestScore = Math.min(runs, Math.round(28 + batNorm * 30));
            fours = Math.max(0, Math.round(runs * 0.09));
            sixes = 0;
        }

        if (isBowler || isAllRounder) {
            inningsBowling = Math.max(1, Math.round(matches * (isBowler ? 1.85 : 1.40)));
            ballsBowled = inningsBowling * (isBowler ? 130 : 88);
            const economy = parseFloat((3.3 - bowlNorm * 0.8 + rand4 * 0.25).toFixed(2));
            runsConceded = Math.round((ballsBowled / 6) * economy);
            wickets = Math.max(1, Math.round(inningsBowling * (1.7 + bowlNorm * 2.0)));
            bestBowlingWickets = Math.min(wickets, Math.max(3, Math.round(3 + bowlNorm * 3.0)));
            bestBowlingRuns = Math.max(22, Math.round(bestBowlingWickets * 10 + rand2 * 15));
            threeWicketHauls = bestBowlingWickets >= 3 ? 1 : 0;
            fiveWicketHauls = bestBowlingWickets >= 5 ? 1 : 0;
        }
    }

    const average = dismissals > 0 ? parseFloat((runs / dismissals).toFixed(2)) : runs;
    const strikeRate = ballsFaced > 0 ? parseFloat(((runs / ballsFaced) * 100).toFixed(2)) : 0;
    const economy = ballsBowled > 0 ? parseFloat(((runsConceded / (ballsBowled / 6))).toFixed(2)) : 0;
    const bowlingAverage = wickets > 0 ? parseFloat((runsConceded / wickets).toFixed(2)) : 0;

    return {
        ...base,
        matches,
        inningsBatting,
        inningsBowling,
        runs,
        highestScore,
        average,
        strikeRate,
        ballsFaced,
        dismissals,
        fours,
        sixes,
        thirties,
        fifties,
        hundreds,
        fastestFifty: fifties > 0 ? 25 + Math.floor((100 - batSkill) * 0.15) : 0,
        fastestHundred: hundreds > 0 ? 55 + Math.floor((100 - batSkill) * 0.20) : 0,
        wickets,
        ballsBowled,
        runsConceded,
        economy,
        bowlingAverage,
        bestBowling: bestBowlingWickets > 0 ? `${bestBowlingWickets}/${bestBowlingRuns}` : '-',
        bestBowlingWickets,
        bestBowlingRuns,
        threeWicketHauls,
        fiveWicketHauls,
        catches: isKeeper ? Math.round(matches * 1.1) : Math.round(matches * 0.45),
        runOuts: Math.round(matches * 0.08),
        manOfTheMatchAwards: Math.max(0, Math.round(matches * 0.08 * Math.max(batNorm, bowlNorm)))
    };
};

/**
 * Combines two PlayerStats objects cleanly, summing count fields and accurately recalculating ratios.
 */
export const addStatsToTotal = (existing: PlayerStats, addition: PlayerStats): PlayerStats => {
    const matches = (existing.matches || 0) + (addition.matches || 0);
    const inningsBatting = (existing.inningsBatting || 0) + (addition.inningsBatting || 0);
    const inningsBowling = (existing.inningsBowling || 0) + (addition.inningsBowling || 0);
    const runs = (existing.runs || 0) + (addition.runs || 0);
    const ballsFaced = (existing.ballsFaced || 0) + (addition.ballsFaced || 0);
    const dismissals = (existing.dismissals || 0) + (addition.dismissals || 0);
    const fours = (existing.fours || 0) + (addition.fours || 0);
    const sixes = (existing.sixes || 0) + (addition.sixes || 0);
    const thirties = (existing.thirties || 0) + (addition.thirties || 0);
    const fifties = (existing.fifties || 0) + (addition.fifties || 0);
    const hundreds = (existing.hundreds || 0) + (addition.hundreds || 0);

    const highestScore = Math.max(existing.highestScore || 0, addition.highestScore || 0);

    let fastestFifty = existing.fastestFifty || 0;
    if (addition.fastestFifty > 0 && (fastestFifty === 0 || addition.fastestFifty < fastestFifty)) {
        fastestFifty = addition.fastestFifty;
    }
    let fastestHundred = existing.fastestHundred || 0;
    if (addition.fastestHundred > 0 && (fastestHundred === 0 || addition.fastestHundred < fastestHundred)) {
        fastestHundred = addition.fastestHundred;
    }

    const wickets = (existing.wickets || 0) + (addition.wickets || 0);
    const ballsBowled = (existing.ballsBowled || 0) + (addition.ballsBowled || 0);
    const runsConceded = (existing.runsConceded || 0) + (addition.runsConceded || 0);
    const threeWicketHauls = (existing.threeWicketHauls || 0) + (addition.threeWicketHauls || 0);
    const fiveWicketHauls = (existing.fiveWicketHauls || 0) + (addition.fiveWicketHauls || 0);

    let bestBowlingWickets = existing.bestBowlingWickets || 0;
    let bestBowlingRuns = existing.bestBowlingRuns || 0;
    if (
        (addition.bestBowlingWickets || 0) > bestBowlingWickets ||
        ((addition.bestBowlingWickets || 0) === bestBowlingWickets && (addition.bestBowlingRuns || 0) < bestBowlingRuns && bestBowlingWickets > 0)
    ) {
        bestBowlingWickets = addition.bestBowlingWickets || 0;
        bestBowlingRuns = addition.bestBowlingRuns || 0;
    }

    const bestBowling = bestBowlingWickets > 0 ? `${bestBowlingWickets}/${bestBowlingRuns}` : (existing.bestBowling || '-');

    const average = dismissals > 0 ? parseFloat((runs / dismissals).toFixed(2)) : runs;
    const strikeRate = ballsFaced > 0 ? parseFloat(((runs / ballsFaced) * 100).toFixed(2)) : 0;
    const economy = ballsBowled > 0 ? parseFloat(((runsConceded / (ballsBowled / 6))).toFixed(2)) : 0;
    const bowlingAverage = wickets > 0 ? parseFloat((runsConceded / wickets).toFixed(2)) : 0;

    const catches = (existing.catches || 0) + (addition.catches || 0);
    const runOuts = (existing.runOuts || 0) + (addition.runOuts || 0);
    const manOfTheMatchAwards = (existing.manOfTheMatchAwards || 0) + (addition.manOfTheMatchAwards || 0);

    return {
        ...existing,
        matches,
        inningsBatting,
        inningsBowling,
        runs,
        highestScore,
        average,
        strikeRate,
        ballsFaced,
        dismissals,
        fours,
        sixes,
        thirties,
        fifties,
        hundreds,
        fastestFifty,
        fastestHundred,
        wickets,
        ballsBowled,
        runsConceded,
        economy,
        bowlingAverage,
        bestBowling,
        bestBowlingWickets,
        bestBowlingRuns,
        threeWicketHauls,
        fiveWicketHauls,
        catches,
        runOuts,
        manOfTheMatchAwards
    };
};

/**
 * Advances domestic stats by one year during season transition:
 * Adds 5-40 matches in T20, 5-35 matches in List A, and 2-20 matches in FC.
 */
export const advanceYearlyDomesticStats = (player: Player): Record<string, PlayerStats> => {
    const currentDomestic = player.domesticStats || generatePlayerDomesticStats(player);
    const uniqueYearSeed = `season_${Date.now()}_${Math.random()}`;

    const t20Add = generateYearlyDomesticAddition(player, 'T20', `${uniqueYearSeed}_t20`);
    const listAAdd = generateYearlyDomesticAddition(player, 'List A', `${uniqueYearSeed}_la`);
    const fcAdd = generateYearlyDomesticAddition(player, 'FC', `${uniqueYearSeed}_fc`);

    return {
        'T20': addStatsToTotal(currentDomestic['T20'] || generateSingleFormatInitialStats(), t20Add),
        'List A': addStatsToTotal(currentDomestic['List A'] || generateSingleFormatInitialStats(), listAAdd),
        'FC': addStatsToTotal(currentDomestic['FC'] || generateSingleFormatInitialStats(), fcAdd),
    };
};

/**
 * Generates initial baseline domestic career statistics for a player:
 * Accumulates realistic yearly stats based on the player's career span from age 18 to current age.
 */
export const generateRealisticDomesticStats = (
    player: {
        id: string;
        name: string;
        age: number;
        role: PlayerRole;
        battingSkill: number;
        secondarySkill: number;
        style?: string;
        isOpener?: boolean;
        isFinisher?: boolean;
        isPowerHitter?: boolean;
        form?: number;
    },
    format: string
): PlayerStats => {
    const age = Math.max(18, Math.min(42, player.age || 24));
    // Scale career experience: young players (18-21) have 1 year (2-8 matches), 
    // prime players (22-26) have 2 years (6-16 matches), senior players (27-31) have 3 years, veterans (32+) have 4 years.
    const careerYears = age <= 21 ? 1 : age <= 25 ? 2 : age <= 30 ? 3 : 4;

    let accumulated = generateSingleFormatInitialStats();
    for (let yr = 0; yr < careerYears; yr++) {
        const yearlyAddition = generateYearlyDomesticAddition(player, format, `init_yr_${yr}`);
        accumulated = addStatsToTotal(accumulated, yearlyAddition);
    }
    return accumulated;
};

/**
 * Generates initial Domestic stats dictionary for a player across all 3 standard domestic formats:
 * - 'T20'
 * - 'List A'
 * - 'FC'
 */
export const generatePlayerDomesticStats = (player: any): Record<string, PlayerStats> => {
    return {
        'T20': generateRealisticDomesticStats(player, 'T20'),
        'List A': generateRealisticDomesticStats(player, 'List A'),
        'FC': generateRealisticDomesticStats(player, 'FC'),
    };
};

/**
 * Generates blank International stats dictionary for the 3 international formats:
 * - 'Test'
 * - 'ODI'
 * - 'T20i'
 */
export const generatePlayerInternationalStats = (): Record<string, PlayerStats> => {
    return {
        'Test': generateSingleFormatInitialStats(),
        'ODI': generateSingleFormatInitialStats(),
        'T20i': generateSingleFormatInitialStats(),
    };
};

/**
 * Generates realistic 5-match auto-generated baseline stats for a player for a given format
 * if the player has not played any matches.
 */
export const generateSimulated5MatchStats = (player: Player, format: Format): PlayerStats => {
    const base = generateSingleFormatInitialStats();
    const isBatter = player.role === PlayerRole.BATSMAN || player.role === PlayerRole.WICKET_KEEPER;
    const isAllRounder = player.role === PlayerRole.ALL_ROUNDER;
    const isBowler = player.role === PlayerRole.FAST_BOWLER || player.role === PlayerRole.SPIN_BOWLER;

    const batSkill = Math.max(30, Math.min(99, player.battingSkill || 50));
    const bowlSkill = Math.max(30, Math.min(99, player.secondarySkill || 50));
    const batNorm = batSkill / 100;
    const bowlNorm = bowlSkill / 100;
    const formNorm = (player.form || 70) / 100;

    const matches = 5;

    if (format === Format.T20 || format === Format.WLT20) {
        let inningsBatting = 0;
        let runs = 0;
        let highestScore = 0;
        let ballsFaced = 0;
        let dismissals = 0;
        let fours = 0;
        let sixes = 0;
        let thirties = 0;
        let fifties = 0;

        let inningsBowling = 0;
        let ballsBowled = 0;
        let runsConceded = 0;
        let wickets = 0;
        let bestBowlingWickets = 0;
        let bestBowlingRuns = 0;
        let threeWicketHauls = 0;

        if (isBatter || isAllRounder) {
            inningsBatting = 5;
            dismissals = Math.max(1, isBatter ? 4 : 3);
            const avgVal = 22 + (batNorm * 30) * formNorm;
            runs = Math.round(dismissals * avgVal);
            const sr = 125 + (batNorm * 38) + (player.style === 'A' ? 12 : player.style === 'D' ? -12 : 0);
            ballsFaced = Math.round((runs / sr) * 100);
            highestScore = Math.min(runs, Math.round(runs * 0.48 + 18));
            fours = Math.max(2, Math.round(runs * 0.10));
            sixes = Math.max(1, Math.round(runs * 0.05));
            fifties = highestScore >= 50 ? (runs > 150 ? 2 : 1) : 0;
            thirties = Math.min(3, Math.floor(runs / 40));
        } else {
            inningsBatting = 2;
            dismissals = 2;
            runs = Math.round(12 + (batNorm * 18));
            ballsFaced = Math.round(runs * 0.9);
            highestScore = runs;
            fours = 1;
        }

        if (isBowler || isAllRounder) {
            inningsBowling = 5;
            ballsBowled = isBowler ? 120 : 96;
            const economy = parseFloat((9.2 - (bowlNorm * 2.6) * formNorm).toFixed(2));
            runsConceded = Math.round((ballsBowled / 6) * economy);
            wickets = Math.max(2, Math.round((isBowler ? 4.5 : 3.0) + (bowlNorm * 5.5) * formNorm));
            bestBowlingWickets = Math.min(wickets, Math.max(2, Math.round(wickets * 0.5)));
            bestBowlingRuns = Math.max(14, Math.round(bestBowlingWickets * (economy * 0.9)));
            threeWicketHauls = bestBowlingWickets >= 3 ? 1 : 0;
        }

        const average = dismissals > 0 ? parseFloat((runs / dismissals).toFixed(2)) : runs;
        const strikeRate = ballsFaced > 0 ? parseFloat(((runs / ballsFaced) * 100).toFixed(2)) : 0;
        const economy = ballsBowled > 0 ? parseFloat(((runsConceded / (ballsBowled / 6))).toFixed(2)) : 0;
        const bowlingAverage = wickets > 0 ? parseFloat((runsConceded / wickets).toFixed(2)) : 0;

        return {
            ...base,
            matches,
            inningsBatting,
            inningsBowling,
            runs,
            highestScore,
            average,
            strikeRate,
            ballsFaced,
            dismissals,
            fours,
            sixes,
            thirties,
            fifties,
            fastestFifty: fifties > 0 ? 26 + Math.floor((100 - batSkill) * 0.15) : 0,
            wickets,
            ballsBowled,
            runsConceded,
            economy,
            bowlingAverage,
            bestBowling: bestBowlingWickets > 0 ? `${bestBowlingWickets}/${bestBowlingRuns}` : '-',
            bestBowlingWickets,
            bestBowlingRuns,
            threeWicketHauls,
            catches: isBatter ? 3 : 1,
            runOuts: 0,
            manOfTheMatchAwards: (runs > 160 || wickets >= 8) ? 1 : 0
        };
    } else if (format === Format.ODI) {
        let inningsBatting = 0;
        let runs = 0;
        let highestScore = 0;
        let ballsFaced = 0;
        let dismissals = 0;
        let fours = 0;
        let sixes = 0;
        let fifties = 0;
        let hundreds = 0;

        let inningsBowling = 0;
        let ballsBowled = 0;
        let runsConceded = 0;
        let wickets = 0;
        let bestBowlingWickets = 0;
        let bestBowlingRuns = 0;

        if (isBatter || isAllRounder) {
            inningsBatting = 5;
            dismissals = Math.max(1, isBatter ? 4 : 4);
            const avgVal = 28 + (batNorm * 36) * formNorm;
            runs = Math.round(dismissals * avgVal);
            const sr = 80 + (batNorm * 25) + (player.style === 'A' ? 8 : player.style === 'D' ? -8 : 0);
            ballsFaced = Math.round((runs / sr) * 100);
            highestScore = Math.min(runs, Math.round(runs * 0.52 + 25));
            fours = Math.max(3, Math.round(runs * 0.09));
            sixes = Math.max(0, Math.round(runs * 0.02));
            hundreds = highestScore >= 100 ? 1 : 0;
            fifties = highestScore >= 50 ? (hundreds > 0 ? (runs > 220 ? 1 : 0) : Math.min(2, Math.floor(runs / 70))) : 0;
        } else {
            inningsBatting = 3;
            dismissals = 3;
            runs = Math.round(20 + (batNorm * 25));
            ballsFaced = Math.round(runs * 1.2);
            highestScore = Math.min(runs, 18);
            fours = 2;
        }

        if (isBowler || isAllRounder) {
            inningsBowling = 5;
            ballsBowled = isBowler ? 270 : 210;
            const economy = parseFloat((5.8 - (bowlNorm * 1.6) * formNorm).toFixed(2));
            runsConceded = Math.round((ballsBowled / 6) * economy);
            wickets = Math.max(2, Math.round((isBowler ? 5.5 : 4.0) + (bowlNorm * 6.5) * formNorm));
            bestBowlingWickets = Math.min(wickets, Math.max(2, Math.round(wickets * 0.45 + 1)));
            bestBowlingRuns = Math.max(25, Math.round(bestBowlingWickets * (economy * 1.1)));
        }

        const average = dismissals > 0 ? parseFloat((runs / dismissals).toFixed(2)) : runs;
        const strikeRate = ballsFaced > 0 ? parseFloat(((runs / ballsFaced) * 100).toFixed(2)) : 0;
        const economy = ballsBowled > 0 ? parseFloat(((runsConceded / (ballsBowled / 6))).toFixed(2)) : 0;
        const bowlingAverage = wickets > 0 ? parseFloat((runsConceded / wickets).toFixed(2)) : 0;

        return {
            ...base,
            matches,
            inningsBatting,
            inningsBowling,
            runs,
            highestScore,
            average,
            strikeRate,
            ballsFaced,
            dismissals,
            fours,
            sixes,
            fifties,
            hundreds,
            wickets,
            ballsBowled,
            runsConceded,
            economy,
            bowlingAverage,
            bestBowling: bestBowlingWickets > 0 ? `${bestBowlingWickets}/${bestBowlingRuns}` : '-',
            bestBowlingWickets,
            bestBowlingRuns,
            threeWicketHauls: bestBowlingWickets >= 3 ? 1 : 0,
            fiveWicketHauls: bestBowlingWickets >= 5 ? 1 : 0,
            catches: isBatter ? 3 : 1,
            runOuts: 0,
            manOfTheMatchAwards: (runs > 220 || wickets >= 9) ? 1 : 0
        };
    } else {
        let inningsBatting = 0;
        let runs = 0;
        let highestScore = 0;
        let ballsFaced = 0;
        let dismissals = 0;
        let fours = 0;
        let sixes = 0;
        let fifties = 0;
        let hundreds = 0;

        let inningsBowling = 0;
        let ballsBowled = 0;
        let runsConceded = 0;
        let wickets = 0;
        let bestBowlingWickets = 0;
        let bestBowlingRuns = 0;
        let fiveWicketHauls = 0;

        if (isBatter || isAllRounder) {
            inningsBatting = 8;
            dismissals = Math.max(1, 7);
            const avgVal = 30 + (batNorm * 38) * formNorm;
            runs = Math.round(dismissals * avgVal);
            const sr = 48 + (batNorm * 18) + (player.style === 'A' ? 6 : player.style === 'D' ? -6 : 0);
            ballsFaced = Math.round((runs / sr) * 100);
            highestScore = Math.min(runs, Math.round(runs * 0.42 + 45));
            fours = Math.max(10, Math.round(runs * 0.11));
            sixes = Math.max(0, Math.round(runs * 0.01));
            hundreds = Math.max(0, Math.min(2, Math.floor(runs / 180)));
            fifties = Math.min(3, Math.max(1, Math.floor((runs - (hundreds * 100)) / 60)));
        } else {
            inningsBatting = 6;
            dismissals = 6;
            runs = Math.round(40 + (batNorm * 45));
            ballsFaced = Math.round(runs * 1.8);
            highestScore = Math.min(runs, 28);
            fours = 4;
        }

        if (isBowler || isAllRounder) {
            inningsBowling = 9;
            ballsBowled = isBowler ? 840 : 540;
            const economy = parseFloat((3.4 - (bowlNorm * 0.8) * formNorm).toFixed(2));
            runsConceded = Math.round((ballsBowled / 6) * economy);
            wickets = Math.max(5, Math.round((isBowler ? 14 : 9) + (bowlNorm * 12) * formNorm));
            bestBowlingWickets = Math.min(wickets, Math.max(3, Math.round(wickets * 0.32 + 2)));
            bestBowlingRuns = Math.max(40, Math.round(bestBowlingWickets * (economy * 1.25)));
            fiveWicketHauls = bestBowlingWickets >= 5 ? 1 : 0;
        }

        const average = dismissals > 0 ? parseFloat((runs / dismissals).toFixed(2)) : runs;
        const strikeRate = ballsFaced > 0 ? parseFloat(((runs / ballsFaced) * 100).toFixed(2)) : 0;
        const economy = ballsBowled > 0 ? parseFloat(((runsConceded / (ballsBowled / 6))).toFixed(2)) : 0;
        const bowlingAverage = wickets > 0 ? parseFloat((runsConceded / wickets).toFixed(2)) : 0;

        return {
            ...base,
            matches,
            inningsBatting,
            inningsBowling,
            runs,
            highestScore,
            average,
            strikeRate,
            ballsFaced,
            dismissals,
            fours,
            sixes,
            fifties,
            hundreds,
            wickets,
            ballsBowled,
            runsConceded,
            economy,
            bowlingAverage,
            bestBowling: bestBowlingWickets > 0 ? `${bestBowlingWickets}/${bestBowlingRuns}` : '-',
            bestBowlingWickets,
            bestBowlingRuns,
            threeWicketHauls: bestBowlingWickets >= 3 ? 1 : 0,
            fiveWicketHauls,
            catches: isBatter ? 5 : 2,
            runOuts: 0,
            manOfTheMatchAwards: (runs > 350 || wickets >= 20) ? 1 : 0
        };
    }
};

/**
 * Checks all players and populates 5-match auto-generated stats for each format
 * for any player who has not played a single match in the whole season.
 */
export const populateStatsForInactivePlayers = (players: Player[]): Player[] => {
    return players.map(player => {
        const domesticStats = player.domesticStats || generatePlayerDomesticStats(player);
        const internationalStats = player.internationalStats || {
            'Test': generateSingleFormatInitialStats(),
            'ODI': generateSingleFormatInitialStats(),
            'T20i': generateSingleFormatInitialStats(),
        };

        const currentStats = player.stats || ({} as Record<Format, PlayerStats>);

        const topSkill = Math.max(player.battingSkill, player.secondarySkill);
        const form = player.form || 70;
        const simulatedPerfScore = Math.min(95, Math.max(45, Math.round((topSkill * 0.6) + (form * 0.3) + 5)));

        return {
            ...player,
            domesticStats,
            internationalStats,
            stats: currentStats,
            previousSeasonPerformance: player.previousSeasonPerformance || simulatedPerfScore
        };
    });
};

/**
 * Automatically assigns Captain and Vice-Captain for all teams immediately after the draft.
 * Selects the top leadership candidates based on skill, form, role, and experience.
 */
export const autoAssignTeamCaptainsAndViceCaptains = (teams: Team[]): Team[] => {
    const formats = [Format.T20, Format.ODI, Format.SHIELD];

    return teams.map(team => {
        const squad = team.squad || [];
        if (squad.length === 0) return team;

        const scored = squad.map(p => {
            const topSkill = Math.max(p.battingSkill, p.secondarySkill);
            const form = p.form || 70;
            const ageBonus = (p.age >= 24 && p.age <= 34) ? 10 : 5;
            const roleBonus = (p.role === PlayerRole.ALL_ROUNDER ? 6 : p.role === PlayerRole.BATSMAN ? 4 : 2);
            const leadershipScore = (topSkill * 0.6) + (form * 0.25) + ageBonus + roleBonus;
            return { player: p, score: leadershipScore };
        });

        scored.sort((a, b) => b.score - a.score);

        const captain = scored[0]?.player;
        const viceCaptain = scored[1]?.player || captain;

        const captainsObj: { [key in Format]?: string } = {};
        const viceCaptainsObj: { [key in Format]?: string } = {};

        formats.forEach(f => {
            if (captain) captainsObj[f] = captain.id;
            if (viceCaptain) viceCaptainsObj[f] = viceCaptain.id;
        });

        return {
            ...team,
            captainId: captain ? captain.id : null,
            viceCaptainId: viceCaptain ? viceCaptain.id : null,
            captains: captainsObj,
            viceCaptains: viceCaptainsObj
        };
    });
};

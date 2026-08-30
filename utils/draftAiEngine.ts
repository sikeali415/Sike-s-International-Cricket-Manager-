import { Player, Team, PlayerRole } from '../types';
import { getPlayerSubRole } from './foreignPlayerSystem';
import { DRAFT_SQUAD_SIZE, DRAFT_FOREIGN_PLAYERS, DRAFT_NATIONAL_PLAYERS } from '../data';

export interface SquadNeedsAnalysis {
    wicketKeepersNeeded: number;
    openersNeeded: number;
    deathBowlersNeeded: number;
    powerplayBowlersNeeded: number;
    spinnersNeeded: number;
    fastBowlersNeeded: number;
    allRoundersNeeded: number;
    finishersNeeded: number;
    middleOrderNeeded: number;
    foreignSlotsRemaining: number;
    nationalSlotsRemaining: number;
    totalSlotsRemaining: number;
}

/**
 * Analyzes the squad composition of a team and identifies critical structural weaknesses and role requirements.
 */
export const analyzeSquadComposition = (team: Team): SquadNeedsAnalysis => {
    const squad = team.squad || [];

    const foreignCount = squad.filter(p => p.isForeign).length;
    const nationalCount = squad.filter(p => !p.isForeign).length;
    const foreignSlotsRemaining = Math.max(0, DRAFT_FOREIGN_PLAYERS - foreignCount);
    const nationalSlotsRemaining = Math.max(0, DRAFT_NATIONAL_PLAYERS - nationalCount);
    const totalSlotsRemaining = Math.max(0, DRAFT_SQUAD_SIZE - squad.length);

    let wkCount = 0;
    let openerCount = 0;
    let deathBowlerCount = 0;
    let ppBowlerCount = 0;
    let spinnerCount = 0;
    let fastBowlerCount = 0;
    let arCount = 0;
    let finisherCount = 0;
    let middleOrderCount = 0;

    squad.forEach(p => {
        const sub = getPlayerSubRole(p).toLowerCase();
        if (p.role === PlayerRole.WICKET_KEEPER) wkCount++;
        if (p.isOpener || sub.includes('opening')) openerCount++;
        if (sub.includes('death') || p.bowlingSubType === 'fbs') deathBowlerCount++;
        if (sub.includes('powerplay') || p.bowlingSubType === 'fb') ppBowlerCount++;
        if (p.role === PlayerRole.SPIN_BOWLER || sub.includes('spinner')) spinnerCount++;
        if (p.role === PlayerRole.FAST_BOWLER || sub.includes('fast') || sub.includes('medium')) fastBowlerCount++;
        if (p.role === PlayerRole.ALL_ROUNDER) arCount++;
        if (p.isFinisher || sub.includes('finisher')) finisherCount++;
        if (p.role === PlayerRole.BATSMAN && !p.isOpener && !p.isFinisher) middleOrderCount++;
    });

    return {
        wicketKeepersNeeded: Math.max(0, 2 - wkCount), // Ideal: 2 WKs
        openersNeeded: Math.max(0, 3 - openerCount), // Ideal: 3 Openers
        deathBowlersNeeded: Math.max(0, 2 - deathBowlerCount), // Ideal: 2 Death Bowlers
        powerplayBowlersNeeded: Math.max(0, 3 - ppBowlerCount), // Ideal: 3 PP Bowlers
        spinnersNeeded: Math.max(0, 3 - spinnerCount), // Ideal: 3 Spinners
        fastBowlersNeeded: Math.max(0, 5 - fastBowlerCount), // Ideal: 5 Fast Bowlers
        allRoundersNeeded: Math.max(0, 4 - arCount), // Ideal: 4 All-Rounders
        finishersNeeded: Math.max(0, 2 - finisherCount), // Ideal: 2 Finishers
        middleOrderNeeded: Math.max(0, 3 - middleOrderCount), // Ideal: 3 Middle-Order
        foreignSlotsRemaining,
        nationalSlotsRemaining,
        totalSlotsRemaining
    };
};

/**
 * Intelligent AI valuation of a draft candidate for a specific team.
 * Evaluates:
 * 1. Foreign/National Quota availability (Strict 10 Foreign / 12 National)
 * 2. Squad weaknesses & role requirements (e.g. Death bowlers, Powerplay bowlers, Wicket-keepers)
 * 3. Player performance (previous season score, Champions League performance, recent form)
 * 4. Player age & potential (upside vs decline)
 * 5. Current skill rating & form
 * 6. Injury status (penalizing injured players)
 */
export const evaluatePlayerDraftValue = (
    player: Player,
    team: Team,
    currentSeason: number
): number => {
    const squadAnalysis = analyzeSquadComposition(team);

    // 1. Quota Hard Checks
    if (player.isForeign && squadAnalysis.foreignSlotsRemaining <= 0) {
        return -999999; // Foreign quota exhausted
    }
    if (!player.isForeign && squadAnalysis.nationalSlotsRemaining <= 0) {
        return -999999; // National quota exhausted
    }

    let valuation = 0;

    // 2. Base Skill Rating (40 - 100)
    const primarySkill = Math.max(player.battingSkill, player.secondarySkill);
    const overallRating = (player.role === PlayerRole.ALL_ROUNDER)
        ? (player.battingSkill * 0.5 + player.secondarySkill * 0.5)
        : primarySkill;
    valuation += overallRating * 1.5;

    // 3. Squad Weakness & Positional Urgency
    const subRole = getPlayerSubRole(player).toLowerCase();

    // Critical Role: Wicket Keeper
    if (player.role === PlayerRole.WICKET_KEEPER) {
        if (squadAnalysis.wicketKeepersNeeded >= 2) valuation += 45;
        else if (squadAnalysis.wicketKeepersNeeded === 1) valuation += 25;
        else valuation -= 15; // Already have enough keepers
    }

    // Critical Role: Death Bowler
    if (subRole.includes('death') || player.bowlingSubType === 'fbs') {
        if (squadAnalysis.deathBowlersNeeded >= 2) valuation += 40;
        else if (squadAnalysis.deathBowlersNeeded === 1) valuation += 20;
    }

    // Role: Powerplay Bowler
    if (subRole.includes('powerplay') || player.bowlingSubType === 'fb') {
        if (squadAnalysis.powerplayBowlersNeeded >= 2) valuation += 30;
        else if (squadAnalysis.powerplayBowlersNeeded === 1) valuation += 15;
    }

    // Role: Spinner
    if (player.role === PlayerRole.SPIN_BOWLER || subRole.includes('spinner')) {
        if (squadAnalysis.spinnersNeeded >= 2) valuation += 28;
        else if (squadAnalysis.spinnersNeeded === 1) valuation += 14;
    }

    // Role: Opening Batter
    if (player.isOpener || subRole.includes('opening')) {
        if (squadAnalysis.openersNeeded >= 2) valuation += 30;
        else if (squadAnalysis.openersNeeded === 1) valuation += 15;
    }

    // Role: Finisher
    if (player.isFinisher || subRole.includes('finisher')) {
        if (squadAnalysis.finishersNeeded >= 2) valuation += 26;
        else if (squadAnalysis.finishersNeeded === 1) valuation += 12;
    }

    // Role: All-Rounder
    if (player.role === PlayerRole.ALL_ROUNDER) {
        if (squadAnalysis.allRoundersNeeded >= 2) valuation += 32;
        else if (squadAnalysis.allRoundersNeeded === 1) valuation += 16;
    }

    // Role: Fast Bowler
    if (player.role === PlayerRole.FAST_BOWLER) {
        if (squadAnalysis.fastBowlersNeeded >= 3) valuation += 25;
        else if (squadAnalysis.fastBowlersNeeded >= 1) valuation += 12;
    }

    // 4. Player Performance (Previous season performance & Champions League performance)
    const prevSeasonScore = player.previousSeasonPerformance || player.seasonPerformanceScore?.totalScore || 65;
    valuation += (prevSeasonScore - 50) * 0.4;

    const clPerf = player.championsLeaguePerformance || 60;
    valuation += (clPerf - 50) * 0.25;

    // 5. Form (50 - 99)
    const form = player.form || 70;
    valuation += (form - 70) * 0.35;

    // 6. Age & Potential
    const age = player.age || 26;
    const potential = player.potential || (age < 25 ? 85 : 75);

    if (age <= 23) {
        // High upside youth
        valuation += 16 + ((potential - 70) * 0.4);
    } else if (age <= 28) {
        // Prime age
        valuation += 10;
    } else if (age >= 35) {
        // Aging veteran
        valuation -= (age - 34) * 4;
    }

    // 7. Injury Evaluation (Penalize injured players)
    if (player.injury) {
        if (player.injury.durationType === 'seasons') {
            valuation -= 65; // Severe long term injury
        } else {
            valuation -= Math.min(45, (player.injury.durationValue || 3) * 8);
        }
    }
    if (player.healthStatus === 'injured') {
        valuation -= 30;
    }

    // 8. Foreign Quota Urgency
    // If a team is running low on foreign slots or national slots as draft nears end
    const remainingSlots = squadAnalysis.totalSlotsRemaining;
    if (player.isForeign && squadAnalysis.foreignSlotsRemaining > remainingSlots * 0.7) {
        valuation += 15; // Must draft foreign to meet 10-player minimum
    }
    if (!player.isForeign && squadAnalysis.nationalSlotsRemaining > remainingSlots * 0.7) {
        valuation += 15; // Must draft national to meet 12-player minimum
    }

    return Math.round(valuation * 10) / 10;
};

/**
 * Picks the most optimal draft candidate for an AI team based on multi-factor valuation.
 */
export const selectBestDraftPickForTeam = (
    team: Team,
    availablePool: Player[],
    currentSeason: number
): Player | null => {
    if (!availablePool || availablePool.length === 0) return null;

    const squadAnalysis = analyzeSquadComposition(team);

    // Filter valid pool by nationality quota
    const validPool = availablePool.filter(p => {
        if (p.isForeign && squadAnalysis.foreignSlotsRemaining <= 0) return false;
        if (!p.isForeign && squadAnalysis.nationalSlotsRemaining <= 0) return false;
        return true;
    });

    const candidates = validPool.length > 0 ? validPool : availablePool;

    // Rank candidates by valuation score
    const scored = candidates.map(p => ({
        player: p,
        score: evaluatePlayerDraftValue(p, team, currentSeason)
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored[0]?.player || candidates[0] || null;
};

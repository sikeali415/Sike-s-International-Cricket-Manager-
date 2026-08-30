import { Player, PlayerRole, BattingStyle, BowlingSubType } from '../types';

export interface CountryQuotaRule {
    country: string;
    initialLimit: number;
    maxCompletedSeasons?: number; // unavailable when completedSeasons >= maxCompletedSeasons (e.g. 2 -> available Year 1-2, 0 in Year 3+)
    isFixed?: boolean; // Small nation / India remains fixed
    notes?: string;
}

/**
 * Foreign Player Availability Specification by Country
 */
export const FOREIGN_COUNTRY_RULES: Record<string, CountryQuotaRule> = {
    'Australia': { country: 'Australia', initialLimit: 999 },
    'England': { country: 'England', initialLimit: 999 },
    'South Africa': { country: 'South Africa', initialLimit: 999 },
    'New Zealand': { country: 'New Zealand', initialLimit: 999 },
    'India': { country: 'India', initialLimit: 999, isFixed: true },
    'Afghanistan': { country: 'Afghanistan', initialLimit: 999, isFixed: true },
    'West Indies': { country: 'West Indies', initialLimit: 999 },
    'Sri Lanka': { country: 'Sri Lanka', initialLimit: 999 },
    'Netherlands': { country: 'Netherlands', initialLimit: 999, isFixed: true },
    'Scotland': { country: 'Scotland', initialLimit: 999 },
    'USA': { country: 'USA', initialLimit: 999, isFixed: true },
    'Nepal': { country: 'Nepal', initialLimit: 999, isFixed: true },
    'Namibia': { country: 'Namibia', initialLimit: 999 },
    'Oman': { country: 'Oman', initialLimit: 999 },
    'Canada': { country: 'Canada', initialLimit: 999 },
    'UAE': { country: 'UAE', initialLimit: 999 },
    'Bangladesh': { country: 'Bangladesh', initialLimit: 999 },
    'Ireland': { country: 'Ireland', initialLimit: 999, isFixed: true },
    'Zimbabwe': { country: 'Zimbabwe', initialLimit: 999 }
};

/**
 * Calculates the exact foreign player draft availability quota for a country in a given season.
 * All players from all countries are now 100% available without limit.
 */
export const getCountryForeignLimit = (country: string, seasonNumber: number): { limit: number; isExpired: boolean; rule: CountryQuotaRule | null } => {
    const rule = FOREIGN_COUNTRY_RULES[country] || { country, initialLimit: 999 };
    return { limit: 999, isExpired: false, rule };
};

/**
 * Categorizes a player into specific positional sub-roles for draft pools
 */
export const getPlayerSubRole = (player: Player): string => {
    if (player.subRole) return player.subRole;

    const role = player.role;
    const isOpener = player.isOpener;
    const isFinisher = player.isFinisher;
    const traits = player.bowlingSubType;

    if (role === PlayerRole.BATSMAN) {
        if (isOpener) return 'Opening Batter';
        if (isFinisher) return 'Finisher';
        if (player.battingSkill >= 75) return 'Specialist Batter';
        return 'Middle-Order Batter';
    }

    if (role === PlayerRole.WICKET_KEEPER) {
        if (isOpener) return 'Opening WK-Batter';
        if (isFinisher) return 'Finisher WK';
        return 'Wicket Keeper';
    }

    if (role === PlayerRole.FAST_BOWLER) {
        if (traits === 'fbs' || player.secondarySkill >= 80) return 'Death Bowler';
        if (traits === 'fb') return 'Powerplay Bowler';
        if (traits === 'mv' || traits === 'm') return 'Medium Pacer';
        return 'Fast Bowler';
    }

    if (role === PlayerRole.SPIN_BOWLER) {
        return 'Spinner';
    }

    if (role === PlayerRole.ALL_ROUNDER) {
        if (player.battingSkill >= player.secondarySkill) {
            return 'Batting All-Rounder';
        }
        return 'Bowling All-Rounder';
    }

    return 'Specialist';
};

/**
 * Builds the yearly foreign draft pool, strictly enforcing country quotas and time-based availability rules.
 * Does not mutate historical player data.
 */
export const buildYearlyForeignPool = (
    allPlayers: Player[],
    currentSeason: number,
    retainedPlayerIds: Set<string>
): {
    pool: Player[];
    countryCounts: Record<string, number>;
    countryLimits: Record<string, number>;
    expiredCountries: string[];
} => {
    // 1. Gather all foreign players not retained in any squad
    const availableForeign = allPlayers.filter(p => p.isForeign && !retainedPlayerIds.has(p.id));

    // 2. Group by nationality
    const groupedByCountry: Record<string, Player[]> = {};
    availableForeign.forEach(p => {
        const country = p.nationality || 'Other';
        if (!groupedByCountry[country]) groupedByCountry[country] = [];
        groupedByCountry[country].push(p);
    });

    const finalizedPool: Player[] = [];
    const countryCounts: Record<string, number> = {};
    const countryLimits: Record<string, number> = {};
    const expiredCountries: string[] = [];

    // 3. For every foreign country rule, take up to allowed limit sorted by highest skill + potential
    Object.keys(FOREIGN_COUNTRY_RULES).forEach(country => {
        const { limit, isExpired } = getCountryForeignLimit(country, currentSeason);
        countryLimits[country] = limit;

        if (isExpired) {
            expiredCountries.push(country);
        }

        const countryCandidates = groupedByCountry[country] || [];
        // Sort best players first (batting + bowling skill + potential)
        const sortedCandidates = [...countryCandidates].sort((a, b) => {
            const valA = Math.max(a.battingSkill, a.secondarySkill) + ((a.potential || 75) * 0.2);
            const valB = Math.max(b.battingSkill, b.secondarySkill) + ((b.potential || 75) * 0.2);
            return valB - valA;
        });

        const selected = sortedCandidates.slice(0, limit);
        finalizedPool.push(...selected);
        countryCounts[country] = selected.length;
    });

    // Handle any foreign players from other nations not explicitly in the rules
    Object.keys(groupedByCountry).forEach(country => {
        if (!FOREIGN_COUNTRY_RULES[country]) {
            const { limit } = getCountryForeignLimit(country, currentSeason);
            countryLimits[country] = limit;
            const selected = (groupedByCountry[country] || []).slice(0, limit);
            finalizedPool.push(...selected);
            countryCounts[country] = selected.length;
        }
    });

    return {
        pool: finalizedPool,
        countryCounts,
        countryLimits,
        expiredCountries
    };
};

/**
 * Filter criteria for Foreign Player search
 */
export interface ForeignFilterCriteria {
    country: string; // 'ALL' or specific country
    role: string; // 'ALL' or PlayerRole
    battingStyle: string; // 'ALL' or BattingStyle
    bowlingStyle: string; // 'ALL' or BowlingSubType
    subRole: string; // 'ALL' or specific subRole
    minRating: number;
    minForm: number;
    minPrevSeason: number;
    minWorldLeague?: number;
    minChampionsLeague?: number;
    searchQuery: string;
}

/**
 * Checks if a player passes foreign filter criteria
 */
export const matchesForeignFilters = (player: Player, filters: ForeignFilterCriteria): boolean => {
    if (!player.isForeign) return false;

    if (filters.country !== 'ALL' && player.nationality !== filters.country) return false;
    if (filters.role !== 'ALL' && player.role !== filters.role) return false;
    if (filters.battingStyle !== 'ALL' && player.style !== filters.battingStyle) return false;
    if (filters.bowlingStyle !== 'ALL' && player.bowlingSubType !== filters.bowlingStyle) return false;
    
    if (filters.subRole !== 'ALL') {
        const pSubRole = getPlayerSubRole(player);
        if (!pSubRole.toLowerCase().includes(filters.subRole.toLowerCase())) return false;
    }

    const topSkill = Math.max(player.battingSkill, player.secondarySkill);
    if (topSkill < filters.minRating) return false;

    const form = player.form || 70;
    if (form < filters.minForm) return false;

    const prevSeason = player.previousSeasonPerformance || 50;
    if (prevSeason < filters.minPrevSeason) return false;

    const targetWL = filters.minWorldLeague ?? filters.minChampionsLeague ?? 50;
    const wlPerf = player.worldLeaguePerformance || player.championsLeaguePerformance || 50;
    if (wlPerf < targetWL) return false;

    if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase().trim();
        const matchesName = player.name.toLowerCase().includes(q);
        const matchesNat = player.nationality.toLowerCase().includes(q);
        const matchesSubRole = getPlayerSubRole(player).toLowerCase().includes(q);
        if (!matchesName && !matchesNat && !matchesSubRole) return false;
    }

    return true;
};

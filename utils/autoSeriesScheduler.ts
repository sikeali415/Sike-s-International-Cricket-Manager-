import { 
  GameData, 
  Format, 
  Team, 
  Match, 
  GameDate, 
  Series, 
  RankingFormat, 
  TeamRanking,
  SeriesFormatMatchConfig
} from '../types';
import { 
  totalDaysFromDate, 
  dateFromTotalDays, 
  formatShortDate, 
  getMatchDurationDays,
  doDateRangesOverlap,
  MAJOR_TOURNAMENT_MONTH
} from './gameCalendar';

export interface GeneratedAnnualSchedule {
  seriesList: Series[];
  matchesByFormat: Record<string, Match[]>;
}

export type TeamTier = 'top' | 'mid' | 'bottom';

export interface TeamTierInfo {
  team: Team;
  tier: TeamTier;
  rating: number;
  rank: number;
}

/**
 * Categorize teams into 3 competitive tiers based on ICC Rankings or average skills
 */
export const classifyTeamTiers = (
  teams: Team[],
  rankings?: { teams: Record<RankingFormat, TeamRanking[]> }
): TeamTierInfo[] => {
  // Compute composite rating from rankings if available or squad attributes
  const sorted = [...teams].map(team => {
    let rating = 100;
    if (rankings?.teams) {
      const testR = rankings.teams.Test?.find(t => t.teamId === team.id)?.rating ?? 100;
      const odiR = rankings.teams.ODI?.find(t => t.teamId === team.id)?.rating ?? 100;
      const t20R = rankings.teams.T20?.find(t => t.teamId === team.id)?.rating ?? 100;
      rating = (testR + odiR + t20R) / 3;
    } else {
      const avgBat = team.squad.reduce((sum, p) => sum + (p.battingSkill || 50), 0) / (team.squad.length || 1);
      const avgBowl = team.squad.reduce((sum, p) => sum + (p.secondarySkill || 30), 0) / (team.squad.length || 1);
      rating = 80 + (avgBat * 0.3) + (avgBowl * 0.25);
    }
    return { team, rating };
  }).sort((a, b) => b.rating - a.rating);

  const total = sorted.length;
  const topCut = Math.min(6, Math.floor(total * 0.33));
  const midCut = Math.min(13, Math.floor(total * 0.68));

  return sorted.map((item, idx) => {
    let tier: TeamTier = 'bottom';
    if (idx < topCut) tier = 'top';
    else if (idx < midCut) tier = 'mid';

    return {
      team: item.team,
      tier,
      rating: Math.round(item.rating),
      rank: idx + 1
    };
  });
};

/**
 * Format mix templates for diverse annual tours
 */
const FORMAT_MIX_OPTIONS: {
  name: string;
  isMultiFormat: boolean;
  primaryFormat: 'T20' | 'ODI' | 'Test' | 'Multi-Format';
  breakdown: SeriesFormatMatchConfig[];
  restDays: number;
}[] = [
  // Single-Format
  { name: 'T20I Bilateral Series', isMultiFormat: false, primaryFormat: 'T20', breakdown: [{ format: 'T20', count: 3 }], restDays: 2 },
  { name: 'ODI Super Series', isMultiFormat: false, primaryFormat: 'ODI', breakdown: [{ format: 'ODI', count: 3 }], restDays: 3 },
  { name: 'Test Championship Series', isMultiFormat: false, primaryFormat: 'Test', breakdown: [{ format: 'Test', count: 2 }], restDays: 3 },
  
  // Multi-Format Tours
  { name: 'White-Ball Tour (T20I + ODI)', isMultiFormat: true, primaryFormat: 'Multi-Format', breakdown: [{ format: 'T20', count: 3 }, { format: 'ODI', count: 3 }], restDays: 2 },
  { name: 'All-Round Tour (ODI + Test)', isMultiFormat: true, primaryFormat: 'Multi-Format', breakdown: [{ format: 'ODI', count: 3 }, { format: 'Test', count: 2 }], restDays: 3 },
  { name: 'Full Bilateral Tour (T20 + ODI + Test)', isMultiFormat: true, primaryFormat: 'Multi-Format', breakdown: [{ format: 'T20', count: 2 }, { format: 'ODI', count: 2 }, { format: 'Test', count: 2 }], restDays: 2 }
];

/**
 * Generates an entire Year's Rank-Aware Bilateral Series Calendar
 * Up to 6 series per team spread across Months 1 - 11.
 */
export const generateAnnualAutoSeries = (
  year: number,
  teams: Team[],
  rankings?: { teams: Record<RankingFormat, TeamRanking[]> },
  existingManualSeries: Series[] = []
): GeneratedAnnualSchedule => {
  const classified = classifyTeamTiers(teams, rankings);
  const teamMap = new Map(classified.map(c => [c.team.id, c]));

  const topTeams = classified.filter(c => c.tier === 'top').map(c => c.team.id);
  const midTeams = classified.filter(c => c.tier === 'mid').map(c => c.team.id);
  const bottomTeams = classified.filter(c => c.tier === 'bottom').map(c => c.team.id);

  // Track matchups to avoid repeating the exact same matchup in the same year
  const pairCounts = new Map<string, number>();
  const getPairKey = (id1: string, id2: string) => [id1, id2].sort().join('___');

  // Track team series counts (aim for up to 6 series per team)
  const teamSeriesCount = new Map<string, number>();
  teams.forEach(t => teamSeriesCount.set(t.id, 0));

  // 6 Tour Windows across Months 1 to 11
  // Window 1: M1 D5 to M2 D25
  // Window 2: M3 D1 to M4 D20
  // Window 3: M5 D1 to M6 D20
  // Window 4: M7 D1 to M8 D20
  // Window 5: M9 D1 to M10 D20
  // Window 6: M10 D25 to M11 D28
  const TOUR_WINDOWS: { start: GameDate; maxEnd: GameDate }[] = [
    { start: { year, month: 1, day: 5 }, maxEnd: { year, month: 2, day: 26 } },
    { start: { year, month: 3, day: 2 }, maxEnd: { year, month: 4, day: 26 } },
    { start: { year, month: 5, day: 2 }, maxEnd: { year, month: 6, day: 26 } },
    { start: { year, month: 7, day: 2 }, maxEnd: { year, month: 8, day: 26 } },
    { start: { year, month: 9, day: 2 }, maxEnd: { year, month: 10, day: 24 } },
    { start: { year, month: 10, day: 26 }, maxEnd: { year, month: 11, day: 28 } },
  ];

  const generatedSeriesList: Series[] = [];
  const matchesByFormat: Record<string, Match[]> = {
    [Format.T20]: [],
    [Format.ODI]: [],
    [Format.SHIELD]: []
  };

  // Helper to check team busy in a date window
  const isTeamBusy = (teamId: string, sDate: GameDate, eDate: GameDate): boolean => {
    // Check manual series
    for (const s of existingManualSeries) {
      if (s.teamAId === teamId || s.teamBId === teamId || s.teamA === teamId || s.teamB === teamId) {
        if (doDateRangesOverlap(sDate, eDate, s.startDate, s.endDate)) return true;
      }
    }
    // Check generated series
    for (const s of generatedSeriesList) {
      if (s.teamAId === teamId || s.teamBId === teamId) {
        if (doDateRangesOverlap(sDate, eDate, s.startDate, s.endDate)) return true;
      }
    }
    return false;
  };

  // Build target matchups per window
  TOUR_WINDOWS.forEach((window, wIdx) => {
    const availableTeams = [...teams]
      .filter(t => (teamSeriesCount.get(t.id) || 0) < 6)
      .sort(() => 0.5 - Math.random());

    const pairedThisWindow = new Set<string>();

    for (let i = 0; i < availableTeams.length; i++) {
      const teamA = availableTeams[i];
      if (pairedThisWindow.has(teamA.id)) continue;

      const tierA = teamMap.get(teamA.id)?.tier || 'mid';

      // Pick opponent based on desired distribution:
      // Windows 0 & 1: Same Tier (2 series)
      // Windows 2 & 3: Adjacent Tier (2 series)
      // Windows 4 & 5: Distant / Cross Tier (1-2 series)
      let candidates: string[] = [];

      if (wIdx === 0 || wIdx === 1) {
        // Same-tier preferred
        if (tierA === 'top') candidates = topTeams.filter(id => id !== teamA.id);
        else if (tierA === 'mid') candidates = midTeams.filter(id => id !== teamA.id);
        else candidates = bottomTeams.filter(id => id !== teamA.id);
      } else if (wIdx === 2 || wIdx === 3) {
        // Adjacent-tier preferred
        if (tierA === 'top') candidates = [...midTeams];
        else if (tierA === 'mid') candidates = [...topTeams, ...bottomTeams];
        else candidates = [...midTeams];
      } else {
        // Cross-tier / distant-tier preferred (Top vs Bottom, etc.)
        if (tierA === 'top') candidates = [...bottomTeams, ...midTeams];
        else if (tierA === 'bottom') candidates = [...topTeams, ...midTeams];
        else candidates = [...topTeams, ...bottomTeams];
      }

      // Filter candidates who are not already paired this window and haven't played too many times
      const validCandidates = candidates
        .filter(cId => !pairedThisWindow.has(cId) && (teamSeriesCount.get(cId) || 0) < 6)
        .sort((a, b) => {
          const pairScoreA = pairCounts.get(getPairKey(teamA.id, a)) || 0;
          const pairScoreB = pairCounts.get(getPairKey(teamA.id, b)) || 0;
          return pairScoreA - pairScoreB;
        });

      if (validCandidates.length === 0) {
        // Fallback to any available team
        const fallback = availableTeams.find(t => t.id !== teamA.id && !pairedThisWindow.has(t.id));
        if (fallback) validCandidates.push(fallback.id);
      }

      if (validCandidates.length > 0) {
        const teamBId = validCandidates[0];
        const teamB = teams.find(t => t.id === teamBId);
        if (!teamB) continue;

        // Choose format mix: vary according to window and team history
        const mixChoice = FORMAT_MIX_OPTIONS[(wIdx + i) % FORMAT_MIX_OPTIONS.length];
        
        // Calculate match dates
        let currentDayOffset = 0;
        const seriesMatches: Match[] = [];
        const seriesStartDate = { ...window.start };
        let startDays = totalDaysFromDate(seriesStartDate);

        // Build series breakdown
        const allMatchConfigs: { format: 'T20' | 'ODI' | 'Test'; index: number }[] = [];
        mixChoice.breakdown.forEach(b => {
          for (let m = 0; m < b.count; m++) {
            allMatchConfigs.push({ format: b.format, index: m + 1 });
          }
        });

        const totalMatchCount = allMatchConfigs.length;
        const seriesId = `series-auto-${year}-w${wIdx + 1}-${teamA.id.slice(0, 3)}-${teamB.id.slice(0, 3)}`;
        
        let tierCategory: 'same-tier' | 'adjacent-tier' | 'cross-tier' = 'same-tier';
        const tierB = teamMap.get(teamB.id)?.tier || 'mid';
        if (tierA === tierB) tierCategory = 'same-tier';
        else if ((tierA === 'top' && tierB === 'bottom') || (tierA === 'bottom' && tierB === 'top')) tierCategory = 'cross-tier';
        else tierCategory = 'adjacent-tier';

        let seriesName = `${teamA.name} vs ${teamB.name} ${mixChoice.name}`;
        if (mixChoice.isMultiFormat) {
          seriesName = `${teamA.name} tour of ${teamB.name} (${mixChoice.name})`;
        }

        allMatchConfigs.forEach((cfg, mIdx) => {
          const matchDate = dateFromTotalDays(startDays + currentDayOffset);
          const isHome = mIdx % 2 === 0;
          const matchDuration = cfg.format === 'Test' ? 5 : 1;

          const matchFormatEnum = cfg.format === 'Test' ? Format.FIRST_CLASS : (cfg.format === 'ODI' ? Format.ODI : Format.T20);

          const match: Match = {
            matchNumber: `${cfg.format} ${cfg.index}/${totalMatchCount}`,
            teamA: isHome ? teamA.name : teamB.name,
            teamAId: isHome ? teamA.id : teamB.id,
            vs: 'vs',
            teamB: isHome ? teamB.name : teamA.name,
            teamBId: isHome ? teamB.id : teamA.id,
            date: formatShortDate(matchDate),
            scheduledDate: matchDate,
            group: 'Bilateral Series',
            seriesId,
            seriesName,
            format: matchFormatEnum,
            daysPlayed: matchDuration
          };

          seriesMatches.push(match);
          currentDayOffset += (matchDuration + mixChoice.restDays);
        });

        const seriesEndDate = dateFromTotalDays(startDays + currentDayOffset - mixChoice.restDays);

        // Verify bounds: must not be in month 12
        if (seriesEndDate.month < MAJOR_TOURNAMENT_MONTH && seriesEndDate.year === year) {
          if (!isTeamBusy(teamA.id, seriesStartDate, seriesEndDate) && !isTeamBusy(teamB.id, seriesStartDate, seriesEndDate)) {
            const seriesEntry: Series = {
              id: seriesId,
              name: seriesName,
              teamA: teamA.name,
              teamAId: teamA.id,
              teamB: teamB.name,
              teamBId: teamB.id,
              format: mixChoice.primaryFormat,
              formatsIncluded: mixChoice.breakdown.map(b => b.format),
              formatBreakdown: mixChoice.breakdown,
              startDate: seriesStartDate,
              endDate: seriesEndDate,
              numberOfMatches: totalMatchCount,
              status: 'upcoming',
              restDays: mixChoice.restDays,
              autoGenerated: true,
              tierCategory,
              seriesScore: {
                teamAWins: 0,
                teamBWins: 0,
                draws: 0,
                ties: 0
              }
            };

            generatedSeriesList.push(seriesEntry);

            // Append matches to respective format buckets
            seriesMatches.forEach(m => {
              const fmt = m.format;
              if (!matchesByFormat[fmt]) matchesByFormat[fmt] = [];
              matchesByFormat[fmt].push(m);
            });

            // Update stats
            pairedThisWindow.add(teamA.id);
            pairedThisWindow.add(teamB.id);
            teamSeriesCount.set(teamA.id, (teamSeriesCount.get(teamA.id) || 0) + 1);
            teamSeriesCount.set(teamB.id, (teamSeriesCount.get(teamB.id) || 0) + 1);
            const pKey = getPairKey(teamA.id, teamB.id);
            pairCounts.set(pKey, (pairCounts.get(pKey) || 0) + 1);
          }
        }
      }
    }
  });

  return {
    seriesList: generatedSeriesList,
    matchesByFormat
  };
};

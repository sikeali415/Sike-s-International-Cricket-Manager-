import { GameDate, Format, Match, MatchResult, ScheduledEvent, Series, GameData } from '../types';

export const DAYS_IN_MONTH = 30;
export const MONTHS_IN_YEAR = 12;
export const MAJOR_TOURNAMENT_MONTH = 12;

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

export const MONTH_SHORT_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
];

export const MONTH_THEMES: Record<number, { title: string; subtitle: string; primaryFormat: Format | 'MAJOR' | 'ALL'; icon: string; locked?: boolean }> = {
  1: { title: 'T20 Premier Season Opening', subtitle: 'Fast-paced league cricket kick-off', primaryFormat: Format.T20, icon: '⚡' },
  2: { title: 'T20 Mid-Season & Derbies', subtitle: 'Rivalry week and high-scoring clashes', primaryFormat: Format.T20, icon: '🔥' },
  3: { title: 'T20 Knockouts & Finals', subtitle: 'Championship playoffs and trophies', primaryFormat: Format.T20, icon: '🏆' },
  4: { title: 'One-Day Cup Season Start', subtitle: '50-over classic tournament begins', primaryFormat: Format.ODI, icon: '🏏' },
  5: { title: 'One-Day Cup Mid-Season', subtitle: 'Crucial group stages and bonus points', primaryFormat: Format.ODI, icon: '🎯' },
  6: { title: 'One-Day Cup Knockouts', subtitle: 'Quarter-finals, semi-finals and finale', primaryFormat: Format.ODI, icon: '🥇' },
  7: { title: 'Development & List-A Tours', subtitle: 'Emerging talent and bilateral series', primaryFormat: Format.DEVELOPMENT_ODI, icon: '🌟' },
  8: { title: 'First-Class Championship Begins', subtitle: 'Red-ball cricket and patience test', primaryFormat: Format.FIRST_CLASS, icon: '🛡️' },
  9: { title: 'First-Class Shield Stage 2', subtitle: 'Four-day grinding matches', primaryFormat: Format.FIRST_CLASS, icon: '⏳' },
  10: { title: 'First-Class Shield Climax', subtitle: 'Championship rounds and promotion fight', primaryFormat: Format.FIRST_CLASS, icon: '🎖️' },
  11: { title: 'Bilateral Test & T20 Series', subtitle: 'Final league battles before Major event', primaryFormat: Format.FIRST_CLASS, icon: '⚔️' },
  12: { 
    title: 'Major International Tournament Month', 
    subtitle: 'Locked exclusively for the Year-End Major Tournament (ICC/Global Cup)', 
    primaryFormat: 'MAJOR', 
    icon: '👑',
    locked: true
  }
};

/**
 * Converts a GameDate to total absolute days from Year 1, Month 1, Day 1
 */
export const totalDaysFromDate = (date: GameDate): number => {
  const y = Math.max(1, date?.year || 1);
  const m = Math.max(1, Math.min(12, date?.month || 1));
  const d = Math.max(1, Math.min(30, date?.day || 1));
  return ((y - 1) * 360) + ((m - 1) * 30) + d;
};

/**
 * Converts total absolute days into a structured GameDate
 */
export const dateFromTotalDays = (totalDays: number): GameDate => {
  const zeroBased = Math.max(0, totalDays - 1);
  const year = Math.floor(zeroBased / 360) + 1;
  const remYear = zeroBased % 360;
  const month = Math.floor(remYear / 30) + 1;
  const day = (remYear % 30) + 1;
  return { year, month, day };
};

/**
 * Advance a date by N days, checking if the season/year has completed (Month 12 finished)
 */
export const advanceGameDate = (date: GameDate, days: number): { newDate: GameDate; seasonEnded: boolean; yearsAdvanced: number } => {
  const startDays = totalDaysFromDate(date);
  const targetDays = startDays + Math.max(1, days);
  const newDate = dateFromTotalDays(targetDays);
  const yearsAdvanced = newDate.year - (date?.year || 1);
  const seasonEnded = yearsAdvanced > 0;
  return { newDate, seasonEnded, yearsAdvanced };
};

/**
 * Format date for friendly UI display
 */
export const formatGameDate = (date: GameDate, includeYear = true): string => {
  if (!date) return 'Y1 M1 D1';
  const mName = MONTH_SHORT_NAMES[(date.month - 1) % 12] || `M${date.month}`;
  if (includeYear) {
    return `${mName} ${date.day}, Year ${date.year}`;
  }
  return `${mName} ${date.day}`;
};

export const formatFullGameDate = (date: GameDate): string => {
  if (!date) return 'Month 1, Day 1, Year 1';
  const mName = MONTH_NAMES[(date.month - 1) % 12] || `Month ${date.month}`;
  return `${mName} (Month ${date.month}), Day ${date.day} — Year ${date.year}`;
};

export const formatShortDate = (date: GameDate): string => {
  if (!date) return 'M1 D1';
  return `M${date.month} D${date.day}`;
};

export const isSameDate = (d1: GameDate, d2: GameDate): boolean => {
  if (!d1 || !d2) return false;
  return d1.year === d2.year && d1.month === d2.month && d1.day === d2.day;
};

export const isDateBefore = (d1: GameDate, d2: GameDate): boolean => {
  return totalDaysFromDate(d1) < totalDaysFromDate(d2);
};

export const isDateAfter = (d1: GameDate, d2: GameDate): boolean => {
  return totalDaysFromDate(d1) > totalDaysFromDate(d2);
};

export const isDateInRange = (date: GameDate, start: GameDate, end: GameDate): boolean => {
  const current = totalDaysFromDate(date);
  return current >= totalDaysFromDate(start) && current <= totalDaysFromDate(end);
};

export const doDateRangesOverlap = (start1: GameDate, end1: GameDate, start2: GameDate, end2: GameDate): boolean => {
  const s1 = totalDaysFromDate(start1);
  const e1 = totalDaysFromDate(end1);
  const s2 = totalDaysFromDate(start2);
  const e2 = totalDaysFromDate(end2);
  return Math.max(s1, s2) <= Math.min(e1, e2);
};

export const isDateInMonth12 = (date: GameDate): boolean => {
  return (date?.month ?? 1) === MAJOR_TOURNAMENT_MONTH;
};

/**
 * Standardize format string to Format enum
 */
export const normalizeFormat = (format: 'T20' | 'ODI' | 'Test' | Format | string): Format => {
  const fStr = String(format).toLowerCase();
  if (fStr.includes('t20') || fStr === 't20') return Format.T20;
  if (fStr.includes('odi') || fStr.includes('one-day') || fStr === 'odi') return Format.ODI;
  if (fStr.includes('test') || fStr.includes('first_class') || fStr.includes('first-class') || fStr.includes('shield') || fStr === 'test') return Format.FIRST_CLASS;
  return Format.T20;
};

/**
 * Calculate match duration in days based on format and simulation result
 */
export const getMatchDurationDays = (format: Format | string, result?: MatchResult): number => {
  const fStr = String(format).toLowerCase();
  
  if (fStr.includes('t20') || fStr.includes('twenty20') || fStr.includes('t10') || fStr.includes('6ixty')) {
    return 1;
  }
  if (fStr.includes('odi') || fStr.includes('one-day') || fStr.includes('list-a') || fStr.includes('list a')) {
    return 1;
  }
  
  // Test / First-Class matches: up to 5 days
  if (result) {
    if (result.isDraw) {
      return 5; // Full 5 days played for a draw
    }
    if (result.summary && result.summary.toLowerCase().includes('innings and')) {
      return 3;
    }
    if (!result.fourthInning) {
      return 3;
    }
    if (result.fourthInning && result.fourthInning.score < 100) {
      return 4;
    }
    return 5;
  }
  return 5; // Default 5 days for FC/Test
};

/**
 * Validates Series creation against Month 12 lock and dates
 */
export interface SeriesValidationResult {
  valid: boolean;
  error?: string;
  matchDates: GameDate[];
  endDate?: GameDate;
}

export const validateSeriesCreation = (
  startDate: GameDate,
  matchCount: number,
  format: Format | string,
  restDays: number,
  currentDate: GameDate,
  existingSeries: Series[] = [],
  teamA?: string,
  teamB?: string,
  ignoreSeriesId?: string
): SeriesValidationResult => {
  if (!startDate) {
    return { valid: false, error: 'Invalid start date provided.', matchDates: [] };
  }

  if (isDateBefore(startDate, currentDate)) {
    return {
      valid: false,
      error: `Cannot schedule series in the past. Current in-game date is ${formatGameDate(currentDate)}.`,
      matchDates: []
    };
  }

  if (startDate.month === MAJOR_TOURNAMENT_MONTH) {
    return {
      valid: false,
      error: `Month 12 is locked for manual Series creation. It is reserved exclusively for the Year-End Major Tournament.`,
      matchDates: []
    };
  }

  const matchDuration = getMatchDurationDays(format);
  const gapBetweenMatches = matchDuration + Math.max(1, restDays);
  const matchDates: GameDate[] = [];

  let currentStartDays = totalDaysFromDate(startDate);

  for (let i = 0; i < matchCount; i++) {
    const matchDate = dateFromTotalDays(currentStartDays);
    
    // Check if match starts in Month 12 or crosses into next year
    if (matchDate.month === MAJOR_TOURNAMENT_MONTH || matchDate.year > startDate.year) {
      return {
        valid: false,
        error: `Match ${i + 1} (${formatShortDate(matchDate)}) overlaps into Month 12. Month 12 is locked for Major Tournaments.`,
        matchDates: []
      };
    }

    // Check if multi-day match extends into Month 12
    const matchEndDays = currentStartDays + (matchDuration - 1);
    const matchEndDate = dateFromTotalDays(matchEndDays);
    if (matchEndDate.month === MAJOR_TOURNAMENT_MONTH || matchEndDate.year > startDate.year) {
      return {
        valid: false,
        error: `Match ${i + 1} concludes in Month 12 (${formatShortDate(matchEndDate)}). Month 12 is reserved exclusively for Major Tournaments.`,
        matchDates: []
      };
    }

    matchDates.push(matchDate);
    currentStartDays += gapBetweenMatches;
  }

  const finalEndDate = dateFromTotalDays(currentStartDays - restDays);

  // Check overlap with other series for either team
  if (teamA || teamB) {
    for (const otherSeries of existingSeries) {
      if (ignoreSeriesId && otherSeries.id === ignoreSeriesId) continue;
      
      const sharesTeam = (teamA && (otherSeries.teamA?.toLowerCase() === teamA.toLowerCase() || otherSeries.teamB?.toLowerCase() === teamA.toLowerCase())) ||
                         (teamB && (otherSeries.teamA?.toLowerCase() === teamB.toLowerCase() || otherSeries.teamB?.toLowerCase() === teamB.toLowerCase()));
      
      if (sharesTeam) {
        if (doDateRangesOverlap(startDate, finalEndDate, otherSeries.startDate, otherSeries.endDate)) {
          const conflictingTeam = (teamA && (otherSeries.teamA?.toLowerCase() === teamA.toLowerCase() || otherSeries.teamB?.toLowerCase() === teamA.toLowerCase())) ? teamA : teamB;
          return {
            valid: false,
            error: `Schedule clash: "${conflictingTeam}" already has a tour scheduled ("${otherSeries.name}") between ${formatShortDate(otherSeries.startDate)} and ${formatShortDate(otherSeries.endDate)}.`,
            matchDates: []
          };
        }
      }
    }
  }

  return {
    valid: true,
    matchDates,
    endDate: finalEndDate
  };
};

/**
 * Generate matches for a series
 */
export const generateSeriesMatches = (
  series: Series,
  matchDates: GameDate[],
  teamAId?: string,
  teamBId?: string
): Match[] => {
  const matchDuration = getMatchDurationDays(series.format);
  return matchDates.map((mDate, idx) => {
    const isHome = idx % 2 === 0;
    return {
      matchNumber: `Series M${idx + 1}/${matchDates.length}`,
      teamA: isHome ? series.teamA : series.teamB,
      teamAId: isHome ? teamAId : teamBId,
      vs: 'vs',
      teamB: isHome ? series.teamB : series.teamA,
      teamBId: isHome ? teamBId : teamAId,
      date: formatShortDate(mDate),
      scheduledDate: mDate,
      group: 'Series',
      seriesId: series.id,
      seriesName: series.name,
      format: series.format,
      daysPlayed: matchDuration
    };
  });
};

/**
 * Assigns realistic calendar dates to a format's schedule
 */
export const assignCalendarDatesToSchedule = (
  matches: Match[],
  format: Format,
  seasonYear: number = 1
): Match[] => {
  if (!matches || matches.length === 0) return [];

  let startMonth = 1;
  let matchDuration = 1;
  let restDays = 2;

  const fStr = String(format).toLowerCase();
  if (fStr.includes('t20')) {
    startMonth = 1;
    matchDuration = 1;
    restDays = 2;
  } else if (fStr.includes('odi') || fStr.includes('one-day') || fStr.includes('list-a')) {
    startMonth = 4;
    matchDuration = 1;
    restDays = 3;
  } else {
    startMonth = 8;
    matchDuration = 5;
    restDays = 4;
  }

  let currentDays = totalDaysFromDate({ year: seasonYear, month: startMonth, day: 2 });

  return matches.map((m, idx) => {
    if (m.group === 'Semi-Finals' && idx > 0 && matches[idx - 1].group === 'Round-Robin') {
      currentDays += 4;
    } else if (m.group === 'Final') {
      currentDays += 5;
    }

    const scheduledDate = dateFromTotalDays(currentDays);
    
    if (scheduledDate.month >= MAJOR_TOURNAMENT_MONTH) {
      scheduledDate.month = 11;
      scheduledDate.day = Math.min(30, 20 + (idx % 8));
    }

    const updatedMatch: Match = {
      ...m,
      scheduledDate,
      date: formatShortDate(scheduledDate),
      daysPlayed: matchDuration
    };

    currentDays += (matchDuration + restDays);

    return updatedMatch;
  });
};

/**
 * Generate default scheduled events (Tournaments, Major Tournament in Month 12)
 */
export const generateDefaultScheduledEvents = (year: number = 1): ScheduledEvent[] => {
  return [
    {
      id: `evt-t20-prem-${year}`,
      name: 'Premier T20 League',
      type: 'tournament',
      format: Format.T20,
      startDate: { year, month: 1, day: 1 },
      endDate: { year, month: 3, day: 28 },
      description: 'The premier domestic 20-over league featuring top franchise stars.',
      matchCount: 15
    },
    {
      id: `evt-odi-cup-${year}`,
      name: 'Premier One-Day Cup',
      type: 'tournament',
      format: Format.ODI,
      startDate: { year, month: 4, day: 1 },
      endDate: { year, month: 6, day: 26 },
      description: '50-over tactical cup competition spanning across national grounds.',
      matchCount: 15
    },
    {
      id: `evt-fc-shield-${year}`,
      name: 'Premier First-Class Shield',
      type: 'tournament',
      format: Format.FIRST_CLASS,
      startDate: { year, month: 8, day: 1 },
      endDate: { year, month: 11, day: 20 },
      description: 'Four-day & five-day pinnacle of red-ball patience and championship pedigree.',
      matchCount: 10
    },
    {
      id: `evt-major-tourn-${year}`,
      name: `ICC Major Championship — Year ${year}`,
      type: 'major_tournament',
      format: Format.ODI,
      startDate: { year, month: 12, day: 1 },
      endDate: { year, month: 12, day: 30 },
      isMonth12Locked: true,
      description: `🔒 Month 12 Exclusive: Pinnacle International Championship cycle.`,
      matchCount: 16
    }
  ];
};

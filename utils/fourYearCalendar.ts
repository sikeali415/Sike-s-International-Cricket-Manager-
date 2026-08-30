import { Format, GameDate, Match, Series, ScheduledEvent, Team, MatchResult, Standing } from '../types';
import { GROUNDS } from '../data';

export interface YearTournamentInfo {
  yearIndex: number; // 1, 2, 3, 4
  name: string;
  shortName: string;
  host: string;
  hostCountry: string;
  format: Format;
  formatName: 'ODI' | 'T20' | 'Test';
  description: string;
  badge: string;
  color: string;
  groups: {
    groupName: string;
    teams: string[];
  }[];
  knockoutStages: string[];
}

export const FOUR_YEAR_TOURNAMENTS: Record<number, YearTournamentInfo> = {
  1: {
    yearIndex: 1,
    name: 'ICC Men\'s Cricket World Cup (ODI)',
    shortName: 'ODI World Cup',
    host: 'India',
    hostCountry: 'India',
    format: Format.ODI,
    formatName: 'ODI',
    description: 'The pinnacle 50-over international global spectacle hosted across iconic venues in India.',
    badge: '🏆 ODI World Cup',
    color: 'from-blue-600 via-indigo-600 to-amber-500',
    groups: [
      {
        groupName: 'Group A',
        teams: ['India', 'England', 'Pakistan', 'Sri Lanka', 'West Indies']
      },
      {
        groupName: 'Group B',
        teams: ['Australia', 'South Africa', 'New Zealand', 'Bangladesh', 'Afghanistan']
      }
    ],
    knockoutStages: ['Semi-Final 1', 'Semi-Final 2', 'Final']
  },
  2: {
    yearIndex: 2,
    name: 'ICC Men\'s T20 World Cup',
    shortName: 'T20 World Cup',
    host: 'West Indies',
    hostCountry: 'West Indies',
    format: Format.T20,
    formatName: 'T20',
    description: 'High-octane 20-over world championship hosted under the Caribbean sun.',
    badge: '⚡ T20 World Cup',
    color: 'from-fuchsia-600 via-purple-600 to-pink-500',
    groups: [
      {
        groupName: 'Group A',
        teams: ['India', 'England', 'Pakistan', 'Sri Lanka', 'West Indies', 'Zimbabwe']
      },
      {
        groupName: 'Group B',
        teams: ['Australia', 'South Africa', 'New Zealand', 'Bangladesh', 'Afghanistan', 'Ireland']
      }
    ],
    knockoutStages: ['Semi-Final 1', 'Semi-Final 2', 'Final']
  },
  3: {
    yearIndex: 3,
    name: 'ICC World Test Championship Final',
    shortName: 'WTC Final',
    host: 'England',
    hostCountry: 'England',
    format: Format.SHIELD,
    formatName: 'Test',
    description: 'The ultimate pinnacle of red-ball Test cricket held at Lord\'s and The Oval.',
    badge: '🛡️ World Test Championship',
    color: 'from-emerald-700 via-teal-800 to-slate-900',
    groups: [
      {
        groupName: 'WTC Finalists',
        teams: ['India', 'Australia', 'South Africa', 'England']
      }
    ],
    knockoutStages: ['Semi-Final 1 (India vs South Africa)', 'Semi-Final 2 (Australia vs England)', 'Grand Final (Lord\'s)']
  },
  4: {
    yearIndex: 4,
    name: 'ICC Champions Trophy',
    shortName: 'Champions Trophy',
    host: 'Pakistan',
    hostCountry: 'Pakistan',
    format: Format.ODI,
    formatName: 'ODI',
    description: 'Elite 8-nation ODI championship hosted across Pakistan\'s historic grounds.',
    badge: '🌟 Champions Trophy',
    color: 'from-emerald-600 via-teal-600 to-amber-400',
    groups: [
      {
        groupName: 'Group A',
        teams: ['India', 'England', 'Pakistan', 'Sri Lanka']
      },
      {
        groupName: 'Group B',
        teams: ['Australia', 'South Africa', 'New Zealand', 'Bangladesh']
      }
    ],
    knockoutStages: ['Semi-Final 1', 'Semi-Final 2', 'Final']
  }
};

/**
 * Returns 1, 2, 3, or 4 indicating the year in the 4-year cycle
 */
export const getCycleYear = (season: number = 1): number => {
  const norm = ((season - 1) % 4) + 1;
  return norm >= 1 && norm <= 4 ? norm : 1;
};

/**
 * Returns the cycle iteration number (Cycle 1, Cycle 2, etc.)
 */
export const getCycleNumber = (season: number = 1): number => {
  return Math.floor((season - 1) / 4) + 1;
};

/**
 * Returns tournament information for a given season
 */
export const getYearTournamentConfig = (season: number = 1): YearTournamentInfo => {
  const yearIndex = getCycleYear(season);
  return FOUR_YEAR_TOURNAMENTS[yearIndex] || FOUR_YEAR_TOURNAMENTS[1];
};

// Raw Bilateral Series Definition Interface
interface RawSeriesDef {
  teamA: string;
  teamB: string;
  name?: string;
  month: number;
  startDay: number;
  formats: {
    format: 'Test' | 'ODI' | 'T20';
    matches: number;
  }[];
}

// Year 1 Bilateral Series Schedule (46 Series)
const YEAR_1_SERIES_DEFS: RawSeriesDef[] = [
  { teamA: 'Australia', teamB: 'USA', month: 1, startDay: 3, formats: [{ format: 'ODI', matches: 3 }] },
  { teamA: 'Afghanistan', teamB: 'UAE', month: 1, startDay: 5, formats: [{ format: 'ODI', matches: 3 }] },
  { teamA: 'South Africa', teamB: 'Netherlands', month: 1, startDay: 10, formats: [{ format: 'ODI', matches: 5 }] },
  { teamA: 'England', teamB: 'Namibia', month: 1, startDay: 12, formats: [{ format: 'T20', matches: 3 }] },
  { teamA: 'Sri Lanka', teamB: 'Scotland', month: 1, startDay: 18, formats: [{ format: 'ODI', matches: 5 }] },
  { teamA: 'Oman', teamB: 'West Indies', month: 1, startDay: 20, formats: [{ format: 'T20', matches: 5 }] },
  { teamA: 'Ireland', teamB: 'Pakistan', month: 1, startDay: 22, formats: [{ format: 'ODI', matches: 5 }] },
  { teamA: 'New Zealand', teamB: 'Nepal', month: 2, startDay: 2, formats: [{ format: 'ODI', matches: 3 }, { format: 'T20', matches: 3 }] },
  { teamA: 'Canada', teamB: 'Bangladesh', month: 2, startDay: 5, formats: [{ format: 'T20', matches: 5 }] },
  { teamA: 'India', teamB: 'Zimbabwe', month: 2, startDay: 10, formats: [{ format: 'T20', matches: 3 }] },
  { teamA: 'West Indies', teamB: 'Pakistan', month: 2, startDay: 14, formats: [{ format: 'T20', matches: 5 }] },
  { teamA: 'India', teamB: 'Afghanistan', month: 4, startDay: 2, formats: [{ format: 'Test', matches: 2 }, { format: 'ODI', matches: 3 }] },
  { teamA: 'Bangladesh', teamB: 'Australia', month: 4, startDay: 8, formats: [{ format: 'ODI', matches: 3 }] },
  { teamA: 'England', teamB: 'Sri Lanka', month: 4, startDay: 15, formats: [{ format: 'Test', matches: 2 }] },
  { teamA: 'South Africa', teamB: 'New Zealand', month: 4, startDay: 20, formats: [{ format: 'ODI', matches: 3 }, { format: 'T20', matches: 3 }] },
  { teamA: 'Pakistan', teamB: 'Afghanistan', month: 5, startDay: 2, formats: [{ format: 'T20', matches: 5 }] },
  { teamA: 'Bangladesh', teamB: 'West Indies', month: 5, startDay: 10, formats: [{ format: 'T20', matches: 3 }] },
  { teamA: 'Sri Lanka', teamB: 'India', month: 5, startDay: 16, formats: [{ format: 'ODI', matches: 5 }] },
  { teamA: 'Australia', teamB: 'New Zealand', month: 6, startDay: 2, formats: [{ format: 'ODI', matches: 5 }] },
  { teamA: 'England', teamB: 'South Africa', month: 6, startDay: 12, formats: [{ format: 'Test', matches: 3 }] },
  { teamA: 'Pakistan', teamB: 'Bangladesh', month: 6, startDay: 20, formats: [{ format: 'ODI', matches: 3 }] },
  { teamA: 'Afghanistan', teamB: 'Sri Lanka', month: 7, startDay: 2, formats: [{ format: 'Test', matches: 2 }, { format: 'ODI', matches: 3 }, { format: 'T20', matches: 3 }] },
  { teamA: 'West Indies', teamB: 'New Zealand', month: 7, startDay: 14, formats: [{ format: 'T20', matches: 3 }] },
  { teamA: 'South Africa', teamB: 'India', month: 7, startDay: 20, formats: [{ format: 'T20', matches: 5 }] },
  { teamA: 'England', teamB: 'Australia', month: 8, startDay: 2, formats: [{ format: 'Test', matches: 3 }] },
  { teamA: 'Pakistan', teamB: 'Sri Lanka', month: 8, startDay: 12, formats: [{ format: 'T20', matches: 3 }] },
  { teamA: 'New Zealand', teamB: 'Bangladesh', month: 8, startDay: 18, formats: [{ format: 'Test', matches: 3 }] },
  { teamA: 'Afghanistan', teamB: 'South Africa', month: 9, startDay: 2, formats: [{ format: 'ODI', matches: 5 }] },
  { teamA: 'West Indies', teamB: 'England', month: 9, startDay: 10, formats: [{ format: 'ODI', matches: 5 }] },
  { teamA: 'India', teamB: 'Australia', month: 9, startDay: 18, formats: [{ format: 'ODI', matches: 3 }] },
  { teamA: 'New Zealand', teamB: 'Pakistan', month: 10, startDay: 2, formats: [{ format: 'ODI', matches: 5 }] },
  { teamA: 'Sri Lanka', teamB: 'South Africa', month: 10, startDay: 12, formats: [{ format: 'ODI', matches: 5 }] },
  { teamA: 'Bangladesh', teamB: 'England', month: 10, startDay: 20, formats: [{ format: 'ODI', matches: 5 }] },
  { teamA: 'Australia', teamB: 'Afghanistan', month: 11, startDay: 2, formats: [{ format: 'ODI', matches: 3 }, { format: 'T20', matches: 3 }] },
  { teamA: 'West Indies', teamB: 'India', month: 11, startDay: 12, formats: [{ format: 'Test', matches: 2 }, { format: 'ODI', matches: 3 }] },
  { teamA: 'Zimbabwe', teamB: 'Namibia', month: 11, startDay: 20, formats: [{ format: 'ODI', matches: 3 }] },
  { teamA: 'Canada', teamB: 'Nepal', month: 12, startDay: 1, formats: [{ format: 'ODI', matches: 3 }, { format: 'T20', matches: 3 }] },
  { teamA: 'USA', teamB: 'Oman', month: 12, startDay: 5, formats: [{ format: 'ODI', matches: 3 }] },
  { teamA: 'UAE', teamB: 'Ireland', month: 12, startDay: 8, formats: [{ format: 'T20', matches: 5 }] },
  { teamA: 'Netherlands', teamB: 'Scotland', month: 12, startDay: 12, formats: [{ format: 'ODI', matches: 3 }, { format: 'T20', matches: 3 }] },
  { teamA: 'Nepal', teamB: 'Zimbabwe', month: 12, startDay: 15, formats: [{ format: 'ODI', matches: 3 }, { format: 'T20', matches: 3 }] },
  { teamA: 'Namibia', teamB: 'Oman', month: 12, startDay: 18, formats: [{ format: 'T20', matches: 3 }] },
  { teamA: 'UAE', teamB: 'Canada', month: 12, startDay: 20, formats: [{ format: 'T20', matches: 5 }] },
  { teamA: 'Scotland', teamB: 'USA', month: 12, startDay: 22, formats: [{ format: 'ODI', matches: 3 }, { format: 'T20', matches: 3 }] },
  { teamA: 'Ireland', teamB: 'Netherlands', month: 12, startDay: 25, formats: [{ format: 'T20', matches: 3 }] },
  { teamA: 'Oman', teamB: 'Canada', month: 12, startDay: 27, formats: [{ format: 'ODI', matches: 3 }] }
];

// Year 2 Bilateral Series Schedule (45 Series)
const YEAR_2_SERIES_DEFS: RawSeriesDef[] = [
  { teamA: 'India', teamB: 'England', month: 1, startDay: 3, formats: [{ format: 'Test', matches: 3 }] },
  { teamA: 'Australia', teamB: 'Pakistan', month: 1, startDay: 8, formats: [{ format: 'ODI', matches: 5 }] },
  { teamA: 'South Africa', teamB: 'Sri Lanka', month: 1, startDay: 15, formats: [{ format: 'Test', matches: 2 }] },
  { teamA: 'New Zealand', teamB: 'West Indies', month: 1, startDay: 20, formats: [{ format: 'T20', matches: 5 }] },
  { teamA: 'Afghanistan', teamB: 'Bangladesh', month: 1, startDay: 24, formats: [{ format: 'ODI', matches: 3 }, { format: 'T20', matches: 3 }] },
  { teamA: 'Ireland', teamB: 'Zimbabwe', month: 2, startDay: 2, formats: [{ format: 'ODI', matches: 3 }, { format: 'T20', matches: 3 }] },
  { teamA: 'Netherlands', teamB: 'Namibia', month: 2, startDay: 6, formats: [{ format: 'T20', matches: 5 }] },
  { teamA: 'Scotland', teamB: 'Oman', month: 2, startDay: 10, formats: [{ format: 'ODI', matches: 3 }] },
  { teamA: 'USA', teamB: 'Canada', month: 2, startDay: 14, formats: [{ format: 'T20', matches: 5 }] },
  { teamA: 'Nepal', teamB: 'UAE', month: 2, startDay: 18, formats: [{ format: 'ODI', matches: 3 }, { format: 'T20', matches: 3 }] },
  { teamA: 'England', teamB: 'New Zealand', month: 4, startDay: 2, formats: [{ format: 'Test', matches: 2 }, { format: 'ODI', matches: 3 }] },
  { teamA: 'India', teamB: 'South Africa', month: 4, startDay: 10, formats: [{ format: 'ODI', matches: 3 }, { format: 'T20', matches: 3 }] },
  { teamA: 'Pakistan', teamB: 'West Indies', month: 4, startDay: 16, formats: [{ format: 'Test', matches: 2 }] },
  { teamA: 'Australia', teamB: 'Sri Lanka', month: 4, startDay: 22, formats: [{ format: 'T20', matches: 5 }] },
  { teamA: 'Bangladesh', teamB: 'Ireland', month: 5, startDay: 2, formats: [{ format: 'ODI', matches: 3 }, { format: 'T20', matches: 3 }] },
  { teamA: 'Afghanistan', teamB: 'Zimbabwe', month: 5, startDay: 8, formats: [{ format: 'Test', matches: 2 }] },
  { teamA: 'England', teamB: 'Pakistan', month: 5, startDay: 14, formats: [{ format: 'T20', matches: 5 }] },
  { teamA: 'New Zealand', teamB: 'India', month: 5, startDay: 20, formats: [{ format: 'Test', matches: 3 }] },
  { teamA: 'South Africa', teamB: 'Australia', month: 6, startDay: 2, formats: [{ format: 'ODI', matches: 3 }, { format: 'T20', matches: 3 }] },
  { teamA: 'West Indies', teamB: 'Sri Lanka', month: 6, startDay: 10, formats: [{ format: 'ODI', matches: 3 }] },
  { teamA: 'Bangladesh', teamB: 'Afghanistan', month: 6, startDay: 16, formats: [{ format: 'T20', matches: 5 }] },
  { teamA: 'India', teamB: 'Australia', month: 7, startDay: 2, formats: [{ format: 'Test', matches: 3 }] },
  { teamA: 'Pakistan', teamB: 'South Africa', month: 7, startDay: 12, formats: [{ format: 'ODI', matches: 5 }] },
  { teamA: 'England', teamB: 'West Indies', month: 7, startDay: 18, formats: [{ format: 'Test', matches: 3 }] },
  { teamA: 'Sri Lanka', teamB: 'New Zealand', month: 7, startDay: 24, formats: [{ format: 'ODI', matches: 3 }, { format: 'T20', matches: 3 }] },
  { teamA: 'Australia', teamB: 'England', month: 8, startDay: 2, formats: [{ format: 'ODI', matches: 5 }] },
  { teamA: 'South Africa', teamB: 'West Indies', month: 8, startDay: 10, formats: [{ format: 'T20', matches: 5 }] },
  { teamA: 'India', teamB: 'Bangladesh', month: 8, startDay: 16, formats: [{ format: 'Test', matches: 2 }, { format: 'ODI', matches: 3 }] },
  { teamA: 'Pakistan', teamB: 'New Zealand', month: 8, startDay: 24, formats: [{ format: 'T20', matches: 5 }] },
  { teamA: 'Sri Lanka', teamB: 'Afghanistan', month: 9, startDay: 2, formats: [{ format: 'ODI', matches: 3 }] },
  { teamA: 'England', teamB: 'India', month: 9, startDay: 8, formats: [{ format: 'ODI', matches: 3 }, { format: 'T20', matches: 3 }] },
  { teamA: 'Australia', teamB: 'South Africa', month: 9, startDay: 16, formats: [{ format: 'Test', matches: 3 }] },
  { teamA: 'New Zealand', teamB: 'Sri Lanka', month: 9, startDay: 24, formats: [{ format: 'T20', matches: 3 }] },
  { teamA: 'West Indies', teamB: 'Bangladesh', month: 10, startDay: 2, formats: [{ format: 'ODI', matches: 3 }, { format: 'T20', matches: 3 }] },
  { teamA: 'Pakistan', teamB: 'India', month: 10, startDay: 10, formats: [{ format: 'ODI', matches: 3 }, { format: 'T20', matches: 3 }] },
  { teamA: 'Afghanistan', teamB: 'England', month: 10, startDay: 18, formats: [{ format: 'T20', matches: 3 }] },
  { teamA: 'South Africa', teamB: 'Pakistan', month: 11, startDay: 2, formats: [{ format: 'Test', matches: 2 }] },
  { teamA: 'New Zealand', teamB: 'Australia', month: 11, startDay: 8, formats: [{ format: 'T20', matches: 3 }] },
  { teamA: 'Sri Lanka', teamB: 'England', month: 11, startDay: 14, formats: [{ format: 'ODI', matches: 3 }] },
  { teamA: 'Zimbabwe', teamB: 'Ireland', month: 11, startDay: 20, formats: [{ format: 'T20', matches: 5 }] },
  { teamA: 'Namibia', teamB: 'Netherlands', month: 12, startDay: 2, formats: [{ format: 'ODI', matches: 3 }] },
  { teamA: 'Oman', teamB: 'Scotland', month: 12, startDay: 6, formats: [{ format: 'T20', matches: 3 }] },
  { teamA: 'Canada', teamB: 'USA', month: 12, startDay: 10, formats: [{ format: 'ODI', matches: 3 }] },
  { teamA: 'UAE', teamB: 'Nepal', month: 12, startDay: 14, formats: [{ format: 'T20', matches: 3 }] },
  { teamA: 'Ireland', teamB: 'Scotland', month: 12, startDay: 18, formats: [{ format: 'ODI', matches: 3 }, { format: 'T20', matches: 3 }] }
];

// Year 3 Bilateral Series Schedule (45 Series)
const YEAR_3_SERIES_DEFS: RawSeriesDef[] = [
  { teamA: 'India', teamB: 'New Zealand', month: 1, startDay: 3, formats: [{ format: 'Test', matches: 3 }] },
  { teamA: 'Australia', teamB: 'West Indies', month: 1, startDay: 8, formats: [{ format: 'Test', matches: 2 }, { format: 'ODI', matches: 3 }] },
  { teamA: 'South Africa', teamB: 'Pakistan', month: 1, startDay: 16, formats: [{ format: 'ODI', matches: 3 }, { format: 'T20', matches: 3 }] },
  { teamA: 'England', teamB: 'Bangladesh', month: 1, startDay: 22, formats: [{ format: 'Test', matches: 2 }] },
  { teamA: 'Sri Lanka', teamB: 'Zimbabwe', month: 2, startDay: 2, formats: [{ format: 'ODI', matches: 3 }, { format: 'T20', matches: 3 }] },
  { teamA: 'Afghanistan', teamB: 'Ireland', month: 2, startDay: 6, formats: [{ format: 'Test', matches: 1 }, { format: 'ODI', matches: 3 }] },
  { teamA: 'Netherlands', teamB: 'USA', month: 2, startDay: 10, formats: [{ format: 'ODI', matches: 3 }, { format: 'T20', matches: 3 }] },
  { teamA: 'Scotland', teamB: 'Nepal', month: 2, startDay: 14, formats: [{ format: 'T20', matches: 5 }] },
  { teamA: 'Namibia', teamB: 'UAE', month: 2, startDay: 18, formats: [{ format: 'ODI', matches: 3 }] },
  { teamA: 'Oman', teamB: 'Canada', month: 2, startDay: 22, formats: [{ format: 'T20', matches: 3 }] },
  { teamA: 'India', teamB: 'England', month: 4, startDay: 2, formats: [{ format: 'ODI', matches: 3 }, { format: 'T20', matches: 3 }] },
  { teamA: 'Australia', teamB: 'South Africa', month: 4, startDay: 8, formats: [{ format: 'ODI', matches: 3 }] },
  { teamA: 'Pakistan', teamB: 'New Zealand', month: 4, startDay: 14, formats: [{ format: 'Test', matches: 2 }] },
  { teamA: 'West Indies', teamB: 'Sri Lanka', month: 4, startDay: 20, formats: [{ format: 'T20', matches: 5 }] },
  { teamA: 'Bangladesh', teamB: 'Zimbabwe', month: 5, startDay: 2, formats: [{ format: 'Test', matches: 2 }] },
  { teamA: 'Afghanistan', teamB: 'Australia', month: 5, startDay: 8, formats: [{ format: 'ODI', matches: 3 }] },
  { teamA: 'England', teamB: 'Pakistan', month: 5, startDay: 14, formats: [{ format: 'Test', matches: 3 }] },
  { teamA: 'South Africa', teamB: 'India', month: 5, startDay: 22, formats: [{ format: 'Test', matches: 2 }] },
  { teamA: 'New Zealand', teamB: 'West Indies', month: 6, startDay: 2, formats: [{ format: 'ODI', matches: 3 }] },
  { teamA: 'Sri Lanka', teamB: 'Australia', month: 6, startDay: 8, formats: [{ format: 'Test', matches: 2 }] },
  { teamA: 'Bangladesh', teamB: 'South Africa', month: 6, startDay: 16, formats: [{ format: 'ODI', matches: 3 }] },
  { teamA: 'India', teamB: 'Sri Lanka', month: 7, startDay: 2, formats: [{ format: 'Test', matches: 2 }, { format: 'T20', matches: 3 }] },
  { teamA: 'Australia', teamB: 'New Zealand', month: 7, startDay: 10, formats: [{ format: 'Test', matches: 3 }] },
  { teamA: 'England', teamB: 'South Africa', month: 7, startDay: 18, formats: [{ format: 'ODI', matches: 3 }, { format: 'T20', matches: 3 }] },
  { teamA: 'Pakistan', teamB: 'Afghanistan', month: 7, startDay: 24, formats: [{ format: 'ODI', matches: 3 }] },
  { teamA: 'West Indies', teamB: 'India', month: 8, startDay: 2, formats: [{ format: 'ODI', matches: 3 }, { format: 'T20', matches: 3 }] },
  { teamA: 'South Africa', teamB: 'New Zealand', month: 8, startDay: 8, formats: [{ format: 'Test', matches: 2 }] },
  { teamA: 'Australia', teamB: 'Pakistan', month: 8, startDay: 15, formats: [{ format: 'Test', matches: 3 }] },
  { teamA: 'England', teamB: 'Sri Lanka', month: 8, startDay: 24, formats: [{ format: 'T20', matches: 3 }] },
  { teamA: 'Bangladesh', teamB: 'New Zealand', month: 9, startDay: 2, formats: [{ format: 'ODI', matches: 3 }] },
  { teamA: 'Afghanistan', teamB: 'West Indies', month: 9, startDay: 8, formats: [{ format: 'T20', matches: 3 }] },
  { teamA: 'India', teamB: 'Australia', month: 9, startDay: 14, formats: [{ format: 'T20', matches: 5 }] },
  { teamA: 'Pakistan', teamB: 'England', month: 9, startDay: 22, formats: [{ format: 'ODI', matches: 3 }] },
  { teamA: 'South Africa', teamB: 'Sri Lanka', month: 10, startDay: 2, formats: [{ format: 'ODI', matches: 3 }] },
  { teamA: 'New Zealand', teamB: 'England', month: 10, startDay: 8, formats: [{ format: 'Test', matches: 2 }] },
  { teamA: 'West Indies', teamB: 'Pakistan', month: 10, startDay: 16, formats: [{ format: 'ODI', matches: 3 }] },
  { teamA: 'Australia', teamB: 'India', month: 11, startDay: 2, formats: [{ format: 'Test', matches: 3 }] },
  { teamA: 'Sri Lanka', teamB: 'Pakistan', month: 11, startDay: 12, formats: [{ format: 'Test', matches: 2 }] },
  { teamA: 'South Africa', teamB: 'West Indies', month: 11, startDay: 18, formats: [{ format: 'ODI', matches: 3 }] },
  { teamA: 'Ireland', teamB: 'Afghanistan', month: 11, startDay: 24, formats: [{ format: 'T20', matches: 3 }] },
  { teamA: 'Zimbabwe', teamB: 'Netherlands', month: 12, startDay: 2, formats: [{ format: 'ODI', matches: 3 }] },
  { teamA: 'USA', teamB: 'Scotland', month: 12, startDay: 6, formats: [{ format: 'T20', matches: 3 }] },
  { teamA: 'Nepal', teamB: 'Namibia', month: 12, startDay: 10, formats: [{ format: 'ODI', matches: 3 }] },
  { teamA: 'UAE', teamB: 'Oman', month: 12, startDay: 14, formats: [{ format: 'T20', matches: 3 }] },
  { teamA: 'Canada', teamB: 'Ireland', month: 12, startDay: 18, formats: [{ format: 'ODI', matches: 3 }] }
];

// Year 4 Bilateral Series Schedule (45 Series)
const YEAR_4_SERIES_DEFS: RawSeriesDef[] = [
  { teamA: 'India', teamB: 'South Africa', month: 1, startDay: 3, formats: [{ format: 'Test', matches: 3 }] },
  { teamA: 'Australia', teamB: 'England', month: 1, startDay: 8, formats: [{ format: 'Test', matches: 3 }] },
  { teamA: 'Pakistan', teamB: 'Sri Lanka', month: 1, startDay: 16, formats: [{ format: 'ODI', matches: 3 }, { format: 'T20', matches: 3 }] },
  { teamA: 'New Zealand', teamB: 'Afghanistan', month: 1, startDay: 22, formats: [{ format: 'Test', matches: 1 }, { format: 'ODI', matches: 3 }] },
  { teamA: 'West Indies', teamB: 'Bangladesh', month: 2, startDay: 2, formats: [{ format: 'Test', matches: 2 }] },
  { teamA: 'Zimbabwe', teamB: 'USA', month: 2, startDay: 6, formats: [{ format: 'ODI', matches: 3 }, { format: 'T20', matches: 3 }] },
  { teamA: 'Ireland', teamB: 'Nepal', month: 2, startDay: 10, formats: [{ format: 'T20', matches: 5 }] },
  { teamA: 'Netherlands', teamB: 'UAE', month: 2, startDay: 14, formats: [{ format: 'ODI', matches: 3 }] },
  { teamA: 'Scotland', teamB: 'Canada', month: 2, startDay: 18, formats: [{ format: 'T20', matches: 3 }] },
  { teamA: 'Namibia', teamB: 'Oman', month: 2, startDay: 22, formats: [{ format: 'ODI', matches: 3 }] },
  { teamA: 'India', teamB: 'Pakistan', month: 4, startDay: 2, formats: [{ format: 'Test', matches: 2 }, { format: 'ODI', matches: 3 }] },
  { teamA: 'Australia', teamB: 'India', month: 4, startDay: 10, formats: [{ format: 'ODI', matches: 3 }, { format: 'T20', matches: 3 }] },
  { teamA: 'England', teamB: 'New Zealand', month: 4, startDay: 16, formats: [{ format: 'ODI', matches: 3 }, { format: 'T20', matches: 3 }] },
  { teamA: 'South Africa', teamB: 'West Indies', month: 4, startDay: 22, formats: [{ format: 'Test', matches: 2 }] },
  { teamA: 'Sri Lanka', teamB: 'Bangladesh', month: 5, startDay: 2, formats: [{ format: 'Test', matches: 2 }, { format: 'ODI', matches: 3 }] },
  { teamA: 'Afghanistan', teamB: 'Pakistan', month: 5, startDay: 10, formats: [{ format: 'T20', matches: 3 }] },
  { teamA: 'Australia', teamB: 'West Indies', month: 5, startDay: 16, formats: [{ format: 'T20', matches: 5 }] },
  { teamA: 'England', teamB: 'India', month: 5, startDay: 22, formats: [{ format: 'Test', matches: 3 }] },
  { teamA: 'New Zealand', teamB: 'South Africa', month: 6, startDay: 2, formats: [{ format: 'ODI', matches: 3 }] },
  { teamA: 'Pakistan', teamB: 'Australia', month: 6, startDay: 8, formats: [{ format: 'T20', matches: 3 }] },
  { teamA: 'Sri Lanka', teamB: 'India', month: 6, startDay: 14, formats: [{ format: 'ODI', matches: 3 }, { format: 'T20', matches: 3 }] },
  { teamA: 'West Indies', teamB: 'England', month: 7, startDay: 2, formats: [{ format: 'Test', matches: 2 }, { format: 'ODI', matches: 3 }] },
  { teamA: 'South Africa', teamB: 'Australia', month: 7, startDay: 10, formats: [{ format: 'Test', matches: 3 }] },
  { teamA: 'New Zealand', teamB: 'Pakistan', month: 7, startDay: 18, formats: [{ format: 'ODI', matches: 3 }] },
  { teamA: 'Bangladesh', teamB: 'Afghanistan', month: 7, startDay: 24, formats: [{ format: 'ODI', matches: 3 }] },
  { teamA: 'India', teamB: 'West Indies', month: 8, startDay: 2, formats: [{ format: 'Test', matches: 2 }] },
  { teamA: 'England', teamB: 'Australia', month: 8, startDay: 8, formats: [{ format: 'T20', matches: 5 }] },
  { teamA: 'Pakistan', teamB: 'South Africa', month: 8, startDay: 16, formats: [{ format: 'Test', matches: 2 }] },
  { teamA: 'Sri Lanka', teamB: 'New Zealand', month: 8, startDay: 22, formats: [{ format: 'Test', matches: 2 }] },
  { teamA: 'Afghanistan', teamB: 'India', month: 9, startDay: 2, formats: [{ format: 'ODI', matches: 3 }, { format: 'T20', matches: 3 }] },
  { teamA: 'Australia', teamB: 'Sri Lanka', month: 9, startDay: 10, formats: [{ format: 'ODI', matches: 3 }] },
  { teamA: 'England', teamB: 'West Indies', month: 9, startDay: 16, formats: [{ format: 'T20', matches: 3 }] },
  { teamA: 'South Africa', teamB: 'New Zealand', month: 9, startDay: 22, formats: [{ format: 'Test', matches: 2 }] },
  { teamA: 'Bangladesh', teamB: 'Pakistan', month: 10, startDay: 2, formats: [{ format: 'ODI', matches: 3 }, { format: 'T20', matches: 3 }] },
  { teamA: 'India', teamB: 'Australia', month: 10, startDay: 10, formats: [{ format: 'ODI', matches: 3 }] },
  { teamA: 'New Zealand', teamB: 'England', month: 10, startDay: 16, formats: [{ format: 'ODI', matches: 3 }] },
  { teamA: 'West Indies', teamB: 'South Africa', month: 11, startDay: 2, formats: [{ format: 'ODI', matches: 3 }] },
  { teamA: 'Pakistan', teamB: 'Sri Lanka', month: 11, startDay: 8, formats: [{ format: 'Test', matches: 2 }] },
  { teamA: 'Australia', teamB: 'Afghanistan', month: 11, startDay: 14, formats: [{ format: 'T20', matches: 3 }] },
  { teamA: 'Zimbabwe', teamB: 'Scotland', month: 11, startDay: 20, formats: [{ format: 'ODI', matches: 3 }] },
  { teamA: 'USA', teamB: 'Netherlands', month: 12, startDay: 2, formats: [{ format: 'T20', matches: 3 }] },
  { teamA: 'Nepal', teamB: 'Canada', month: 12, startDay: 6, formats: [{ format: 'ODI', matches: 3 }] },
  { teamA: 'UAE', teamB: 'Namibia', month: 12, startDay: 10, formats: [{ format: 'T20', matches: 3 }] },
  { teamA: 'Oman', teamB: 'Ireland', month: 12, startDay: 14, formats: [{ format: 'ODI', matches: 3 }] },
  { teamA: 'Canada', teamB: 'Zimbabwe', month: 12, startDay: 18, formats: [{ format: 'T20', matches: 3 }] }
];

const RAW_YEAR_SCHEDULES: Record<number, RawSeriesDef[]> = {
  1: YEAR_1_SERIES_DEFS,
  2: YEAR_2_SERIES_DEFS,
  3: YEAR_3_SERIES_DEFS,
  4: YEAR_4_SERIES_DEFS
};

/**
 * Returns the raw bilateral definitions for a given season (1-indexed)
 */
export const getYearBilateralDefs = (season: number = 1): RawSeriesDef[] => {
  const yearIndex = getCycleYear(season);
  return RAW_YEAR_SCHEDULES[yearIndex] || RAW_YEAR_SCHEDULES[1];
};

/**
 * Generates all Series objects for a season
 */
export const generateYearSeriesList = (season: number = 1): Series[] => {
  const defs = getYearBilateralDefs(season);
  const seriesList: Series[] = [];

  defs.forEach((def, index) => {
    const seriesId = `series-s${season}-${index + 1}`;
    
    // Calculate total matches & primary format
    let totalMatches = 0;
    let formatLabel: 'Test' | 'ODI' | 'T20' | string = 'ODI';
    
    if (def.formats.length === 1) {
      totalMatches = def.formats[0].matches;
      formatLabel = def.formats[0].format;
    } else {
      totalMatches = def.formats.reduce((acc, f) => acc + f.matches, 0);
      formatLabel = def.formats.map(f => `${f.matches} ${f.format}s`).join(' + ');
    }

    const seriesName = def.name || `${def.teamA} vs ${def.teamB} Tour (${formatLabel})`;
    
    // Calculate start & estimated end date
    const startMonth = def.month;
    const startDay = def.startDay;
    const durationDays = totalMatches * 3 + 2;
    let endDay = startDay + durationDays;
    let endMonth = startMonth;
    if (endDay > 28) {
      endDay = Math.min(28, endDay - 28);
      endMonth = Math.min(12, startMonth + 1);
    }

    seriesList.push({
      id: seriesId,
      name: seriesName,
      teamA: def.teamA,
      teamB: def.teamB,
      format: formatLabel,
      startDate: { year: season, month: startMonth, day: startDay },
      endDate: { year: season, month: endMonth, day: endDay },
      numberOfMatches: totalMatches,
      status: 'upcoming',
      restDays: 2,
      seriesScore: {
        teamAWins: 0,
        teamBWins: 0,
        draws: 0,
        ties: 0
      }
    });
  });

  return seriesList;
};

/**
 * Generates all match fixtures for a specific series
 */
export const generateMatchesForBilateralSeries = (
  series: Series, 
  rawDef: RawSeriesDef, 
  season: number
): Match[] => {
  const matches: Match[] = [];
  let matchSeq = 1;
  let currentMonth = rawDef.month;
  let currentDay = rawDef.startDay;

  rawDef.formats.forEach(fBlock => {
    const fType = fBlock.format;
    const actualFormat = fType === 'Test' ? Format.SHIELD : (fType === 'T20' ? Format.T20 : Format.ODI);
    const dayGap = fType === 'Test' ? 6 : 3;

    for (let i = 1; i <= fBlock.matches; i++) {
      const matchDateStr = `${currentDay} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][currentMonth - 1] || 'Jan'}`;
      
      matches.push({
        matchNumber: `${series.id}-M${matchSeq}`,
        teamA: rawDef.teamA,
        teamB: rawDef.teamB,
        vs: 'vs',
        date: matchDateStr,
        scheduledDate: { year: season, month: currentMonth, day: currentDay },
        group: 'Round-Robin',
        stage: `${fType} Series - Match ${i} of ${fBlock.matches}`,
        seriesId: series.id,
        tournamentName: series.name
      });

      matchSeq++;
      currentDay += dayGap;
      if (currentDay > 28) {
        currentDay = 2;
        currentMonth = Math.min(12, currentMonth + 1);
      }
    }
  });

  return matches;
};

/**
 * Generates all match fixtures for the active March Major Tournament of the year
 */
export const generateMajorTournamentMatches = (season: number = 1): Match[] => {
  const tInfo = getYearTournamentConfig(season);
  const matches: Match[] = [];
  const month = 3; // March exclusive tournament month
  let matchDay = 2;

  if (tInfo.yearIndex === 1) {
    // Year 1: ODI World Cup (Group A 5 teams, Group B 5 teams)
    const grpA = tInfo.groups[0].teams;
    const grpB = tInfo.groups[1].teams;
    let mNum = 1;

    // Group A round-robin (10 matches)
    for (let i = 0; i < grpA.length; i++) {
      for (let j = i + 1; j < grpA.length; j++) {
        matches.push({
          matchNumber: `WC-M${mNum++}`,
          teamA: grpA[i],
          teamB: grpA[j],
          vs: 'vs',
          date: `${matchDay} Mar`,
          scheduledDate: { year: season, month, day: matchDay },
          group: 'Group A',
          stage: 'Group Stage',
          tournamentName: tInfo.name
        });
        matchDay += 1;
      }
    }

    // Group B round-robin (10 matches)
    for (let i = 0; i < grpB.length; i++) {
      for (let j = i + 1; j < grpB.length; j++) {
        matches.push({
          matchNumber: `WC-M${mNum++}`,
          teamA: grpB[i],
          teamB: grpB[j],
          vs: 'vs',
          date: `${matchDay} Mar`,
          scheduledDate: { year: season, month, day: matchDay },
          group: 'Group B',
          stage: 'Group Stage',
          tournamentName: tInfo.name
        });
        matchDay += 1;
      }
    }

    // Knockouts
    matches.push({
      matchNumber: 'WC-SF1',
      teamA: '1st in Group A',
      teamB: '2nd in Group B',
      vs: 'vs',
      date: '24 Mar',
      scheduledDate: { year: season, month, day: 24 },
      group: 'Semi-Finals',
      stage: 'Semi-Final 1',
      tournamentName: tInfo.name
    });

    matches.push({
      matchNumber: 'WC-SF2',
      teamA: '1st in Group B',
      teamB: '2nd in Group A',
      vs: 'vs',
      date: '25 Mar',
      scheduledDate: { year: season, month, day: 25 },
      group: 'Semi-Finals',
      stage: 'Semi-Final 2',
      tournamentName: tInfo.name
    });

    matches.push({
      matchNumber: 'WC-Final',
      teamA: 'Winner of SF1',
      teamB: 'Winner of SF2',
      vs: 'vs',
      date: '28 Mar',
      scheduledDate: { year: season, month, day: 28 },
      group: 'Final',
      stage: 'Grand Final',
      tournamentName: tInfo.name
    });

  } else if (tInfo.yearIndex === 2) {
    // Year 2: T20 World Cup (Group A 6 teams, Group B 6 teams)
    const grpA = tInfo.groups[0].teams;
    const grpB = tInfo.groups[1].teams;
    let mNum = 1;

    for (let i = 0; i < grpA.length; i++) {
      for (let j = i + 1; j < grpA.length; j++) {
        matches.push({
          matchNumber: `T20WC-M${mNum++}`,
          teamA: grpA[i],
          teamB: grpA[j],
          vs: 'vs',
          date: `${Math.min(23, Math.floor(mNum * 0.75) + 1)} Mar`,
          scheduledDate: { year: season, month, day: Math.min(23, Math.floor(mNum * 0.75) + 1) },
          group: 'Group A',
          stage: 'Group Stage',
          tournamentName: tInfo.name
        });
      }
    }

    for (let i = 0; i < grpB.length; i++) {
      for (let j = i + 1; j < grpB.length; j++) {
        matches.push({
          matchNumber: `T20WC-M${mNum++}`,
          teamA: grpB[i],
          teamB: grpB[j],
          vs: 'vs',
          date: `${Math.min(23, Math.floor(mNum * 0.75) + 1)} Mar`,
          scheduledDate: { year: season, month, day: Math.min(23, Math.floor(mNum * 0.75) + 1) },
          group: 'Group B',
          stage: 'Group Stage',
          tournamentName: tInfo.name
        });
      }
    }

    // Knockouts
    matches.push({
      matchNumber: 'T20WC-SF1',
      teamA: '1st in Group A',
      teamB: '2nd in Group B',
      vs: 'vs',
      date: '25 Mar',
      scheduledDate: { year: season, month, day: 25 },
      group: 'Semi-Finals',
      stage: 'Semi-Final 1',
      tournamentName: tInfo.name
    });

    matches.push({
      matchNumber: 'T20WC-SF2',
      teamA: '1st in Group B',
      teamB: '2nd in Group A',
      vs: 'vs',
      date: '26 Mar',
      scheduledDate: { year: season, month, day: 26 },
      group: 'Semi-Finals',
      stage: 'Semi-Final 2',
      tournamentName: tInfo.name
    });

    matches.push({
      matchNumber: 'T20WC-Final',
      teamA: 'Winner of SF1',
      teamB: 'Winner of SF2',
      vs: 'vs',
      date: '28 Mar',
      scheduledDate: { year: season, month, day: 28 },
      group: 'Final',
      stage: 'Grand Final',
      tournamentName: tInfo.name
    });

  } else if (tInfo.yearIndex === 3) {
    // Year 3: World Test Championship Final (Lord's & The Oval)
    matches.push({
      matchNumber: 'WTC-SF1',
      teamA: 'India',
      teamB: 'South Africa',
      vs: 'vs',
      date: '2 Mar',
      scheduledDate: { year: season, month, day: 2 },
      group: 'Semi-Finals',
      stage: 'WTC Semi-Final 1 (Lord\'s)',
      tournamentName: tInfo.name
    });

    matches.push({
      matchNumber: 'WTC-SF2',
      teamA: 'Australia',
      teamB: 'England',
      vs: 'vs',
      date: '10 Mar',
      scheduledDate: { year: season, month, day: 10 },
      group: 'Semi-Finals',
      stage: 'WTC Semi-Final 2 (The Oval)',
      tournamentName: tInfo.name
    });

    matches.push({
      matchNumber: 'WTC-Final',
      teamA: 'Winner of SF1',
      teamB: 'Winner of SF2',
      vs: 'vs',
      date: '20 Mar',
      scheduledDate: { year: season, month, day: 20 },
      group: 'Final',
      stage: 'WTC Grand Final (Lord\'s)',
      tournamentName: tInfo.name
    });

  } else if (tInfo.yearIndex === 4) {
    // Year 4: Champions Trophy (Group A 4 teams, Group B 4 teams)
    const grpA = tInfo.groups[0].teams;
    const grpB = tInfo.groups[1].teams;
    let mNum = 1;

    for (let i = 0; i < grpA.length; i++) {
      for (let j = i + 1; j < grpA.length; j++) {
        matches.push({
          matchNumber: `CT-M${mNum++}`,
          teamA: grpA[i],
          teamB: grpA[j],
          vs: 'vs',
          date: `${matchDay} Mar`,
          scheduledDate: { year: season, month, day: matchDay },
          group: 'Group A',
          stage: 'Group Stage',
          tournamentName: tInfo.name
        });
        matchDay += 2;
      }
    }

    for (let i = 0; i < grpB.length; i++) {
      for (let j = i + 1; j < grpB.length; j++) {
        matches.push({
          matchNumber: `CT-M${mNum++}`,
          teamA: grpB[i],
          teamB: grpB[j],
          vs: 'vs',
          date: `${matchDay} Mar`,
          scheduledDate: { year: season, month, day: matchDay },
          group: 'Group B',
          stage: 'Group Stage',
          tournamentName: tInfo.name
        });
        matchDay += 2;
      }
    }

    // Knockouts
    matches.push({
      matchNumber: 'CT-SF1',
      teamA: '1st in Group A',
      teamB: '2nd in Group B',
      vs: 'vs',
      date: '24 Mar',
      scheduledDate: { year: season, month, day: 24 },
      group: 'Semi-Finals',
      stage: 'Semi-Final 1',
      tournamentName: tInfo.name
    });

    matches.push({
      matchNumber: 'CT-SF2',
      teamA: '1st in Group B',
      teamB: '2nd in Group A',
      vs: 'vs',
      date: '25 Mar',
      scheduledDate: { year: season, month, day: 25 },
      group: 'Semi-Finals',
      stage: 'Semi-Final 2',
      tournamentName: tInfo.name
    });

    matches.push({
      matchNumber: 'CT-Final',
      teamA: 'Winner of SF1',
      teamB: 'Winner of SF2',
      vs: 'vs',
      date: '28 Mar',
      scheduledDate: { year: season, month, day: 28 },
      group: 'Final',
      stage: 'Grand Final',
      tournamentName: tInfo.name
    });
  }

  return matches;
};

/**
 * Generates the full master fixture schedule for the year by format
 */
export const generateFullYearSchedule = (
  season: number = 1
): {
  scheduleByFormat: Record<Format, Match[]>;
  allMatchesChronological: Match[];
  seriesList: Series[];
  scheduledEvents: ScheduledEvent[];
  tournamentInfo: YearTournamentInfo;
} => {
  const tournamentInfo = getYearTournamentConfig(season);
  const seriesList = generateYearSeriesList(season);
  const rawDefs = getYearBilateralDefs(season);

  const t20Matches: Match[] = [];
  const odiMatches: Match[] = [];
  const fcMatches: Match[] = [];

  // Generate Bilateral Matches
  seriesList.forEach((s, idx) => {
    const rawDef = rawDefs[idx];
    if (rawDef) {
      const bMatches = generateMatchesForBilateralSeries(s, rawDef, season);
      bMatches.forEach(m => {
        if (m.stage?.toLowerCase().includes('t20')) {
          t20Matches.push(m);
        } else if (m.stage?.toLowerCase().includes('test')) {
          fcMatches.push(m);
        } else {
          odiMatches.push(m);
        }
      });
    }
  });

  // Generate Major Tournament Matches (Only the active one for this year)
  const majorMatches = generateMajorTournamentMatches(season);
  if (tournamentInfo.format === Format.T20) {
    t20Matches.push(...majorMatches);
  } else if (tournamentInfo.format === Format.SHIELD) {
    fcMatches.push(...majorMatches);
  } else {
    odiMatches.push(...majorMatches);
  }

  // Sort matches by month, then day
  const sortByDate = (a: Match, b: Match) => {
    const mA = a.scheduledDate?.month || 1;
    const mB = b.scheduledDate?.month || 1;
    if (mA !== mB) return mA - mB;
    const dA = a.scheduledDate?.day || 1;
    const dB = b.scheduledDate?.day || 1;
    return dA - dB;
  };

  t20Matches.sort(sortByDate);
  odiMatches.sort(sortByDate);
  fcMatches.sort(sortByDate);

  const allMatchesChronological = [...t20Matches, ...odiMatches, ...fcMatches].sort(sortByDate);

  // Generate Scheduled Events
  const scheduledEvents: ScheduledEvent[] = [
    {
      id: `evt-tourn-y${season}`,
      name: tournamentInfo.name,
      type: 'major_tournament',
      format: tournamentInfo.format,
      startDate: { year: season, month: 3, day: 1 },
      endDate: { year: season, month: 3, day: 28 },
      description: tournamentInfo.description,
      matchCount: majorMatches.length,
      isMonth12Locked: false
    },
    ...seriesList.map(s => ({
      id: `evt-${s.id}`,
      name: s.name,
      type: 'series' as const,
      format: s.format,
      startDate: s.startDate,
      endDate: s.endDate,
      teamA: s.teamA,
      teamB: s.teamB,
      matchCount: s.numberOfMatches,
      description: `Bilateral Tour: ${s.teamA} vs ${s.teamB} (${s.format})`
    }))
  ];

  const scheduleByFormat = {
    [Format.T20]: t20Matches,
    [Format.ODI]: odiMatches,
    [Format.SHIELD]: fcMatches,
    [Format.WLT20]: [],
    [Format.DEVELOPMENT_T20]: [],
    [Format.DEVELOPMENT_ODI]: [],
    [Format.DEVELOPMENT_FIRST_CLASS]: [],
    [Format.RISE_T20]: [],
    [Format.RISE_ODI]: [],
    [Format.RISE_FIRST_CLASS]: []
  } as Record<Format, Match[]>;

  return {
    scheduleByFormat,
    allMatchesChronological,
    seriesList,
    scheduledEvents,
    tournamentInfo
  };
};

/**
 * Calculates live series progress, scoreline, and winner for a bilateral series
 */
export const calculateSeriesProgress = (
  series: Series,
  matchResultsOrRecord: MatchResult[] | Record<string, MatchResult[]> = [],
  allMatchesOrSchedule: Match[] | Record<string, Match[]> = [],
  currentDate?: GameDate
): {
  totalMatches: number;
  completedMatches: number;
  playedMatches: number;
  teamAWins: number;
  winsTeamA: number;
  teamBWins: number;
  winsTeamB: number;
  draws: number;
  scoreline: string;
  leaderText: string;
  currentScoreline: string;
  isComplete: boolean;
  isCompleted: boolean;
  progressPercent: number;
  winnerTeam?: string | null;
  seriesMatches: {
    match: Match;
    result?: MatchResult;
  }[];
} => {
  // Extract match results from either flat array or Record<Format, MatchResult[]>
  const resultsList: MatchResult[] = Array.isArray(matchResultsOrRecord)
    ? matchResultsOrRecord
    : Object.values(matchResultsOrRecord || {}).flat();

  // Extract matches from either array or Record<Format, Match[]>
  const allMatchesList: Match[] = Array.isArray(allMatchesOrSchedule)
    ? allMatchesOrSchedule
    : Object.values(allMatchesOrSchedule || {}).flat();

  const seriesMatches = allMatchesList.filter(m => m.seriesId === series.id || m.tournamentName === series.name);
  let teamAWins = 0;
  let teamBWins = 0;
  let draws = 0;
  let completedMatches = 0;

  const matchesWithResults = seriesMatches.map(match => {
    const res = resultsList.find(r => String(r.matchNumber) === String(match.matchNumber));
    if (res) {
      completedMatches++;
      if (res.winnerId) {
        if (res.winnerId.toLowerCase().includes(series.teamA.toLowerCase()) || res.winnerId === series.teamA) {
          teamAWins++;
        } else if (res.winnerId.toLowerCase().includes(series.teamB.toLowerCase()) || res.winnerId === series.teamB) {
          teamBWins++;
        } else {
          // Check summary
          if (res.summary.toLowerCase().includes(series.teamA.toLowerCase()) && res.summary.toLowerCase().includes('won')) {
            teamAWins++;
          } else if (res.summary.toLowerCase().includes(series.teamB.toLowerCase()) && res.summary.toLowerCase().includes('won')) {
            teamBWins++;
          } else {
            draws++;
          }
        }
      } else {
        draws++;
      }
    }
    return { match, result: res };
  });

  const totalMatches = Math.max(series.numberOfMatches || 3, seriesMatches.length);
  const isComplete = completedMatches >= totalMatches && totalMatches > 0;
  
  let winnerTeam: string | null = null;
  let leaderText = 'Series Not Started';

  if (teamAWins > teamBWins) {
    leaderText = isComplete 
      ? `${series.teamA} Won Series (${teamAWins}-${teamBWins})` 
      : `${series.teamA} leads ${teamAWins}-${teamBWins}`;
    if (isComplete) winnerTeam = series.teamA;
  } else if (teamBWins > teamAWins) {
    leaderText = isComplete 
      ? `${series.teamB} Won Series (${teamBWins}-${teamAWins})` 
      : `${series.teamB} leads ${teamBWins}-${teamAWins}`;
    if (isComplete) winnerTeam = series.teamB;
  } else if (completedMatches > 0) {
    leaderText = isComplete ? `Series Drawn (${teamAWins}-${teamBWins})` : `Series Level (${teamAWins}-${teamBWins})`;
  }

  const scoreline = `${series.teamA} ${teamAWins} - ${teamBWins} ${series.teamB}${draws > 0 ? ` (${draws} Drawn)` : ''}`;
  const progressPercent = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;

  return {
    totalMatches,
    completedMatches,
    playedMatches: completedMatches,
    teamAWins,
    winsTeamA: teamAWins,
    teamBWins,
    winsTeamB: teamBWins,
    draws,
    scoreline,
    leaderText,
    currentScoreline: leaderText,
    isComplete,
    isCompleted: isComplete,
    progressPercent,
    winnerTeam,
    seriesMatches: matchesWithResults
  };
};

/**
 * Calculates Tournament Standings for the active Major Tournament
 */
export const calculateTournamentStandings = (
  season: number = 1,
  tournamentMatches: Match[] = [],
  matchResults: MatchResult[] = []
): {
  groups: {
    groupName: string;
    standings: Standing[];
  }[];
  knockouts: {
    match: Match;
    resolvedMatch: Match;
    result?: MatchResult;
  }[];
} => {
  const tConfig = getYearTournamentConfig(season);

  const groups = tConfig.groups.map(grp => {
    const table: Standing[] = grp.teams.map(tName => ({
      teamId: tName.toLowerCase().replace(/\s+/g, '-'),
      teamName: tName,
      played: 0,
      won: 0,
      lost: 0,
      drawn: 0,
      points: 0,
      netRunRate: 0,
      runsFor: 0,
      runsAgainst: 0
    }));

    // Find group matches
    const grpMatches = tournamentMatches.filter(m => m.group === grp.groupName);
    grpMatches.forEach(m => {
      const res = matchResults.find(r => String(r.matchNumber) === String(m.matchNumber));
      if (res) {
        const teamAEntry = table.find(t => t.teamName.toLowerCase() === m.teamA.toLowerCase());
        const teamBEntry = table.find(t => t.teamName.toLowerCase() === m.teamB.toLowerCase());

        if (teamAEntry && teamBEntry) {
          teamAEntry.played++;
          teamBEntry.played++;

          if (res.winnerId) {
            const isAWinner = res.winnerId.toLowerCase().includes(teamAEntry.teamName.toLowerCase());
            if (isAWinner) {
              teamAEntry.won++;
              teamAEntry.points += 2;
              teamBEntry.lost++;
            } else {
              teamBEntry.won++;
              teamBEntry.points += 2;
              teamAEntry.lost++;
            }
          } else {
            teamAEntry.drawn++;
            teamBEntry.drawn++;
            teamAEntry.points += 1;
            teamBEntry.points += 1;
          }
        }
      }
    });

    // Sort by points desc, then won desc
    table.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.won - a.won;
    });

    return {
      groupName: grp.groupName,
      standings: table
    };
  });

  // Resolve Knockout Matches
  const knockoutMatches = tournamentMatches.filter(m => m.group === 'Semi-Finals' || m.group === 'Final');
  
  const getPlaceTeam = (grpName: string, place: number): string => {
    const g = groups.find(gp => gp.groupName === grpName);
    if (!g || !g.standings || g.standings.length < place) return `TBD`;
    return g.standings[place - 1]?.teamName || `TBD`;
  };

  const knockouts = knockoutMatches.map(m => {
    const resolved = { ...m };
    const res = matchResults.find(r => String(r.matchNumber) === String(m.matchNumber));

    // Resolve team placeholders
    if (resolved.teamA.includes('1st in Group A')) resolved.teamA = getPlaceTeam('Group A', 1);
    else if (resolved.teamA.includes('1st in Group B')) resolved.teamA = getPlaceTeam('Group B', 1);
    else if (resolved.teamA.includes('2nd in Group A')) resolved.teamA = getPlaceTeam('Group A', 2);
    else if (resolved.teamA.includes('2nd in Group B')) resolved.teamA = getPlaceTeam('Group B', 2);

    if (resolved.teamB.includes('1st in Group A')) resolved.teamB = getPlaceTeam('Group A', 1);
    else if (resolved.teamB.includes('1st in Group B')) resolved.teamB = getPlaceTeam('Group B', 1);
    else if (resolved.teamB.includes('2nd in Group A')) resolved.teamB = getPlaceTeam('Group A', 2);
    else if (resolved.teamB.includes('2nd in Group B')) resolved.teamB = getPlaceTeam('Group B', 2);

    if (resolved.teamA.includes('Winner of SF1')) {
      const sf1Res = matchResults.find(r => String(r.matchNumber).includes('SF1'));
      resolved.teamA = sf1Res?.winnerId ? (sf1Res.winnerId.replace('team-', '').toUpperCase()) : 'SF1 Winner';
    }
    if (resolved.teamB.includes('Winner of SF2')) {
      const sf2Res = matchResults.find(r => String(r.matchNumber).includes('SF2'));
      resolved.teamB = sf2Res?.winnerId ? (sf2Res.winnerId.replace('team-', '').toUpperCase()) : 'SF2 Winner';
    }

    return {
      match: m,
      resolvedMatch: resolved,
      result: res
    };
  });

  return {
    groups,
    knockouts
  };
};

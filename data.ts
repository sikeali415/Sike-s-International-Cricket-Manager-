
import { Player, PlayerRole, TeamData, Ground, Match, PlayerStats, NewsArticle, Format, Sponsorship } from './types';
import { getAllExtraPlayers, initializePlayersWithWeaknesses } from './utils/playerRegistry';

export const MAX_SQUAD_SIZE = 999; // Unlimited squad size
export const MIN_SQUAD_SIZE = 15;
export const MAX_FOREIGN_PLAYERS = 10;
export const DRAFT_SQUAD_SIZE = 22;
export const DRAFT_FOREIGN_PLAYERS = 10;
export const DRAFT_NATIONAL_PLAYERS = 12;
export const MAX_TRANSFERS_PER_SEASON = 3;

// Pre-Season Retention Constraints
export const MAX_RETAINED_NATIONAL_PLAYERS = 5;
export const MAX_RETAINED_FOREIGN_PLAYERS = 0; // All foreign players go into Draft
export const MAX_RETAINED_TOTAL_PLAYERS = 5;

export const BRANDS = [
    { name: "Sike's", color: "text-yellow-500", style: "font-extrabold tracking-tight font-display", logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" /></svg>' },
    { name: "Signify", color: "text-cyan-400", style: "font-sans tracking-widest uppercase", logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>' },
    { name: "Malik", color: "text-red-600", style: "font-serif italic font-bold", logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M14.06 9.02l.92.92L3.92 21h16.16V23H3a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h1V9.02zM12 3a2 2 0 0 1 2 2v4h-4V5a2 2 0 0 1 2-2z"/></svg>' },
    { name: "G.S", color: "text-green-500", style: "font-mono font-bold", logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" /></svg>' }
];

export const TV_CHANNELS = [
    { id: 'tv-prime', name: 'PrimeCast Ultra', logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="4" width="20" height="16" rx="2" /><circle cx="12" cy="12" r="4" fill="white" fill-opacity="0.3"/><path d="M10 9l5 3-5 3V9z" fill="white"/></svg>', color: 'text-purple-500', minPopularity: 40, tier: 'Premium' },
    { id: 'tv-roar', name: 'Roar Sports', logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 6h6l-5 4 2 6-6-4-6 4 2-6-5-4h6z"/></svg>', color: 'text-red-600', minPopularity: 55, tier: 'Premium' },
    { id: 'tv-now', name: 'CricketNow HD', logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v12H4z"/><path d="M8 10h8v4H8z" fill="white"/></svg>', color: 'text-blue-500', minPopularity: 30, tier: 'Standard' },
    { id: 'tv-sig', name: 'Signify TV', logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M2 12h20M2 12l10-9 10 9M2 12l10 9 10-9" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>', color: 'text-cyan-400', minPopularity: 50, tier: 'Premium' },
];

export const TOURNAMENT_LOGOS = [
    { id: 'cup-1', name: 'Classic Cup', svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M5 2h14a1 1 0 0 1 1 1v4a3 3 0 0 1-3 3h-1v2h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-3v3h2a1 1 0 0 1 1 1v1H6v-1a1 1 0 0 1 1-1h2v-3H6a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h2v-2H7a3 3 0 0 1-3-3V3a1 1 0 0 1 1-1z"/></svg>' },
    { id: 'shield-1', name: 'Grand Shield', svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>' },
];

export const SPONSOR_THRESHOLDS = {
    [Format.T20]: { "Sike's": 40, "Signify": 35, "Malik": 30, "G.S": 25 },
    [Format.ODI]: { "Sike's": 45, "Signify": 40, "Malik": 30, "G.S": 25 },
    [Format.SHIELD]: { "Sike's": 40, "Signify": 35, "Malik": 30, "G.S": 25 },
    [Format.WLT20]: { "Sike's": 50, "Signify": 45, "Malik": 40, "G.S": 35 },
};

export const INITIAL_SPONSORSHIPS: Record<string, Sponsorship> = {
    [Format.T20]: { sponsorName: "Sike's", tournamentName: "T20 World Championship", logoColor: "text-yellow-500", tournamentLogo: TOURNAMENT_LOGOS[0].svg, tvChannel: "CricketNow HD", tvLogo: "" },
    [Format.ODI]: { sponsorName: "Signify", tournamentName: "International ODI Cup", logoColor: "text-cyan-400", tournamentLogo: TOURNAMENT_LOGOS[0].svg, tvChannel: "Signify TV", tvLogo: "" },
    [Format.SHIELD]: { sponsorName: "Malik", tournamentName: "World Test Championship", logoColor: "text-red-600", tournamentLogo: TOURNAMENT_LOGOS[1].svg, tvChannel: "PrimeCast Ultra", tvLogo: "" },
    [Format.WLT20]: { sponsorName: "Signify", tournamentName: "Global Nations Cup", logoColor: "text-cyan-400", tournamentLogo: TOURNAMENT_LOGOS[0].svg, tvChannel: "Signify TV", tvLogo: "" },
};

export const TEAMS: TeamData[] = [
  { id: 'pak', name: 'Pakistan', homeGround: 'GAD', logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#006629" stroke="#E2B93B" stroke-width="4"/><path d="M58 28 A22 22 0 1 0 74 66 A27 27 0 1 1 58 28 Z" fill="#FFFFFF"/><polygon points="62,38 65,48 75,48 67,54 70,64 62,58 54,64 57,54 49,48 59,48" fill="#FFFFFF"/></svg>', isYouthTeam: false },
  { id: 'ind', name: 'India', homeGround: 'EDN', logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#0038A8" stroke="#FF9933" stroke-width="4"/><circle cx="50" cy="50" r="28" fill="#FFFFFF"/><circle cx="50" cy="50" r="14" fill="#0038A8"/><path d="M50 25 L50 75 M25 50 L75 50 M32 32 L68 68 M32 68 L68 32" stroke="#0038A8" stroke-width="2.5"/></svg>', isYouthTeam: false },
  { id: 'aus', name: 'Australia', homeGround: 'MCG', logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#004724" stroke="#FFCD00" stroke-width="4"/><circle cx="50" cy="50" r="30" fill="#FFCD00"/><polygon points="50,28 54,42 68,42 57,51 61,65 50,56 39,65 43,51 32,42 46,42" fill="#004724"/></svg>', isYouthTeam: false },
  { id: 'eng', name: 'England', homeGround: 'LOR', logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#0B1C38" stroke="#CE1124" stroke-width="4"/><circle cx="50" cy="50" r="32" fill="#FFFFFF"/><path d="M44 26 H56 V44 H74 V56 H56 V74 H44 V56 H26 V44 H44 Z" fill="#CE1124"/></svg>', isYouthTeam: false },
  { id: 'sa', name: 'South Africa', homeGround: 'NWL', logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#007749" stroke="#FFB81C" stroke-width="4"/><path d="M12 28 L48 50 L12 72 Z" fill="#000000" stroke="#FFB81C" stroke-width="3"/><path d="M50 50 L88 24 L88 38 L68 50 L88 62 L88 76 Z" fill="#DE3831"/></svg>', isYouthTeam: false },
  { id: 'nz', name: 'New Zealand', homeGround: 'EDP', logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#111827" stroke="#9CA3AF" stroke-width="4"/><path d="M50 20 C45 35 25 45 25 60 C25 75 40 80 50 80 C60 80 75 75 75 60 C75 45 55 35 50 20 Z" fill="#E5E7EB"/><circle cx="50" cy="55" r="8" fill="#111827"/></svg>', isYouthTeam: false },
  { id: 'wi', name: 'West Indies', homeGround: 'KEO', logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#7A0026" stroke="#FDB913" stroke-width="4"/><circle cx="50" cy="50" r="30" fill="#FDB913"/><path d="M50 30 C40 30 35 45 42 60 L50 72 L58 60 C65 45 60 30 50 30 Z" fill="#7A0026"/></svg>', isYouthTeam: false },
  { id: 'sl', name: 'Sri Lanka', homeGround: 'RPS', logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#0A1172" stroke="#FBB03B" stroke-width="4"/><circle cx="50" cy="50" r="30" fill="#8D153A"/><polygon points="50,32 54,44 67,44 56,52 60,65 50,57 40,65 44,52 33,44 46,44" fill="#FBB03B"/></svg>', isYouthTeam: false },
  { id: 'afg', name: 'Afghanistan', homeGround: 'KBL', logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#0018A8" stroke="#D32011" stroke-width="4"/><circle cx="50" cy="50" r="28" fill="#000000"/><circle cx="50" cy="50" r="16" fill="#007A3D"/><polygon points="50,38 53,46 62,46 55,51 58,59 50,54 42,59 45,51 38,46 47,46" fill="#FFFFFF"/></svg>', isYouthTeam: false },
  { id: 'ban', name: 'Bangladesh', homeGround: 'SBD', logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#006A4E" stroke="#F42A41" stroke-width="4"/><circle cx="45" cy="50" r="24" fill="#F42A41"/></svg>', isYouthTeam: false },
  { id: 'ire', name: 'Ireland', homeGround: 'MAL', logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#169B62" stroke="#FF883E" stroke-width="4"/><circle cx="50" cy="50" r="28" fill="#FFFFFF"/><path d="M42 38 C36 34 30 42 36 48 C42 54 48 48 48 48 C48 48 54 54 60 48 C66 42 60 34 54 38 C50 41 50 45 50 50 L50 66" stroke="#169B62" stroke-width="6" fill="none" stroke-linecap="round"/></svg>', isYouthTeam: false },
  { id: 'zim', name: 'Zimbabwe', homeGround: 'HSC', logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#D40000" stroke="#FFD200" stroke-width="4"/><polygon points="50,25 68,40 60,65 40,65 32,40" fill="#FFD200"/><polygon points="50,35 53,44 62,44 55,49 58,58 50,53 42,58 45,49 38,44 47,44" fill="#D40000"/></svg>', isYouthTeam: false },
  { id: 'ned', name: 'Netherlands', homeGround: 'VRA', logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#F36C21" stroke="#21468B" stroke-width="4"/><path d="M25 35 H75 V45 H25 Z M25 45 H75 V55 H25 Z M25 55 H75 V65 H25 Z" fill="#FFFFFF"/><circle cx="50" cy="50" r="14" fill="#21468B"/></svg>', isYouthTeam: false },
  { id: 'sco', name: 'Scotland', homeGround: 'GRN', logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#005EB8" stroke="#FFFFFF" stroke-width="4"/><line x1="20" y1="20" x2="80" y2="80" stroke="#FFFFFF" stroke-width="12"/><line x1="80" y1="20" x2="20" y2="80" stroke="#FFFFFF" stroke-width="12"/></svg>', isYouthTeam: false },
  { id: 'usa', name: 'USA', homeGround: 'GPS', logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#002868" stroke="#BF0A30" stroke-width="4"/><path d="M50 15 L85 50 L50 85 L15 50 Z" fill="#BF0A30"/><polygon points="50,30 54,42 66,42 56,50 60,62 50,54 40,62 44,50 34,42 46,42" fill="#FFFFFF"/></svg>', isYouthTeam: false },
  { id: 'nep', name: 'Nepal', homeGround: 'TUC', logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#DC143C" stroke="#003893" stroke-width="4"/><path d="M30 20 L70 45 L45 45 L75 75 L25 75 Z" fill="#003893"/><circle cx="45" cy="60" r="8" fill="#FFFFFF"/></svg>', isYouthTeam: false },
  { id: 'nam', name: 'Namibia', homeGround: 'WDC', logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#002F6C" stroke="#C8102E" stroke-width="4"/><circle cx="50" cy="50" r="28" fill="#007A3D"/><polygon points="50,30 55,42 67,42 57,50 61,62 50,54 39,62 43,50 33,42 45,42" fill="#FFCD00"/></svg>', isYouthTeam: false },
  { id: 'oma', name: 'Oman', homeGround: 'ACA', logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#EE2737" stroke="#008000" stroke-width="4"/><path d="M25 35 H75 V45 H25 Z M25 45 H75 V55 H25 Z M25 55 H75 V65 H25 Z" fill="#FFFFFF"/><circle cx="50" cy="50" r="12" fill="#008000"/></svg>', isYouthTeam: false },
  { id: 'can', name: 'Canada', homeGround: 'MAP', logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#FF0000" stroke="#FFFFFF" stroke-width="4"/><rect x="30" y="20" width="40" height="60" fill="#FFFFFF"/><path d="M50 25 L55 38 L65 35 L58 46 L68 52 L54 54 L52 68 L48 68 L46 54 L32 52 L42 46 L35 35 L45 38 Z" fill="#FF0000"/></svg>', isYouthTeam: false },
  { id: 'uae', name: 'UAE', homeGround: 'DXB', logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#00732F" stroke="#FF0000" stroke-width="4"/><rect x="20" y="32" width="60" height="12" fill="#00732F"/><rect x="20" y="44" width="60" height="12" fill="#FFFFFF"/><rect x="20" y="56" width="60" height="12" fill="#000000"/><rect x="20" y="32" width="16" height="36" fill="#FF0000"/></svg>', isYouthTeam: false },
];

export const GROUNDS: Ground[] = [
  { name: "Gaddafi Stadium, Lahore", code: "GAD", pitch: "Batting Paradise", dimensions: "70m / 68m", weather: "Sunny", boundarySize: "Medium", outfieldSpeed: "Lightning", capacity: 27000 },
  { name: "Eden Gardens, Kolkata", code: "EDN", pitch: "Balanced Sporting Pitch", dimensions: "72m / 70m", weather: "Humid", boundarySize: "Large", outfieldSpeed: "Fast", capacity: 68000 },
  { name: "Melbourne Cricket Ground", code: "MCG", pitch: "Balanced Sporting Pitch", dimensions: "85m / 80m", weather: "Sunny", boundarySize: "Large", outfieldSpeed: "Lightning", capacity: 100000 },
  { name: "Lord's Cricket Ground, London", code: "LOR", pitch: "Green Top", dimensions: "74m / 72m", weather: "Overcast", boundarySize: "Medium", outfieldSpeed: "Fast", capacity: 31000 },
  { name: "Newlands, Cape Town", code: "NWL", pitch: "Green Top", dimensions: "70m / 68m", weather: "Sunny", boundarySize: "Medium", outfieldSpeed: "Fast", capacity: 25000 },
  { name: "Eden Park, Auckland", code: "EDP", pitch: "50m Action Track", dimensions: "55m / 55m", weather: "Overcast", boundarySize: "Small", outfieldSpeed: "Lightning", capacity: 42000 },
  { name: "Kensington Oval, Barbados", code: "KEO", pitch: "50m Action Track", dimensions: "65m / 65m", weather: "Sunny", boundarySize: "Small", outfieldSpeed: "Lightning", capacity: 28000 },
  { name: "R. Premadasa Stadium, Colombo", code: "RPS", pitch: "Dusty Spinner’s Haven", dimensions: "68m / 66m", weather: "Humid", boundarySize: "Medium", outfieldSpeed: "Medium", capacity: 35000 },
  { name: "Kabul International Stadium", code: "KBL", pitch: "Dusty Spinner’s Haven", dimensions: "65m / 62m", weather: "Dry", boundarySize: "Small", outfieldSpeed: "Fast", capacity: 15000 },
  { name: "Sher-e-Bangla Stadium, Dhaka", code: "SBD", pitch: "Dead Slow Track", dimensions: "68m / 65m", weather: "Humid", boundarySize: "Medium", outfieldSpeed: "Slow", capacity: 26000 },
  { name: "Malahide Cricket Club, Dublin", code: "MAL", pitch: "Green Top", dimensions: "70m / 68m", weather: "Overcast", boundarySize: "Medium", outfieldSpeed: "Medium", capacity: 11500 },
  { name: "Harare Sports Club", code: "HSC", pitch: "Cracked Worn Surface", dimensions: "72m / 70m", weather: "Sunny", boundarySize: "Medium", outfieldSpeed: "Fast", capacity: 10000 },
  { name: "VRA Cricket Ground, Amstelveen", code: "VRA", pitch: "Balanced Sporting Pitch", dimensions: "68m / 66m", weather: "Overcast", boundarySize: "Medium", outfieldSpeed: "Medium", capacity: 5000 },
  { name: "The Grange Club, Edinburgh", code: "GRN", pitch: "Green Top", dimensions: "66m / 64m", weather: "Overcast", boundarySize: "Small", outfieldSpeed: "Medium", capacity: 5000 },
  { name: "Grand Prairie Stadium, Dallas", code: "GPS", pitch: "50m Action Track", dimensions: "65m / 65m", weather: "Sunny", boundarySize: "Small", outfieldSpeed: "Lightning", capacity: 15000 },
  { name: "TU Cricket Ground, Kathmandu", code: "TUC", pitch: "Dead Slow Track", dimensions: "65m / 62m", weather: "Sunny", boundarySize: "Small", outfieldSpeed: "Slow", capacity: 20000 },
  { name: "Wanderers Cricket Ground, Windhoek", code: "WDC", pitch: "Cracked Worn Surface", dimensions: "68m / 66m", weather: "Sunny", boundarySize: "Medium", outfieldSpeed: "Fast", capacity: 7000 },
  { name: "Al Amerat Cricket Stadium, Muscat", code: "ACA", pitch: "Batting Paradise", dimensions: "70m / 68m", weather: "Sunny", boundarySize: "Medium", outfieldSpeed: "Lightning", capacity: 10000 },
  { name: "Maple Leaf Cricket Club, King City", code: "MAP", pitch: "Green Top", dimensions: "66m / 64m", weather: "Overcast", boundarySize: "Small", outfieldSpeed: "Medium", capacity: 6000 },
  { name: "Dubai International Stadium", code: "DXB", pitch: "50m Action Track", dimensions: "72m / 70m", weather: "Sunny", boundarySize: "Medium", outfieldSpeed: "Lightning", capacity: 25000 },
];

export const PITCH_TYPES = [ "50m Action Track", "Balanced Sporting Pitch", "Dusty Spinner’s Haven", "Green Top", "Batting Paradise", "Dead Slow Track", "Cracked Worn Surface" ];

export const generateSingleFormatInitialStats = (): PlayerStats => {
    const phaseStats = {
        batting: {
            pp: { runs: 0, balls: 0, dismissals: 0 },
            mo: { runs: 0, balls: 0, dismissals: 0 },
            do: { runs: 0, balls: 0, dismissals: 0 }
        },
        bowling: {
            pp: { wickets: 0, runsConceded: 0, ballsBowled: 0 },
            mo: { wickets: 0, runsConceded: 0, ballsBowled: 0 },
            do: { wickets: 0, runsConceded: 0, ballsBowled: 0 }
        }
    };

    const positionStats: Record<number, { innings: number; runs: number; balls: number; dismissals: number; thirties: number; fifties: number; hundreds: number }> = {};
    for (let pos = 1; pos <= 11; pos++) {
        positionStats[pos] = { innings: 0, runs: 0, balls: 0, dismissals: 0, thirties: 0, fifties: 0, hundreds: 0 };
    }

    return {
        matches: 0, 
        inningsBatting: 0,
        inningsBowling: 0,
        runs: 0, highestScore: 0, average: 0, strikeRate: 0, ballsFaced: 0, dismissals: 0,
        hundreds: 0, fifties: 0, thirties: 0, fours: 0, sixes: 0, fastestFifty: 0, fastestHundred: 0,
        wickets: 0, economy: 0, bestBowling: '-', bestBowlingWickets: 0, bestBowlingRuns: 0,
        bowlingAverage: 0, ballsBowled: 0, runsConceded: 0, threeWicketHauls: 0, fiveWicketHauls: 0,
        catches: 0, runOuts: 0, manOfTheMatchAwards: 0,
        phaseStats,
        positionStats
    };
};

export const generateInitialStats = (): { [key in Format]: PlayerStats } => {
    const stats: any = {};
    Object.values(Format).forEach(f => stats[f] = generateSingleFormatInitialStats());
    return stats;
};

// --- RAW PLAYER DATA HAS BEEN MOVED TO utils/playerRegistry.ts ---

export const PLAYERS: Player[] = initializePlayersWithWeaknesses([
    ...getAllExtraPlayers()
]);

export const PRE_BUILT_SQUADS: Record<string, string[]> = {
  'pak': [
    'bt-6', 'bt-12', 'bt-27', 'bt-30', 'bt-32', 'bt-5', 'bt-7', 'bt-13',
    'wk-2', 'wk-9', 'wk-10',
    'ar-12', 'ar-7', 'ar-11', 'ar-9', 'ar-13',
    'bl-12', 'bl-13', 'bl-24', 'bl-25', 'bl-18', 'bl-19', 'sb-3', 'sb-6'
  ],
  'ind': [
    'int-ind-1', 'int-ind-2', 'int-ind-3', 'int-ind-4', 'int-ind-5', 'int-ind-17',
    'int-ind-6', 'int-ind-7',
    'int-ind-8', 'int-ind-9', 'int-ind-10', 'int-ind-18',
    'int-ind-11', 'int-ind-12', 'int-ind-19',
    'int-ind-13', 'int-ind-14', 'int-ind-15', 'int-ind-16', 'int-ind-20'
  ],
  'aus': [
    'int-au-1', 'int-au-2', 'int-au-3', 'int-au-4', 'int-au-5', 'int-au-6',
    'int-au-7', 'int-au-8', 'int-au-9', 'int-au-10', 'int-nz-4',
    'int-au-11', 'int-au-12', 'int-au-13', 'int-au-14', 'int-au-15', 'int-au-16',
    'int-au-17', 'int-au-18', 'int-au-19', 'int-au-20', 'int-au-21'
  ],
  'eng': [
    'int-en-1', 'int-en-2', 'int-nz-5',
    'int-en-3', 'int-en-4', 'int-en-5', 'int-en-6', 'int-en-7', 'int-en-8', 'int-en-9', 'int-en-10',
    'int-en-11', 'int-en-12', 'int-en-13', 'int-en-14', 'int-en-15', 'int-en-16', 'int-en-17', 'int-en-18', 'int-en-19', 'int-en-20'
  ],
  'sa': [
    'int-sa-1', 'int-sa-2',
    'int-sa-3', 'int-sa-4', 'int-sa-5', 'int-sa-6', 'int-sa-7', 'int-sa-8', 'int-sa-9', 'int-sa-10',
    'int-sa-11', 'int-sa-12', 'int-sa-13', 'int-sa-14', 'int-sa-15', 'int-sa-16', 'int-sa-17', 'int-sa-18', 'int-sa-19', 'int-sa-20'
  ],
  'nz': [
    'int-nz-1', 'int-nz-2', 'int-nz-3',
    'int-nz-6', 'int-nz-7', 'int-nz-8', 'int-nz-9', 'int-nz-10',
    'int-nz-11', 'int-nz-12', 'int-nz-13', 'int-nz-14', 'int-nz-15', 'int-nz-16', 'int-nz-17', 'int-nz-18', 'int-nz-19', 'int-nz-20'
  ],
  'wi': [
    'int-wi-1', 'int-wi-2', 'int-wi-3',
    'int-wi-4', 'int-wi-5', 'int-wi-6', 'int-wi-7', 'int-wi-8', 'int-wi-9', 'int-wi-10',
    'int-wi-11', 'int-wi-12', 'int-wi-13', 'int-wi-14', 'int-wi-15'
  ],
  'sl': [
    'int-sl-1', 'int-sl-2',
    'int-sl-3', 'int-sl-4', 'int-sl-5', 'int-sl-6', 'int-sl-7', 'int-sl-8', 'int-sl-9', 'int-sl-10',
    'int-sl-11', 'int-sl-12', 'int-sl-13', 'int-sl-14', 'int-sl-15', 'int-sl-16', 'int-sl-17', 'int-sl-18', 'int-sl-19', 'int-sl-20',
    'int-sl-21', 'int-sl-22'
  ],
  'afg': [
    'int-afg-1', 'int-afg-2', 'int-afg-3', 'int-afg-4', 'int-afg-5', 'int-afg-6', 'int-afg-7', 'int-afg-8', 'int-afg-9', 'int-afg-10',
    'int-afg-11', 'int-afg-12', 'int-afg-13', 'int-afg-14', 'int-afg-15', 'int-afg-16', 'int-afg-17', 'int-afg-18', 'int-afg-19', 'int-afg-20'
  ],
  'ban': [
    'int-ban-1', 'int-ban-2', 'int-ban-3', 'int-ban-4', 'int-ban-5', 'int-ban-6', 'int-ban-7', 'int-ban-8', 'int-ban-9', 'int-ban-10',
    'int-ban-11', 'int-ban-12', 'int-ban-13', 'int-ban-14', 'int-ban-15', 'int-ban-16', 'int-ban-17', 'int-ban-18', 'int-ban-19', 'int-ban-20'
  ],
  'ire': [
    'int-ire-1', 'int-ire-2', 'int-ire-3', 'int-ire-4', 'int-ire-5', 'int-ire-6', 'int-ire-7', 'int-ire-8', 'int-ire-9', 'int-ire-10',
    'int-ire-11', 'int-ire-12', 'int-ire-13', 'int-ire-14', 'int-ire-15', 'int-ire-16', 'int-ire-17', 'int-ire-18', 'int-ire-19', 'int-ire-20'
  ],
  'zim': [
    'int-zim-1', 'int-zim-2', 'int-zim-3', 'int-zim-4', 'int-zim-5', 'int-zim-6', 'int-zim-7', 'int-zim-8', 'int-zim-9', 'int-zim-10',
    'int-zim-11', 'int-zim-12', 'int-zim-13', 'int-zim-14', 'int-zim-15', 'int-zim-16', 'int-zim-17', 'int-zim-18', 'int-zim-19', 'int-zim-20'
  ],
  'ned': [
    'int-ned-1', 'int-ned-2', 'int-ned-3', 'int-ned-4', 'int-ned-5', 'int-ned-6', 'int-ned-7', 'int-ned-8', 'int-ned-9', 'int-ned-10',
    'int-ned-11', 'int-ned-12', 'int-ned-13', 'int-ned-14', 'int-ned-15'
  ],
  'sco': [
    'int-sco-1', 'int-sco-2', 'int-sco-3', 'int-sco-4', 'int-sco-5', 'int-sco-6', 'int-sco-7', 'int-sco-8', 'int-sco-9', 'int-sco-10',
    'int-sco-11', 'int-sco-12', 'int-sco-13', 'int-sco-14', 'int-sco-15'
  ],
  'usa': [
    'int-usa-1', 'int-usa-2', 'int-usa-3', 'int-usa-4', 'int-usa-5', 'int-usa-6', 'int-usa-7', 'int-usa-8', 'int-usa-9', 'int-usa-10',
    'int-usa-11', 'int-usa-12', 'int-usa-13', 'int-usa-14', 'int-usa-15'
  ],
  'nep': [
    'int-nep-1', 'int-nep-2', 'int-nep-3', 'int-nep-4', 'int-nep-5', 'int-nep-6', 'int-nep-7', 'int-nep-8', 'int-nep-9', 'int-nep-10',
    'int-nep-11', 'int-nep-12', 'int-nep-13', 'int-nep-14', 'int-nep-15'
  ],
  'nam': [
    'int-nam-1', 'int-nam-2', 'int-nam-3', 'int-nam-4', 'int-nam-5', 'int-nam-6',
    'int-nam-7', 'int-nam-8', 'int-nam-9', 'int-nam-10', 'int-nam-11', 'int-nam-12',
    'int-nam-13', 'int-nam-14', 'int-nam-15'
  ],
  'oma': [
    'int-omn-1', 'int-omn-2', 'int-omn-3', 'int-omn-4', 'int-omn-5', 'int-omn-6',
    'int-omn-7', 'int-omn-8', 'int-omn-9', 'int-omn-10', 'int-omn-11', 'int-omn-12',
    'int-omn-13', 'int-omn-14', 'int-omn-15'
  ],
  'can': [
    'int-can-1', 'int-can-2', 'int-can-3', 'int-can-4', 'int-can-5', 'int-can-6',
    'int-can-7', 'int-can-8', 'int-can-9', 'int-can-10', 'int-can-11', 'int-can-12',
    'int-can-13', 'int-can-14', 'int-can-15'
  ],
  'uae': [
    'int-uae-1', 'int-uae-2', 'int-uae-3', 'int-uae-4', 'int-uae-5', 'int-uae-6',
    'int-uae-7', 'int-uae-8', 'int-uae-9', 'int-uae-10', 'int-uae-11', 'int-uae-12',
    'int-uae-13', 'int-uae-14', 'int-uae-15'
  ],
};

export const INITIAL_NEWS: NewsArticle[] = [
    { id: 'n1', headline: "International Season Kicks Off!", date: "28 Jun 2026", excerpt: "World cricket nations assemble for the global championship calendar.", content: "16 international teams are set to compete across T10, T20 International, ODI Cup, and World Test Championship formats. Rosters are locked and squads are in peak condition.", type: 'league' },
    { id: 'n2', headline: "Global Nations Championship Open", date: "29 Jun 2026", excerpt: "Top cricket nations ready for Match 1.", content: "All international squads have announced their touring squads. Fast bowling pace attacks and spin batteries are geared up for the season opener.", type: 'league' },
    { id: 'n3', headline: "World Stars Touch Down", date: "30 Jun 2026", excerpt: "International talent ready for action.", content: "The competition across all 4 international formats is anticipated to be the fiercest in global cricket history.", type: 'league' },
];

export const NEWS_ARTICLES = INITIAL_NEWS;

import { 
  GameData, 
  Format, 
  Team, 
  Match, 
  GameDate, 
  MajorTournamentType, 
  RankingFormat, 
  TeamRanking, 
  MatchResult,
  Player
} from '../types';
import { formatShortDate } from './gameCalendar';

export const MAJOR_TOURNAMENT_CYCLE: MajorTournamentType[] = [
  'ODI World Cup',
  'T20 World Cup',
  'Champions Trophy',
  'World Test Championship Final'
];

export interface MajorTournamentMeta {
  type: MajorTournamentType;
  cycleIndex: number;
  name: string;
  format: Format;
  rankingFormat: RankingFormat;
  teamCount: number;
  structure: string;
  description: string;
  trophyField: 'worldCupsWon' | 't20WorldCupsWon' | 'championsTrophiesWon' | 'wtcTitlesWon';
}

export const getMajorTournamentCycleInfo = (year: number): MajorTournamentMeta => {
  const cycleIndex = Math.abs((year - 1) % 4);
  const type = MAJOR_TOURNAMENT_CYCLE[cycleIndex];

  switch (type) {
    case 'ODI World Cup':
      return {
        type,
        cycleIndex,
        name: `ICC Men's Cricket World Cup (ODI) — Year ${year}`,
        format: Format.ODI,
        rankingFormat: 'ODI',
        teamCount: 10,
        structure: 'Top 10 Nations in 2 Groups of 5 → Semifinals → World Cup Final (23 matches total)',
        description: 'The pinnacle 50-over quadrennial championship contested by the global top 10 ranked cricket nations in two groups of five.',
        trophyField: 'worldCupsWon'
      };
    case 'T20 World Cup':
      return {
        type,
        cycleIndex,
        name: `ICC Men's T20 World Cup — Year ${year}`,
        format: Format.T20,
        rankingFormat: 'T20',
        teamCount: 20, // 20 international nations in 4 groups of 5
        structure: '20 Nations in 4 Groups of 5 → Quarter-Finals → Semifinals → T20 World Cup Final (47 matches total)',
        description: 'High-octane 20-over world championship with 20 nations across 4 groups of 5, followed by knockout Quarter-Finals, Semifinals, and Final.',
        trophyField: 't20WorldCupsWon'
      };
    case 'Champions Trophy':
      return {
        type,
        cycleIndex,
        name: `ICC Champions Trophy (ODI) — Year ${year}`,
        format: Format.ODI,
        rankingFormat: 'ODI',
        teamCount: 8,
        structure: 'Top 8 Ranked Nations in 2 Groups of 4 → Semifinals → Champions Trophy Final (15 matches total)',
        description: 'Elite 8-nation ODI tournament. Only the top 8 ranked ODI teams in world cricket qualify for the battle across 2 groups of 4.',
        trophyField: 'championsTrophiesWon'
      };
    case 'World Test Championship Final':
      return {
        type,
        cycleIndex,
        name: `ICC World Test Championship (WTC) Finals — Year ${year}`,
        format: Format.FIRST_CLASS,
        rankingFormat: 'Test',
        teamCount: 4,
        structure: 'Top 4 Test-Ranked Nations → Semifinals (1v4, 2v3) → WTC Final at Lord\'s (3 matches total)',
        description: 'The ultimate pinnacle of red-ball Test cricket. The top 4 teams from the Test ranking cycle battle in knockout Tests.',
        trophyField: 'wtcTitlesWon'
      };
  }
};

/**
 * Generate all Month 12 Major Tournament fixtures with capped Group Stage -> Knockout structure (under 50 matches)
 */
export const generateMajorTournament = (
  year: number,
  allTeams: Team[],
  rankings?: {
    teams: Record<RankingFormat, TeamRanking[]>;
  }
): {
  meta: MajorTournamentMeta;
  participatingTeams: Team[];
  groupA: Team[];
  groupB: Team[];
  groupC?: Team[];
  groupD?: Team[];
  matches: Match[];
} => {
  const meta = getMajorTournamentCycleInfo(year);
  const rankingList = rankings?.teams?.[meta.rankingFormat] || [];

  // Sort all teams based on current format rankings if available, or overall squad skill
  const sortedTeams = [...allTeams].sort((a, b) => {
    const rankA = rankingList.find(r => r.teamId === a.id)?.rank ?? 999;
    const rankB = rankingList.find(r => r.teamId === b.id)?.rank ?? 999;
    if (rankA !== rankB) return rankA - rankB;
    const skillA = a.squad.reduce((sum, p) => sum + (p.battingSkill + p.secondarySkill), 0);
    const skillB = b.squad.reduce((sum, p) => sum + (p.battingSkill + p.secondarySkill), 0);
    return skillB - skillA;
  });

  let participatingTeams: Team[] = [];
  let groupA: Team[] = [];
  let groupB: Team[] = [];
  let groupC: Team[] = [];
  let groupD: Team[] = [];
  const matches: Match[] = [];

  const tournamentMonth = 12;

  if (meta.type === 'ODI World Cup') {
    // Top 10 teams -> 2 groups of 5
    participatingTeams = sortedTeams.slice(0, 10);
    // Snake seeding: Group A (1, 4, 5, 8, 9), Group B (2, 3, 6, 7, 10)
    groupA = [participatingTeams[0], participatingTeams[3], participatingTeams[4], participatingTeams[7], participatingTeams[8]].filter(Boolean);
    groupB = [participatingTeams[1], participatingTeams[2], participatingTeams[5], participatingTeams[6], participatingTeams[9]].filter(Boolean);

    let matchIdx = 1;
    let day = 1;

    // Group A round-robin matches (10 matches)
    for (let i = 0; i < groupA.length; i++) {
      for (let j = i + 1; j < groupA.length; j++) {
        const sDate: GameDate = { year, month: tournamentMonth, day: Math.min(22, day) };
        matches.push({
          matchNumber: `WC-A${matchIdx++}`,
          teamA: groupA[i].name,
          teamAId: groupA[i].id,
          vs: 'vs',
          teamB: groupA[j].name,
          teamBId: groupA[j].id,
          date: formatShortDate(sDate),
          scheduledDate: sDate,
          group: 'Group A',
          seriesId: `major-tourn-${year}`,
          seriesName: meta.name,
          format: meta.format,
          daysPlayed: 1
        });
        day += 2;
      }
    }

    // Group B round-robin matches (10 matches)
    day = 2;
    for (let i = 0; i < groupB.length; i++) {
      for (let j = i + 1; j < groupB.length; j++) {
        const sDate: GameDate = { year, month: tournamentMonth, day: Math.min(23, day) };
        matches.push({
          matchNumber: `WC-B${matchIdx++}`,
          teamA: groupB[i].name,
          teamAId: groupB[i].id,
          vs: 'vs',
          teamB: groupB[j].name,
          teamBId: groupB[j].id,
          date: formatShortDate(sDate),
          scheduledDate: sDate,
          group: 'Group B',
          seriesId: `major-tourn-${year}`,
          seriesName: meta.name,
          format: meta.format,
          daysPlayed: 1
        });
        day += 2;
      }
    }

    // Semi-Final 1 (A1 vs B2) on Day 25
    matches.push({
      matchNumber: `WC-SF1`,
      teamA: `${groupA[0]?.name || 'Group A Winner'}`,
      teamAId: groupA[0]?.id || '',
      vs: 'vs',
      teamB: `${groupB[1]?.name || 'Group B Runner-Up'}`,
      teamBId: groupB[1]?.id || '',
      date: formatShortDate({ year, month: tournamentMonth, day: 25 }),
      scheduledDate: { year, month: tournamentMonth, day: 25 },
      group: 'Semi-Finals',
      seriesId: `major-tourn-${year}`,
      seriesName: meta.name,
      format: meta.format,
      daysPlayed: 1
    });

    // Semi-Final 2 (B1 vs A2) on Day 26
    matches.push({
      matchNumber: `WC-SF2`,
      teamA: `${groupB[0]?.name || 'Group B Winner'}`,
      teamAId: groupB[0]?.id || '',
      vs: 'vs',
      teamB: `${groupA[1]?.name || 'Group A Runner-Up'}`,
      teamBId: groupA[1]?.id || '',
      date: formatShortDate({ year, month: tournamentMonth, day: 26 }),
      scheduledDate: { year, month: tournamentMonth, day: 26 },
      group: 'Semi-Finals',
      seriesId: `major-tourn-${year}`,
      seriesName: meta.name,
      format: meta.format,
      daysPlayed: 1
    });

    // World Cup Final on Day 29
    matches.push({
      matchNumber: `WC-FINAL`,
      teamA: `${groupA[0]?.name || 'Finalist 1'}`,
      teamAId: groupA[0]?.id || '',
      vs: 'vs',
      teamB: `${groupB[0]?.name || 'Finalist 2'}`,
      teamBId: groupB[0]?.id || '',
      date: formatShortDate({ year, month: tournamentMonth, day: 29 }),
      scheduledDate: { year, month: tournamentMonth, day: 29 },
      group: 'Final',
      seriesId: `major-tourn-${year}`,
      seriesName: meta.name,
      format: meta.format,
      daysPlayed: 1
    });

  } else if (meta.type === 'T20 World Cup') {
    // 20 teams partitioned into 4 groups of 5 (Group A, B, C, D)
    participatingTeams = sortedTeams.slice(0, 20);
    // If fewer than 20, fill with all available
    if (participatingTeams.length === 0) participatingTeams = sortedTeams;

    groupA = [];
    groupB = [];
    groupC = [];
    groupD = [];

    participatingTeams.forEach((t, idx) => {
      const g = idx % 4;
      if (g === 0) groupA.push(t);
      else if (g === 1) groupB.push(t);
      else if (g === 2) groupC.push(t);
      else groupD.push(t);
    });

    let matchIdx = 1;
    const addGroupMatches = (grp: Team[], grpName: string, offsetDay: number) => {
      let gDay = offsetDay;
      for (let i = 0; i < grp.length; i++) {
        for (let j = i + 1; j < grp.length; j++) {
          const sDate: GameDate = { year, month: tournamentMonth, day: Math.min(22, gDay) };
          matches.push({
            matchNumber: `T20WC-${grpName[grpName.length - 1]}${matchIdx++}`,
            teamA: grp[i].name,
            teamAId: grp[i].id,
            vs: 'vs',
            teamB: grp[j].name,
            teamBId: grp[j].id,
            date: formatShortDate(sDate),
            scheduledDate: sDate,
            group: grpName,
            seriesId: `major-tourn-${year}`,
            seriesName: meta.name,
            format: meta.format,
            daysPlayed: 1
          });
          gDay = (gDay % 22) + 2;
        }
      }
    };

    addGroupMatches(groupA, 'Group A', 1);
    addGroupMatches(groupB, 'Group B', 2);
    addGroupMatches(groupC, 'Group C', 3);
    addGroupMatches(groupD, 'Group D', 4);

    // Knockout Quarter-Finals (Super 8 Knockouts on Days 23-24)
    matches.push({
      matchNumber: `T20WC-QF1`,
      teamA: groupA[0]?.name || 'Group A Winner',
      teamAId: groupA[0]?.id || '',
      vs: 'vs',
      teamB: groupB[1]?.name || 'Group B Runner-Up',
      teamBId: groupB[1]?.id || '',
      date: formatShortDate({ year, month: tournamentMonth, day: 23 }),
      scheduledDate: { year, month: tournamentMonth, day: 23 },
      group: 'Quarter-Finals',
      seriesId: `major-tourn-${year}`,
      seriesName: meta.name,
      format: meta.format,
      daysPlayed: 1
    });

    matches.push({
      matchNumber: `T20WC-QF2`,
      teamA: groupB[0]?.name || 'Group B Winner',
      teamAId: groupB[0]?.id || '',
      vs: 'vs',
      teamB: groupA[1]?.name || 'Group A Runner-Up',
      teamBId: groupA[1]?.id || '',
      date: formatShortDate({ year, month: tournamentMonth, day: 23 }),
      scheduledDate: { year, month: tournamentMonth, day: 23 },
      group: 'Quarter-Finals',
      seriesId: `major-tourn-${year}`,
      seriesName: meta.name,
      format: meta.format,
      daysPlayed: 1
    });

    matches.push({
      matchNumber: `T20WC-QF3`,
      teamA: groupC[0]?.name || 'Group C Winner',
      teamAId: groupC[0]?.id || '',
      vs: 'vs',
      teamB: groupD[1]?.name || 'Group D Runner-Up',
      teamBId: groupD[1]?.id || '',
      date: formatShortDate({ year, month: tournamentMonth, day: 24 }),
      scheduledDate: { year, month: tournamentMonth, day: 24 },
      group: 'Quarter-Finals',
      seriesId: `major-tourn-${year}`,
      seriesName: meta.name,
      format: meta.format,
      daysPlayed: 1
    });

    matches.push({
      matchNumber: `T20WC-QF4`,
      teamA: groupD[0]?.name || 'Group D Winner',
      teamAId: groupD[0]?.id || '',
      vs: 'vs',
      teamB: groupC[1]?.name || 'Group C Runner-Up',
      teamBId: groupC[1]?.id || '',
      date: formatShortDate({ year, month: tournamentMonth, day: 24 }),
      scheduledDate: { year, month: tournamentMonth, day: 24 },
      group: 'Quarter-Finals',
      seriesId: `major-tourn-${year}`,
      seriesName: meta.name,
      format: meta.format,
      daysPlayed: 1
    });

    // Semi-Final 1 (Day 26)
    matches.push({
      matchNumber: `T20WC-SF1`,
      teamA: groupA[0]?.name || 'QF1 Winner',
      teamAId: groupA[0]?.id || '',
      vs: 'vs',
      teamB: groupC[0]?.name || 'QF3 Winner',
      teamBId: groupC[0]?.id || '',
      date: formatShortDate({ year, month: tournamentMonth, day: 26 }),
      scheduledDate: { year, month: tournamentMonth, day: 26 },
      group: 'Semi-Finals',
      seriesId: `major-tourn-${year}`,
      seriesName: meta.name,
      format: meta.format,
      daysPlayed: 1
    });

    // Semi-Final 2 (Day 27)
    matches.push({
      matchNumber: `T20WC-SF2`,
      teamA: groupB[0]?.name || 'QF2 Winner',
      teamAId: groupB[0]?.id || '',
      vs: 'vs',
      teamB: groupD[0]?.name || 'QF4 Winner',
      teamBId: groupD[0]?.id || '',
      date: formatShortDate({ year, month: tournamentMonth, day: 27 }),
      scheduledDate: { year, month: tournamentMonth, day: 27 },
      group: 'Semi-Finals',
      seriesId: `major-tourn-${year}`,
      seriesName: meta.name,
      format: meta.format,
      daysPlayed: 1
    });

    // T20 World Cup Final (Day 29)
    matches.push({
      matchNumber: `T20WC-FINAL`,
      teamA: groupA[0]?.name || 'T20 Finalist 1',
      teamAId: groupA[0]?.id || '',
      vs: 'vs',
      teamB: groupB[0]?.name || 'T20 Finalist 2',
      teamBId: groupB[0]?.id || '',
      date: formatShortDate({ year, month: tournamentMonth, day: 29 }),
      scheduledDate: { year, month: tournamentMonth, day: 29 },
      group: 'Final',
      seriesId: `major-tourn-${year}`,
      seriesName: meta.name,
      format: meta.format,
      daysPlayed: 1
    });

  } else if (meta.type === 'Champions Trophy') {
    // Top 8 teams in 2 groups of 4
    participatingTeams = sortedTeams.slice(0, 8);
    groupA = [participatingTeams[0], participatingTeams[3], participatingTeams[4], participatingTeams[7]].filter(Boolean);
    groupB = [participatingTeams[1], participatingTeams[2], participatingTeams[5], participatingTeams[6]].filter(Boolean);

    let matchIdx = 1;
    let day = 1;

    // Group A round robin (6 matches)
    for (let i = 0; i < groupA.length; i++) {
      for (let j = i + 1; j < groupA.length; j++) {
        const sDate: GameDate = { year, month: tournamentMonth, day: Math.min(21, day) };
        matches.push({
          matchNumber: `CT-A${matchIdx++}`,
          teamA: groupA[i].name,
          teamAId: groupA[i].id,
          vs: 'vs',
          teamB: groupA[j].name,
          teamBId: groupA[j].id,
          date: formatShortDate(sDate),
          scheduledDate: sDate,
          group: 'Group A',
          seriesId: `major-tourn-${year}`,
          seriesName: meta.name,
          format: meta.format,
          daysPlayed: 1
        });
        day += 3;
      }
    }

    // Group B round robin (6 matches)
    day = 2;
    for (let i = 0; i < groupB.length; i++) {
      for (let j = i + 1; j < groupB.length; j++) {
        const sDate: GameDate = { year, month: tournamentMonth, day: Math.min(22, day) };
        matches.push({
          matchNumber: `CT-B${matchIdx++}`,
          teamA: groupB[i].name,
          teamAId: groupB[i].id,
          vs: 'vs',
          teamB: groupB[j].name,
          teamBId: groupB[j].id,
          date: formatShortDate(sDate),
          scheduledDate: sDate,
          group: 'Group B',
          seriesId: `major-tourn-${year}`,
          seriesName: meta.name,
          format: meta.format,
          daysPlayed: 1
        });
        day += 3;
      }
    }

    // Semi-Final 1 (Day 25)
    matches.push({
      matchNumber: `CT-SF1`,
      teamA: groupA[0]?.name || 'Group A Winner',
      teamAId: groupA[0]?.id || '',
      vs: 'vs',
      teamB: groupB[1]?.name || 'Group B Runner-Up',
      teamBId: groupB[1]?.id || '',
      date: formatShortDate({ year, month: tournamentMonth, day: 25 }),
      scheduledDate: { year, month: tournamentMonth, day: 25 },
      group: 'Semi-Finals',
      seriesId: `major-tourn-${year}`,
      seriesName: meta.name,
      format: meta.format,
      daysPlayed: 1
    });

    // Semi-Final 2 (Day 26)
    matches.push({
      matchNumber: `CT-SF2`,
      teamA: groupB[0]?.name || 'Group B Winner',
      teamAId: groupB[0]?.id || '',
      vs: 'vs',
      teamB: groupA[1]?.name || 'Group A Runner-Up',
      teamBId: groupA[1]?.id || '',
      date: formatShortDate({ year, month: tournamentMonth, day: 26 }),
      scheduledDate: { year, month: tournamentMonth, day: 26 },
      group: 'Semi-Finals',
      seriesId: `major-tourn-${year}`,
      seriesName: meta.name,
      format: meta.format,
      daysPlayed: 1
    });

    // Champions Trophy Final (Day 29)
    matches.push({
      matchNumber: `CT-FINAL`,
      teamA: groupA[0]?.name || 'CT Finalist 1',
      teamAId: groupA[0]?.id || '',
      vs: 'vs',
      teamB: groupB[0]?.name || 'CT Finalist 2',
      teamBId: groupB[0]?.id || '',
      date: formatShortDate({ year, month: tournamentMonth, day: 29 }),
      scheduledDate: { year, month: tournamentMonth, day: 29 },
      group: 'Final',
      seriesId: `major-tourn-${year}`,
      seriesName: meta.name,
      format: meta.format,
      daysPlayed: 1
    });

  } else if (meta.type === 'World Test Championship Final') {
    // Top 4 teams from Test ranking table!
    participatingTeams = sortedTeams.slice(0, 4);

    const rank1 = participatingTeams[0] || sortedTeams[0];
    const rank2 = participatingTeams[1] || sortedTeams[1];
    const rank3 = participatingTeams[2] || sortedTeams[2];
    const rank4 = participatingTeams[3] || sortedTeams[3];

    // Semifinal 1: 1st vs 4th (Days 1 - 5)
    matches.push({
      matchNumber: `WTC-SF1 (1st vs 4th)`,
      teamA: rank1.name,
      teamAId: rank1.id,
      vs: 'vs',
      teamB: rank4.name,
      teamBId: rank4.id,
      date: formatShortDate({ year, month: tournamentMonth, day: 2 }),
      scheduledDate: { year, month: tournamentMonth, day: 2 },
      group: 'Semi-Finals',
      seriesId: `major-tourn-${year}`,
      seriesName: meta.name,
      format: Format.FIRST_CLASS,
      daysPlayed: 5
    });

    // Semifinal 2: 2nd vs 3rd (Days 8 - 12)
    matches.push({
      matchNumber: `WTC-SF2 (2nd vs 3rd)`,
      teamA: rank2.name,
      teamAId: rank2.id,
      vs: 'vs',
      teamB: rank3.name,
      teamBId: rank3.id,
      date: formatShortDate({ year, month: tournamentMonth, day: 9 }),
      scheduledDate: { year, month: tournamentMonth, day: 9 },
      group: 'Semi-Finals',
      seriesId: `major-tourn-${year}`,
      seriesName: meta.name,
      format: Format.FIRST_CLASS,
      daysPlayed: 5
    });

    // WTC Final (Lord's / Timeless Test on Days 18 - 23)
    matches.push({
      matchNumber: `WTC-GRAND-FINAL`,
      teamA: rank1.name,
      teamAId: rank1.id,
      vs: 'vs',
      teamB: rank2.name,
      teamBId: rank2.id,
      date: formatShortDate({ year, month: tournamentMonth, day: 20 }),
      scheduledDate: { year, month: tournamentMonth, day: 20 },
      group: 'Final',
      seriesId: `major-tourn-${year}`,
      seriesName: meta.name,
      format: Format.FIRST_CLASS,
      daysPlayed: 5
    });
  }

  return {
    meta,
    participatingTeams,
    groupA,
    groupB,
    groupC,
    groupD,
    matches
  };
};

/**
 * Record tournament triumph to team and squad player profiles
 */
export const awardMajorTournamentTrophy = (
  gameData: GameData,
  winnerTeamId: string,
  runnerUpTeamId: string,
  tournamentType: MajorTournamentType,
  year: number
): void => {
  const meta = getMajorTournamentCycleInfo(year);
  const trophyKey = meta.trophyField;

  // 1. Update Team Profile Trophies
  const winnerTeam = gameData.teams.find(t => t.id === winnerTeamId);
  if (winnerTeam) {
    if (!winnerTeam.trophies) {
      winnerTeam.trophies = { worldCupsWon: 0, t20WorldCupsWon: 0, championsTrophiesWon: 0, wtcTitlesWon: 0 };
    }
    winnerTeam.trophies[trophyKey] = (winnerTeam.trophies[trophyKey] || 0) + 1;

    // 2. Update all squad players on the winning team
    winnerTeam.squad.forEach(p => {
      if (!p.trophies) {
        p.trophies = { worldCupsWon: 0, t20WorldCupsWon: 0, championsTrophiesWon: 0, wtcTitlesWon: 0 };
      }
      p.trophies[trophyKey] = (p.trophies[trophyKey] || 0) + 1;
    });
  }
};

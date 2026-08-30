import { 
  GameData, 
  Format, 
  Team, 
  MatchResult, 
  CurrentYearStanding, 
  Series,
  RankingFormat
} from '../types';
import { getRankingFormat } from './rankingsEngine';

/**
 * Initialize clean zeroed current year standings for all teams
 */
export const initializeCurrentYearStandings = (teams: Team[]): CurrentYearStanding[] => {
  return teams.map((t, idx) => ({
    teamId: t.id,
    teamName: t.name,
    seriesPlayed: 0,
    seriesWon: 0,
    seriesLost: 0,
    seriesDrawn: 0,
    points: 0,
    matchesPlayed: 0,
    matchesWon: 0,
    matchesLost: 0,
    matchesTiedOrDrawn: 0,
    rank: idx + 1,
    byFormat: {
      Test: { seriesPlayed: 0, seriesWon: 0, seriesLost: 0, seriesDrawn: 0, points: 0, matchesPlayed: 0, matchesWon: 0, matchesLost: 0, matchesDrawn: 0 },
      ODI: { seriesPlayed: 0, seriesWon: 0, seriesLost: 0, seriesDrawn: 0, points: 0, matchesPlayed: 0, matchesWon: 0, matchesLost: 0, matchesTied: 0 },
      T20: { seriesPlayed: 0, seriesWon: 0, seriesLost: 0, seriesDrawn: 0, points: 0, matchesPlayed: 0, matchesWon: 0, matchesLost: 0, matchesTied: 0 }
    }
  }));
};

/**
 * Recalculate Current Year Standings from completed series and match results of the current year
 */
export const recalculateCurrentYearStandings = (
  gameData: GameData
): CurrentYearStanding[] => {
  const standings = initializeCurrentYearStandings(gameData.teams);
  const standingsMap = new Map(standings.map(s => [s.teamId, s]));

  const currentYear = gameData.gameDate?.year ?? 1;
  const seriesList = gameData.seriesList || [];

  // Filter series belonging to current year (ignoring Major Tournaments which don't count towards regular season standings)
  const regularSeries = seriesList.filter(s => 
    s.startDate.year === currentYear && !s.id.startsWith('major-tourn-')
  );

  regularSeries.forEach(series => {
    const teamAId = series.teamAId || gameData.teams.find(t => t.name === series.teamA)?.id;
    const teamBId = series.teamBId || gameData.teams.find(t => t.name === series.teamB)?.id;

    if (!teamAId || !teamBId) return;

    const standingA = standingsMap.get(teamAId);
    const standingB = standingsMap.get(teamBId);

    if (!standingA || !standingB) return;

    // Collect all match results belonging to this series
    const allResults: MatchResult[] = [];
    Object.values(gameData.matchResults).forEach(resList => {
      resList.forEach(r => {
        if (r.seriesId === series.id) {
          allResults.push(r);
        }
      });
    });

    let teamAWins = 0;
    let teamBWins = 0;
    let draws = 0;
    let ties = 0;

    allResults.forEach(r => {
      const matchFormat = getRankingFormat(r.format || Format.T20);

      // Match level stats
      standingA.matchesPlayed += 1;
      standingB.matchesPlayed += 1;

      if (standingA.byFormat) standingA.byFormat[matchFormat].matchesPlayed += 1;
      if (standingB.byFormat) standingB.byFormat[matchFormat].matchesPlayed += 1;

      if (r.isDraw || r.isTie) {
        if (r.isDraw) {
          draws += 1;
          standingA.matchesTiedOrDrawn += 1;
          standingB.matchesTiedOrDrawn += 1;
          if (standingA.byFormat && matchFormat === 'Test') standingA.byFormat.Test.matchesDrawn += 1;
          if (standingB.byFormat && matchFormat === 'Test') standingB.byFormat.Test.matchesDrawn += 1;
        } else {
          ties += 1;
          standingA.matchesTiedOrDrawn += 1;
          standingB.matchesTiedOrDrawn += 1;
          if (standingA.byFormat && matchFormat !== 'Test') (standingA.byFormat as any)[matchFormat].matchesTied += 1;
          if (standingB.byFormat && matchFormat !== 'Test') (standingB.byFormat as any)[matchFormat].matchesTied += 1;
        }
      } else if (r.winnerId === teamAId) {
        teamAWins += 1;
        standingA.matchesWon += 1;
        standingB.matchesLost += 1;
        if (standingA.byFormat) standingA.byFormat[matchFormat].matchesWon += 1;
        if (standingB.byFormat) standingB.byFormat[matchFormat].matchesLost += 1;
      } else if (r.winnerId === teamBId) {
        teamBWins += 1;
        standingB.matchesWon += 1;
        standingA.matchesLost += 1;
        if (standingB.byFormat) standingB.byFormat[matchFormat].matchesWon += 1;
        if (standingA.byFormat) standingA.byFormat[matchFormat].matchesLost += 1;
      }
    });

    // Determine Series Completion
    const isSeriesDone = (allResults.length >= series.numberOfMatches) || series.status === 'completed';

    if (isSeriesDone && allResults.length > 0) {
      standingA.seriesPlayed += 1;
      standingB.seriesPlayed += 1;

      const seriesFormat = series.format === 'Test' ? 'Test' : (series.format === 'ODI' ? 'ODI' : (series.format === 'T20' ? 'T20' : null));

      if (teamAWins > teamBWins) {
        standingA.seriesWon += 1;
        standingA.points += 2;
        standingB.seriesLost += 1;

        if (seriesFormat && standingA.byFormat && standingB.byFormat) {
          standingA.byFormat[seriesFormat].seriesPlayed += 1;
          standingA.byFormat[seriesFormat].seriesWon += 1;
          standingA.byFormat[seriesFormat].points += 2;
          standingB.byFormat[seriesFormat].seriesPlayed += 1;
          standingB.byFormat[seriesFormat].seriesLost += 1;
        }
      } else if (teamBWins > teamAWins) {
        standingB.seriesWon += 1;
        standingB.points += 2;
        standingA.seriesLost += 1;

        if (seriesFormat && standingA.byFormat && standingB.byFormat) {
          standingB.byFormat[seriesFormat].seriesPlayed += 1;
          standingB.byFormat[seriesFormat].seriesWon += 1;
          standingB.byFormat[seriesFormat].points += 2;
          standingA.byFormat[seriesFormat].seriesPlayed += 1;
          standingA.byFormat[seriesFormat].seriesLost += 1;
        }
      } else {
        // Draw / Tied Series
        standingA.seriesDrawn += 1;
        standingA.points += 1;
        standingB.seriesDrawn += 1;
        standingB.points += 1;

        if (seriesFormat && standingA.byFormat && standingB.byFormat) {
          standingA.byFormat[seriesFormat].seriesPlayed += 1;
          standingA.byFormat[seriesFormat].seriesDrawn += 1;
          standingA.byFormat[seriesFormat].points += 1;
          standingB.byFormat[seriesFormat].seriesPlayed += 1;
          standingB.byFormat[seriesFormat].seriesDrawn += 1;
          standingB.byFormat[seriesFormat].points += 1;
        }
      }
    }
  });

  // Sort standings: Points desc, Series Won desc, Matches Won desc
  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.seriesWon !== a.seriesWon) return b.seriesWon - a.seriesWon;
    if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
    return b.seriesPlayed - a.seriesPlayed;
  });

  standings.forEach((s, idx) => {
    s.rank = idx + 1;
  });

  return standings;
};

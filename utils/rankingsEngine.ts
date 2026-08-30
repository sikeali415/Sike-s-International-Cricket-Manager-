import { 
  GameData, 
  Format, 
  Player, 
  Team, 
  MatchResult, 
  RankingFormat, 
  TeamRanking, 
  PlayerRanking, 
  FormatPlayerRankings,
  PlayerRole
} from '../types';

export const getRankingFormat = (format: Format | string): RankingFormat => {
  const fStr = String(format).toLowerCase();
  if (fStr.includes('test') || fStr.includes('first_class') || fStr.includes('first-class') || fStr.includes('fc') || fStr.includes('shield')) {
    return 'Test';
  }
  if (fStr.includes('odi') || fStr.includes('one-day') || fStr.includes('list-a') || fStr.includes('list a')) {
    return 'ODI';
  }
  return 'T20';
};

/**
 * Initialize baseline ICC-style team & player rankings
 */
export const initializeRankings = (
  teams: Team[],
  allPlayers: Player[]
): {
  teams: Record<RankingFormat, TeamRanking[]>;
  players: Record<RankingFormat, FormatPlayerRankings>;
} => {
  const rankingFormats: RankingFormat[] = ['Test', 'ODI', 'T20'];

  const teamRankings: Record<RankingFormat, TeamRanking[]> = {
    Test: [],
    ODI: [],
    T20: []
  };

  const playerRankings: Record<RankingFormat, FormatPlayerRankings> = {
    Test: { batting: [], bowling: [], allRounder: [] },
    ODI: { batting: [], bowling: [], allRounder: [] },
    T20: { batting: [], bowling: [], allRounder: [] }
  };

  rankingFormats.forEach(rf => {
    // 1. Team Rankings
    const tList: TeamRanking[] = teams.map((team, idx) => {
      // Calculate baseline strength from squad skill average
      const avgBat = team.squad.reduce((sum, p) => sum + (p.battingSkill || 50), 0) / (team.squad.length || 1);
      const avgBowl = team.squad.reduce((sum, p) => sum + (p.secondarySkill || 30), 0) / (team.squad.length || 1);
      const baseRating = Math.round(85 + (avgBat * 0.25) + (avgBowl * 0.2) + (10 - idx * 1.5));

      return {
        teamId: team.id,
        teamName: team.name,
        rating: Math.max(70, Math.min(130, baseRating)),
        matchesPlayed: 10 + (idx % 5),
        points: baseRating * (10 + (idx % 5)),
        rank: idx + 1,
        previousRank: idx + 1
      };
    });

    // Sort teams descending by rating
    tList.sort((a, b) => b.rating - a.rating);
    tList.forEach((t, i) => {
      t.rank = i + 1;
      t.previousRank = i + 1;
    });
    teamRankings[rf] = tList;

    // 2. Player Rankings
    const batList: PlayerRanking[] = [];
    const bowlList: PlayerRanking[] = [];
    const arList: PlayerRanking[] = [];

    allPlayers.forEach(p => {
      const batSkill = p.battingSkill || 50;
      const bowlSkill = p.secondarySkill || 20;

      // Batting rating (range ~ 500 - 920)
      const batRating = Math.round(500 + (batSkill * 4.2) + ((p.stats[Format.T20]?.average || 25) * 1.5));
      // Bowling rating (range ~ 450 - 900)
      const bowlRating = Math.round(450 + (bowlSkill * 4.5) + ((p.stats[Format.T20]?.wickets || 5) * 2));
      // All-Rounder rating (range ~ 150 - 520)
      const arRating = Math.round((batRating * 0.35) + (bowlRating * 0.35));

      const baseInfo = {
        playerId: p.id,
        playerName: p.name,
        teamName: p.teamName || 'Free Agent',
        role: p.role,
        previousRank: 1
      };

      if ([PlayerRole.BATSMAN, PlayerRole.WICKET_KEEPER, PlayerRole.ALL_ROUNDER].includes(p.role) || batSkill >= 60) {
        batList.push({ ...baseInfo, rating: batRating, rank: 1 });
      }

      if ([PlayerRole.FAST_BOWLER, PlayerRole.SPIN_BOWLER, PlayerRole.ALL_ROUNDER].includes(p.role) || bowlSkill >= 55) {
        bowlList.push({ ...baseInfo, rating: bowlRating, rank: 1 });
      }

      if (p.role === PlayerRole.ALL_ROUNDER || (batSkill >= 50 && bowlSkill >= 50)) {
        arList.push({ ...baseInfo, rating: arRating, rank: 1 });
      }
    });

    batList.sort((a, b) => b.rating - a.rating);
    batList.slice(0, 50).forEach((b, i) => { b.rank = i + 1; b.previousRank = i + 1; });

    bowlList.sort((a, b) => b.rating - a.rating);
    bowlList.slice(0, 50).forEach((b, i) => { b.rank = i + 1; b.previousRank = i + 1; });

    arList.sort((a, b) => b.rating - a.rating);
    arList.slice(0, 50).forEach((a, i) => { a.rank = i + 1; a.previousRank = i + 1; });

    playerRankings[rf] = {
      batting: batList.slice(0, 50),
      bowling: bowlList.slice(0, 50),
      allRounder: arList.slice(0, 50)
    };
  });

  return { teams: teamRankings, players: playerRankings };
};

/**
 * Updates ICC ratings after a completed match
 */
export const updateRankingsAfterMatch = (
  gameData: GameData,
  result: MatchResult,
  format: Format | string
): {
  teams: Record<RankingFormat, TeamRanking[]>;
  players: Record<RankingFormat, FormatPlayerRankings>;
} => {
  const rankingFormat = getRankingFormat(format);
  const currentRankings = gameData.rankings || initializeRankings(gameData.teams, gameData.allPlayers);

  // Clone current state
  const updatedTeams: Record<RankingFormat, TeamRanking[]> = JSON.parse(JSON.stringify(currentRankings.teams));
  const updatedPlayers: Record<RankingFormat, FormatPlayerRankings> = JSON.parse(JSON.stringify(currentRankings.players));

  const formatTeamRankings = updatedTeams[rankingFormat] || [];
  const teamAId = result.firstInning.teamId;
  const teamBId = result.secondInning?.teamId || '';

  const teamARank = formatTeamRankings.find(t => t.teamId === teamAId);
  const teamBRank = formatTeamRankings.find(t => t.teamId === teamBId);

  // 1. Team Elo-style Rating Calculation
  if (teamARank && teamBRank) {
    const diff = (teamBRank.rating - teamARank.rating);
    const expectedA = 1 / (1 + Math.pow(10, diff / 40));
    const kFactor = 4; // Rating volatility factor

    let actualA = 0.5; // Draw / Tie
    if (result.winnerId === teamAId) actualA = 1.0;
    else if (result.winnerId === teamBId) actualA = 0.0;

    const changeA = Math.round((actualA - expectedA) * kFactor * 10) / 10;
    const changeB = -changeA;

    teamARank.rating = Math.max(50, Math.round((teamARank.rating + changeA) * 10) / 10);
    teamBRank.rating = Math.max(50, Math.round((teamBRank.rating + changeB) * 10) / 10);
    teamARank.matchesPlayed = (teamARank.matchesPlayed || 0) + 1;
    teamBRank.matchesPlayed = (teamBRank.matchesPlayed || 0) + 1;

    // Save previous ranks before resorting
    formatTeamRankings.forEach(t => {
      t.previousRank = t.rank;
    });

    // Re-rank teams
    formatTeamRankings.sort((a, b) => b.rating - a.rating);
    formatTeamRankings.forEach((t, idx) => {
      t.rank = idx + 1;
    });
  }

  // 2. Player Form & Rating Updates based on match performance
  const playerRankingsObj = updatedPlayers[rankingFormat];
  const allInnings = [result.firstInning, result.secondInning, result.thirdInning, result.fourthInning].filter(Boolean);

  // Save previous ranks
  playerRankingsObj.batting.forEach(p => { p.previousRank = p.rank; });
  playerRankingsObj.bowling.forEach(p => { p.previousRank = p.rank; });
  playerRankingsObj.allRounder.forEach(p => { p.previousRank = p.rank; });

  allInnings.forEach(inn => {
    // Batting rating adjustments
    inn.batting.forEach(b => {
      let playerEntry = playerRankingsObj.batting.find(p => p.playerId === b.playerId);
      const playerObj = gameData.allPlayers.find(p => p.id === b.playerId);

      if (!playerEntry && playerObj && b.runs > 0) {
        playerEntry = {
          playerId: playerObj.id,
          playerName: playerObj.name,
          teamName: playerObj.teamName || inn.teamName,
          role: playerObj.role,
          rating: 500,
          rank: 50,
          previousRank: 50
        };
        playerRankingsObj.batting.push(playerEntry);
      }

      if (playerEntry) {
        // Runs impact + SR impact
        let scoreGain = (b.runs * 0.5);
        if (b.runs >= 100) scoreGain += 15;
        else if (b.runs >= 50) scoreGain += 8;
        if (b.balls > 0 && (b.runs / b.balls) > 1.4) scoreGain += 4;
        if (b.runs === 0 && b.isOut) scoreGain -= 6;

        playerEntry.rating = Math.max(100, Math.min(999, Math.round(playerEntry.rating * 0.96 + (500 + scoreGain * 8) * 0.04)));
      }
    });

    // Bowling rating adjustments
    inn.bowling.forEach(bowl => {
      let playerEntry = playerRankingsObj.bowling.find(p => p.playerId === bowl.playerId);
      const playerObj = gameData.allPlayers.find(p => p.id === bowl.playerId);

      if (!playerEntry && playerObj && bowl.ballsBowled > 0) {
        playerEntry = {
          playerId: playerObj.id,
          playerName: playerObj.name,
          teamName: playerObj.teamName || '',
          role: playerObj.role,
          rating: 450,
          rank: 50,
          previousRank: 50
        };
        playerRankingsObj.bowling.push(playerEntry);
      }

      if (playerEntry) {
        let bowlGain = (bowl.wickets * 12);
        if (bowl.wickets >= 5) bowlGain += 25;
        else if (bowl.wickets >= 3) bowlGain += 12;
        const econ = bowl.ballsBowled > 0 ? (bowl.runsConceded / bowl.ballsBowled) * 6 : 6;
        if (econ < 6.0) bowlGain += 6;
        else if (econ > 10.0) bowlGain -= 6;

        playerEntry.rating = Math.max(100, Math.min(999, Math.round(playerEntry.rating * 0.96 + (450 + bowlGain * 8) * 0.04)));
      }
    });
  });

  // Re-sort Batting
  playerRankingsObj.batting.sort((a, b) => b.rating - a.rating);
  playerRankingsObj.batting.forEach((p, idx) => { p.rank = idx + 1; });

  // Re-sort Bowling
  playerRankingsObj.bowling.sort((a, b) => b.rating - a.rating);
  playerRankingsObj.bowling.forEach((p, idx) => { p.rank = idx + 1; });

  // Recalculate All-Rounders
  playerRankingsObj.allRounder.forEach(ar => {
    const batRating = playerRankingsObj.batting.find(b => b.playerId === ar.playerId)?.rating || 300;
    const bowlRating = playerRankingsObj.bowling.find(b => b.playerId === ar.playerId)?.rating || 300;
    ar.rating = Math.round(Math.sqrt(batRating * bowlRating) * 0.6);
  });
  playerRankingsObj.allRounder.sort((a, b) => b.rating - a.rating);
  playerRankingsObj.allRounder.forEach((p, idx) => { p.rank = idx + 1; });

  return {
    teams: updatedTeams,
    players: updatedPlayers
  };
};

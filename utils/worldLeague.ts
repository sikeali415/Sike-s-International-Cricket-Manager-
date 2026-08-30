import { GameData, Team, Player, MatchResult, WorldLeagueState, WorldLeagueTeam, WorldLeagueMatch, WorldLeagueStanding, Format, PlayerRole, Inning } from '../types';
import { resolveMatch } from '../utils';

// City Badges / Logos (SVG) for the 20 World Cities
export const WORLD_CITY_LOGOS: Record<string, string> = {
    'London': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#1e293b" stroke="#38bdf8" stroke-width="4"/><path d="M50 18 L58 42 L84 42 L63 58 L71 82 L50 66 L29 82 L37 58 L16 42 L42 42 Z" fill="#38bdf8"/><circle cx="50" cy="50" r="10" fill="#0f172a"/></svg>',
    'Sydney': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#0f766e" stroke="#2dd4bf" stroke-width="4"/><path d="M25 65 Q50 20 75 65 Q50 45 25 65 Z" fill="#2dd4bf"/><circle cx="50" cy="35" r="8" fill="#facc15"/></svg>',
    'Melbourne': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#1e1b4b" stroke="#818cf8" stroke-width="4"/><rect x="25" y="25" width="50" height="50" rx="10" fill="#818cf8"/><text x="50" y="60" font-family="Arial" font-size="32" font-weight="900" fill="#1e1b4b" text-anchor="middle">M</text></svg>',
    'Cape Town': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#065f46" stroke="#34d399" stroke-width="4"/><path d="M20 70 L50 25 L80 70 Z" fill="#34d399"/><circle cx="50" cy="60" r="8" fill="#fbbf24"/></svg>',
    'Johannesburg': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#713f12" stroke="#facc15" stroke-width="4"/><polygon points="50,15 85,50 50,85 15,50" fill="#facc15"/><circle cx="50" cy="50" r="12" fill="#713f12"/></svg>',
    'Auckland': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#0284c7" stroke="#38bdf8" stroke-width="4"/><path d="M30 70 L50 20 L70 70 L50 55 Z" fill="#ffffff"/></svg>',
    'Bridgetown': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#831843" stroke="#f43f5e" stroke-width="4"/><path d="M50 15 L60 40 L85 45 L65 65 L70 90 L50 75 L30 90 L35 65 L15 45 L40 40 Z" fill="#fbbf24"/></svg>',
    'Kingston': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#14532d" stroke="#4ade80" stroke-width="4"/><path d="M20 20 L80 80 M80 20 L20 80" stroke="#facc15" stroke-width="12"/><circle cx="50" cy="50" r="14" fill="#14532d"/></svg>',
    'Dubai': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#78350f" stroke="#fbbf24" stroke-width="4"/><path d="M50 15 L75 75 L25 75 Z" fill="#fbbf24"/><circle cx="50" cy="45" r="10" fill="#78350f"/></svg>',
    'Toronto': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#881337" stroke="#fb7185" stroke-width="4"/><path d="M50 20 L60 38 L80 40 L65 55 L70 75 L50 63 L30 75 L35 55 L20 40 L40 38 Z" fill="#ffffff"/></svg>',
    'Karachi': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#1e3a8a" stroke="#60a5fa" stroke-width="4"/><path d="M30 65 Q50 25 70 65" stroke="#ffffff" stroke-width="8" fill="none"/><circle cx="50" cy="35" r="10" fill="#facc15"/></svg>',
    'Lahore': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#14532d" stroke="#86efac" stroke-width="4"/><polygon points="50,15 80,45 65,85 35,85 20,45" fill="#86efac"/><circle cx="50" cy="50" r="10" fill="#14532d"/></svg>',
    'Mumbai': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#1d4ed8" stroke="#93c5fd" stroke-width="4"/><circle cx="50" cy="50" r="28" fill="#3b82f6"/><path d="M50 25 L55 45 L75 50 L55 55 L50 75 L45 55 L25 50 L45 45 Z" fill="#fbbf24"/></svg>',
    'Delhi': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#991b1b" stroke="#f87171" stroke-width="4"/><rect x="30" y="30" width="40" height="40" rx="8" fill="#f87171"/><circle cx="50" cy="50" r="10" fill="#ffffff"/></svg>',
    'Colombo': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#1e3a5f" stroke="#fbbf24" stroke-width="4"/><path d="M50 20 Q75 50 50 80 Q25 50 50 20 Z" fill="#fbbf24"/></svg>',
    'Dhaka': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#064e3b" stroke="#34d399" stroke-width="4"/><circle cx="45" cy="50" r="22" fill="#ef4444"/></svg>',
    'Edinburgh': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#312e81" stroke="#a5b4fc" stroke-width="4"/><path d="M20 20 L80 80 M80 20 L20 80" stroke="#ffffff" stroke-width="10"/></svg>',
    'Amsterdam': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#9a3412" stroke="#fb923c" stroke-width="4"/><path d="M35 30 L65 30 L65 70 L35 70 Z" fill="#fb923c"/><text x="50" y="58" font-family="Arial" font-size="28" font-weight="900" fill="#ffffff" text-anchor="middle">XXX</text></svg>',
    'Kathmandu': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#831843" stroke="#f472b6" stroke-width="4"/><polygon points="30,20 70,40 45,45 75,75 30,75" fill="#ffffff"/></svg>',
    'Dallas': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#0f172a" stroke="#60a5fa" stroke-width="4"/><path d="M50 15 L62 38 L87 42 L68 60 L73 85 L50 72 L27 85 L32 60 L13 42 L38 38 Z" fill="#60a5fa"/></svg>'
};

// 20 World Cities specification
export const WORLD_CITIES = [
    { name: 'London', country: 'England', group: 'Group A' as const },
    { name: 'Sydney', country: 'Australia', group: 'Group A' as const },
    { name: 'Cape Town', country: 'South Africa', group: 'Group A' as const },
    { name: 'Bridgetown', country: 'West Indies', group: 'Group A' as const },
    { name: 'Karachi', country: 'Pakistan', group: 'Group A' as const },

    { name: 'Melbourne', country: 'Australia', group: 'Group B' as const },
    { name: 'Johannesburg', country: 'South Africa', group: 'Group B' as const },
    { name: 'Auckland', country: 'New Zealand', group: 'Group B' as const },
    { name: 'Lahore', country: 'Pakistan', group: 'Group B' as const },
    { name: 'Toronto', country: 'Canada', group: 'Group B' as const },

    { name: 'Mumbai', country: 'India', group: 'Group C' as const },
    { name: 'Kingston', country: 'West Indies', group: 'Group C' as const },
    { name: 'Dubai', country: 'UAE', group: 'Group C' as const },
    { name: 'Colombo', country: 'Sri Lanka', group: 'Group C' as const },
    { name: 'Edinburgh', country: 'Scotland', group: 'Group C' as const },

    { name: 'Delhi', country: 'India', group: 'Group D' as const },
    { name: 'Dhaka', country: 'Bangladesh', group: 'Group D' as const },
    { name: 'Amsterdam', country: 'Netherlands', group: 'Group D' as const },
    { name: 'Kathmandu', country: 'Nepal', group: 'Group D' as const },
    { name: 'Dallas', country: 'USA', group: 'Group D' as const }
];

/**
 * Automatically computes an optimal 11-player lineup from a 15-player squad.
 */
export const optimizeWorldLeaguePlayingXI = (squad: Player[]): { playingXI: string[]; captainId: string; wicketKeeperId: string } => {
    if (!squad || squad.length === 0) {
        return { playingXI: [], captainId: '', wicketKeeperId: '' };
    }

    // 1. Identify best Wicket Keeper
    const keepers = squad.filter(p => p.role === PlayerRole.WICKET_KEEPER);
    const wk = keepers.length > 0
        ? [...keepers].sort((a, b) => b.battingSkill - a.battingSkill)[0]
        : squad[0];

    // 2. Identify top batsmen (3-4)
    const pureBatsmen = squad.filter(p => p.role === PlayerRole.BATSMAN && p.id !== wk.id)
        .sort((a, b) => b.battingSkill - a.battingSkill);
    const topBatsmen = pureBatsmen.slice(0, 4);

    // 3. Identify all-rounders (2-3)
    const allRounders = squad.filter(p => p.role === PlayerRole.ALL_ROUNDER && p.id !== wk.id)
        .sort((a, b) => (b.battingSkill + b.secondarySkill) - (a.battingSkill + a.secondarySkill));
    const topAllRounders = allRounders.slice(0, 2);

    // 4. Identify frontline bowlers (4-5)
    const bowlers = squad.filter(p => (p.role === PlayerRole.FAST_BOWLER || p.role === PlayerRole.SPIN_BOWLER) && p.id !== wk.id)
        .sort((a, b) => b.secondarySkill - a.secondarySkill);
    const topBowlers = bowlers.slice(0, 4);

    // Assemble 11 starters
    const xi: Player[] = [wk, ...topBatsmen, ...topAllRounders, ...topBowlers];

    // If less than 11, fill with best remaining players
    if (xi.length < 11) {
        const remaining = squad.filter(p => !xi.some(x => x.id === p.id))
            .sort((a, b) => Math.max(b.battingSkill, b.secondarySkill) - Math.max(a.battingSkill, a.secondarySkill));
        xi.push(...remaining.slice(0, 11 - xi.length));
    }

    const playingXI = xi.slice(0, 11).map(p => p.id);

    // Captain selection (highest experienced / skilled batsman or allrounder)
    const candidateCaptains = xi.filter(p => p.role === PlayerRole.BATSMAN || p.role === PlayerRole.ALL_ROUNDER);
    const captain = candidateCaptains.length > 0
        ? [...candidateCaptains].sort((a, b) => Math.max(b.battingSkill, b.secondarySkill) - Math.max(a.battingSkill, a.secondarySkill))[0]
        : xi[0];

    return {
        playingXI,
        captainId: captain.id,
        wicketKeeperId: wk.id
    };
};

/**
 * Initializes the 20 World City Teams with balanced squads from all global players.
 */
export const initializeWorldLeagueTeams = (allPlayers: Player[], userTeam?: Team): WorldLeagueTeam[] => {
    // Separate players by rating
    const sortedPlayers = [...allPlayers].sort((a, b) => {
        const valA = Math.max(a.battingSkill, a.secondarySkill);
        const valB = Math.max(b.battingSkill, b.secondarySkill);
        return valB - valA;
    });

    const teams: WorldLeagueTeam[] = WORLD_CITIES.map((city, idx) => {
        // Distribute 15 players per team in a serpentine/draft distribution
        const squad: Player[] = [];
        for (let round = 0; round < 15; round++) {
            const playerIndex = (round * 20) + (round % 2 === 0 ? idx : (19 - idx));
            const p = sortedPlayers[playerIndex % sortedPlayers.length];
            if (p && !squad.some(existing => existing.id === p.id)) {
                squad.push(p);
            } else {
                // Fallback to any remaining player
                const fallback = sortedPlayers.find(rem => !squad.some(s => s.id === rem.id));
                if (fallback) squad.push(fallback);
            }
        }

        const isUser = false;
        const { playingXI, captainId, wicketKeeperId } = optimizeWorldLeaguePlayingXI(squad);

        return {
            id: `wl-city-${city.name.toLowerCase().replace(/\s+/g, '-')}`,
            name: city.name,
            origin: city.country,
            logo: WORLD_CITY_LOGOS[city.name] || WORLD_CITY_LOGOS['London'],
            squad,
            group: city.group,
            isUserTeam: false,
            playingXI,
            captainId,
            wicketKeeperId
        };
    });

    return teams;
};

/**
 * Initializes the World League tournament with 20 World City Teams across 4 Groups.
 */
export const initializeWorldLeague = (gameData: GameData): WorldLeagueState => {
    const userTeam = gameData.teams.find(t => t.id === gameData.userTeamId);
    const teams = initializeWorldLeagueTeams(gameData.allPlayers, userTeam);

    const matches: WorldLeagueMatch[] = [];
    let matchCounter = 1;

    // Generate Group Stage Matches (4 groups, 5 teams each -> 10 matches per group = 40 matches)
    const groups: ('Group A' | 'Group B' | 'Group C' | 'Group D')[] = ['Group A', 'Group B', 'Group C', 'Group D'];
    
    groups.forEach(groupName => {
        const groupTeams = teams.filter(t => t.group === groupName);
        for (let i = 0; i < groupTeams.length; i++) {
            for (let j = i + 1; j < groupTeams.length; j++) {
                matches.push({
                    id: `wl-m${matchCounter}`,
                    matchNumber: `Match ${matchCounter}`,
                    teamA: groupTeams[i].name,
                    teamB: groupTeams[j].name,
                    date: `Round ${Math.floor((matchCounter - 1) / 4) + 1}`,
                    stage: 'Group Stage',
                    group: groupName
                });
                matchCounter++;
            }
        }
    });

    // Quarter Finals (Top 2 from each of 4 groups advance = 8 teams)
    matches.push({
        id: `wl-qf1`,
        matchNumber: `QF 1`,
        teamA: 'Group A 1st',
        teamB: 'Group B 2nd',
        date: `Quarter-Final 1`,
        stage: 'Quarter-Finals'
    });
    matches.push({
        id: `wl-qf2`,
        matchNumber: `QF 2`,
        teamA: 'Group C 1st',
        teamB: 'Group D 2nd',
        date: `Quarter-Final 2`,
        stage: 'Quarter-Finals'
    });
    matches.push({
        id: `wl-qf3`,
        matchNumber: `QF 3`,
        teamA: 'Group B 1st',
        teamB: 'Group A 2nd',
        date: `Quarter-Final 3`,
        stage: 'Quarter-Finals'
    });
    matches.push({
        id: `wl-qf4`,
        matchNumber: `QF 4`,
        teamA: 'Group D 1st',
        teamB: 'Group C 2nd',
        date: `Quarter-Final 4`,
        stage: 'Quarter-Finals'
    });

    // Semi Finals
    matches.push({
        id: `wl-sf1`,
        matchNumber: `Semi-Final 1`,
        teamA: 'Winner QF 1',
        teamB: 'Winner QF 2',
        date: `Semi-Final 1`,
        stage: 'Semi-Finals'
    });
    matches.push({
        id: `wl-sf2`,
        matchNumber: `Semi-Final 2`,
        teamA: 'Winner QF 3',
        teamB: 'Winner QF 4',
        date: `Semi-Final 2`,
        stage: 'Semi-Finals'
    });

    // Grand Final
    matches.push({
        id: `wl-final`,
        matchNumber: `World Grand Final`,
        teamA: 'Winner SF 1',
        teamB: 'Winner SF 2',
        date: `Grand Final`,
        stage: 'Final'
    });

    // Initial Standings
    const standings: WorldLeagueStanding[] = teams.map(t => ({
        teamId: t.id,
        teamName: t.name,
        group: t.group || 'Group A',
        played: 0,
        won: 0,
        lost: 0,
        points: 0,
        netRunRate: 0,
        runsFor: 0,
        runsAgainst: 0
    }));

    return {
        season: gameData.currentSeason,
        status: 'ready',
        teams,
        matches,
        currentMatchIndex: 0,
        standings
    };
};

/**
 * Resolves knockout stage placeholders based on group results.
 */
export const resolveWorldLeagueMatch = (
    match: WorldLeagueMatch,
    wlState: WorldLeagueState
): WorldLeagueMatch => {
    const resolved = { ...match };
    if (match.stage === 'Group Stage') return resolved;

    const getGroupTop = (grp: 'Group A' | 'Group B' | 'Group C' | 'Group D') => {
        return wlState.standings
            .filter(s => s.group === grp)
            .sort((a, b) => b.points !== a.points ? b.points - a.points : b.netRunRate - a.netRunRate);
    };

    const gA = getGroupTop('Group A');
    const gB = getGroupTop('Group B');
    const gC = getGroupTop('Group C');
    const gD = getGroupTop('Group D');

    if (match.matchNumber === 'QF 1') {
        resolved.teamA = gA[0]?.teamName || 'Group A 1st';
        resolved.teamB = gB[1]?.teamName || 'Group B 2nd';
    } else if (match.matchNumber === 'QF 2') {
        resolved.teamA = gC[0]?.teamName || 'Group C 1st';
        resolved.teamB = gD[1]?.teamName || 'Group D 2nd';
    } else if (match.matchNumber === 'QF 3') {
        resolved.teamA = gB[0]?.teamName || 'Group B 1st';
        resolved.teamB = gA[1]?.teamName || 'Group A 2nd';
    } else if (match.matchNumber === 'QF 4') {
        resolved.teamA = gD[0]?.teamName || 'Group D 1st';
        resolved.teamB = gC[1]?.teamName || 'Group C 2nd';
    } else if (match.matchNumber === 'Semi-Final 1') {
        const qf1 = wlState.matches.find(m => m.matchNumber === 'QF 1');
        const qf2 = wlState.matches.find(m => m.matchNumber === 'QF 2');
        resolved.teamA = getMatchWinner(qf1, wlState) || 'Winner QF 1';
        resolved.teamB = getMatchWinner(qf2, wlState) || 'Winner QF 2';
    } else if (match.matchNumber === 'Semi-Final 2') {
        const qf3 = wlState.matches.find(m => m.matchNumber === 'QF 3');
        const qf4 = wlState.matches.find(m => m.matchNumber === 'QF 4');
        resolved.teamA = getMatchWinner(qf3, wlState) || 'Winner QF 3';
        resolved.teamB = getMatchWinner(qf4, wlState) || 'Winner QF 4';
    } else if (match.matchNumber === 'World Grand Final') {
        const sf1 = wlState.matches.find(m => m.matchNumber === 'Semi-Final 1');
        const sf2 = wlState.matches.find(m => m.matchNumber === 'Semi-Final 2');
        resolved.teamA = getMatchWinner(sf1, wlState) || 'Winner SF 1';
        resolved.teamB = getMatchWinner(sf2, wlState) || 'Winner SF 2';
    }

    return resolved;
};

function getMatchWinner(m: WorldLeagueMatch | undefined, state: WorldLeagueState): string | null {
    if (!m || !m.result) return null;
    if (m.result.winnerId) {
        const t = state.teams.find(tm => tm.id === m.result?.winnerId);
        if (t) return t.name;
    }
    const s1 = m.result.firstInning.score;
    const s2 = m.result.secondInning.score;
    return s1 > s2 ? m.result.firstInning.teamName : m.result.secondInning.teamName;
}

/**
 * Updates World League state after a match, including stats accumulation for all players.
 */
export const updateWorldLeagueWithResult = (
    wlState: WorldLeagueState,
    matchIndex: number,
    result: MatchResult
): WorldLeagueState => {
    const updated = JSON.parse(JSON.stringify(wlState)) as WorldLeagueState;
    const match = updated.matches[matchIndex];
    if (!match) return updated;

    match.result = result;
    updated.currentMatchIndex = Math.min(updated.matches.length, matchIndex + 1);

    // Apply individual stats directly to players in the squads
    applyMatchStatsToPlayers(updated.teams, result);

    // Update group standings if group stage
    if (match.stage === 'Group Stage') {
        const teamAStanding = updated.standings.find(s => s.teamName === match.teamA);
        const teamBStanding = updated.standings.find(s => s.teamName === match.teamB);

        if (teamAStanding && teamBStanding) {
            teamAStanding.played++;
            teamBStanding.played++;

            const teamAScore = result.firstInning.teamName === match.teamA ? result.firstInning.score : result.secondInning.score;
            const teamBScore = result.firstInning.teamName === match.teamB ? result.firstInning.score : result.secondInning.score;

            teamAStanding.runsFor = (teamAStanding.runsFor || 0) + teamAScore;
            teamAStanding.runsAgainst = (teamAStanding.runsAgainst || 0) + teamBScore;
            teamBStanding.runsFor = (teamBStanding.runsFor || 0) + teamBScore;
            teamBStanding.runsAgainst = (teamBStanding.runsAgainst || 0) + teamAScore;

            if (teamAScore > teamBScore) {
                teamAStanding.won++;
                teamAStanding.points += 2;
                teamBStanding.lost++;
            } else if (teamBScore > teamAScore) {
                teamBStanding.won++;
                teamBStanding.points += 2;
                teamAStanding.lost++;
            } else {
                teamAStanding.points += 1;
                teamBStanding.points += 1;
            }

            const aDiff = (teamAStanding.runsFor || 0) - (teamAStanding.runsAgainst || 0);
            teamAStanding.netRunRate = parseFloat(((aDiff / Math.max(1, teamAStanding.played * 20))).toFixed(3));

            const bDiff = (teamBStanding.runsFor || 0) - (teamBStanding.runsAgainst || 0);
            teamBStanding.netRunRate = parseFloat(((bDiff / Math.max(1, teamBStanding.played * 20))).toFixed(3));
        }
    }

    // Check if tournament has reached Grand Final completion
    const finalMatch = updated.matches.find(m => m.matchNumber === 'World Grand Final');
    if (finalMatch && finalMatch.result) {
        updated.status = 'completed';
        const finalResult = finalMatch.result;
        
        let championName = finalMatch.teamA;
        let runnerUpName = finalMatch.teamB;

        const s1 = finalResult.firstInning.score;
        const s2 = finalResult.secondInning.score;
        if (s2 > s1) {
            championName = finalResult.secondInning.teamName;
            runnerUpName = finalResult.firstInning.teamName;
        } else {
            championName = finalResult.firstInning.teamName;
            runnerUpName = finalResult.secondInning.teamName;
        }

        const champTeam = updated.teams.find(t => t.name === championName);
        updated.championTeamId = champTeam?.id;
        updated.championTeamName = championName;
        updated.runnerUpTeamName = runnerUpName;

        // Compute Golden Bat, Golden Ball, and MVP
        calculateTournamentAwards(updated);
    } else {
        updated.status = 'in_progress';
    }

    return updated;
};

/**
 * Accumulates real performance stats for every player involved in World League matches.
 */
function applyMatchStatsToPlayers(teams: WorldLeagueTeam[], result: MatchResult) {
    const allSquadPlayers: Record<string, Player> = {};
    teams.forEach(t => t.squad.forEach(p => { allSquadPlayers[p.id] = p; }));

    // Batting stats
    [result.firstInning, result.secondInning].forEach(inn => {
        if (!inn) return;
        inn.batting.forEach(b => {
            const player = allSquadPlayers[b.playerId];
            if (!player) return;

            if (!player.worldLeagueStats) {
                player.worldLeagueStats = {
                    matches: 0,
                    inningsBatting: 0,
                    inningsBowling: 0,
                    runs: 0,
                    highestScore: 0,
                    average: 0,
                    strikeRate: 0,
                    ballsFaced: 0,
                    dismissals: 0,
                    hundreds: 0,
                    fifties: 0,
                    thirties: 0,
                    fours: 0,
                    sixes: 0,
                    fastestFifty: 0,
                    fastestHundred: 0,
                    wickets: 0,
                    economy: 0,
                    bestBowling: '0/0',
                    bestBowlingWickets: 0,
                    bestBowlingRuns: 0,
                    bowlingAverage: 0,
                    ballsBowled: 0,
                    runsConceded: 0,
                    threeWicketHauls: 0,
                    fiveWicketHauls: 0,
                    catches: 0,
                    runOuts: 0,
                    manOfTheMatchAwards: 0
                };
            }

            const ws = player.worldLeagueStats;
            ws.matches++;
            ws.inningsBatting++;
            ws.runs += b.runs;
            ws.ballsFaced += b.balls;
            ws.fours += b.fours;
            ws.sixes += b.sixes;
            if (b.runs > ws.highestScore) ws.highestScore = b.runs;
            if (b.runs >= 100) ws.hundreds++;
            else if (b.runs >= 50) ws.fifties++;
            else if (b.runs >= 30) ws.thirties++;
            if (b.isOut) ws.dismissals++;

            ws.average = ws.dismissals > 0 ? parseFloat((ws.runs / ws.dismissals).toFixed(2)) : ws.runs;
            ws.strikeRate = ws.ballsFaced > 0 ? parseFloat(((ws.runs / ws.ballsFaced) * 100).toFixed(2)) : 0;

            // Recalculate World League Performance (0-100)
            const runsBonus = Math.min(40, ws.runs * 0.4);
            const srBonus = Math.min(25, (ws.strikeRate / 150) * 25);
            const avgBonus = Math.min(25, (ws.average / 40) * 25);
            player.worldLeaguePerformance = Math.min(99, Math.round(40 + runsBonus + srBonus + avgBonus));
            player.previousSeasonPerformance = player.worldLeaguePerformance;
        });

        // Bowling stats
        inn.bowling.forEach(bw => {
            const player = allSquadPlayers[bw.playerId];
            if (!player) return;

            if (!player.worldLeagueStats) {
                player.worldLeagueStats = {
                    matches: 0,
                    inningsBatting: 0,
                    inningsBowling: 0,
                    runs: 0,
                    highestScore: 0,
                    average: 0,
                    strikeRate: 0,
                    ballsFaced: 0,
                    dismissals: 0,
                    hundreds: 0,
                    fifties: 0,
                    thirties: 0,
                    fours: 0,
                    sixes: 0,
                    fastestFifty: 0,
                    fastestHundred: 0,
                    wickets: 0,
                    economy: 0,
                    bestBowling: '0/0',
                    bestBowlingWickets: 0,
                    bestBowlingRuns: 0,
                    bowlingAverage: 0,
                    ballsBowled: 0,
                    runsConceded: 0,
                    threeWicketHauls: 0,
                    fiveWicketHauls: 0,
                    catches: 0,
                    runOuts: 0,
                    manOfTheMatchAwards: 0
                };
            }

            const ws = player.worldLeagueStats;
            ws.inningsBowling++;
            ws.wickets += bw.wickets;
            ws.ballsBowled += bw.ballsBowled;
            ws.runsConceded += bw.runsConceded;

            if (bw.wickets >= 5) ws.fiveWicketHauls++;
            else if (bw.wickets >= 3) ws.threeWicketHauls++;

            if (bw.wickets > ws.bestBowlingWickets || (bw.wickets === ws.bestBowlingWickets && bw.runsConceded < ws.bestBowlingRuns)) {
                ws.bestBowlingWickets = bw.wickets;
                ws.bestBowlingRuns = bw.runsConceded;
                ws.bestBowling = `${bw.wickets}/${bw.runsConceded}`;
            }

            ws.economy = ws.ballsBowled > 0 ? parseFloat(((ws.runsConceded / (ws.ballsBowled / 6))).toFixed(2)) : 0;
            ws.bowlingAverage = ws.wickets > 0 ? parseFloat((ws.runsConceded / ws.wickets).toFixed(2)) : ws.runsConceded;

            const wktBonus = Math.min(45, ws.wickets * 5);
            const econBonus = Math.max(0, Math.min(25, (10 - ws.economy) * 5));
            const existingWL = player.worldLeaguePerformance || 50;
            player.worldLeaguePerformance = Math.min(99, Math.round(Math.max(existingWL, 35 + wktBonus + econBonus)));
            player.previousSeasonPerformance = player.worldLeaguePerformance;
        });
    });

    if (result.manOfTheMatch?.playerId && allSquadPlayers[result.manOfTheMatch.playerId]) {
        const motmPlayer = allSquadPlayers[result.manOfTheMatch.playerId];
        if (motmPlayer.worldLeagueStats) {
            motmPlayer.worldLeagueStats.manOfTheMatchAwards++;
        }
    }
}

/**
 * Sets or updates the user-managed team in the World League.
 * If teamName is null, sets all teams to AI / spectator mode.
 */
export const setUserManagedWorldLeagueTeam = (
    state: WorldLeagueState,
    teamName: string | null
): WorldLeagueState => {
    const updated = JSON.parse(JSON.stringify(state)) as WorldLeagueState;
    updated.teams.forEach(t => {
        t.isUserTeam = teamName ? t.name.toLowerCase() === teamName.toLowerCase() : false;
    });
    return updated;
};

/**
 * Updates Playing XI, Captain, and WicketKeeper for a specific World League franchise.
 */
export const updateWorldLeagueTeamLineup = (
    state: WorldLeagueState,
    teamId: string,
    playingXI: string[],
    captainId?: string,
    wicketKeeperId?: string
): WorldLeagueState => {
    const updated = JSON.parse(JSON.stringify(state)) as WorldLeagueState;
    const team = updated.teams.find(t => t.id === teamId || t.name.toLowerCase() === teamId.toLowerCase());
    if (team) {
        team.playingXI = playingXI;
        if (captainId) team.captainId = captainId;
        if (wicketKeeperId) team.wicketKeeperId = wicketKeeperId;
    }
    return updated;
};

/**
 * Calculates Golden Bat, Golden Ball, and MVP awards for the World League.
 */
function calculateTournamentAwards(state: WorldLeagueState) {
    const playerStatsAgg: Record<string, { name: string; team: string; runs: number; wickets: number; balls: number; outs: number; runsConceded: number; ballsBowled: number; bestBowling: string; potmAwards: number }> = {};

    state.teams.forEach(team => {
        team.squad.forEach(player => {
            const ws = player.worldLeagueStats;
            if (ws && (ws.runs > 0 || ws.wickets > 0)) {
                playerStatsAgg[player.id] = {
                    name: player.name,
                    team: team.name,
                    runs: ws.runs,
                    wickets: ws.wickets,
                    balls: ws.ballsFaced,
                    outs: ws.dismissals,
                    runsConceded: ws.runsConceded,
                    ballsBowled: ws.ballsBowled,
                    bestBowling: ws.bestBowling,
                    potmAwards: ws.manOfTheMatchAwards
                };
            }
        });
    });

    // Golden Bat
    const sortedBatters = Object.entries(playerStatsAgg).sort((a, b) => b[1].runs - a[1].runs);
    if (sortedBatters.length > 0) {
        const [pId, d] = sortedBatters[0];
        const avg = d.outs > 0 ? parseFloat((d.runs / d.outs).toFixed(2)) : d.runs;
        const sr = d.balls > 0 ? parseFloat(((d.runs / d.balls) * 100).toFixed(2)) : 0;
        state.goldenBat = {
            playerId: pId,
            playerName: d.name,
            teamName: d.team,
            runs: d.runs,
            average: avg,
            strikeRate: sr
        };
    }

    // Golden Ball
    const sortedBowlers = Object.entries(playerStatsAgg).sort((a, b) => b[1].wickets - a[1].wickets);
    if (sortedBowlers.length > 0) {
        const [pId, d] = sortedBowlers[0];
        const econ = d.ballsBowled > 0 ? parseFloat((d.runsConceded / (d.ballsBowled / 6)).toFixed(2)) : 0;
        state.goldenBall = {
            playerId: pId,
            playerName: d.name,
            teamName: d.team,
            wickets: d.wickets,
            economy: econ,
            bestBowling: d.bestBowling
        };
    }

    // MVP
    const sortedMVP = Object.entries(playerStatsAgg).sort((a, b) => {
        const scoreA = (a[1].runs * 1) + (a[1].wickets * 25) + (a[1].potmAwards * 50);
        const scoreB = (b[1].runs * 1) + (b[1].wickets * 25) + (b[1].potmAwards * 50);
        return scoreB - scoreA;
    });

    if (sortedMVP.length > 0) {
        const [pId, d] = sortedMVP[0];
        state.mvpPlayer = {
            playerId: pId,
            playerName: d.name,
            teamName: d.team,
            statsSummary: `${d.runs} runs, ${d.wickets} wickets, ${d.potmAwards} POTM`
        };
    }
}

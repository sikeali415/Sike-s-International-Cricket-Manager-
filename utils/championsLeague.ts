// Backwards-compatibility wrapper for World League
export * from './worldLeague';

import { 
    initializeWorldLeague, 
    resolveWorldLeagueMatch, 
    updateWorldLeagueWithResult,
    initializeWorldLeagueTeams
} from './worldLeague';

export const initializeChampionsLeague = initializeWorldLeague;
export const resolveChampionsLeagueMatch = resolveWorldLeagueMatch;
export const updateChampionsLeagueWithResult = updateWorldLeagueWithResult;
export const getInternationalChampionsLeagueTeams = (allPlayers: any) => initializeWorldLeagueTeams(allPlayers);

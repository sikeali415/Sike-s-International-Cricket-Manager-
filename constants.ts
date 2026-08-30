
import { Player, Team, PlayerRole } from './types';
import { generateInitialStats } from './data';

// Updated initial squad to match Player interface and use PlayerRole enum values.
export const INITIAL_SQUAD: Player[] = [];
export const INITIAL_TEAM: Team = {
  id: 'team_mavericks',
  name: 'Mumbai Mavericks',
  squad: INITIAL_SQUAD,
  captains: {},
  purse: 50.0,
};
export const MARKET_PLAYERS: Player[] = [];

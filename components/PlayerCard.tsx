
import React from 'react';
import { Player, PlayerRole } from '../types';
import { getRoleFullName } from '../utils';

interface PlayerCardProps {
  player: Player;
  onAction?: (player: Player) => void;
  actionLabel?: string;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player, onAction, actionLabel }) => {
  // Fix: switch on PlayerRole enum values
  const getRoleColor = (role: PlayerRole) => {
    switch (role) {
      case PlayerRole.BATSMAN: return 'bg-blue-500';
      case PlayerRole.FAST_BOWLER:
      case PlayerRole.SPIN_BOWLER: return 'bg-red-500';
      case PlayerRole.ALL_ROUNDER: return 'bg-green-500';
      case PlayerRole.WICKET_KEEPER: return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-lg hover:border-blue-500 transition-all">
      <div className="relative h-40 bg-slate-700 flex items-center justify-center">
        {/* Fix: Property 'image' does not exist on type 'Player'. Using a placeholder icon */}
        <div className="text-slate-500 text-6xl">🏏</div>
        <div className={`absolute top-2 right-2 px-2 py-1 rounded text-[10px] font-bold uppercase text-white ${getRoleColor(player.role)}`}>
          {getRoleFullName(player.role)}
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-bold truncate">{player.name}</h3>
        <div className="flex justify-between mt-2 text-sm text-slate-400">
          {/* Fix: Property 'age' does not exist on type 'Player'. Using nationality */}
          <span>{player.nationality}</span>
          {/* Fix: Property 'value' does not exist on type 'Player'. Using style */}
          <span className="text-white font-medium">{player.style === 'A' ? 'Aggressive' : player.style === 'D' ? 'Defensive' : 'Balanced'}</span>
        </div>
        
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span>Batting</span>
            <div className="w-2/3 bg-slate-700 h-1.5 rounded-full overflow-hidden">
              {/* Fix: Property 'battingRating' does not exist on type 'Player'. Use battingSkill */}
              <div className="bg-blue-400 h-full" style={{ width: `${player.battingSkill}%` }}></div>
            </div>
            <span className="w-6 text-right">{player.battingSkill}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span>Bowling</span>
            <div className="w-2/3 bg-slate-700 h-1.5 rounded-full overflow-hidden">
              {/* Fix: Property 'bowlingRating' does not exist on type 'Player'. Use secondarySkill */}
              <div className="bg-red-400 h-full" style={{ width: `${player.secondarySkill}%` }}></div>
            </div>
            <span className="w-6 text-right">{player.secondarySkill}</span>
          </div>
          {/* Fix: Property 'fitness' does not exist on type 'Player'. Fitness logic removed */}
        </div>

        {onAction && actionLabel && (
          <button
            onClick={() => onAction(player)}
            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors text-sm"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default PlayerCard;

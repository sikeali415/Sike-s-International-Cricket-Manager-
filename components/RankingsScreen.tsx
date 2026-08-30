import React, { useState } from 'react';
import { 
  GameData, 
  RankingFormat, 
  TeamRanking, 
  PlayerRanking, 
  FormatPlayerRankings,
  PlayerRole
} from '../types';
import { initializeRankings } from '../utils/rankingsEngine';
import { 
  Trophy, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Shield, 
  User, 
  Target, 
  Zap, 
  Award,
  Globe2,
  Calendar,
  Flame
} from 'lucide-react';

interface RankingsScreenProps {
  gameData: GameData;
  onSelectPlayer?: (playerId: string) => void;
}

export const RankingsScreen: React.FC<RankingsScreenProps> = ({
  gameData,
  onSelectPlayer
}) => {
  const [selectedFormat, setSelectedFormat] = useState<RankingFormat>('T20');
  const [selectedCategory, setSelectedCategory] = useState<'teams' | 'batting' | 'bowling' | 'allRounder'>('teams');

  const rankings = gameData.rankings || initializeRankings(gameData.teams, gameData.allPlayers);
  const teamList = rankings.teams[selectedFormat] || [];
  const playerRankings = rankings.players[selectedFormat] || { batting: [], bowling: [], allRounder: [] };

  const currentPlayers = playerRankings[selectedCategory === 'teams' ? 'batting' : selectedCategory] || [];

  const renderRankChange = (current: number, previous: number) => {
    if (!previous || current === previous) {
      return (
        <span className="flex items-center text-xs font-semibold text-slate-500">
          <Minus className="w-3 h-3 mr-0.5" /> -
        </span>
      );
    }
    if (current < previous) {
      // Improved rank (e.g. from 3 to 1)
      const diff = previous - current;
      return (
        <span className="flex items-center text-xs font-bold text-emerald-400">
          <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> +{diff}
        </span>
      );
    }
    // Dropped rank (e.g. from 1 to 4)
    const diff = current - previous;
    return (
      <span className="flex items-center text-xs font-bold text-rose-400">
        <TrendingDown className="w-3.5 h-3.5 mr-0.5" /> -{diff}
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3.5 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30">
              <Globe2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-100 tracking-tight">
                  ICC Official World Rankings
                </h1>
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-full border border-emerald-500/30">
                  Live Match Dynamic
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Ongoing Elo-rated international standings & individual form indices updated after every ball and match
              </p>
            </div>
          </div>

          {/* Format Selector Pills */}
          <div className="flex items-center bg-slate-950 p-1.5 rounded-xl border border-slate-800 self-start md:self-auto">
            {(['T20', 'ODI', 'Test'] as RankingFormat[]).map(fmt => (
              <button
                key={fmt}
                onClick={() => setSelectedFormat(fmt)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  selectedFormat === fmt
                    ? 'bg-cyan-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {fmt === 'Test' ? 'Test / Multi-Day' : fmt}
              </button>
            ))}
          </div>
        </div>

        {/* Category Navigation Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-6 pt-5 border-t border-slate-800/80">
          <button
            onClick={() => setSelectedCategory('teams')}
            className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold border transition-all ${
              selectedCategory === 'teams'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            Team Rankings
          </button>

          <button
            onClick={() => setSelectedCategory('batting')}
            className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold border transition-all ${
              selectedCategory === 'batting'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            Top Batters
          </button>

          <button
            onClick={() => setSelectedCategory('bowling')}
            className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold border transition-all ${
              selectedCategory === 'bowling'
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm'
                : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Target className="w-4 h-4" />
            Top Bowlers
          </button>

          <button
            onClick={() => setSelectedCategory('allRounder')}
            className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold border transition-all ${
              selectedCategory === 'allRounder'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Award className="w-4 h-4" />
            All-Rounders
          </button>
        </div>
      </div>

      {/* Main Ranking Table Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {selectedCategory === 'teams' ? (
          /* Team Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 text-xs uppercase font-mono tracking-wider border-b border-slate-800">
                  <th className="py-3.5 px-4 text-center w-16">Rank</th>
                  <th className="py-3.5 px-4">Nation / Team</th>
                  <th className="py-3.5 px-4 text-center">Trend</th>
                  <th className="py-3.5 px-4 text-center">Matches</th>
                  <th className="py-3.5 px-4 text-right pr-6">ICC Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {teamList.map((team, idx) => {
                  const isUserTeam = team.teamId === gameData.userTeamId;
                  const isTop4 = idx < 4;
                  const isTop1 = idx === 0;

                  return (
                    <tr
                      key={team.teamId}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isUserTeam ? 'bg-cyan-950/30' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center font-mono">
                        <div className="flex items-center justify-center">
                          {isTop1 ? (
                            <span className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center font-bold text-xs shadow-sm">
                              1
                            </span>
                          ) : (
                            <span className={`text-xs font-bold ${isTop4 ? 'text-slate-200' : 'text-slate-400'}`}>
                              {team.rank}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-slate-100 flex items-center gap-1.5">
                            {team.teamName}
                            {isUserTeam && (
                              <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-[10px] font-bold rounded border border-cyan-500/30">
                                USER
                              </span>
                            )}
                          </span>
                          {selectedFormat === 'Test' && isTop4 && (
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold rounded border border-emerald-500/20">
                              WTC Spot #{idx + 1}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex justify-center">
                          {renderRankChange(team.rank, team.previousRank)}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono text-slate-300 text-xs">
                        {team.matchesPlayed || 0}
                      </td>

                      <td className="py-3.5 px-4 text-right pr-6 font-mono font-bold text-slate-100">
                        <span className="text-cyan-400">{team.rating}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Player Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 text-xs uppercase font-mono tracking-wider border-b border-slate-800">
                  <th className="py-3.5 px-4 text-center w-16">Rank</th>
                  <th className="py-3.5 px-4">Player</th>
                  <th className="py-3.5 px-4">Team</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4 text-center">Trend</th>
                  <th className="py-3.5 px-4 text-right pr-6">Rating Index</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {currentPlayers.slice(0, 25).map((player, idx) => {
                  const isTop1 = idx === 0;

                  return (
                    <tr
                      key={player.playerId}
                      onClick={() => onSelectPlayer && onSelectPlayer(player.playerId)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4 text-center font-mono">
                        <div className="flex items-center justify-center">
                          {isTop1 ? (
                            <span className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center font-bold text-xs shadow-sm">
                              1
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-slate-300">
                              {player.rank}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-100 hover:text-cyan-400 transition-colors">
                          {player.playerName}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs font-medium text-slate-300">
                        {player.teamName}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[11px] font-semibold rounded-md border border-slate-700">
                          {player.role}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex justify-center">
                          {renderRankChange(player.rank, player.previousRank)}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right pr-6 font-mono font-bold text-cyan-400">
                        {player.rating}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RankingsScreen;

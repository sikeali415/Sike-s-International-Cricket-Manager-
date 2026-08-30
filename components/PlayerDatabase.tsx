
import React, { useState, useMemo } from 'react';
import { GameData, Player, PlayerRole } from '../types';
import { getRoleColor, getRoleFullName } from '../utils';
import { Icons } from './Icons';

interface PlayerDatabaseProps {
    gameData: GameData;
    onAddPlayer: () => void;
    onViewPlayer: (player: Player) => void;
}

const PlayerDatabase: React.FC<PlayerDatabaseProps> = ({ gameData, onAddPlayer, onViewPlayer }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<PlayerRole | 'ALL'>('ALL');
    const [sortBy, setSortBy] = useState<'skill' | 'name'>('skill');
    const [showOnlyForeign, setShowOnlyForeign] = useState(false);

    const filteredPlayers = useMemo(() => {
        return gameData.allPlayers.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesRole = roleFilter === 'ALL' || p.role === roleFilter;
            const matchesForeign = !showOnlyForeign || p.isForeign;
            return matchesSearch && matchesRole && matchesForeign;
        }).sort((a, b) => {
            if (sortBy === 'skill') {
                return (b.battingSkill + b.secondarySkill) - (a.battingSkill + a.secondarySkill);
            }
            return a.name.localeCompare(b.name);
        });
    }, [gameData.allPlayers, searchTerm, roleFilter, sortBy, showOnlyForeign]);

    const groupedPlayers = useMemo(() => {
        // Group by nationality
        const groups: Record<string, Player[]> = {};
        filteredPlayers.forEach(p => {
            const nat = p.nationality || 'Unspecified';
            if (!groups[nat]) groups[nat] = [];
            groups[nat].push(p);
        });

        return groups;
    }, [filteredPlayers]);

    const nationalities = useMemo(() => 
        Object.keys(groupedPlayers).sort((a, b) => a.localeCompare(b))
    , [groupedPlayers]);

    return (
        <div className="h-full flex flex-col bg-slate-950 text-white">
            <header className="p-4 bg-slate-900 border-b border-slate-800">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter text-teal-400">Player Registry</h2>
                    <button 
                        onClick={onAddPlayer}
                        className="bg-pink-600 hover:bg-pink-500 text-white p-2 rounded-full shadow-lg transition-all active:scale-95"
                        title="Add New Player"
                    >
                        <Icons.PlusCircle />
                    </button>
                </div>

                <div className="space-y-3">
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                             <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                             </svg>
                        </span>
                        <input 
                            type="text" 
                            placeholder="Search world talent..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        />
                    </div>

                    <div className="flex gap-2 items-center">
                        <div className="flex-1 flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
                            {(['ALL', ...Object.values(PlayerRole)] as const).map(role => (
                                <button
                                    key={role}
                                    onClick={() => setRoleFilter(role)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase whitespace-nowrap border transition-all ${
                                        roleFilter === role 
                                        ? 'bg-teal-500 border-teal-400 text-slate-950' 
                                        : 'bg-slate-800 border-slate-700 text-slate-400'
                                    }`}
                                >
                                    {role === 'ALL' ? 'World' : getRoleFullName(role as PlayerRole)}
                                </button>
                            ))}
                        </div>
                        <button 
                            onClick={() => setShowOnlyForeign(!showOnlyForeign)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase whitespace-nowrap border transition-all ${
                                showOnlyForeign 
                                ? 'bg-pink-600 border-pink-500 text-white' 
                                : 'bg-slate-800 border-slate-700 text-slate-400'
                            }`}
                        >
                            Foreign ✈️
                        </button>
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500 pt-1">
                        <span>Sort By:</span>
                        <div className="flex gap-4">
                            <button 
                                onClick={() => setSortBy('skill')}
                                className={sortBy === 'skill' ? 'text-teal-400' : 'hover:text-slate-300'}
                            >
                                Skill
                            </button>
                            <button 
                                onClick={() => setSortBy('name')}
                                className={sortBy === 'name' ? 'text-teal-400' : 'hover:text-slate-300'}
                            >
                                Name
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-8">
                {nationalities.length > 0 ? nationalities.map(nat => (
                    <div key={nat} className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="h-px bg-slate-800 flex-1"></div>
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">{nat}</h3>
                            <div className="h-px bg-slate-800 flex-1"></div>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            {groupedPlayers[nat].map(player => (
                                <div 
                                    key={player.id}
                                    onClick={() => onViewPlayer(player)}
                                    className="group bg-slate-900 border border-slate-800 p-3 rounded-2xl flex items-center justify-between hover:border-teal-500/50 hover:bg-slate-900/80 transition-all cursor-pointer"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-lg shadow-inner">
                                            {player.role === PlayerRole.WICKET_KEEPER ? '🧤' : player.role === PlayerRole.BATSMAN ? '🏏' : '⚾'}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-100 group-hover:text-teal-400 transition-colors">{player.name}</p>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[9px] font-black uppercase ${getRoleColor(player.role)}`}>
                                                    {getRoleFullName(player.role)}
                                                </span>
                                                <span className="text-[9px] text-slate-600">•</span>
                                                <span className="text-[9px] text-slate-500 font-bold uppercase">{player.style === 'A' ? 'Aggressive' : player.style === 'D' ? 'Defensive' : 'Balanced'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <p className="text-xs font-black text-teal-400">{Math.max(player.battingSkill, player.secondarySkill)}</p>
                                            <p className="text-[8px] text-slate-600 uppercase font-black">Rating</p>
                                        </div>
                                        <div className="text-slate-700 group-hover:text-teal-500 transition-colors">
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4 pt-20">
                        <Icons.Database className="h-12 w-12 opacity-20" />
                        <p className="text-sm font-bold uppercase tracking-widest">No players found</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlayerDatabase;

import React from 'react';
import { Filter, RotateCcw, Shield, Trophy, Users, Calendar } from 'lucide-react';
import { Format, UniversalFilterState, Team } from '../types';

interface UniversalFilterBarProps {
    filterState: UniversalFilterState;
    onChange: (newState: UniversalFilterState) => void;
    teams?: Team[];
    availableSeasons?: number[];
    hideOpponent?: boolean;
    hideRole?: boolean;
    hideTournament?: boolean;
    compact?: boolean;
}

export const UniversalFilterBar: React.FC<UniversalFilterBarProps> = ({
    filterState,
    onChange,
    teams = [],
    availableSeasons = [1],
    hideOpponent = false,
    hideRole = false,
    hideTournament = false,
    compact = false
}) => {
    const handleFieldChange = (field: keyof UniversalFilterState, value: any) => {
        onChange({
            ...filterState,
            [field]: value
        });
    };

    const handleReset = () => {
        onChange({
            format: 'ALL',
            season: 'ALL',
            teamId: 'ALL',
            opponentTeamId: 'ALL',
            tournament: 'ALL',
            role: 'ALL'
        });
    };

    const isFiltered = filterState.format !== 'ALL' || 
                       filterState.season !== 'ALL' || 
                       filterState.teamId !== 'ALL' || 
                       filterState.opponentTeamId !== 'ALL' || 
                       filterState.tournament !== 'ALL' || 
                       filterState.role !== 'ALL';

    return (
        <div className="bg-slate-900/90 backdrop-blur-md border border-teal-500/30 rounded-xl p-3 shadow-lg mb-4">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-teal-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-300">
                        Universal Records & Stats Filter
                    </span>
                </div>
                {isFiltered && (
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-1 text-[11px] font-semibold text-rose-400 hover:text-rose-300 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 transition-all hover:scale-105"
                    >
                        <RotateCcw className="w-3 h-3" />
                        Reset Filters
                    </button>
                )}
            </div>

            <div className={`grid grid-cols-2 sm:grid-cols-3 ${compact ? 'lg:grid-cols-4' : 'lg:grid-cols-6'} gap-2.5`}>
                {/* Format Filter */}
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Format
                    </label>
                    <select
                        value={filterState.format}
                        onChange={(e) => handleFieldChange('format', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-teal-400 font-medium"
                    >
                        <option value="ALL">All Formats</option>
                        <option value={Format.T20}>Domestic T20</option>
                        <option value={Format.ODI}>National One-Day (ODI)</option>
                        <option value={Format.SHIELD}>First Class Shield</option>
                    </select>
                </div>

                {/* Season Filter */}
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Season
                    </label>
                    <select
                        value={filterState.season}
                        onChange={(e) => handleFieldChange('season', e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-teal-400 font-medium"
                    >
                        <option value="ALL">All Time</option>
                        {availableSeasons.map(s => (
                            <option key={s} value={s}>Season {s}</option>
                        ))}
                    </select>
                </div>

                {/* Team Filter */}
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Team
                    </label>
                    <select
                        value={filterState.teamId}
                        onChange={(e) => handleFieldChange('teamId', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-teal-400 font-medium"
                    >
                        <option value="ALL">All Teams</option>
                        {teams.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>

                {/* Opponent Filter */}
                {!hideOpponent && (
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Opponent
                        </label>
                        <select
                            value={filterState.opponentTeamId}
                            onChange={(e) => handleFieldChange('opponentTeamId', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-teal-400 font-medium"
                        >
                            <option value="ALL">All Opponents</option>
                            {teams.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Tournament / Stage Filter */}
                {!hideTournament && (
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Stage / Tournament
                        </label>
                        <select
                            value={filterState.tournament}
                            onChange={(e) => handleFieldChange('tournament', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-teal-400 font-medium"
                        >
                            <option value="ALL">All Stages</option>
                            <option value="Round-Robin">Round-Robin / League</option>
                            <option value="Semi-Finals">Semi-Finals</option>
                            <option value="Final">Final</option>
                        </select>
                    </div>
                )}

                {/* Role Filter */}
                {!hideRole && (
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Role
                        </label>
                        <select
                            value={filterState.role}
                            onChange={(e) => handleFieldChange('role', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-teal-400 font-medium"
                        >
                            <option value="ALL">All (Player & Captain)</option>
                            <option value="CAPTAIN">Captaincy Only</option>
                            <option value="PLAYER">Player Only</option>
                        </select>
                    </div>
                )}
            </div>
        </div>
    );
};

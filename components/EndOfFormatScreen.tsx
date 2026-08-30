import React, { useState, useMemo } from 'react';
import { GameData, Format, Player } from '../types';
import { getRoleFullName, getRoleColor } from '../utils';
import { 
    DRAFT_SQUAD_SIZE, 
    DRAFT_FOREIGN_PLAYERS, 
    DRAFT_NATIONAL_PLAYERS,
    MAX_RETAINED_NATIONAL_PLAYERS,
    MAX_RETAINED_FOREIGN_PLAYERS,
    MAX_RETAINED_TOTAL_PLAYERS
} from '../data';
import { Trophy, Award, Sparkles, ChevronRight, UserCheck, AlertCircle, Ban } from 'lucide-react';

interface EndOfFormatScreenProps {
    gameData: GameData;
    handleFormatChange: (newFormat: Format) => void;
    handleEndSeason: (retainedPlayers: Player[]) => void;
    onNavigateToScreen?: (screen: any) => void;
}

const EndOfFormatScreen: React.FC<EndOfFormatScreenProps> = ({ gameData, handleFormatChange, handleEndSeason, onNavigateToScreen }) => {
    const [view, setView] = useState<'awards' | 'retention'>('awards');
    const [retainedIds, setRetainedIds] = useState<Set<string>>(new Set());
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const userTeam = useMemo(() => gameData.teams.find(t => t.id === gameData.userTeamId), [gameData]);
    const lastAward = (gameData.awardsHistory || [])[(gameData.awardsHistory || []).length - 1];
    
    const formatsOrder = [
        Format.T20, Format.ODI, Format.SHIELD
    ];

    const currentIdx = formatsOrder.indexOf(gameData.currentFormat);
    const nextFormat = currentIdx !== -1 && currentIdx < formatsOrder.length - 1 ? formatsOrder[currentIdx + 1] : null;

    // Standard Retention Players (National Only, Max 5)
    const retainedPlayersList = useMemo(() => {
        return userTeam?.squad.filter(p => !p.isForeign && retainedIds.has(p.id)) || [];
    }, [userTeam, retainedIds]);

    const nationalCount = retainedPlayersList.length;

    const toggleRetention = (id: string) => {
        const player = userTeam?.squad.find(p => p.id === id);
        if (!player) return;
        setErrorMessage(null);

        if (player.isForeign) {
            setErrorMessage(`Foreign players cannot be retained! All foreign players must enter the Draft pool.`);
            return;
        }

        setRetainedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                if (nationalCount >= MAX_RETAINED_NATIONAL_PLAYERS) {
                    setErrorMessage(`Maximum ${MAX_RETAINED_NATIONAL_PLAYERS} national players can be retained! All others will enter the Draft.`);
                    return prev;
                }
                next.add(id);
            }
            return next;
        });
    };

    const finalizeSeason = () => {
        const finalRetained = userTeam?.squad.filter(p => !p.isForeign && retainedIds.has(p.id)) || [];
        handleEndSeason(finalRetained);
    };

    if (view === 'retention') {
        return (
            <div className="p-4 md:p-6 bg-slate-950 text-white min-h-screen space-y-5">
                <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-slate-950 p-5 rounded-3xl border border-teal-500/30 shadow-2xl space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2 text-xs font-black uppercase text-teal-400 tracking-widest">
                                <Sparkles size={16} />
                                <span>Pre-Season Retentions • Season {gameData.currentSeason + 1}</span>
                            </div>
                            <h2 className="text-2xl font-black uppercase tracking-tight text-white mt-1">
                                National Core Retentions (Max 5)
                            </h2>
                            <p className="text-xs text-slate-400">
                                Only <span className="text-teal-300 font-bold">5 National players</span> can be retained. All Foreign players and remaining Domestic players enter the Draft.
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="bg-slate-900 border border-teal-500/40 px-3 py-2 rounded-2xl text-center">
                                <div className="text-[10px] text-slate-400 font-bold uppercase">Total Kept</div>
                                <div className="text-base font-black text-teal-400">{retainedPlayersList.length} / {MAX_RETAINED_NATIONAL_PLAYERS}</div>
                            </div>
                            <div className="bg-slate-900 border border-amber-500/40 px-3 py-2 rounded-2xl text-center opacity-75">
                                <div className="text-[10px] text-slate-400 font-bold uppercase">✈️ Foreign</div>
                                <div className="text-xs font-black text-amber-400 mt-1">All in Draft (0/{MAX_RETAINED_FOREIGN_PLAYERS})</div>
                            </div>
                            <div className="bg-slate-900 border border-cyan-500/40 px-3 py-2 rounded-2xl text-center">
                                <div className="text-[10px] text-slate-400 font-bold uppercase">🏠 National</div>
                                <div className="text-base font-black text-cyan-400">{nationalCount} / {MAX_RETAINED_NATIONAL_PLAYERS}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {errorMessage && (
                    <div className="bg-red-950/60 border border-red-500/50 p-3 rounded-2xl text-xs text-red-200 flex items-center gap-2 font-mono">
                        <AlertCircle size={16} className="text-red-400 shrink-0" />
                        <span>{errorMessage}</span>
                    </div>
                )}

                <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <UserCheck size={16} className="text-teal-400" />
                            <span>Select Up to 5 National Players from {userTeam?.name} Squad</span>
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-1">
                        {userTeam?.squad.map(p => {
                            const isForeign = p.isForeign;
                            const isRetained = !isForeign && retainedIds.has(p.id);
                            const topSkill = Math.max(p.battingSkill, p.secondarySkill);

                            return (
                                <div
                                    key={p.id}
                                    onClick={() => toggleRetention(p.id)}
                                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                                        isForeign 
                                            ? 'bg-slate-900/40 border-slate-800/80 text-slate-500 opacity-60 hover:opacity-80'
                                            : isRetained
                                                ? 'bg-teal-950/60 border-teal-400 text-white shadow-lg'
                                                : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700'
                                    }`}
                                >
                                    <div>
                                        <div className="font-bold text-sm flex items-center gap-1.5">
                                            <span className={isForeign ? 'text-slate-400' : 'text-white'}>{p.name}</span>
                                            {isForeign ? (
                                                <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-extrabold flex items-center gap-1">
                                                    ✈️ Foreign • Draft Pool
                                                </span>
                                            ) : (
                                                <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1 py-0.2 rounded font-extrabold">🏠 National</span>
                                            )}
                                        </div>
                                        <div className={`text-[10px] font-semibold ${isForeign ? 'text-slate-500' : getRoleColor(p.role)}`}>
                                            {getRoleFullName(p.role)} • Rating {topSkill} {p.nationality ? `(${p.nationality})` : ''}
                                        </div>
                                    </div>

                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                                        isForeign
                                            ? 'bg-slate-800 text-slate-500'
                                            : isRetained 
                                                ? 'bg-teal-400 text-slate-950' 
                                                : 'bg-slate-800 text-slate-400'
                                    }`}>
                                        {isForeign ? <Ban size={12} /> : isRetained ? '✓' : '+'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <button
                    onClick={finalizeSeason}
                    className="w-full bg-gradient-to-r from-teal-400 to-emerald-400 py-4 rounded-2xl text-slate-950 font-black text-sm uppercase tracking-wider shadow-2xl hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    <span>Confirm Retentions ({nationalCount}/5) & Enter Season {gameData.currentSeason + 1} Draft</span>
                    <ChevronRight size={18} />
                </button>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 text-center flex flex-col justify-between min-h-screen bg-slate-950 text-white space-y-6">
            <div className="space-y-6 max-w-4xl mx-auto w-full">
                <div className="space-y-2">
                    <div className="text-xs font-black uppercase text-teal-400 tracking-widest flex items-center justify-center gap-2">
                        <Trophy size={18} className="text-amber-400" />
                        <span>Tournament Concluded</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-white">
                        {lastAward?.format || gameData.currentFormat} Champions & Awards
                    </h2>
                </div>

                <div className="bg-gradient-to-b from-amber-500/20 to-slate-900 border-2 border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-2">
                    <p className="text-xs font-black uppercase tracking-widest text-amber-300">Champions Trophy</p>
                    <p className="text-3xl md:text-4xl font-black uppercase tracking-tight text-white">
                        {lastAward?.winnerTeamName || 'TBD'}
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-slate-900/90 border border-blue-500/40 rounded-2xl p-4 space-y-1 text-center shadow-lg">
                        <p className="font-black text-blue-400 text-xs uppercase">Orange Cap (Top Batter)</p>
                        <p className="font-bold text-white truncate text-sm">{lastAward?.bestBatter?.playerName || 'N/A'}</p>
                        <p className="text-2xl font-black text-white">{lastAward?.bestBatter?.runs ?? 0} Runs</p>
                    </div>

                    <div className="bg-slate-900/90 border border-purple-500/40 rounded-2xl p-4 space-y-1 text-center shadow-lg">
                        <p className="font-black text-purple-400 text-xs uppercase">Purple Cap (Top Bowler)</p>
                        <p className="font-bold text-white truncate text-sm">{lastAward?.bestBowler?.playerName || 'N/A'}</p>
                        <p className="text-2xl font-black text-white">{lastAward?.bestBowler?.wickets ?? 0} Wickets</p>
                    </div>

                    <div className="bg-slate-900/90 border border-orange-500/40 rounded-2xl p-4 space-y-1 text-center shadow-lg">
                        <p className="font-black text-orange-400 text-xs uppercase">Power Hitter Award</p>
                        <p className="font-bold text-white truncate text-sm">{lastAward?.powerHitter?.playerName || 'N/A'}</p>
                        <p className="text-2xl font-black text-white">{lastAward?.powerHitter?.sixes ?? 0} Sixes</p>
                    </div>

                    <div className="bg-slate-900/90 border border-teal-500/40 rounded-2xl p-4 space-y-1 text-center shadow-lg">
                        <p className="font-black text-teal-400 text-xs uppercase">Tournament MVP</p>
                        <p className="font-bold text-white truncate text-sm">{lastAward?.playerOfSeason?.playerName || 'N/A'}</p>
                        <p className="text-2xl font-black text-white">{lastAward?.playerOfSeason?.impact ?? 0} Pts</p>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto w-full pt-4">
                {nextFormat ? (
                    <button
                        onClick={() => handleFormatChange(nextFormat)}
                        className="w-full bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 font-black py-4 px-8 text-base rounded-2xl shadow-xl uppercase tracking-wider hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <span>Proceed to Next Tournament: {nextFormat}</span>
                        <ChevronRight size={20} />
                    </button>
                ) : (
                    <button
                        onClick={() => {
                            if (onNavigateToScreen) onNavigateToScreen('SEASON_TRANSITION');
                            else handleEndSeason(userTeam?.squad || []);
                        }}
                        className="w-full bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 font-black py-4 px-8 text-base rounded-2xl shadow-xl uppercase tracking-wider hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <span>⚡ Advance to Next International Year (Season {gameData.currentSeason + 1})</span>
                        <ChevronRight size={20} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default EndOfFormatScreen;

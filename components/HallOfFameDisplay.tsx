import React, { useState } from 'react';
import { GameData, SeasonHallOfFame, HallOfFameInductee } from '../types';
import { Trophy, Award, Globe, Zap, ShieldCheck, Flame, Star, Sparkles, ChevronRight, Crown } from 'lucide-react';

interface HallOfFameDisplayProps {
    gameData: GameData;
    currentSeasonOverride?: number;
}

export const HallOfFameDisplay: React.FC<HallOfFameDisplayProps> = ({
    gameData,
    currentSeasonOverride
}) => {
    const hallOfFameHistory = gameData.hallOfFameHistory || [];
    const latestSeason = currentSeasonOverride || gameData.currentSeason;

    const [selectedSeason, setSelectedSeason] = useState<number>(() => {
        if (hallOfFameHistory.length > 0) {
            return hallOfFameHistory[hallOfFameHistory.length - 1].season;
        }
        return latestSeason;
    });

    const activeHallOfFame = hallOfFameHistory.find(h => h.season === selectedSeason) || 
        hallOfFameHistory[hallOfFameHistory.length - 1];

    if (!activeHallOfFame && hallOfFameHistory.length === 0) {
        return (
            <div className="bg-slate-900/80 border border-slate-800 p-8 rounded-3xl text-center space-y-3">
                <Trophy size={40} className="mx-auto text-amber-400 opacity-60" />
                <h3 className="text-lg font-black text-white uppercase tracking-wider">Hall of Fame Awaits Inductees</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                    At the conclusion of each season, the league inducts 4 elite legends into the permanent Hall of Fame: Best Batter, Best Bowler, Best All-Rounder, and Best Foreign Player.
                </p>
            </div>
        );
    }

    const inductees: { title: string; icon: any; color: string; bg: string; data: HallOfFameInductee }[] = activeHallOfFame ? [
        {
            title: 'Best Batter of the Season',
            icon: Zap,
            color: 'text-amber-400',
            bg: 'from-amber-950/60 via-slate-900 to-amber-900/20 border-amber-500/40',
            data: activeHallOfFame.bestBatter
        },
        {
            title: 'Best Bowler of the Season',
            icon: ShieldCheck,
            color: 'text-cyan-400',
            bg: 'from-cyan-950/60 via-slate-900 to-cyan-900/20 border-cyan-500/40',
            data: activeHallOfFame.bestBowler
        },
        {
            title: 'Best All-Rounder of the Season',
            icon: Flame,
            color: 'text-emerald-400',
            bg: 'from-emerald-950/60 via-slate-900 to-emerald-900/20 border-emerald-500/40',
            data: activeHallOfFame.bestAllRounder
        },
        {
            title: 'Best Foreign Player of the Season',
            icon: Globe,
            color: 'text-purple-400',
            bg: 'from-purple-950/60 via-slate-900 to-purple-900/20 border-purple-500/40',
            data: activeHallOfFame.bestForeign
        }
    ] : [];

    return (
        <div className="space-y-6">
            {/* Header / Season Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-amber-950/70 via-slate-900 to-purple-950/70 p-5 rounded-3xl border border-amber-500/40 shadow-xl">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-black uppercase text-amber-400 tracking-widest">
                        <Crown size={16} />
                        <span>Cricket Manager • Hall of Fame</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black uppercase text-white tracking-tight">
                        Season {selectedSeason} Hall of Fame Class
                    </h3>
                    <p className="text-xs text-slate-300">
                        Honoring the single greatest Batter, Bowler, All-Rounder, and Foreign icon of the campaign.
                    </p>
                </div>

                {hallOfFameHistory.length > 1 && (
                    <div className="flex items-center gap-1 bg-slate-950/90 p-1.5 rounded-2xl border border-slate-800 self-start sm:self-auto">
                        <span className="text-[10px] text-slate-400 font-bold px-2 uppercase">Season:</span>
                        {hallOfFameHistory.map(h => (
                            <button
                                key={h.season}
                                onClick={() => setSelectedSeason(h.season)}
                                className={`px-3 py-1 rounded-xl text-xs font-black transition-all ${
                                    selectedSeason === h.season
                                        ? 'bg-amber-500 text-slate-950 shadow-md'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                S{h.season}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* 4 Golden Inductee Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inductees.map(({ title, icon: Icon, color, bg, data }) => (
                    <div
                        key={title}
                        className={`bg-gradient-to-br ${bg} border p-5 rounded-3xl shadow-xl space-y-4 relative overflow-hidden`}
                    >
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <div className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${color}`}>
                                    <Icon size={16} />
                                    <span>{title}</span>
                                </div>
                                <div className="text-2xl font-black text-white tracking-tight">
                                    {data.playerName}
                                </div>
                                <div className="text-xs text-slate-300 flex items-center gap-2">
                                    <span className="font-bold text-teal-300">{data.teamName}</span>
                                    <span>•</span>
                                    <span>{data.role}</span>
                                    {data.isForeign && <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded-full font-bold">✈️ {data.nationality}</span>}
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="text-xs font-black uppercase text-slate-400">Impact Score</div>
                                <div className={`text-xl font-black font-mono ${color}`}>{data.evaluationScore} pts</div>
                            </div>
                        </div>

                        {/* Stats Row */}
                        <div className="grid grid-cols-3 gap-2 bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-center">
                            {data.seasonRuns > 0 && (
                                <div>
                                    <div className="text-[9px] text-slate-400 uppercase font-bold">Runs Scored</div>
                                    <div className="text-sm font-black font-mono text-white">{data.seasonRuns}</div>
                                </div>
                            )}
                            {data.seasonWickets > 0 && (
                                <div>
                                    <div className="text-[9px] text-slate-400 uppercase font-bold">Wickets Taken</div>
                                    <div className="text-sm font-black font-mono text-cyan-400">{data.seasonWickets}</div>
                                </div>
                            )}
                            {data.battingAverage !== undefined && data.battingAverage > 0 && (
                                <div>
                                    <div className="text-[9px] text-slate-400 uppercase font-bold">Bat Average</div>
                                    <div className="text-sm font-black font-mono text-emerald-400">{data.battingAverage}</div>
                                </div>
                            )}
                            {data.bowlingEconomy !== undefined && data.bowlingEconomy > 0 && (
                                <div>
                                    <div className="text-[9px] text-slate-400 uppercase font-bold">Economy</div>
                                    <div className="text-sm font-black font-mono text-amber-400">{data.bowlingEconomy}</div>
                                </div>
                            )}
                        </div>

                        {/* Inducted Reason Quote */}
                        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80 text-xs text-slate-300 italic">
                            "{data.achievementHighlight}"
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HallOfFameDisplay;

import React, { useState } from 'react';
import { GameData, SkillProgressionSummary, SkillProgressionReport, PlayerRole } from '../types';
import { TrendingUp, TrendingDown, Zap, Shield, Flame, Sparkles, Filter } from 'lucide-react';

interface SkillProgressionViewProps {
    gameData: GameData;
    summary?: SkillProgressionSummary;
}

export const SkillProgressionView: React.FC<SkillProgressionViewProps> = ({
    gameData,
    summary
}) => {
    const [selectedRole, setSelectedRole] = useState<'ALL' | 'BATSMAN' | 'BOWLER' | 'ALL_ROUNDER'>('ALL');
    const [progressionType, setProgressionType] = useState<'ALL' | 'GAIN' | 'LOSS'>('ALL');

    // Default to latest season summary if available
    const activeSummary: SkillProgressionSummary | undefined = summary || (() => {
        const history = gameData.skillProgressionHistory;
        if (history) {
            const seasons = Object.keys(history).map(Number).sort((a, b) => b - a);
            if (seasons.length > 0) return history[seasons[0]];
        }
        return undefined;
    })();

    if (!activeSummary) {
        return (
            <div className="bg-slate-900/80 border border-slate-800 p-8 rounded-3xl text-center space-y-3">
                <TrendingUp size={40} className="mx-auto text-teal-400 opacity-60" />
                <h3 className="text-lg font-black text-white uppercase tracking-wider">Dynamic Skill Progression</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                    At the end of every season, the 10 best and 10 worst Batters, Bowlers, and All-Rounders experience consequential skill upgrades and regressions based strictly on their match performance.
                </p>
            </div>
        );
    }

    const gainingBatters = activeSummary.gainingBatters || [];
    const losingBatters = activeSummary.losingBatters || [];
    const gainingBowlers = activeSummary.gainingBowlers || [];
    const losingBowlers = activeSummary.losingBowlers || [];
    const gainingAllRounders = activeSummary.gainingAllRounders || [];
    const losingAllRounders = activeSummary.losingAllRounders || [];

    const allGaining = [...gainingBatters, ...gainingBowlers, ...gainingAllRounders];
    const allLosing = [...losingBatters, ...losingBowlers, ...losingAllRounders];

    const filterList = (list: SkillProgressionReport[]) => {
        return list.filter(item => {
            if (selectedRole === 'BATSMAN') return item.role === PlayerRole.BATSMAN || item.role === PlayerRole.WICKET_KEEPER;
            if (selectedRole === 'BOWLER') return item.role === PlayerRole.FAST_BOWLER || item.role === PlayerRole.SPIN_BOWLER;
            if (selectedRole === 'ALL_ROUNDER') return item.role === PlayerRole.ALL_ROUNDER;
            return true;
        });
    };

    const displayGaining = filterList(allGaining);
    const displayLosing = filterList(allLosing);

    return (
        <div className="space-y-6">
            {/* Overview Banner */}
            <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-cyan-950 p-5 rounded-3xl border border-teal-500/40 space-y-3 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-black uppercase text-teal-400 tracking-widest">
                            <Sparkles size={16} />
                            <span>Season {activeSummary.season} Attribute Progression Report</span>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-black uppercase text-white mt-1">
                            Dynamic Player Skill Evolutions (10 Best &amp; 10 Worst Per Role)
                        </h3>
                        <p className="text-xs text-slate-300 mt-0.5">
                            Elite performers earned permanent attribute upgrades (Batters/Bowlers +1 to +2, All-Rounders +1 to +3 dual skill), while worst performers faced skill reductions.
                        </p>
                    </div>

                    {/* Summary Counters */}
                    <div className="flex items-center gap-2">
                        <div className="bg-slate-950/80 px-3 py-2 rounded-2xl border border-emerald-500/40 text-center">
                            <div className="text-[10px] text-emerald-400 font-bold uppercase">Upgrades</div>
                            <div className="text-lg font-black text-white">{allGaining.length}</div>
                        </div>
                        <div className="bg-slate-950/80 px-3 py-2 rounded-2xl border border-rose-500/40 text-center">
                            <div className="text-[10px] text-rose-400 font-bold uppercase">Regressions</div>
                            <div className="text-lg font-black text-white">{allLosing.length}</div>
                        </div>
                    </div>
                </div>

                {/* Filter Controls */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setSelectedRole('ALL')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                selectedRole === 'ALL' ? 'bg-teal-500 text-slate-950' : 'bg-slate-950 text-slate-400 hover:text-white'
                            }`}
                        >
                            All Roles (30+30)
                        </button>
                        <button
                            onClick={() => setSelectedRole('BATSMAN')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                selectedRole === 'BATSMAN' ? 'bg-teal-500 text-slate-950' : 'bg-slate-950 text-slate-400 hover:text-white'
                            }`}
                        >
                            Batters (10+10)
                        </button>
                        <button
                            onClick={() => setSelectedRole('BOWLER')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                selectedRole === 'BOWLER' ? 'bg-teal-500 text-slate-950' : 'bg-slate-950 text-slate-400 hover:text-white'
                            }`}
                        >
                            Bowlers (10+10)
                        </button>
                        <button
                            onClick={() => setSelectedRole('ALL_ROUNDER')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                selectedRole === 'ALL_ROUNDER' ? 'bg-teal-500 text-slate-950' : 'bg-slate-950 text-slate-400 hover:text-white'
                            }`}
                        >
                            All-Rounders (10+10)
                        </button>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                        <button
                            onClick={() => setProgressionType('ALL')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                progressionType === 'ALL' ? 'bg-teal-500 text-slate-950' : 'text-slate-400'
                            }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setProgressionType('GAIN')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                progressionType === 'GAIN' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
                            }`}
                        >
                            Upgrades Only
                        </button>
                        <button
                            onClick={() => setProgressionType('LOSS')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                progressionType === 'LOSS' ? 'bg-rose-500 text-slate-950' : 'text-slate-400'
                            }`}
                        >
                            Regressions Only
                        </button>
                    </div>
                </div>
            </div>

            {/* List Grids */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Upgraded Performers */}
                {(progressionType === 'ALL' || progressionType === 'GAIN') && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between bg-emerald-950/40 border border-emerald-500/30 p-3.5 rounded-2xl">
                            <div className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                                <TrendingUp size={16} />
                                <span>Skill Upgrades (Top Performers)</span>
                            </div>
                            <span className="text-xs font-mono font-bold text-emerald-400">{displayGaining.length} Players</span>
                        </div>

                        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                            {displayGaining.map((item, idx) => (
                                <div
                                    key={`${item.playerId}-gain`}
                                    className="bg-slate-900/90 border border-emerald-500/20 hover:border-emerald-500/40 p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-md"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 font-mono font-black text-xs flex items-center justify-center shrink-0">
                                            #{idx + 1}
                                        </div>
                                        <div className="truncate">
                                            <div className="font-bold text-xs text-white flex items-center gap-1.5 truncate">
                                                <span className="truncate">{item.playerName}</span>
                                                <span className="text-[10px] text-slate-400 font-mono">Age {item.age}</span>
                                                {item.isForeign && <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1 rounded font-bold">✈️</span>}
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-0.5">
                                                <span>{item.teamName}</span> • <span className="text-teal-400">{item.role}</span>
                                            </div>
                                            <div className="text-[10px] text-emerald-300/80 italic mt-0.5">
                                                {item.reason}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                        {item.battingSkillDelta > 0 && (
                                            <div className="text-xs font-mono font-black text-emerald-400">
                                                +{item.battingSkillDelta} Bat ({item.oldBattingSkill} → {item.newBattingSkill})
                                            </div>
                                        )}
                                        {item.bowlingSkillDelta > 0 && (
                                            <div className="text-xs font-mono font-black text-cyan-400">
                                                +{item.bowlingSkillDelta} Bowl ({item.oldBowlingSkill} → {item.newBowlingSkill})
                                            </div>
                                        )}
                                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                            Eval Score: {item.seasonEvaluationScore}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Regressed Performers */}
                {(progressionType === 'ALL' || progressionType === 'LOSS') && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between bg-rose-950/40 border border-rose-500/30 p-3.5 rounded-2xl">
                            <div className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-2">
                                <TrendingDown size={16} />
                                <span>Skill Regressions (Underperformers)</span>
                            </div>
                            <span className="text-xs font-mono font-bold text-rose-400">{displayLosing.length} Players</span>
                        </div>

                        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                            {displayLosing.map((item, idx) => (
                                <div
                                    key={`${item.playerId}-loss`}
                                    className="bg-slate-900/90 border border-rose-500/20 hover:border-rose-500/40 p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-md"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-300 font-mono font-black text-xs flex items-center justify-center shrink-0">
                                            #{idx + 1}
                                        </div>
                                        <div className="truncate">
                                            <div className="font-bold text-xs text-white flex items-center gap-1.5 truncate">
                                                <span className="truncate">{item.playerName}</span>
                                                <span className="text-[10px] text-slate-400 font-mono">Age {item.age}</span>
                                                {item.isForeign && <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1 rounded font-bold">✈️</span>}
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-0.5">
                                                <span>{item.teamName}</span> • <span className="text-slate-400">{item.role}</span>
                                            </div>
                                            <div className="text-[10px] text-rose-300/80 italic mt-0.5">
                                                {item.reason}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                        {item.battingSkillDelta < 0 && (
                                            <div className="text-xs font-mono font-black text-rose-400">
                                                {item.battingSkillDelta} Bat ({item.oldBattingSkill} → {item.newBattingSkill})
                                            </div>
                                        )}
                                        {item.bowlingSkillDelta < 0 && (
                                            <div className="text-xs font-mono font-black text-rose-400">
                                                {item.bowlingSkillDelta} Bowl ({item.oldBowlingSkill} → {item.newBowlingSkill})
                                            </div>
                                        )}
                                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                            Eval Score: {item.seasonEvaluationScore}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SkillProgressionView;

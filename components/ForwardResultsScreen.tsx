
import React, { useMemo } from 'react';
import { MatchResult, Match } from '../types';
import { Trophy, Swords, Sparkles, Play, Award, ChevronRight, ArrowLeft, BarChart2 } from 'lucide-react';
import { playSFX } from '../utils/soundManager';

interface ForwardResultsScreenProps {
    results: MatchResult[];
    onBack: () => void;
    userTeamId: string;
    onViewResult?: (result: MatchResult) => void;
    onPlayNextMatch?: () => void;
    upcomingMatch?: Match | null;
    userTeamName?: string;
}

export const ForwardResultsScreen: React.FC<ForwardResultsScreenProps> = ({ 
    results, 
    onBack, 
    userTeamId,
    onViewResult,
    onPlayNextMatch,
    upcomingMatch,
    userTeamName
}) => {
    // Calculate key highlights from the simulated period
    const statsHighlights = useMemo(() => {
        if (!results || results.length === 0) return null;

        let highestScore = { runs: 0, teamName: '', overs: '' };
        let topBatter = { name: '', runs: 0, balls: 0, teamName: '' };
        let topBowler = { name: '', wickets: 0, runsConceded: 0, teamName: '' };

        results.forEach(res => {
            [res.firstInning, res.secondInning, res.thirdInning, res.fourthInning].filter(Boolean).forEach(inn => {
                if (!inn) return;
                if (inn.score > highestScore.runs) {
                    highestScore = { runs: inn.score, teamName: inn.teamName, overs: inn.overs };
                }
                inn.batting.forEach(b => {
                    if (b.runs > topBatter.runs) {
                        topBatter = { name: b.playerName, runs: b.runs, balls: b.balls, teamName: inn.teamName };
                    }
                });
                inn.bowling.forEach(bw => {
                    if (bw.wickets > topBowler.wickets || (bw.wickets === topBowler.wickets && bw.runsConceded < topBowler.runsConceded && bw.wickets > 0)) {
                        topBowler = { name: bw.playerName, wickets: bw.wickets, runsConceded: bw.runsConceded, teamName: inn.teamName };
                    }
                });
            });
        });

        return { highestScore, topBatter, topBowler };
    }, [results]);

    return (
        <div className="p-3 sm:p-4 min-h-full flex flex-col max-w-4xl mx-auto space-y-4 pb-20">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-teal-950/60 to-slate-900 border border-teal-500/30 rounded-2xl p-4 shadow-xl">
                <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-teal-500/20 text-teal-300 rounded-xl border border-teal-500/40">
                            <Swords className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                                Fast-Forward Period Results
                            </h2>
                            <p className="text-xs text-slate-300">
                                Simulated <strong className="text-teal-400 font-bold">{results.length}</strong> match{results.length !== 1 ? 'es' : ''} leading up to your next fixture
                            </p>
                        </div>
                    </div>
                    <span className="text-[10px] uppercase font-black tracking-widest bg-teal-500/20 text-teal-300 border border-teal-500/40 px-2.5 py-1 rounded-lg shrink-0">
                        {results.length} Completed
                    </span>
                </div>

                {/* Upcoming Fixture Card */}
                {upcomingMatch && (
                    <div className="mt-3 p-3 bg-slate-950/80 border border-teal-500/40 rounded-xl flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-amber-400" />
                                Up Next (Your Match)
                            </span>
                            <p className="font-extrabold text-white text-xs sm:text-sm truncate">
                                <span className={upcomingMatch.teamA === userTeamName ? 'text-teal-400 font-black' : ''}>{upcomingMatch.teamA}</span>
                                <span className="text-slate-400 font-normal mx-1.5">vs</span>
                                <span className={upcomingMatch.teamB === userTeamName ? 'text-teal-400 font-black' : ''}>{upcomingMatch.teamB}</span>
                            </p>
                            <span className="text-[10px] text-slate-400">Match {upcomingMatch.matchNumber} • {upcomingMatch.date}</span>
                        </div>
                        {onPlayNextMatch && (
                            <button
                                onClick={() => {
                                    playSFX('click');
                                    onPlayNextMatch();
                                }}
                                className="px-3 py-2 bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg active:scale-95 transition-all shrink-0"
                            >
                                <Play className="w-3.5 h-3.5 fill-slate-950" />
                                <span>Play Now</span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Quick Highlights Grid */}
            {statsHighlights && (
                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 text-center">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Top Innings Score</span>
                        <p className="text-sm font-black text-amber-400 mt-0.5 truncate">{statsHighlights.highestScore.runs} runs</p>
                        <span className="text-[10px] text-slate-400 block truncate">{statsHighlights.highestScore.teamName}</span>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 text-center">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Best Batter</span>
                        <p className="text-sm font-black text-teal-400 mt-0.5 truncate">{statsHighlights.topBatter.name || 'N/A'}</p>
                        <span className="text-[10px] text-slate-400 block truncate">{statsHighlights.topBatter.runs} ({statsHighlights.topBatter.balls})</span>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 text-center">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Best Bowler</span>
                        <p className="text-sm font-black text-cyan-400 mt-0.5 truncate">{statsHighlights.topBowler.name || 'N/A'}</p>
                        <span className="text-[10px] text-slate-400 block truncate">{statsHighlights.topBowler.wickets > 0 ? `${statsHighlights.topBowler.wickets}/${statsHighlights.topBowler.runsConceded}` : 'N/A'}</span>
                    </div>
                </div>
            )}

            {/* Match Results List */}
            <div className="space-y-2.5 flex-1">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <BarChart2 className="w-3.5 h-3.5 text-teal-400" />
                        Simulated Matches ({results.length})
                    </h3>
                    <span className="text-[10px] text-slate-400">Click any match to view scorecard</span>
                </div>

                {results.map((result, index) => {
                    const isUserInvolved = result.firstInning.teamId === userTeamId || result.secondInning.teamId === userTeamId;
                    const inn1 = result.firstInning;
                    const inn2 = result.secondInning;

                    return (
                        <div 
                            key={`${result.matchNumber}-${index}`}
                            className={`p-3.5 rounded-2xl border transition-all shadow-md ${
                                isUserInvolved 
                                    ? 'bg-teal-950/30 border-teal-500/50' 
                                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                            }`}
                        >
                            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                                <span className="font-bold text-slate-300">Match {result.matchNumber}</span>
                                {result.manOfTheMatch?.playerName && (
                                    <span className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <Award className="w-3 h-3 text-amber-400" />
                                        POTM: {result.manOfTheMatch.playerName}
                                    </span>
                                )}
                            </div>

                            {/* Innings comparison */}
                            <div className="grid grid-cols-2 gap-2 py-1 items-center">
                                <div className={`p-2 rounded-xl border ${result.winnerId === inn1.teamId ? 'bg-teal-500/10 border-teal-500/30 text-teal-300' : 'bg-slate-950/60 border-slate-800 text-slate-300'}`}>
                                    <p className="font-black text-xs sm:text-sm truncate">{inn1.teamName}</p>
                                    <p className="font-extrabold text-sm sm:text-base text-white mt-0.5">
                                        {inn1.score}/{inn1.wickets}
                                        <span className="text-[10px] font-normal text-slate-400 ml-1">({inn1.overs} ov)</span>
                                    </p>
                                </div>

                                <div className={`p-2 rounded-xl border ${result.winnerId === inn2.teamId ? 'bg-teal-500/10 border-teal-500/30 text-teal-300' : 'bg-slate-950/60 border-slate-800 text-slate-300'}`}>
                                    <p className="font-black text-xs sm:text-sm truncate">{inn2.teamName}</p>
                                    <p className="font-extrabold text-sm sm:text-base text-white mt-0.5">
                                        {inn2.score}/{inn2.wickets}
                                        <span className="text-[10px] font-normal text-slate-400 ml-1">({inn2.overs} ov)</span>
                                    </p>
                                </div>
                            </div>

                            {/* Summary & View Details */}
                            <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                                <p className="text-xs font-semibold text-teal-400 truncate">
                                    {result.summary}
                                </p>
                                {onViewResult && (
                                    <button
                                        onClick={() => {
                                            playSFX('click');
                                            onViewResult(result);
                                        }}
                                        className="text-[10px] font-bold text-slate-300 hover:text-teal-300 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-700 flex items-center gap-1 shrink-0 transition-all"
                                    >
                                        <span>Scorecard</span>
                                        <ChevronRight className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Bottom Floating Navigation Buttons */}
            <div className="sticky bottom-2 z-20 bg-slate-950/95 backdrop-blur-md p-2 rounded-2xl border border-slate-800 flex gap-2 shadow-2xl">
                <button
                    onClick={() => {
                        playSFX('click');
                        onBack();
                    }}
                    className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Return to Dashboard</span>
                </button>

                {onPlayNextMatch && (
                    <button
                        onClick={() => {
                            playSFX('click');
                            onPlayNextMatch();
                        }}
                        className="flex-1 py-3 px-4 bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-500 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 active:scale-95"
                    >
                        <Play className="w-4 h-4 fill-slate-950" />
                        <span>Ready For My Match</span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default ForwardResultsScreen;


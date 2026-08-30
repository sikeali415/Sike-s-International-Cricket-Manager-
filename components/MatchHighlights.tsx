import React, { useState, useEffect } from 'react';
import { MatchResult } from '../types';
import { generateDetailedMatchSummary } from '../geminiService';

interface MatchHighlightsProps {
    result: MatchResult;
    userTeamId: string;
}

export const MatchHighlights: React.FC<MatchHighlightsProps> = ({ result, userTeamId }) => {
    const [aiSummary, setAiSummary] = useState<string>('');
    const [loadingAi, setLoadingAi] = useState<boolean>(false);
    const [aiError, setAiError] = useState<string>('');

    const handleGenerateAiSummary = async () => {
        setLoadingAi(true);
        setAiError('');
        try {
            const summaryText = await generateDetailedMatchSummary(result);
            setAiSummary(summaryText);
        } catch (err) {
            setAiError('Failed to establish contact with the press box.');
        } finally {
            setLoadingAi(false);
        }
    };

    // 1. Programmatic highlights builder (extremely rich, acts as reliable fallback and structured timeline)
    const getProgrammaticHighlights = (): { title: string; desc: string; type: 'bat' | 'bowl' | 'milestone' | 'match' | 'toss' }[] => {
        const events: { title: string; desc: string; type: 'bat' | 'bowl' | 'milestone' | 'match' | 'toss' }[] = [];
        const { firstInning, secondInning, manOfTheMatch, summary } = result;

        // Toss event
        if (result.tossWinnerId) {
            const tossWinnerName = result.tossWinnerId === firstInning.teamId ? firstInning.teamName : secondInning.teamName;
            events.push({
                title: "🪙 Toss Decided",
                desc: `${tossWinnerName} won the coin toss and elected to ${result.tossDecision || 'bat'} first.`,
                type: 'toss'
            });
        }

        // Innings 1 Highlights
        events.push({
            title: `🏏 Innings 1: ${firstInning.teamName}`,
            desc: `Set the tone by accumulating ${firstInning.score}/${firstInning.wickets} in ${firstInning.overs} overs.`,
            type: 'match'
        });

        // Top Batting from Innings 1
        const inn1Batters = [...firstInning.batting].sort((a, b) => b.runs - a.runs).filter(b => b.runs >= 30);
        inn1Batters.forEach(b => {
            const boundaryStr = (b.fours || b.sixes) ? ` (${b.fours || 0} fours, ${b.sixes || 0} sixes)` : "";
            events.push({
                title: `⭐ Batting Milestone: ${b.playerName}`,
                desc: `Smashed a clinical ${b.runs} off ${b.balls} balls${boundaryStr}, anchor-driving the first inning.`,
                type: 'bat'
            });
        });

        // Top Bowling from Innings 1
        const inn1Bowlers = [...firstInning.bowling].sort((a, b) => b.wickets - a.wickets).filter(w => w.wickets >= 2 || (w.ballsBowled >= 12 && w.runsConceded / (w.ballsBowled / 6) <= 5.5));
        inn1Bowlers.forEach(w => {
            events.push({
                title: `🎯 Bowling Spell: ${w.playerName}`,
                desc: `Claimed ${w.wickets} wickets for ${w.runsConceded} runs in ${w.overs} overs, exerting immense pressure.`,
                type: 'bowl'
            });
        });

        // Innings 2 Highlights
        events.push({
            title: `🏏 Innings 2: ${secondInning.teamName}`,
            desc: `Stepped up to chase, finishing at ${secondInning.score}/${secondInning.wickets} in ${secondInning.overs} overs.`,
            type: 'match'
        });

        // Top Batting from Innings 2
        const inn2Batters = [...secondInning.batting].sort((a, b) => b.runs - a.runs).filter(b => b.runs >= 30);
        inn2Batters.forEach(b => {
            const boundaryStr = (b.fours || b.sixes) ? ` (${b.fours || 0} fours, ${b.sixes || 0} sixes)` : "";
            events.push({
                title: `⭐ Batting Milestone: ${b.playerName}`,
                desc: `Anchored the chase with a resilient ${b.runs} off ${b.balls} balls${boundaryStr}.`,
                type: 'bat'
            });
        });

        // Top Bowling from Innings 2
        const inn2Bowlers = [...secondInning.bowling].sort((a, b) => b.wickets - a.wickets).filter(w => w.wickets >= 2 || (w.ballsBowled >= 12 && w.runsConceded / (w.ballsBowled / 6) <= 5.5));
        inn2Bowlers.forEach(w => {
            events.push({
                title: `🎯 Bowling Spell: ${w.playerName}`,
                desc: `Secured key breakthroughs, registering ${w.wickets}/${w.runsConceded} to strangulate opposing aggressive surges.`,
                type: 'bowl'
            });
        });

        // Award
        if (manOfTheMatch) {
            events.push({
                title: `🏆 Man of the Match: ${manOfTheMatch.playerName}`,
                desc: `Celebrated MVP status for their masterful game-defining contribution: ${manOfTheMatch.summary}.`,
                type: 'milestone'
            });
        }

        return events;
    };

    const timelineEvents = getProgrammaticHighlights();

    return (
        <div className="flex flex-col gap-4 p-1 max-w-2xl mx-auto">
            {/* Live Match Ball-By-Ball Timeline Highlights if present */}
            {result.highlights && result.highlights.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight mb-3 flex items-center gap-2">
                        <span>⚡</span> Ball-by-Ball Live Highlights
                    </h3>
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {result.highlights.map((h, index) => (
                            <div 
                                key={index} 
                                className="flex gap-2 text-xs py-1.5 px-2 bg-white dark:bg-slate-950 border-l-4 border-pink-500 rounded-r shadow-xs text-slate-700 dark:text-slate-300"
                            >
                                <span className="font-mono text-pink-500 font-bold">●</span>
                                <p>{h}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* AI Sports Journalist Reporter */}
            <div className="bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-teal-100 border border-teal-800/40 rounded-xl p-4 shadow-lg flex flex-col gap-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transform translate-x-4 -translate-y-4">
                    <span className="text-9xl font-black italic">PressCard</span>
                </div>

                <div className="flex justify-between items-center z-10">
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-teal-400">Signify Broadcast Center</h3>
                        <p className="text-lg font-black italic tracking-tight text-white">GENERATE JOURNALIST REPLAY</p>
                    </div>
                    {!aiSummary && (
                        <button
                            onClick={handleGenerateAiSummary}
                            disabled={loadingAi}
                            className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 disabled:opacity-50 text-white text-xs font-black px-4 py-2 rounded-lg tracking-wider transition-all shadow-md uppercase active:scale-98"
                        >
                            {loadingAi ? "Drafting Report..." : "✨ Draft AI Report"}
                        </button>
                    )}
                </div>

                {loadingAi && (
                    <div className="flex flex-col items-center justify-center py-6 gap-3 z-10">
                        <div className="w-8 h-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin"></div>
                        <p className="text-xs text-teal-300 font-mono italic animate-pulse">Analyzing final-overs footage and scorebooks...</p>
                    </div>
                )}

                {aiError && (
                    <div className="bg-red-950/40 text-red-300 rounded-lg p-2.5 text-xs text-center border border-red-900/30 z-10 font-bold">
                        {aiError}
                    </div>
                )}

                {aiSummary && (
                    <div className="bg-slate-950/60 rounded-xl p-4 border border-teal-800/20 text-xs text-slate-200 leading-relaxed font-normal whitespace-pre-line z-10 transition-all hover:bg-slate-950/80">
                        <div className="flex justify-between items-baseline mb-3 pb-1.5 border-b border-teal-900/50">
                            <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400">📰 Express Match Report</span>
                            <button 
                                onClick={handleGenerateAiSummary} 
                                className="text-[10px] text-teal-400 hover:text-teal-300 uppercase font-black hover:underline"
                            >
                                Regenerate
                            </button>
                        </div>
                        <p className="italic leading-relaxed">{aiSummary}</p>
                    </div>
                )}
            </div>

            {/* Programmatic Key Moments Feed */}
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-1 flex items-center gap-2">
                    <span>🎬</span> Chronological Timeline & Key Breakthroughs
                </h3>
                <div className="relative border-l border-slate-200 dark:border-slate-800 ml-4 pl-5 space-y-4 py-2">
                    {timelineEvents.map((ev, index) => {
                        let iconColor = "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
                        if (ev.type === 'bat') iconColor = "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200";
                        if (ev.type === 'bowl') iconColor = "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200";
                        if (ev.type === 'milestone') iconColor = "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200";

                        return (
                            <div key={index} className="relative group">
                                <div className={`absolute -left-[30px] top-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${iconColor} border-2 border-white dark:border-slate-950 shadow-xs`}>
                                    {ev.type === 'toss' ? "🪙" : ev.type === 'bat' ? "🏏" : ev.type === 'bowl' ? "🎯" : ev.type === 'milestone' ? "🏆" : "📢"}
                                </div>
                                <div className="flex flex-col">
                                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 tracking-tight">{ev.title}</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">{ev.desc}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

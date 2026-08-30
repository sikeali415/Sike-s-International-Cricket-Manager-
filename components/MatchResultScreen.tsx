import React, { useState } from 'react';
import { MatchResult, Inning } from '../types';

interface MatchHighlightsProps {
    result: MatchResult;
    userTeamId: string;
}

export const MatchHighlights: React.FC<MatchHighlightsProps> = ({ result, userTeamId }) => {
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

            {/* Match Editorial Summary */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-slate-100 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col gap-2 relative overflow-hidden">
                <div className="flex justify-between items-center z-10 pb-2 border-b border-slate-800">
                    <h3 className="text-xs font-black uppercase tracking-widest text-teal-400">Match Review & Summary</h3>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Official Report</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed z-10">
                    {result.summary}
                </p>
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

interface ScorecardDisplayProps {
    inning: Inning;
    inningNumber: number;
}

const ScorecardDisplay: React.FC<ScorecardDisplayProps> = ({ inning, inningNumber }) => {
    const getBallsFromOvers = (overs: string) => {
        const parts = overs.split('.');
        const oversN = parseInt(parts[0], 10) || 0;
        const ballsN = parseInt(parts[1] || '0', 10);
        return (oversN * 6) + ballsN;
    };

    // Fix: Strictly preserve walk-out order by sorting by battingPosition if available, or using original array order.
    // We sort a copy to avoid mutating props.
    const sortedBatting = React.useMemo(() => {
        return [...inning.batting].sort((a, b) => {
            const posA = a.battingPosition ?? 999;
            const posB = b.battingPosition ?? 999;
            return posA - posB;
        });
    }, [inning.batting]);

    return (
        <div className="mb-4">
            <div className="flex justify-between items-baseline bg-gray-200 dark:bg-gray-800 p-2 rounded-t-lg">
                <h3 className="text-lg font-bold">{inning.teamName} <span className="text-sm font-normal">({inningNumber <= 2 ? `${inningNumber === 1 ? '1st' : '2nd'}` : `${inningNumber === 3 ? '3rd' : '4th'}`} Innings)</span></h3>
                <p className="font-mono text-xl">{inning.score} / {inning.wickets} <span className="text-sm">({inning.overs})</span></p>
            </div>
            <div className="bg-white dark:bg-gray-800/50 p-2 rounded-b-lg text-xs">
                <h4 className="font-semibold mb-1">Batting</h4>
                <table className="w-full">
                    <thead className="text-gray-500">
                        <tr className="border-b dark:border-gray-700">
                            <th className="text-left font-normal py-1">Batter</th>
                            <th className="text-left font-normal w-1/3">Dismissal</th>
                            <th className="text-right font-normal">R</th>
                            <th className="text-right font-normal">B</th>
                            <th className="text-right font-normal">SR</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedBatting.map(p => (
                            <tr key={p.playerId} className="border-b border-gray-100 dark:border-gray-700/50">
                                <td className="py-1 font-semibold">{p.playerName}</td>
                                <td className="text-gray-500 dark:text-gray-400">{p.dismissalText}</td>
                                <td className="text-right font-bold">{p.runs}</td>
                                <td className="text-right">{p.balls}</td>
                                <td className="text-right">{p.balls > 0 ? ((p.runs / p.balls) * 100).toFixed(0) : 0}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <h4 className="font-semibold mt-3 mb-1">Bowling</h4>
                <table className="w-full">
                     <thead className="text-gray-500">
                        <tr className="border-b dark:border-gray-700">
                            <th className="text-left font-normal py-1">Bowler</th>
                            <th className="text-right font-normal">O</th>
                            <th className="text-right font-normal">M</th>
                            <th className="text-right font-normal">R</th>
                            <th className="text-right font-normal">W</th>
                            <th className="text-right font-normal">Econ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {inning.bowling.map(p => (
                            <tr key={p.playerId} className="border-b border-gray-100 dark:border-gray-700/50">
                                <td className="py-1 font-semibold">{p.playerName}</td>
                                <td className="text-right">{p.overs}</td>
                                <td className="text-right">{p.maidens}</td>
                                <td className="text-right">{p.runsConceded}</td>
                                <td className="text-right font-bold">{p.wickets}</td>
                                <td className="text-right">{getBallsFromOvers(p.overs) > 0 ? ((p.runsConceded / getBallsFromOvers(p.overs)) * 6).toFixed(2) : "0.00"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

interface MatchResultScreenProps {
    result: MatchResult | null;
    onBack: () => void;
    userTeamId: string;
}

const MatchResultScreen: React.FC<MatchResultScreenProps> = ({ result, onBack, userTeamId }) => {
    const [view, setView] = useState<'highlights' | 'summary' | 'scorecard'>('highlights');
    
    if (!result) return <div className="p-4">No match result found. <button onClick={onBack}>Go Back</button></div>;
    const { firstInning, secondInning, thirdInning, fourthInning, summary, manOfTheMatch } = result;

    return (
        <div className="p-2 h-[calc(100vh-90px)] flex flex-col">
             <div className="text-center bg-gray-100 dark:bg-gray-800 p-3 rounded-lg mb-2">
                <h2 className="text-xl font-bold">{summary}</h2>
                <p className="text-sm text-yellow-600 dark:text-yellow-400">Man of the Match: {manOfTheMatch.playerName} ({manOfTheMatch.summary})</p>
             </div>
             
             <div className="flex justify-center border-b border-gray-300 dark:border-gray-700 mb-2 overflow-x-auto gap-1">
                <button onClick={() => setView('highlights')} className={`px-4 py-2 font-semibold text-xs uppercase tracking-wider ${view === 'highlights' ? 'border-b-2 border-teal-500 text-teal-600 dark:text-teal-400 font-extrabold' : 'text-slate-500 hover:text-slate-700'}`}>🎬 Highlights</button>
                <button onClick={() => setView('summary')} className={`px-4 py-2 font-semibold text-xs uppercase tracking-wider ${view === 'summary' ? 'border-b-2 border-teal-500 text-teal-600 dark:text-teal-400 font-extrabold' : 'text-slate-500 hover:text-slate-700'}`}>Summary</button>
                <button onClick={() => setView('scorecard')} className={`px-4 py-2 font-semibold text-xs uppercase tracking-wider ${view === 'scorecard' ? 'border-b-2 border-teal-500 text-teal-600 dark:text-teal-400 font-extrabold' : 'text-slate-500 hover:text-slate-700'}`}>Scorecard</button>
            </div>
             <div className="flex-grow overflow-y-auto pr-1">
                 {view === 'highlights' && (
                     <MatchHighlights result={result} userTeamId={userTeamId} />
                 )}
                 {view === 'summary' && (
                     <div>
                        {[firstInning, secondInning, thirdInning, fourthInning].filter(Boolean).map((inning, idx) => (
                             <div key={idx} className="mb-4">
                                <div className="flex justify-between items-baseline bg-gray-200 dark:bg-gray-800 p-2 rounded-t-lg">
                                    <h3 className={`text-lg font-bold ${inning!.teamId === userTeamId ? 'text-teal-500' : ''}`}>{inning!.teamName}</h3>
                                    <p className="font-mono text-xl">{inning!.score} / {inning!.wickets} <span className="text-sm">({inning!.overs})</span></p>
                                </div>
                                <div className="bg-white dark:bg-gray-800/50 p-2 rounded-b-lg">
                                    <h4 className="font-semibold text-sm mb-1">Top Performers</h4>
                                    {inning!.batting.length > 0 && [...inning!.batting].sort((a,b) => b.runs - a.runs).slice(0,2).map(b => <p key={b.playerId} className="text-xs">{b.playerName} {b.runs}{b.isOut ? '' : '*'}({b.balls})</p>)}
                                    {inning!.bowling.length > 0 && [...inning!.bowling].sort((a,b) => b.wickets - a.wickets).slice(0,1).map(b => <p key={b.playerId} className="text-xs">{b.playerName} {b.wickets} / {b.runsConceded}</p>)}
                                </div>
                            </div>
                        ))}
                     </div>
                 )}
                 {view === 'scorecard' && (
                     <div>
                        <ScorecardDisplay inning={firstInning} inningNumber={1} />
                        {secondInning && <ScorecardDisplay inning={secondInning} inningNumber={2} />}
                        {thirdInning && <ScorecardDisplay inning={thirdInning} inningNumber={3} />}
                        {fourthInning && <ScorecardDisplay inning={fourthInning} inningNumber={4} />}
                     </div>
                 )}
             </div>
             <button onClick={onBack} className="w-full mt-2 bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-lg">Continue</button>
        </div>
    )
};

export default MatchResultScreen;
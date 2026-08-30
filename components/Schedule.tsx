import React, { useState, useEffect, useMemo } from 'react';
import { GameData, Team, MatchResult, Format, Match, WorldLeagueMatch, WorldLeagueTeam } from '../types';
import { Category, getFormatsForCategory, getCategoryForFormat, resolveMatch, getMatchRainImpact, restartTournament } from '../utils';
import { initializeWorldLeague, resolveWorldLeagueMatch, updateWorldLeagueWithResult, WORLD_CITY_LOGOS } from '../utils/worldLeague';
import { getYearTournamentConfig, getCycleYear, getCycleNumber } from '../utils/fourYearCalendar';
import { useSimulation } from '../hooks/useSimulation';
import { CategoryTabs, FormatDropdown } from './SharedUI';
import { ConfirmModal } from './ConfirmModal';
import { Swords, ShieldAlert, BarChart3, CloudRain, Trophy, Users, X, Sparkles, TrendingUp, RotateCcw, Globe, Calendar as CalendarIcon } from 'lucide-react';
import { playSFX } from '../utils/soundManager';

interface ScheduleProps {
    gameData: GameData;
    setGameData?: React.Dispatch<React.SetStateAction<GameData | null>>;
    showFeedback?: (msg: string, type?: 'success' | 'error') => void;
    userTeam: Team | null;
    viewMatchResult: (result: MatchResult) => void;
    handleSimulateMatch?: () => void;
    handleSimulateFormat?: (f?: Format) => void;
    handleSimulateSeason?: () => void;
    handleTakeMeToMyMatch?: () => void;
    handlePlayMatch?: () => void;
    onNavigateToCalendar?: () => void;
    onNavigateToSeriesManager?: () => void;
}

interface PreMatchModalProps {
    match: Match | WorldLeagueMatch;
    resolved: Match | WorldLeagueMatch;
    format: Format;
    gameData: GameData;
    onClose: () => void;
}

const PreMatchModal: React.FC<PreMatchModalProps> = ({ match, resolved, format, gameData, onClose }) => {
    const isWorldLeague = format === Format.WLT20;
    
    // Look up teams
    const teamA = isWorldLeague
        ? gameData.worldLeague?.teams.find(t => t.name.toLowerCase() === resolved.teamA.toLowerCase())
        : gameData.teams.find(t => t.name.toLowerCase() === resolved.teamA.toLowerCase());

    const teamB = isWorldLeague
        ? gameData.worldLeague?.teams.find(t => t.name.toLowerCase() === resolved.teamB.toLowerCase())
        : gameData.teams.find(t => t.name.toLowerCase() === resolved.teamB.toLowerCase());

    const standings = isWorldLeague
        ? (gameData.worldLeague?.standings || [])
        : (gameData.standings[format] || []);

    const standingA = standings.find(s => s.teamName.toLowerCase() === resolved.teamA.toLowerCase());
    const standingB = standings.find(s => s.teamName.toLowerCase() === resolved.teamB.toLowerCase());

    const teamAData = gameData.allTeamsData?.find(t => t.name.toLowerCase() === resolved.teamA.toLowerCase());
    const ground = teamAData ? gameData.grounds?.find(g => g.code === teamAData.homeGround) : gameData.grounds?.[0];

    const rainImpact = getMatchRainImpact(match.matchNumber, format, gameData.currentSeason);

    // Calculate team ratings
    const getAvgSkill = (t?: Team | WorldLeagueTeam) => {
        if (!t || !t.squad || t.squad.length === 0) return { bat: 75, bowl: 75 };
        const bat = Math.round(t.squad.reduce((acc, p) => acc + p.battingSkill, 0) / t.squad.length);
        const bowl = Math.round(t.squad.reduce((acc, p) => acc + p.secondarySkill, 0) / t.squad.length);
        return { bat, bowl };
    };

    const ratingA = getAvgSkill(teamA);
    const ratingB = getAvgSkill(teamB);

    // Key players
    const keyPlayerA = teamA?.squad?.slice().sort((a,b) => b.battingSkill - a.battingSkill)[0];
    const keyPlayerB = teamB?.squad?.slice().sort((a,b) => b.battingSkill - a.battingSkill)[0];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 animate-fadeIn">
            <div className="w-full max-w-lg bg-slate-900 border border-teal-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-100">
                {/* Header */}
                <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-cyan-950 border-b border-teal-500/30 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Swords className="w-5 h-5 text-teal-400" />
                        <h3 className="font-extrabold text-base tracking-wide text-white uppercase">Pre-Match Intelligence</h3>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
                    {/* Match Versus Card */}
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-2">
                        <div className="flex-1 text-center">
                            <p className="font-extrabold text-sm text-teal-400 truncate">{resolved.teamA}</p>
                            <span className="text-[10px] text-slate-400 font-mono">
                                Pos: #{standingA ? standings.indexOf(standingA as any) + 1 : '-'} ({standingA?.points || 0} pts)
                            </span>
                        </div>
                        <div className="px-2 py-1 bg-teal-500/20 text-teal-300 rounded font-black text-xs uppercase border border-teal-500/30">
                            VS
                        </div>
                        <div className="flex-1 text-center">
                            <p className="font-extrabold text-sm text-cyan-400 truncate">{resolved.teamB}</p>
                            <span className="text-[10px] text-slate-400 font-mono">
                                Pos: #{standingB ? standings.indexOf(standingB as any) + 1 : '-'} ({standingB?.points || 0} pts)
                            </span>
                        </div>
                    </div>

                    {/* Ground & Weather Info */}
                    <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between text-slate-300">
                            <span className="font-semibold flex items-center gap-1.5 text-teal-300">
                                <Trophy className="w-3.5 h-3.5" />
                                Venue: {ground?.name || (isWorldLeague ? `${resolved.teamA} International Arena` : 'Central Stadium')}
                            </span>
                            <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-200">
                                {ground?.pitch || 'Balanced Sporting Pitch'}
                            </span>
                        </div>
                        
                        <div className="flex items-center justify-between pt-1 border-t border-slate-700/50">
                            <span className="flex items-center gap-1.5 text-cyan-300 font-medium">
                                <CloudRain className="w-3.5 h-3.5" />
                                Weather Forecast:
                            </span>
                            <span className={`font-bold px-2 py-0.5 rounded ${
                                rainImpact?.willRain 
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}>
                                {rainImpact?.willRain ? `☔ ${rainImpact.rainProb}% Rain Risk (DLS Active)` : '☀️ Clear Sky (0% Rain)'}
                            </span>
                        </div>
                    </div>

                    {/* Team Strength Comparison */}
                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-3">
                        <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[10px] flex items-center gap-1">
                            <BarChart3 className="w-3.5 h-3.5 text-teal-400" />
                            Squad Skill Index
                        </h4>

                        {/* Batting Rating */}
                        <div>
                            <div className="flex justify-between text-[11px] font-semibold mb-1">
                                <span>{resolved.teamA} ({ratingA.bat})</span>
                                <span className="text-slate-400">Avg Batting Skill</span>
                                <span>{resolved.teamB} ({ratingB.bat})</span>
                            </div>
                            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                                <div className="bg-teal-500 h-full" style={{ width: `${(ratingA.bat / Math.max(1, ratingA.bat + ratingB.bat)) * 100}%` }}></div>
                                <div className="bg-cyan-500 h-full" style={{ width: `${(ratingB.bat / Math.max(1, ratingA.bat + ratingB.bat)) * 100}%` }}></div>
                            </div>
                        </div>

                        {/* Bowling Rating */}
                        <div>
                            <div className="flex justify-between text-[11px] font-semibold mb-1">
                                <span>{resolved.teamA} ({ratingA.bowl})</span>
                                <span className="text-slate-400">Avg Bowling Skill</span>
                                <span>{resolved.teamB} ({ratingB.bowl})</span>
                            </div>
                            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                                <div className="bg-teal-500 h-full" style={{ width: `${(ratingA.bowl / Math.max(1, ratingA.bowl + ratingB.bowl)) * 100}%` }}></div>
                                <div className="bg-cyan-500 h-full" style={{ width: `${(ratingB.bowl / Math.max(1, ratingA.bowl + ratingB.bowl)) * 100}%` }}></div>
                            </div>
                        </div>
                    </div>

                    {/* Key Players to Watch */}
                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-2">
                        <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[10px] flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                            Key Players to Watch
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                            {keyPlayerA && (
                                <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg">
                                    <span className="text-[9px] text-teal-400 font-bold block">{resolved.teamA}</span>
                                    <p className="font-extrabold text-white text-xs truncate">{keyPlayerA.name}</p>
                                    <span className="text-[10px] text-slate-400">Skill: {keyPlayerA.battingSkill} | {keyPlayerA.role}</span>
                                </div>
                            )}
                            {keyPlayerB && (
                                <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg">
                                    <span className="text-[9px] text-cyan-400 font-bold block">{resolved.teamB}</span>
                                    <p className="font-extrabold text-white text-xs truncate">{keyPlayerB.name}</p>
                                    <span className="text-[10px] text-slate-400">Skill: {keyPlayerB.battingSkill} | {keyPlayerB.role}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-3 bg-slate-950 border-t border-slate-800">
                    <button onClick={onClose} className="w-full py-2.5 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider transition-all">
                        Close Preview
                    </button>
                </div>
            </div>
        </div>
    );
};

const MatchItem: React.FC<{
    match: Match;
    resolved: Match;
    result?: MatchResult;
    isUserMatch: boolean;
    isNextMatch: boolean;
    userTeamName?: string;
    onViewResult: (result: MatchResult) => void;
    onOpenPreMatch: () => void;
}> = ({ match, resolved, result, isUserMatch, isNextMatch, userTeamName, onViewResult, onOpenPreMatch }) => (
    <div className={`p-3 rounded-lg shadow-md transition-all ${result ? 'bg-white dark:bg-gray-800/50' : 'bg-gray-200 dark:bg-gray-700/40'} ${isNextMatch ? 'ring-2 ring-teal-500' : ''}`}>
        <div className="flex justify-between items-center text-xs mb-1 text-gray-500 dark:text-gray-400">
            <span className="font-medium">Match {match.matchNumber}</span>
            <span>{match.date}</span>
        </div>
        <div className="text-center font-semibold text-lg py-1">
            <span className={isUserMatch && resolved.teamA === userTeamName ? 'text-teal-500 dark:text-teal-400 font-bold' : ''}>{resolved.teamA}</span>
            <span className="mx-3 text-gray-400 text-sm font-normal">vs</span>
            <span className={isUserMatch && resolved.teamB === userTeamName ? 'text-teal-500 dark:text-teal-400 font-bold' : ''}>{resolved.teamB}</span>
        </div>
        {result ? (
            <div className="text-center text-sm mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <p className="font-medium text-blue-600 dark:text-blue-400 mb-2">{result.summary}</p>
                <button 
                    onClick={() => onViewResult(result)}
                    className="bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 px-4 py-1.5 text-xs font-bold rounded-full hover:bg-teal-500 hover:text-white transition-all uppercase tracking-wider"
                >
                    View Scorecard &amp; Highlights
                </button>
            </div>
        ) : (
            <div className="text-center text-sm mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
                <button 
                    onClick={onOpenPreMatch}
                    className="bg-slate-800/80 hover:bg-slate-700 text-teal-400 border border-teal-500/30 px-3 py-1 text-xs font-bold rounded-full transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                >
                    <Swords className="w-3.5 h-3.5" />
                    Pre-Match Stats
                </button>
            </div>
        )}
    </div>
);

const WorldLeagueMatchItem: React.FC<{
    match: WorldLeagueMatch;
    resolved: WorldLeagueMatch;
    isNextMatch: boolean;
    onViewResult: (result: MatchResult) => void;
    onOpenPreMatch: () => void;
}> = ({ match, resolved, isNextMatch, onViewResult, onOpenPreMatch }) => {
    const logoA = WORLD_CITY_LOGOS[resolved.teamA];
    const logoB = WORLD_CITY_LOGOS[resolved.teamB];

    return (
        <div className={`p-3.5 rounded-xl shadow-md border transition-all ${match.result ? 'bg-white dark:bg-gray-800/60 border-slate-700/50' : 'bg-gray-100 dark:bg-slate-900/60 border-slate-800'} ${isNextMatch ? 'ring-2 ring-cyan-400' : ''}`}>
            <div className="flex justify-between items-center text-[10px] mb-1.5 text-slate-400 uppercase tracking-wider font-extrabold">
                <div className="flex items-center gap-1.5">
                    <span className="bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded font-black">{match.stage}</span>
                    {match.group && <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">{match.group}</span>}
                </div>
                <span>{match.date} • {match.matchNumber}</span>
            </div>
            <div className="flex items-center justify-between py-2 px-3 bg-slate-200/50 dark:bg-slate-950/70 rounded-xl">
                <div className="flex items-center gap-2 flex-1">
                    {logoA && <div className="w-6 h-6 shrink-0" dangerouslySetInnerHTML={{ __html: logoA }} />}
                    <span className="font-extrabold text-sm sm:text-base truncate text-slate-900 dark:text-slate-100">{resolved.teamA}</span>
                </div>
                <span className="mx-2 text-xs font-black uppercase text-slate-400">VS</span>
                <div className="flex items-center gap-2 flex-1 justify-end">
                    <span className="font-extrabold text-sm sm:text-base truncate text-slate-900 dark:text-slate-100 text-right">{resolved.teamB}</span>
                    {logoB && <div className="w-6 h-6 shrink-0" dangerouslySetInnerHTML={{ __html: logoB }} />}
                </div>
            </div>
            {match.result ? (
                <div className="text-center text-xs mt-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <p className="font-bold text-cyan-600 dark:text-cyan-400 mb-2 italic">{match.result.summary}</p>
                    <button 
                        onClick={() => onViewResult(match.result!)}
                        className="bg-cyan-500/20 hover:bg-cyan-500 hover:text-slate-950 text-cyan-400 px-4 py-1.5 text-xs font-black rounded-full uppercase tracking-wider transition-all"
                    >
                        View Scorecard &amp; Highlights
                    </button>
                </div>
            ) : (
                <div className="text-center text-xs mt-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <button 
                        onClick={onOpenPreMatch}
                        className="bg-slate-800/80 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 px-3 py-1 text-xs font-bold rounded-full transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                    >
                        <Swords className="w-3.5 h-3.5" />
                        Pre-Match Intelligence
                    </button>
                </div>
            )}
        </div>
    );
};

const Schedule: React.FC<ScheduleProps> = ({ 
    gameData, 
    setGameData, 
    showFeedback, 
    userTeam, 
    viewMatchResult, 
    handleSimulateMatch, 
    handleSimulateFormat, 
    handleSimulateSeason, 
    handleTakeMeToMyMatch,
    handlePlayMatch,
    onNavigateToCalendar,
    onNavigateToSeriesManager
}) => {
    const [category, setCategory] = useState<Category>(getCategoryForFormat(gameData.currentFormat));
    const [selectedFormat, setSelectedFormat] = useState<Format>(gameData.currentFormat);
    const [selectedPreMatch, setSelectedPreMatch] = useState<{ match: any; resolved: any } | null>(null);
    const [selectedWlGroup, setSelectedWlGroup] = useState<'ALL' | 'Group A' | 'Group B' | 'Group C' | 'Group D'>('ALL');
    const [selectedWlStage, setSelectedWlStage] = useState<'ALL' | 'Group Stage' | 'Quarter-Finals' | 'Semi-Finals' | 'Final'>('ALL');

    const { runSimulationForCurrentFormat } = useSimulation(gameData, setGameData || (() => {}));

    useEffect(() => {
        setCategory(getCategoryForFormat(gameData.currentFormat));
        setSelectedFormat(gameData.currentFormat);
    }, [gameData.currentFormat]);

    useEffect(() => {
        const formats = getFormatsForCategory(category);
        if (!formats.includes(selectedFormat)) {
            setSelectedFormat(formats[0]);
        }
    }, [category]);

    const isWorldLeague = selectedFormat === Format.WLT20;

    // Load or initialize World League state
    const wlState = useMemo(() => {
        if (!isWorldLeague) return null;
        if (gameData.worldLeague && gameData.worldLeague.teams && gameData.worldLeague.teams.length > 0) {
            return gameData.worldLeague;
        }
        return initializeWorldLeague(gameData);
    }, [gameData, isWorldLeague]);

    const schedule = gameData.schedule[selectedFormat] || [];

    const [showConfirmRestart, setShowConfirmRestart] = useState(false);

    const handleRestartCurrentTournament = () => {
        if (!setGameData) return;
        playSFX('click');
        setShowConfirmRestart(true);
    };

    const confirmRestart = () => {
        if (!setGameData) return;
        setShowConfirmRestart(false);
        if (isWorldLeague) {
            const freshWl = initializeWorldLeague(gameData);
            setGameData(prev => prev ? { ...prev, worldLeague: freshWl } : null);
            playSFX('success');
            if (showFeedback) showFeedback(`World League tournament restarted successfully!`, 'success');
            return;
        }
        const updated = restartTournament(gameData, selectedFormat);
        setGameData(updated);
        playSFX('success');
        if (showFeedback) showFeedback(`${selectedFormat} tournament restarted successfully!`, 'success');
    };

    // World League Simulation Handlers
    const handleSimulateWorldLeagueSingleMatch = () => {
        if (!setGameData || !wlState) return;
        const currentMatch = wlState.matches[wlState.currentMatchIndex];
        if (!currentMatch) {
            if (showFeedback) showFeedback('World League tournament already completed!', 'success');
            return;
        }
        const resolved = resolveWorldLeagueMatch(currentMatch, wlState);
        if (resolved.teamA.includes('Winner') || resolved.teamB.includes('Winner') || resolved.teamA.includes('1st') || resolved.teamB.includes('1st') || resolved.teamA.includes('2nd') || resolved.teamB.includes('2nd')) {
            if (showFeedback) showFeedback('Knockout teams not determined yet. Complete prior stage matches.', 'error');
            return;
        }

        try {
            const dummyMatch = {
                matchNumber: resolved.matchNumber,
                teamA: resolved.teamA,
                teamB: resolved.teamB,
                vs: 'vs',
                date: resolved.date,
                group: 'Round-Robin' as const
            };

            const effectiveGameData = { ...gameData, currentFormat: 'World League' as any, worldLeague: wlState };
            const result = runSimulationForCurrentFormat(dummyMatch, effectiveGameData);

            const updatedWl = updateWorldLeagueWithResult(wlState, wlState.currentMatchIndex, result);
            setGameData(prev => prev ? { ...prev, worldLeague: updatedWl } : null);
            playSFX('success');
            if (showFeedback) showFeedback(`Match simulated: ${result.summary}`, 'success');
        } catch (e) {
            console.error('World league sim error:', e);
            if (showFeedback) showFeedback('Error during simulation', 'error');
        }
    };

    const handleSimulateWorldLeagueAllMatches = () => {
        if (!setGameData || !wlState) return;
        let currentState = { ...wlState };
        let count = 0;

        while (currentState.status !== 'completed' && currentState.currentMatchIndex < currentState.matches.length) {
            const currentMatch = currentState.matches[currentState.currentMatchIndex];
            const resolved = resolveWorldLeagueMatch(currentMatch, currentState);
            if (resolved.teamA.includes('Winner') || resolved.teamB.includes('Winner') || resolved.teamA.includes('1st') || resolved.teamB.includes('1st') || resolved.teamA.includes('2nd') || resolved.teamB.includes('2nd')) {
                break;
            }

            const dummyMatch = {
                matchNumber: resolved.matchNumber,
                teamA: resolved.teamA,
                teamB: resolved.teamB,
                vs: 'vs',
                date: resolved.date,
                group: 'Round-Robin' as const
            };

            const effectiveGameData = { ...gameData, currentFormat: 'World League' as any, worldLeague: currentState };
            const result = runSimulationForCurrentFormat(dummyMatch, effectiveGameData);

            currentState = updateWorldLeagueWithResult(currentState, currentState.currentMatchIndex, result);
            count++;
        }

        setGameData(prev => prev ? { ...prev, worldLeague: currentState } : null);
        playSFX('success');
        if (showFeedback) showFeedback(`Simulated ${count} World League matches!`, 'success');
    };

    // Filter World League matches
    const filteredWlMatches = useMemo(() => {
        if (!wlState) return [];
        return wlState.matches.filter(m => {
            if (selectedWlStage !== 'ALL' && m.stage !== selectedWlStage) return false;
            if (selectedWlGroup !== 'ALL' && m.group && m.group !== selectedWlGroup) return false;
            return true;
        });
    }, [wlState, selectedWlStage, selectedWlGroup]);

    return (
        <div className="p-4 flex flex-col h-full relative">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                <div>
                    <h2 className="text-xl font-extrabold tracking-tight">Fixtures &amp; Schedule</h2>
                    <p className="text-xs text-slate-400">Match calendar, simulations, and live tactical intelligence</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {onNavigateToCalendar && (
                        <button
                            onClick={onNavigateToCalendar}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/10 hover:bg-teal-500 text-teal-400 hover:text-slate-950 border border-teal-500/30 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm"
                        >
                            <CalendarIcon size={14} />
                            <span>Month Calendar</span>
                        </button>
                    )}
                    {onNavigateToSeriesManager && (
                        <button
                            onClick={onNavigateToSeriesManager}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-slate-950 border border-cyan-500/30 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm"
                        >
                            <Swords size={14} />
                            <span>Series Manager</span>
                        </button>
                    )}
                    {setGameData && (
                        <button
                            onClick={handleRestartCurrentTournament}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-600 dark:text-amber-400 hover:text-slate-950 border border-amber-500/30 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm"
                            title="Restart this tournament"
                        >
                            <RotateCcw size={12} />
                            <span>Restart Tournament</span>
                        </button>
                    )}
                </div>
            </div>
            
            <CategoryTabs category={category} setCategory={setCategory} />
            <FormatDropdown category={category} selectedFormat={selectedFormat} setSelectedFormat={setSelectedFormat} />

            {/* World League Filters */}
            {isWorldLeague ? (
                <div className="space-y-2 my-2">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Stage:</span>
                        {(['ALL', 'Group Stage', 'Quarter-Finals', 'Semi-Finals', 'Final'] as const).map(stg => (
                            <button
                                key={stg}
                                onClick={() => setSelectedWlStage(stg)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase whitespace-nowrap transition-all ${selectedWlStage === stg ? 'bg-cyan-500 text-slate-950 shadow-md' : 'bg-slate-800 text-slate-300 hover:text-white'}`}
                            >
                                {stg}
                            </button>
                        ))}
                    </div>
                    {selectedWlStage === 'ALL' || selectedWlStage === 'Group Stage' ? (
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Group:</span>
                            {(['ALL', 'Group A', 'Group B', 'Group C', 'Group D'] as const).map(grp => (
                                <button
                                    key={grp}
                                    onClick={() => setSelectedWlGroup(grp)}
                                    className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase whitespace-nowrap transition-all ${selectedWlGroup === grp ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'bg-slate-900 text-slate-400 hover:text-slate-200'}`}
                                >
                                    {grp}
                                </button>
                            ))}
                        </div>
                    ) : null}
                </div>
            ) : (
                /* Season Calendar Window & 4-Year Cycle Banner */
                (() => {
                    const isInternational = [Format.T20, Format.ODI, Format.SHIELD].includes(selectedFormat);
                    const cycleYear = getCycleYear(gameData.currentSeason);
                    const cycleNum = getCycleNumber(gameData.currentSeason);
                    const tourney = getYearTournamentConfig(gameData.currentSeason);

                    return (
                        <div className="my-2 p-3 rounded-xl bg-slate-900/90 border border-teal-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2.5">
                                <span className="text-xl">📅</span>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-extrabold text-teal-400 uppercase tracking-wider">
                                            {selectedFormat} Season {gameData.currentSeason}
                                        </span>
                                        {isInternational && (
                                            <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-md text-[10px] font-bold">
                                                Cycle {cycleNum} • Year {cycleYear}/4
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[11px] text-slate-300 font-medium">
                                        {isInternational ? (
                                            <>Annual Pinnacle Tournament (Month 3 - March): <strong className="text-amber-300">{tourney.badge}</strong> in {tourney.hostCountry}</>
                                        ) : (
                                            gameData.currentSeason % 2 !== 0 ? (
                                                selectedFormat === Format.T20 ? '8 May – 15 June' :
                                                selectedFormat === Format.ODI ? '25 June – 30 July' : '3 August – 30 September'
                                            ) : (
                                                selectedFormat === Format.T20 ? '6 November – 15 December' :
                                                selectedFormat === Format.ODI ? '25 December – 1 February' : '5 February – 30 March'
                                            )
                                        )}
                                    </span>
                                </div>
                            </div>
                            <span className="text-[10px] bg-teal-950 text-teal-300 font-bold px-2 py-1 rounded-md border border-teal-500/20 uppercase font-mono self-start sm:self-auto">
                                {isInternational ? `Year ${cycleYear} Tourney: ${tourney.shortName}` : (gameData.currentSeason % 2 !== 0 ? 'Odd Season Schedule' : 'Even Season Schedule')}
                            </span>
                        </div>
                    );
                })()
            )}

            {/* Simulation Action Toolbar */}
            <div className="my-2.5 space-y-2">
                {handleTakeMeToMyMatch && !isWorldLeague && (
                    <button 
                        onClick={handleTakeMeToMyMatch}
                        className="w-full bg-gradient-to-r from-cyan-600 via-teal-600 to-cyan-600 hover:from-cyan-500 hover:to-teal-500 text-white font-black py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-[0.98] border border-cyan-400/30 uppercase tracking-wider"
                        title="Fast-forward intervening AI matches and jump directly to your next game"
                    >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>⚡ Take Me to My Match (Simulate Period)</span>
                    </button>
                )}

                <div className="grid grid-cols-3 gap-2">
                    {isWorldLeague ? (
                        <>
                            <button 
                                onClick={handleSimulateWorldLeagueSingleMatch}
                                className="bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-slate-950 border border-cyan-500/30 font-bold py-1.5 px-2 rounded-lg text-xs flex items-center justify-center gap-1 transition-all active:scale-95"
                            >
                                <span>⚡ Sim WL Match</span>
                            </button>
                            <button 
                                onClick={handleSimulateWorldLeagueAllMatches}
                                className="bg-teal-500/10 hover:bg-teal-500 text-teal-400 hover:text-slate-950 border border-teal-500/30 font-bold py-1.5 px-2 rounded-lg text-xs flex items-center justify-center gap-1 transition-all active:scale-95"
                            >
                                <span>🏆 Sim All WL</span>
                            </button>
                            {handleSimulateSeason && (
                                <button 
                                    onClick={handleSimulateSeason}
                                    className="bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 border border-amber-500/30 font-bold py-1.5 px-2 rounded-lg text-xs flex items-center justify-center gap-1 transition-all active:scale-95"
                                >
                                    <span>🌟 Sim Season</span>
                                </button>
                            )}
                        </>
                    ) : (
                        <>
                            {handleSimulateMatch && (
                                <button 
                                    onClick={handleSimulateMatch}
                                    className="bg-teal-500/10 hover:bg-teal-500 text-teal-400 hover:text-slate-950 border border-teal-500/30 font-bold py-1.5 px-2 rounded-lg text-xs flex items-center justify-center gap-1 transition-all active:scale-95"
                                >
                                    <span>⚡ Sim 1 Match</span>
                                </button>
                            )}
                            {handleSimulateFormat && (
                                <button 
                                    onClick={() => handleSimulateFormat(selectedFormat)}
                                    className="bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-slate-950 border border-cyan-500/30 font-bold py-1.5 px-2 rounded-lg text-xs flex items-center justify-center gap-1 transition-all active:scale-95"
                                >
                                    <span>🏆 Sim Format</span>
                                </button>
                            )}
                            {handleSimulateSeason && (
                                <button 
                                    onClick={handleSimulateSeason}
                                    className="bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 border border-amber-500/30 font-bold py-1.5 px-2 rounded-lg text-xs flex items-center justify-center gap-1 transition-all active:scale-95"
                                >
                                    <span>🌟 Sim Season</span>
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
                {isWorldLeague ? (
                    filteredWlMatches.map((match, index) => {
                        const resolved = wlState ? resolveWorldLeagueMatch(match, wlState) : match;
                        const isNextMatch = wlState?.currentMatchIndex === wlState?.matches.findIndex(m => m.id === match.id);

                        return (
                            <WorldLeagueMatchItem
                                key={match.id || index}
                                match={match}
                                resolved={resolved}
                                isNextMatch={isNextMatch}
                                onViewResult={viewMatchResult}
                                onOpenPreMatch={() => setSelectedPreMatch({ match, resolved })}
                            />
                        );
                    })
                ) : (
                    schedule.map((match, index) => {
                        const resolved = resolveMatch(match, gameData, selectedFormat);
                        const result = gameData.matchResults[selectedFormat]?.find(r => String(r.matchNumber) === String(match.matchNumber));
                        const isUserMatch = !!userTeam && (resolved.teamA === userTeam.name || resolved.teamB === userTeam.name);
                        const isNextMatch = selectedFormat === gameData.currentFormat && index === gameData.currentMatchIndex[selectedFormat];
                        
                        return (
                            <MatchItem 
                                key={`${selectedFormat}-${match.matchNumber}-${index}`}
                                match={match}
                                resolved={resolved}
                                result={result}
                                isUserMatch={isUserMatch}
                                isNextMatch={isNextMatch}
                                userTeamName={userTeam?.name}
                                onViewResult={viewMatchResult}
                                onOpenPreMatch={() => setSelectedPreMatch({ match, resolved })}
                            />
                        );
                    })
                )}

                {((isWorldLeague && filteredWlMatches.length === 0) || (!isWorldLeague && schedule.length === 0)) && (
                    <div className="text-center py-10 text-gray-500">
                        No matches scheduled for this format.
                    </div>
                )}
            </div>

            {selectedPreMatch && (
                <PreMatchModal 
                    match={selectedPreMatch.match}
                    resolved={selectedPreMatch.resolved}
                    format={selectedFormat}
                    gameData={gameData}
                    onClose={() => setSelectedPreMatch(null)}
                />
            )}

            <ConfirmModal 
                isOpen={showConfirmRestart}
                title={`Restart ${isWorldLeague ? 'World League' : selectedFormat}?`}
                message={`This will reset all match fixtures, results, and league standings for ${isWorldLeague ? 'World League' : selectedFormat} back to Match Day 1.`}
                confirmText="Restart Tournament"
                icon="restart"
                onConfirm={confirmRestart}
                onCancel={() => setShowConfirmRestart(false)}
            />
        </div>
    );
};

export default Schedule;

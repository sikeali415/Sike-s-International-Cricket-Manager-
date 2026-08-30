import React, { useState, useEffect, useMemo } from 'react';
import { GameData, Format, Standing, Match, WorldLeagueStanding, WorldLeagueMatch, CurrentYearStanding } from '../types';
import { Category, getFormatsForCategory, getCategoryForFormat, resolveMatch, restartTournament } from '../utils';
import { initializeWorldLeague, resolveWorldLeagueMatch, WORLD_CITY_LOGOS } from '../utils/worldLeague';
import { recalculateCurrentYearStandings } from '../utils/currentYearStandings';
import { CategoryTabs, FormatDropdown } from './SharedUI';
import { ConfirmModal } from './ConfirmModal';
import { RotateCcw, Globe, ShieldCheck, Trophy, Sparkles, Filter, Calendar, Award, Info, Zap } from 'lucide-react';
import { playSFX } from '../utils/soundManager';

interface StandingsProps {
    gameData: GameData;
    setGameData?: React.Dispatch<React.SetStateAction<GameData | null>>;
    showFeedback?: (msg: string, type?: 'success' | 'error') => void;
    onViewResult?: (result: any) => void;
}

const StandingRow: React.FC<{ standing: Standing; index: number; isFirstClass: boolean }> = ({ standing, index, isFirstClass }) => (
    <tr className={`border-b dark:border-gray-700/50 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/30 ${index < 4 ? 'bg-teal-500/5' : ''}`}>
        <td className="p-3 font-semibold whitespace-nowrap">
            <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-4">{index + 1}</span>
                <span className="truncate max-w-[130px] sm:max-w-none">{standing.teamName}</span>
            </div>
        </td>
        <td className="p-3 text-center whitespace-nowrap">{standing.played}</td>
        <td className="p-3 text-center whitespace-nowrap">{standing.won}</td>
        <td className="p-3 text-center whitespace-nowrap">{standing.lost}</td>
        {isFirstClass && <td className="p-3 text-center whitespace-nowrap">{standing.drawn}</td>}
        <td className="p-3 text-center font-bold text-teal-600 dark:text-teal-400 whitespace-nowrap">{standing.points}</td>
        <td className="p-3 text-center font-mono text-xs whitespace-nowrap">{standing.netRunRate > 0 ? `+${standing.netRunRate.toFixed(2)}` : standing.netRunRate.toFixed(2)}</td>
    </tr>
);

const WorldLeagueStandingRow: React.FC<{ standing: WorldLeagueStanding; index: number }> = ({ standing, index }) => {
    const isQualified = index < 2;
    const logoSvg = WORLD_CITY_LOGOS[standing.teamName];

    return (
        <tr className={`border-b dark:border-gray-700/50 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/30 ${isQualified ? 'bg-cyan-500/5' : ''}`}>
            <td className="p-3 font-semibold whitespace-nowrap">
                <div className="flex items-center gap-2.5">
                    <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${isQualified ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'text-gray-400'}`}>
                        {index + 1}
                    </span>
                    {logoSvg ? (
                        <div className="w-5 h-5 shrink-0" dangerouslySetInnerHTML={{ __html: logoSvg }} />
                    ) : (
                        <Globe size={16} className="text-cyan-400 shrink-0" />
                    )}
                    <div>
                        <span className="truncate font-bold text-sm text-slate-900 dark:text-slate-100">{standing.teamName}</span>
                        {isQualified && (
                            <span className="ml-2 text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-extrabold uppercase">
                                QF Qualified
                            </span>
                        )}
                    </div>
                </div>
            </td>
            <td className="p-3 text-center font-semibold whitespace-nowrap">{standing.played}</td>
            <td className="p-3 text-center text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap">{standing.won}</td>
            <td className="p-3 text-center text-rose-500 font-semibold whitespace-nowrap">{standing.lost}</td>
            <td className="p-3 text-center font-black text-cyan-600 dark:text-cyan-400 whitespace-nowrap">{standing.points}</td>
            <td className="p-3 text-center font-mono text-xs whitespace-nowrap">{standing.netRunRate > 0 ? `+${standing.netRunRate.toFixed(2)}` : standing.netRunRate.toFixed(2)}</td>
        </tr>
    );
};

const FixtureItem: React.FC<{ match: Match; resolved: Match; result?: any; onViewResult?: (result: any) => void }> = ({ match, resolved, result, onViewResult }) => (
    <div className={`p-3 rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm ${result ? 'bg-white dark:bg-gray-800/40' : 'bg-gray-50 dark:bg-gray-900/20'}`}>
        <div className="flex justify-between items-center text-[10px] mb-1 text-gray-400 uppercase tracking-wider font-bold">
            <span>Match {match.matchNumber}</span>
            <span>{match.date}</span>
        </div>
        <div className="text-center font-medium text-sm py-1">
            <span>{resolved.teamA}</span>
            <span className="mx-2 text-[10px] text-gray-400 font-normal italic">vs</span>
            <span>{resolved.teamB}</span>
        </div>
        {result && (
            <div className="text-center text-[11px] mt-1 pt-1 border-t border-gray-200/50 dark:border-gray-700/50">
                <p className="text-blue-500 dark:text-blue-400 font-semibold italic mb-1">{result.summary}</p>
                {onViewResult && (
                    <button 
                        onClick={() => onViewResult(result)}
                        className="text-[10px] bg-teal-500/20 hover:bg-teal-500 hover:text-white text-teal-400 px-3 py-0.5 rounded-full font-bold uppercase transition-all"
                    >
                        View Scorecard
                    </button>
                )}
            </div>
        )}
    </div>
);

const WorldLeagueFixtureItem: React.FC<{ match: WorldLeagueMatch; resolved: WorldLeagueMatch; onViewResult?: (result: any) => void }> = ({ match, resolved, onViewResult }) => {
    const logoA = WORLD_CITY_LOGOS[resolved.teamA];
    const logoB = WORLD_CITY_LOGOS[resolved.teamB];

    return (
        <div className={`p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm transition-all ${match.result ? 'bg-white dark:bg-gray-800/60' : 'bg-gray-50 dark:bg-gray-900/40'}`}>
            <div className="flex justify-between items-center text-[10px] mb-1.5 text-gray-400 uppercase tracking-wider font-extrabold">
                <div className="flex items-center gap-1.5">
                    <span className="bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded text-[9px] font-black">{match.stage}</span>
                    {match.group && <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[9px]">{match.group}</span>}
                </div>
                <span>{match.date} • {match.matchNumber}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 px-2 bg-slate-100 dark:bg-slate-950/60 rounded-lg">
                <div className="flex items-center gap-2 flex-1">
                    {logoA && <div className="w-5 h-5 shrink-0" dangerouslySetInnerHTML={{ __html: logoA }} />}
                    <span className="font-bold text-sm truncate text-slate-900 dark:text-slate-100">{resolved.teamA}</span>
                </div>
                <span className="mx-2 text-xs text-gray-400 font-bold uppercase">vs</span>
                <div className="flex items-center gap-2 flex-1 justify-end">
                    <span className="font-bold text-sm truncate text-slate-900 dark:text-slate-100 text-right">{resolved.teamB}</span>
                    {logoB && <div className="w-5 h-5 shrink-0" dangerouslySetInnerHTML={{ __html: logoB }} />}
                </div>
            </div>
            {match.result && (
                <div className="text-center text-[11px] mt-2 pt-1.5 border-t border-gray-200/50 dark:border-gray-700/50">
                    <p className="text-cyan-600 dark:text-cyan-400 font-bold italic mb-1.5">{match.result.summary}</p>
                    {onViewResult && (
                        <button 
                            onClick={() => onViewResult(match.result)}
                            className="text-[10px] bg-cyan-500/20 hover:bg-cyan-500 hover:text-slate-950 text-cyan-400 px-3 py-1 rounded-full font-black uppercase tracking-wider transition-all"
                        >
                            View Scorecard
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

const Standings: React.FC<StandingsProps> = ({ gameData, setGameData, showFeedback, onViewResult }) => {
    const [standingsMode, setStandingsMode] = useState<'CURRENT_YEAR' | 'DOMESTIC_TOURNAMENTS'>('CURRENT_YEAR');
    const [currentYearFormatFilter, setCurrentYearFormatFilter] = useState<'ALL' | 'Test' | 'ODI' | 'T20'>('ALL');

    const [category, setCategory] = useState<Category>(getCategoryForFormat(gameData.currentFormat));
    const [selectedFormat, setSelectedFormat] = useState<Format>(gameData.currentFormat);
    const [view, setView] = useState<'standings' | 'fixtures'>('standings');
    const [selectedWlGroup, setSelectedWlGroup] = useState<'ALL' | 'Group A' | 'Group B' | 'Group C' | 'Group D'>('ALL');
    const [selectedWlStage, setSelectedWlStage] = useState<'ALL' | 'Group Stage' | 'Quarter-Finals' | 'Semi-Finals' | 'Final'>('ALL');

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

    const standings = gameData.standings[selectedFormat] || [];
    const schedule = gameData.schedule[selectedFormat] || [];
    const isFirstClass = selectedFormat === Format.SHIELD;

    const [showConfirmRestart, setShowConfirmRestart] = useState(false);

    // Current Year Standings calculation
    const currentYearStandingsList = useMemo(() => {
        return recalculateCurrentYearStandings(gameData);
    }, [gameData]);

    const currentInGameYear = gameData.gameDate?.year ?? 1;

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

    const wlGroups: ('Group A' | 'Group B' | 'Group C' | 'Group D')[] = ['Group A', 'Group B', 'Group C', 'Group D'];
    const activeWlGroups = selectedWlGroup === 'ALL' ? wlGroups : [selectedWlGroup];

    const filteredWlMatches = useMemo(() => {
        if (!wlState) return [];
        return wlState.matches.filter(m => {
            if (selectedWlStage !== 'ALL' && m.stage !== selectedWlStage) return false;
            if (selectedWlGroup !== 'ALL' && m.group && m.group !== selectedWlGroup) return false;
            return true;
        });
    }, [wlState, selectedWlStage, selectedWlGroup]);

    return (
        <div className="p-4 flex flex-col h-full overflow-hidden">
            {/* Top Bar Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-100">Standings &amp; Tournaments</h2>
                    <p className="text-xs text-slate-400">
                        {standingsMode === 'CURRENT_YEAR' 
                            ? `Current In-Game Year ${currentInGameYear} International Bilateral Series Standings` 
                            : 'All domestic formats: The 6ixty, T20, ODI Championship, Shield & World League'}
                    </p>
                </div>

                {/* Top Level Mode Selector */}
                <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800 self-stretch sm:self-auto">
                    <button
                        onClick={() => setStandingsMode('CURRENT_YEAR')}
                        className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            standingsMode === 'CURRENT_YEAR'
                                ? 'bg-cyan-600 text-white shadow-md'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <Calendar size={13} />
                        <span>Year {currentInGameYear} Standings</span>
                    </button>
                    <button
                        onClick={() => setStandingsMode('DOMESTIC_TOURNAMENTS')}
                        className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            standingsMode === 'DOMESTIC_TOURNAMENTS'
                                ? 'bg-cyan-600 text-white shadow-md'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <Trophy size={13} />
                        <span>League Formats</span>
                    </button>
                </div>
            </div>

            {/* ======================= CURRENT YEAR STANDINGS VIEW (SECTION 7) ======================= */}
            {standingsMode === 'CURRENT_YEAR' ? (
                <div className="flex-1 flex flex-col min-h-0 space-y-3">
                    {/* Filter & Reset Notice Banner */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-lg">
                                <Award className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                                    Annual International Series Standings — Year {currentInGameYear}
                                    <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full font-bold border border-emerald-500/30">
                                        Win = 2 pts • Draw = 1 pt • Loss = 0 pts
                                    </span>
                                </h3>
                                <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                    <Info className="w-3.5 h-3.5 text-cyan-400" />
                                    Standings reset to zero at the start of every in-game year (Month 1). Major tournaments do not count towards these standings.
                                </p>
                            </div>
                        </div>

                        {/* Format Filters */}
                        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 self-start md:self-auto">
                            {(['ALL', 'Test', 'ODI', 'T20'] as const).map(fmt => (
                                <button
                                    key={fmt}
                                    onClick={() => setCurrentYearFormatFilter(fmt)}
                                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                                        currentYearFormatFilter === fmt
                                            ? 'bg-cyan-600 text-white shadow-sm'
                                            : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    {fmt === 'ALL' ? 'All Formats' : (fmt === 'Test' ? 'Test Series' : (fmt === 'ODI' ? 'ODI Series' : 'T20I Series'))}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Standings Table */}
                    <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl shadow-lg overflow-hidden flex flex-col">
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="bg-slate-950/90 text-slate-400 text-xs font-mono uppercase tracking-wider border-b border-slate-800">
                                        <th className="py-3 px-4 text-center w-14">Rank</th>
                                        <th className="py-3 px-4">Nation / Team</th>
                                        <th className="py-3 px-3 text-center text-cyan-400 font-bold">Series P</th>
                                        <th className="py-3 px-3 text-center text-emerald-400 font-bold">Series W</th>
                                        <th className="py-3 px-3 text-center text-rose-400 font-bold">Series L</th>
                                        <th className="py-3 px-3 text-center text-amber-400 font-bold">Series D</th>
                                        <th className="py-3 px-3 text-center text-slate-400">Matches (W-L-D)</th>
                                        <th className="py-3 px-4 text-right pr-6 font-bold text-cyan-400">Total Points</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                    {currentYearStandingsList.map((standing, idx) => {
                                        const isUserTeam = standing.teamId === gameData.userTeamId;
                                        const isTop3 = idx < 3;

                                        // Format filtered values if filter is active
                                        let sP = standing.seriesPlayed;
                                        let sW = standing.seriesWon;
                                        let sL = standing.seriesLost;
                                        let sD = standing.seriesDrawn;
                                        let pts = standing.points;
                                        let mP = standing.matchesPlayed;
                                        let mW = standing.matchesWon;
                                        let mL = standing.matchesLost;
                                        let mD = standing.matchesTiedOrDrawn;

                                        if (currentYearFormatFilter !== 'ALL' && standing.byFormat) {
                                            const fmtData = standing.byFormat[currentYearFormatFilter];
                                            if (fmtData) {
                                                sP = fmtData.seriesPlayed;
                                                sW = fmtData.seriesWon;
                                                sL = fmtData.seriesLost;
                                                sD = fmtData.seriesDrawn;
                                                pts = fmtData.points;
                                                mP = fmtData.matchesPlayed;
                                                mW = fmtData.matchesWon;
                                                mL = fmtData.matchesLost;
                                                mD = (fmtData as any).matchesDrawn || (fmtData as any).matchesTied || 0;
                                            }
                                        }

                                        return (
                                            <tr
                                                key={standing.teamId}
                                                className={`hover:bg-slate-800/40 transition-colors ${
                                                    isUserTeam ? 'bg-cyan-950/30' : (isTop3 ? 'bg-slate-800/20' : '')
                                                }`}
                                            >
                                                <td className="py-3 px-4 text-center font-mono">
                                                    <div className="flex items-center justify-center">
                                                        {idx === 0 ? (
                                                            <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center font-bold text-xs">
                                                                1
                                                            </span>
                                                        ) : (
                                                            <span className={`text-xs font-bold ${isTop3 ? 'text-slate-200' : 'text-slate-400'}`}>
                                                                {idx + 1}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-100">
                                                            {standing.teamName}
                                                        </span>
                                                        {isUserTeam && (
                                                            <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-[10px] font-bold rounded border border-cyan-500/30">
                                                                USER
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="py-3 px-3 text-center font-mono font-semibold text-slate-200">
                                                    {sP}
                                                </td>

                                                <td className="py-3 px-3 text-center font-mono font-bold text-emerald-400">
                                                    {sW}
                                                </td>

                                                <td className="py-3 px-3 text-center font-mono font-semibold text-rose-400">
                                                    {sL}
                                                </td>

                                                <td className="py-3 px-3 text-center font-mono font-semibold text-amber-400">
                                                    {sD}
                                                </td>

                                                <td className="py-3 px-3 text-center font-mono text-xs text-slate-300">
                                                    {mP > 0 ? `${mW}W - ${mL}L - ${mD}D` : '—'}
                                                </td>

                                                <td className="py-3 px-4 text-right pr-6 font-mono font-black text-base text-cyan-400">
                                                    {pts}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                /* ======================= DOMESTIC LEAGUES VIEW ======================= */
                <>
                    <div className="flex justify-between items-center mb-3">
                        <CategoryTabs category={category} setCategory={setCategory} />
                        {setGameData && (
                            <button
                                onClick={handleRestartCurrentTournament}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-600 dark:text-amber-400 hover:text-slate-950 border border-amber-500/30 rounded-lg text-xs font-bold transition-all active:scale-95 shadow-sm"
                                title="Restart this tournament"
                            >
                                <RotateCcw size={13} />
                                <span>Restart Tournament</span>
                            </button>
                        )}
                    </div>

                    <FormatDropdown category={category} selectedFormat={selectedFormat} setSelectedFormat={setSelectedFormat} />

                    {/* View Switcher: Standings vs Fixtures */}
                    <div className="flex justify-center mb-3 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg self-center">
                        <button 
                            onClick={() => setView('standings')} 
                            className={`px-6 py-1.5 text-xs font-bold rounded-md transition-all ${view === 'standings' ? 'bg-white dark:bg-gray-700 shadow-sm text-teal-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            Standings
                        </button>
                        <button 
                            onClick={() => setView('fixtures')} 
                            className={`px-6 py-1.5 text-xs font-bold rounded-md transition-all ${view === 'fixtures' ? 'bg-white dark:bg-gray-700 shadow-sm text-teal-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            Fixtures &amp; Results
                        </button>
                    </div>

                    {/* World League Filters */}
                    {isWorldLeague && view === 'standings' && (
                        <div className="flex items-center justify-center gap-1.5 mb-3 overflow-x-auto pb-1">
                            <button
                                onClick={() => setSelectedWlGroup('ALL')}
                                className={`px-3 py-1 rounded-lg text-xs font-black uppercase transition-all ${selectedWlGroup === 'ALL' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'bg-slate-800 text-slate-300 hover:text-white'}`}
                            >
                                All Groups
                            </button>
                            {wlGroups.map(grp => (
                                <button
                                    key={grp}
                                    onClick={() => setSelectedWlGroup(grp)}
                                    className={`px-3 py-1 rounded-lg text-xs font-black uppercase transition-all ${selectedWlGroup === grp ? 'bg-cyan-500 text-slate-950 shadow-md' : 'bg-slate-800 text-slate-300 hover:text-white'}`}
                                >
                                    {grp}
                                </button>
                            ))}
                        </div>
                    )}

                    {isWorldLeague && view === 'fixtures' && (
                        <div className="flex items-center justify-center gap-1.5 mb-3 overflow-x-auto pb-1">
                            {(['ALL', 'Group Stage', 'Quarter-Finals', 'Semi-Finals', 'Final'] as const).map(stg => (
                                <button
                                    key={stg}
                                    onClick={() => setSelectedWlStage(stg)}
                                    className={`px-3 py-1 rounded-lg text-xs font-black uppercase whitespace-nowrap transition-all ${selectedWlStage === stg ? 'bg-cyan-500 text-slate-950 shadow-md' : 'bg-slate-800 text-slate-300 hover:text-white'}`}
                                >
                                    {stg}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
                        {isWorldLeague ? (
                            view === 'standings' ? (
                                <div className="space-y-6">
                                    {activeWlGroups.map(groupName => {
                                        const groupStandings = (wlState?.standings || [])
                                            .filter(s => s.group === groupName)
                                            .sort((a, b) => b.points !== a.points ? b.points - a.points : b.netRunRate - a.netRunRate);

                                        return (
                                            <div key={groupName} className="bg-white dark:bg-gray-800/30 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                                                <div className="bg-slate-900 px-4 py-2.5 border-b border-gray-800 flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Trophy size={14} className="text-cyan-400" />
                                                        <h3 className="font-black text-sm uppercase text-white tracking-wider">{groupName} Table</h3>
                                                    </div>
                                                    <span className="text-[10px] text-cyan-300 font-bold bg-cyan-950/80 border border-cyan-500/30 px-2 py-0.5 rounded">
                                                        Top 2 Advance to QF
                                                    </span>
                                                </div>
                                                <div className="overflow-x-auto w-full">
                                                    <table className="w-full text-left text-sm">
                                                        <thead className="bg-gray-50 dark:bg-gray-800/50">
                                                            <tr>
                                                                <th className="p-3 font-bold text-xs uppercase tracking-wider text-gray-500">City Franchise</th>
                                                                <th className="p-3 text-center font-bold text-xs uppercase tracking-wider text-gray-500">P</th>
                                                                <th className="p-3 text-center font-bold text-xs uppercase tracking-wider text-gray-500">W</th>
                                                                <th className="p-3 text-center font-bold text-xs uppercase tracking-wider text-gray-500">L</th>
                                                                <th className="p-3 text-center font-bold text-xs uppercase tracking-wider text-gray-500">Pts</th>
                                                                <th className="p-3 text-center font-bold text-xs uppercase tracking-wider text-gray-500">NRR</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {groupStandings.map((s, index) => (
                                                                <WorldLeagueStandingRow key={s.teamId} standing={s} index={index} />
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {filteredWlMatches.map((match, index) => (
                                        <WorldLeagueFixtureItem 
                                            key={match.id || index}
                                            match={match}
                                            resolved={wlState ? resolveWorldLeagueMatch(match, wlState) : match}
                                            onViewResult={onViewResult}
                                        />
                                    ))}
                                    {filteredWlMatches.length === 0 && (
                                        <div className="text-center py-10 text-gray-500 text-sm">
                                            No World League fixtures found for this filter.
                                        </div>
                                    )}
                                </div>
                            )
                        ) : (
                            view === 'standings' ? (
                                <div className="bg-white dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-800 overflow-x-auto w-full shadow-sm">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 dark:bg-gray-800/50">
                                            <tr>
                                                <th className="p-3 font-bold text-xs uppercase tracking-wider text-gray-500">Team</th>
                                                <th className="p-3 text-center font-bold text-xs uppercase tracking-wider text-gray-500">P</th>
                                                <th className="p-3 text-center font-bold text-xs uppercase tracking-wider text-gray-500">W</th>
                                                <th className="p-3 text-center font-bold text-xs uppercase tracking-wider text-gray-500">L</th>
                                                {isFirstClass && <th className="p-3 text-center font-bold text-xs uppercase tracking-wider text-gray-500">D</th>}
                                                <th className="p-3 text-center font-bold text-xs uppercase tracking-wider text-gray-500">Pts</th>
                                                <th className="p-3 text-center font-bold text-xs uppercase tracking-wider text-gray-500">NRR</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {standings.map((s, index) => (
                                                <StandingRow key={s.teamId} standing={s} index={index} isFirstClass={isFirstClass} />
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {schedule.map((match, index) => (
                                        <FixtureItem 
                                            key={`${selectedFormat}-fixture-${index}`}
                                            match={match}
                                            resolved={resolveMatch(match, gameData, selectedFormat)}
                                            result={gameData.matchResults[selectedFormat]?.find(r => String(r.matchNumber) === String(match.matchNumber))}
                                            onViewResult={onViewResult}
                                        />
                                    ))}
                                </div>
                            )
                        )}
                    </div>

                    <ConfirmModal 
                        isOpen={showConfirmRestart}
                        title={`Restart ${isWorldLeague ? 'World League' : selectedFormat}?`}
                        message={`This will reset all match fixtures, results, and league standings for ${isWorldLeague ? 'World League' : selectedFormat} back to Match Day 1.`}
                        confirmText="Restart Tournament"
                        icon="restart"
                        onConfirm={confirmRestart}
                        onCancel={() => setShowConfirmRestart(false)}
                    />
                </>
            )}
        </div>
    );
};

export default Standings;

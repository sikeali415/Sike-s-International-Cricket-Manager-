
import React, { useState } from 'react';
import { GameData, Team, CareerScreen, Format, NewsArticle } from '../types';
import { Icons } from './Icons';
import { SPONSOR_THRESHOLDS, TOURNAMENT_LOGOS } from '../data';
import { RotateCcw, Trophy, RadioTower, Award, Newspaper, Target, Calendar, Swords, Clock, Globe2, Users, ArrowRightLeft, ShieldCheck, ChevronRight, Play, Zap, Flame, Sparkles, Sliders, Crown, Database } from 'lucide-react';
import { restartTournament } from '../utils';
import { formatFullGameDate, formatGameDate, MONTH_THEMES } from '../utils/gameCalendar';
import { playSFX } from '../utils/soundManager';
import { ConfirmModal } from './ConfirmModal';

interface DashboardProps {
    gameData: GameData;
    setGameData?: React.Dispatch<React.SetStateAction<GameData | null>>;
    showFeedback?: (msg: string, type?: 'success' | 'error') => void;
    userTeam: Team | null;
    setScreen: (screen: CareerScreen) => void;
    handlePlayMatch: () => void;
    handleForwardDay: () => void;
    handleTakeMeToMyMatch?: () => void;
    handleSimulateMatch?: () => void;
    handleSimulateFormat?: (f?: Format) => void;
    handleSimulateSeason?: () => void;
    handleFormatChange?: (f: Format) => void;
    optimizeAllSquads: () => void;
    onOpenSquadModal?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
    gameData, 
    setGameData, 
    showFeedback, 
    userTeam, 
    setScreen, 
    handlePlayMatch, 
    handleForwardDay, 
    handleTakeMeToMyMatch,
    handleSimulateMatch,
    handleSimulateFormat,
    handleSimulateSeason,
    handleFormatChange,
    optimizeAllSquads,
    onOpenSquadModal
}) => {
    const [showConfirmRestart, setShowConfirmRestart] = useState(false);
    const currentSchedule = gameData.schedule[gameData.currentFormat] || [];
    const matchIndex = gameData.currentMatchIndex[gameData.currentFormat] || 0;
    const sponsorship = gameData.sponsorships?.[gameData.currentFormat];

    if (matchIndex >= currentSchedule.length) {
        return (
            <div className="p-6 text-center h-full flex flex-col items-center justify-center gap-4 bg-slate-950 text-white">
                <Trophy size={56} className="text-amber-400 animate-bounce" />
                <h3 className="text-2xl font-black uppercase tracking-tight">{gameData.currentFormat} Campaign Concluded!</h3>
                <p className="text-sm text-slate-300 max-w-xs leading-relaxed">
                    All matches for this tournament format have been completed. You can restart this tournament or transition to the next event.
                </p>
                {setGameData && (
                    <button
                        onClick={() => {
                            playSFX('click');
                            setShowConfirmRestart(true);
                        }}
                        className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all text-sm uppercase tracking-wide"
                    >
                        <RotateCcw size={18} />
                        <span>Restart Tournament</span>
                    </button>
                )}

                <ConfirmModal 
                    isOpen={showConfirmRestart}
                    title={`Restart ${gameData.currentFormat}?`}
                    message={`This will reset all match fixtures, results, and league standings for ${gameData.currentFormat} back to Match Day 1.`}
                    confirmText="Restart Tournament"
                    icon="restart"
                    onConfirm={() => {
                        setShowConfirmRestart(false);
                        const updated = restartTournament(gameData, gameData.currentFormat);
                        setGameData(updated);
                        playSFX('success');
                        if (showFeedback) showFeedback(`${gameData.currentFormat} tournament restarted!`, 'success');
                    }}
                    onCancel={() => setShowConfirmRestart(false)}
                />
            </div>
        );
    }

    let nextMatch = currentSchedule[matchIndex] ? { ...currentSchedule[matchIndex] } : { id: 'm-default', group: 'Round-Robin', teamA: 'TBD', teamB: 'TBD', matchNumber: '1', date: 'Day 1' };
    if (nextMatch.group !== 'Round-Robin') {
        const standings = gameData.standings?.[gameData.currentFormat] || [];
        const getTeamName = (pos: number) => standings.length >= pos ? standings[pos - 1]?.teamName : `TBD ${pos}`;
        const resolvePlaceholder = (placeholder: string) => {
            if (['1st', '2nd', '3rd', '4th'].includes(placeholder)) {
                return getTeamName(parseInt(placeholder[0], 10));
            }
            if (placeholder.startsWith('SF')) {
                const sfMatchNumber = placeholder.split(' ')[0];
                const formatResults = gameData.matchResults?.[gameData.currentFormat] || [];
                const sfResult = formatResults.find(r => r.matchNumber === sfMatchNumber);
                if (sfResult?.winnerId) {
                    return gameData.teams.find(t => t.id === sfResult.winnerId)?.name || 'TBD';
                }
                return `Winner of ${sfMatchNumber}`;
            }
            return placeholder;
        };
        nextMatch.teamA = resolvePlaceholder(nextMatch.teamA);
        nextMatch.teamB = resolvePlaceholder(nextMatch.teamB);
    }

    const isUserMatch = userTeam ? (
        nextMatch.teamA.trim().toLowerCase() === userTeam.name.trim().toLowerCase() || 
        nextMatch.teamB.trim().toLowerCase() === userTeam.name.trim().toLowerCase()
    ) : false;
    
    const teamAData = gameData.allTeamsData.find(t => t.name === nextMatch.teamA);
    const homeGround = teamAData ? gameData.grounds.find(g => g.code === teamAData.homeGround) : null;

    // Recent news / inbox feed items (take top 3)
    const recentNews = (gameData.news || []).slice(0, 3);

    // Trophy summary
    const worldCups = userTeam?.trophies?.worldCupsWon || 0;
    const t20WorldCups = userTeam?.trophies?.t20WorldCupsWon || 0;
    const championsTrophies = userTeam?.trophies?.championsTrophiesWon || 0;
    const wtcTitles = userTeam?.trophies?.wtcTitlesWon || 0;
    const totalTrophies = worldCups + t20WorldCups + championsTrophies + wtcTitles;

    return (
        <div className="p-3.5 sm:p-5 max-w-4xl mx-auto space-y-4 relative pb-20">
            {/* Top Bar: In-Game Date & Season Window */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-teal-950 border border-teal-500/30 p-3.5 rounded-2xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-teal-500/10 border border-teal-500/30 rounded-xl text-teal-400 font-bold flex items-center justify-center">
                        <Clock className="w-5 h-5 text-teal-400 animate-pulse" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-teal-400">
                                In-Game Calendar
                            </span>
                            <span className="text-[9px] bg-teal-950 text-teal-300 font-bold px-1.5 py-0.5 rounded border border-teal-500/30">
                                Season {gameData.currentSeason}
                            </span>
                            {gameData.gameDate?.month === 3 && (
                                <span className="text-[9px] bg-amber-500/20 text-amber-300 font-black px-2 py-0.5 rounded border border-amber-500/40">
                                    👑 MAJOR TOURNAMENT MONTH
                                </span>
                            )}
                        </div>
                        <p className="text-sm sm:text-base font-extrabold text-white mt-0.5">
                            {formatFullGameDate(gameData.gameDate || { year: gameData.currentSeason || 1, month: 1, day: 1 })}
                        </p>
                        <p className="text-[11px] text-slate-400">
                            {MONTH_THEMES[gameData.gameDate?.month || 1]?.title || 'Season Window'}: {MONTH_THEMES[gameData.gameDate?.month || 1]?.subtitle || ''}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-1 sm:pt-0">
                    <button 
                        onClick={optimizeAllSquads}
                        className="px-3 py-1.5 bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
                        title="Auto-Optimize Playing XIs"
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Auto-Optimize</span>
                    </button>
                    <button
                        onClick={() => setScreen('CALENDAR')}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
                    >
                        <Calendar className="w-3.5 h-3.5 text-teal-400" />
                        <span>Calendar</span>
                    </button>
                </div>
            </div>

            {/* Prominent Next Match Card (Central Focus) */}
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl p-5 shadow-2xl border-2 border-teal-500/50 relative overflow-hidden space-y-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black tracking-widest text-teal-400 uppercase bg-teal-500/15 px-3 py-1 rounded-full border border-teal-500/30 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                            Match Day {matchIndex + 1} of {currentSchedule.length}
                        </span>
                        {isUserMatch && (
                            <span className="text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                Your Match
                            </span>
                        )}
                    </div>
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                        {gameData.currentFormat}
                    </span>
                </div>

                {/* Teams Display */}
                <div className="text-center py-2">
                    <div className="flex items-center justify-center gap-3 sm:gap-6">
                        <div className="flex-1 text-right">
                            <span className={`text-lg sm:text-2xl font-black block tracking-tight ${nextMatch.teamA === userTeam?.name ? 'text-teal-400' : 'text-white'}`}>
                                {nextMatch.teamA}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                                {nextMatch.teamA.slice(0, 3).toUpperCase()}
                            </span>
                        </div>

                        <div className="px-3 py-1 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 font-black text-xs sm:text-sm uppercase tracking-widest">
                            VS
                        </div>

                        <div className="flex-1 text-left">
                            <span className={`text-lg sm:text-2xl font-black block tracking-tight ${nextMatch.teamB === userTeam?.name ? 'text-teal-400' : 'text-white'}`}>
                                {nextMatch.teamB}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                                {nextMatch.teamB.slice(0, 3).toUpperCase()}
                            </span>
                        </div>
                    </div>

                    <p className="text-xs text-slate-400 mt-2 font-medium">
                        🏟️ {homeGround?.name || 'Neutral International Stadium'} • <span className="font-mono text-teal-400">{nextMatch.date}</span>
                    </p>
                </div>

                {/* Primary Action Button & Quick Controls */}
                <div className="space-y-2 pt-1">
                    {/* 15-Man Match Squad & Captain selection button */}
                    <button 
                        onClick={() => {
                            playSFX('click');
                            if (onOpenSquadModal) {
                                onOpenSquadModal();
                            } else {
                                setScreen('LINEUPS');
                            }
                        }}
                        className="w-full bg-slate-900 hover:bg-slate-850 border border-teal-500/40 hover:border-teal-400 text-teal-300 font-extrabold py-2.5 px-4 rounded-xl shadow-md flex items-center justify-center space-x-2 transition-all active:scale-[0.98] text-xs uppercase tracking-wider group"
                    >
                        <Crown className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                        <span>Select 15-Man Match Squad &amp; Captain</span>
                    </button>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button 
                            onClick={handlePlayMatch} 
                            className="w-full bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-500 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-black py-3.5 px-4 rounded-xl shadow-xl flex items-center justify-center space-x-2 transition-all active:scale-[0.98] text-sm uppercase tracking-wider group"
                        >
                            <Play className="w-5 h-5 fill-slate-950 group-hover:scale-110 transition-transform" />
                            <span>{isUserMatch ? 'Play Match (Live)' : 'Play / Sim Match'}</span>
                        </button>

                        {(handleTakeMeToMyMatch || handleForwardDay) && (
                            <button 
                                onClick={handleTakeMeToMyMatch || handleForwardDay} 
                                className="w-full bg-gradient-to-r from-cyan-600 via-teal-600 to-cyan-600 hover:from-cyan-500 hover:to-teal-500 text-white font-black py-3.5 px-4 rounded-xl shadow-xl flex items-center justify-center space-x-2 transition-all active:scale-[0.98] text-sm uppercase tracking-wider group border border-cyan-400/30"
                                title="Fast-forward intervening AI matches directly to your next fixture and view summary results"
                            >
                                <Zap className="w-5 h-5 fill-white group-hover:scale-110 transition-transform text-amber-300" />
                                <span>Take Me to My Match</span>
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <button 
                            onClick={handleSimulateMatch || handleForwardDay} 
                            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 font-bold py-2 px-2.5 rounded-lg text-xs flex items-center justify-center space-x-1 transition-all active:scale-95"
                        >
                            <Zap className="w-3.5 h-3.5" />
                            <span>Sim 1 Match</span>
                        </button>
                        {handleSimulateFormat && (
                            <button 
                                onClick={() => handleSimulateFormat(gameData.currentFormat)}
                                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-teal-300 font-bold py-2 px-2.5 rounded-lg text-xs flex items-center justify-center space-x-1 transition-all active:scale-95"
                            >
                                <Trophy className="w-3.5 h-3.5" />
                                <span>Sim Format</span>
                            </button>
                        )}
                        {handleSimulateSeason && (
                            <button 
                                onClick={handleSimulateSeason}
                                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-bold py-2 px-2.5 rounded-lg text-xs flex items-center justify-center space-x-1 transition-all active:scale-95"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Sim Season</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Trophy Cabinet & Manager Honors Shelf */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 shadow-md">
                <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                            {userTeam?.name || 'Manager'} Trophy Cabinet
                        </span>
                    </div>
                    <button 
                        onClick={() => setScreen('AWARDS_RECORDS')}
                        className="text-[11px] font-bold text-teal-400 hover:underline flex items-center gap-0.5"
                    >
                        <span>Awards & Records</span>
                        <ChevronRight className="w-3 h-3" />
                    </button>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-slate-950/70 border border-slate-800/80 p-2 rounded-xl">
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">ODI WC</span>
                        <span className="text-base font-black text-amber-400">{worldCups}</span>
                    </div>
                    <div className="bg-slate-950/70 border border-slate-800/80 p-2 rounded-xl">
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">T20 WC</span>
                        <span className="text-base font-black text-cyan-400">{t20WorldCups}</span>
                    </div>
                    <div className="bg-slate-950/70 border border-slate-800/80 p-2 rounded-xl">
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">CT Trophy</span>
                        <span className="text-base font-black text-emerald-400">{championsTrophies}</span>
                    </div>
                    <div className="bg-slate-950/70 border border-slate-800/80 p-2 rounded-xl">
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">WTC Mace</span>
                        <span className="text-base font-black text-indigo-400">{wtcTitles}</span>
                    </div>
                </div>
            </div>

            {/* Focused Quick-Access Navigation Grid */}
            <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2 px-1">
                    Manager Control Center
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {/* 1. Squad / Lineups */}
                    <button 
                        onClick={() => setScreen('LINEUPS')}
                        className="bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-teal-500/40 p-3 rounded-xl shadow-md flex flex-col items-center justify-center space-y-1 transition-all text-center group active:scale-95"
                    >
                        <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Users className="w-4 h-4" />
                        </div>
                        <span className="font-extrabold text-[11px] text-white">Squad &amp; XI</span>
                        <span className="text-[9px] text-slate-400">Tactics</span>
                    </button>

                    {/* 2. Fixtures & Calendar */}
                    <button 
                        onClick={() => setScreen('SCHEDULE')}
                        className="bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-teal-500/40 p-3 rounded-xl shadow-md flex flex-col items-center justify-center space-y-1 transition-all text-center group active:scale-95"
                    >
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Calendar className="w-4 h-4" />
                        </div>
                        <span className="font-extrabold text-[11px] text-white">Fixtures</span>
                        <span className="text-[9px] text-slate-400">Calendar</span>
                    </button>

                    {/* 3. ICC Rankings */}
                    <button 
                        onClick={() => setScreen('RANKINGS')}
                        className="bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-teal-500/40 p-3 rounded-xl shadow-md flex flex-col items-center justify-center space-y-1 transition-all text-center group active:scale-95"
                    >
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Globe2 className="w-4 h-4" />
                        </div>
                        <span className="font-extrabold text-[11px] text-white">Rankings</span>
                        <span className="text-[9px] text-slate-400">ICC Tables</span>
                    </button>

                    {/* 4. Transfers */}
                    <button 
                        onClick={() => setScreen('TRANSFERS')}
                        className="bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-teal-500/40 p-3 rounded-xl shadow-md flex flex-col items-center justify-center space-y-1 transition-all text-center group active:scale-95"
                    >
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <ArrowRightLeft className="w-4 h-4" />
                        </div>
                        <span className="font-extrabold text-[11px] text-white">Transfers</span>
                        <span className="text-[9px] text-slate-400">Reserves</span>
                    </button>

                    {/* 5. Game Editor */}
                    <button 
                        onClick={() => setScreen('EDITOR')}
                        className="bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/40 p-3 rounded-xl shadow-md flex flex-col items-center justify-center space-y-1 transition-all text-center group active:scale-95"
                    >
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Sliders className="w-4 h-4" />
                        </div>
                        <span className="font-extrabold text-[11px] text-white">Editor</span>
                        <span className="text-[9px] text-slate-400">Customise</span>
                    </button>

                    {/* 6. Select 15 Squad */}
                    <button 
                        onClick={() => {
                            if (onOpenSquadModal) onOpenSquadModal();
                            else setScreen('LINEUPS');
                        }}
                        className="bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 p-3 rounded-xl shadow-md flex flex-col items-center justify-center space-y-1 transition-all text-center group active:scale-95"
                    >
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Crown className="w-4 h-4" />
                        </div>
                        <span className="font-extrabold text-[11px] text-white">15 Squad</span>
                        <span className="text-[9px] text-slate-400">Captains</span>
                    </button>
                </div>
            </div>

            {/* Simple News & Inbox Pulse Feed */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                        <Newspaper className="w-4 h-4 text-teal-400" />
                        <span className="text-xs font-black uppercase tracking-wider text-white">
                            News & Media Pulse
                        </span>
                    </div>
                    <button 
                        onClick={() => setScreen('NEWS')}
                        className="text-[11px] font-bold text-teal-400 hover:underline flex items-center gap-0.5"
                    >
                        <span>View All Feed</span>
                        <ChevronRight className="w-3 h-3" />
                    </button>
                </div>

                <div className="space-y-2">
                    {recentNews.length > 0 ? (
                        recentNews.map((article: NewsArticle, idx: number) => (
                            <div 
                                key={article.id || idx}
                                onClick={() => setScreen('NEWS')}
                                className="bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 p-2.5 rounded-xl cursor-pointer transition-all flex items-start gap-2.5 group"
                            >
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-wider shrink-0 mt-0.5 ${
                                    article.category === 'Tournament & Draft' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                    article.category === 'Record Breaker' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                                    article.category === 'Player Impact' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                                    'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                                }`}>
                                    {article.category || 'News'}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <h5 className="text-xs font-bold text-slate-200 truncate group-hover:text-teal-300 transition-colors">
                                        {article.headline}
                                    </h5>
                                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                                        {article.excerpt || article.content}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-4 text-xs text-slate-500 italic">
                            No recent news alerts recorded. Advance season or simulate matches to generate headlines.
                        </div>
                    )}
                </div>
            </div>

            {/* Secondary Utility Row (Standings, Squad Database, Shot Lab) */}
            <div className="grid grid-cols-3 gap-2">
                <button 
                    onClick={() => setScreen('LEAGUES')} 
                    className="bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 p-2.5 rounded-xl text-center flex flex-col items-center justify-center gap-1 transition-all text-slate-300 hover:text-white"
                >
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span className="text-[11px] font-bold">Standings</span>
                </button>
                <button 
                    onClick={() => setScreen('PLAYER_DATABASE')} 
                    className="bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 p-2.5 rounded-xl text-center flex flex-col items-center justify-center gap-1 transition-all text-slate-300 hover:text-white"
                >
                    <Database className="w-4 h-4 text-cyan-400" />
                    <span className="text-[11px] font-bold">Database</span>
                </button>
                <button 
                    onClick={() => setScreen('SHOT_SELECTION')} 
                    className="bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 p-2.5 rounded-xl text-center flex flex-col items-center justify-center gap-1 transition-all text-slate-300 hover:text-white"
                >
                    <Target className="w-4 h-4 text-teal-400" />
                    <span className="text-[11px] font-bold">Shot Lab</span>
                </button>
            </div>
        </div>
    );
};

export default Dashboard;

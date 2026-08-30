import React, { useState, useMemo } from 'react';
import { GameData, WorldLeagueState, WorldLeagueTeam, CareerScreen, PlayerRole, Player } from '../types';
import { 
    resolveWorldLeagueMatch, 
    updateWorldLeagueWithResult, 
    initializeWorldLeague, 
    WORLD_CITY_LOGOS 
} from '../utils/worldLeague';
import { useSimulation } from '../hooks/useSimulation';
import { 
    Trophy, 
    Award, 
    Sparkles, 
    Play, 
    FastForward, 
    ArrowRight, 
    Globe, 
    Search, 
    Shield, 
    Target, 
    Users, 
    RotateCcw, 
    Eye
} from 'lucide-react';
import { playSFX } from '../utils/soundManager';
import { ConfirmModal } from './ConfirmModal';
import { getRoleFullName, getRoleColor } from '../utils';

interface WorldLeagueScreenProps {
    gameData: GameData;
    setGameData: React.Dispatch<React.SetStateAction<GameData | null>>;
    setScreen: (screen: CareerScreen) => void;
    showFeedback: (msg: string, type?: 'success' | 'error') => void;
    onCompleteWorldLeague?: () => void;
}

export const WorldLeagueScreen: React.FC<WorldLeagueScreenProps> = ({
    gameData,
    setGameData,
    setScreen,
    showFeedback,
    onCompleteWorldLeague
}) => {
    const wlState: WorldLeagueState = useMemo(() => {
        try {
            if (gameData.worldLeague && gameData.worldLeague.teams && gameData.worldLeague.teams.length > 0) {
                return gameData.worldLeague;
            }
            if (gameData.championsLeague && gameData.championsLeague.teams && gameData.championsLeague.teams.length > 0) {
                return gameData.championsLeague;
            }
            return initializeWorldLeague(gameData);
        } catch (e) {
            console.error("Failed to load world league state:", e);
            return initializeWorldLeague(gameData);
        }
    }, [gameData]);

    const [activeTab, setActiveTab] = useState<'fixtures' | 'standings' | 'teams' | 'leaders'>('fixtures');
    const [selectedGroup, setSelectedGroup] = useState<'ALL' | 'Group A' | 'Group B' | 'Group C' | 'Group D' | 'KNOCKOUTS'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [leaderCategory, setLeaderCategory] = useState<'ALL' | 'BAT' | 'BOWL' | 'MVP'>('ALL');
    
    // Squad & Lineup Viewer Modal
    const [showSquadModal, setShowSquadModal] = useState(false);
    const [selectedTeamForView, setSelectedTeamForView] = useState<WorldLeagueTeam | null>(null);
    const [showConfirmReset, setShowConfirmReset] = useState(false);

    const { runSimulationForCurrentFormat } = useSimulation(gameData, setGameData);

    const isComplete = wlState.status === 'completed';
    const currentMatch = wlState.matches[wlState.currentMatchIndex] 
        ? resolveWorldLeagueMatch(wlState.matches[wlState.currentMatchIndex], wlState)
        : null;

    const groupAStandings = wlState.standings.filter(s => s.group === 'Group A').sort((a, b) => b.points !== a.points ? b.points - a.points : b.netRunRate - a.netRunRate);
    const groupBStandings = wlState.standings.filter(s => s.group === 'Group B').sort((a, b) => b.points !== a.points ? b.points - a.points : b.netRunRate - a.netRunRate);
    const groupCStandings = wlState.standings.filter(s => s.group === 'Group C').sort((a, b) => b.points !== a.points ? b.points - a.points : b.netRunRate - a.netRunRate);
    const groupDStandings = wlState.standings.filter(s => s.group === 'Group D').sort((a, b) => b.points !== a.points ? b.points - a.points : b.netRunRate - a.netRunRate);

    // Open Squad & XI Viewer for a City Franchise
    const handleOpenSquadViewer = (team: WorldLeagueTeam) => {
        setSelectedTeamForView(team);
        setShowSquadModal(true);
    };

    // Single Match Simulation
    const handleSimulateSingleMatch = () => {
        if (!currentMatch) return;
        if (currentMatch.teamA.includes('Winner') || currentMatch.teamB.includes('Winner') || currentMatch.teamA.includes('1st') || currentMatch.teamB.includes('1st') || currentMatch.teamA.includes('2nd') || currentMatch.teamB.includes('2nd')) {
            showFeedback('Knockout teams not determined yet. Complete prior stage matches.', 'error');
            return;
        }

        try {
            const dummyMatch = {
                matchNumber: currentMatch.matchNumber,
                teamA: currentMatch.teamA,
                teamB: currentMatch.teamB,
                vs: 'vs',
                date: currentMatch.date,
                group: 'Round-Robin' as const
            };

            const effectiveGameData = { ...gameData, currentFormat: 'World League' as any, worldLeague: wlState };
            const result = runSimulationForCurrentFormat(dummyMatch, effectiveGameData);
            const updatedWL = updateWorldLeagueWithResult(wlState, wlState.currentMatchIndex, result);

            setGameData(prev => prev ? { ...prev, worldLeague: updatedWL, championsLeague: updatedWL } : null);
            playSFX('success');
            showFeedback(`${currentMatch.matchNumber} finished: ${result.summary}`);
        } catch (err: any) {
            console.error("Simulation error in single match:", err);
            showFeedback(`Simulation error: ${err.message || 'Check team squads'}`, 'error');
        }
    };

    // Group Stage Simulation
    const handleSimulateGroupStage = () => {
        try {
            let workingWL = JSON.parse(JSON.stringify(wlState)) as WorldLeagueState;
            let idx = workingWL.currentMatchIndex;
            let playedCount = 0;

            while (idx < workingWL.matches.length) {
                const rawMatch = workingWL.matches[idx];
                if (rawMatch.stage !== 'Group Stage') break;

                const resolved = resolveWorldLeagueMatch(rawMatch, workingWL);
                const dummyMatch = {
                    matchNumber: resolved.matchNumber,
                    teamA: resolved.teamA,
                    teamB: resolved.teamB,
                    vs: 'vs',
                    date: resolved.date,
                    group: 'Round-Robin' as const
                };

                const effectiveGameData = { ...gameData, currentFormat: 'World League' as any, worldLeague: workingWL };
                const result = runSimulationForCurrentFormat(dummyMatch, effectiveGameData);
                workingWL = updateWorldLeagueWithResult(workingWL, idx, result);
                idx++;
                playedCount++;
            }

            setGameData(prev => prev ? { ...prev, worldLeague: workingWL, championsLeague: workingWL } : null);
            playSFX('success');
            showFeedback(`Simulated ${playedCount} Group Stage matches! Quarter-Finals are now set.`, 'success');
        } catch (err: any) {
            console.error("Simulation error in group stage:", err);
            showFeedback(`Simulation error: ${err.message || 'Check squads'}`, 'error');
        }
    };

    // Entire Tournament Simulation
    const handleSimulateAllWL = () => {
        try {
            let workingWL = JSON.parse(JSON.stringify(wlState)) as WorldLeagueState;
            let idx = workingWL.currentMatchIndex;

            while (idx < workingWL.matches.length) {
                const rawMatch = workingWL.matches[idx];
                const resolved = resolveWorldLeagueMatch(rawMatch, workingWL);

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

                const effectiveGameData = { ...gameData, currentFormat: 'World League' as any, worldLeague: workingWL };
                const result = runSimulationForCurrentFormat(dummyMatch, effectiveGameData);
                workingWL = updateWorldLeagueWithResult(workingWL, idx, result);
                idx++;
            }

            setGameData(prev => prev ? { ...prev, worldLeague: workingWL, championsLeague: workingWL } : null);
            playSFX('success');
            showFeedback(`World League completed! Champion: ${workingWL.championTeamName || 'Decided'} 🏆 Player stats updated for the Draft!`, 'success');
        } catch (err: any) {
            console.error("Simulation error in tournament simulation:", err);
            showFeedback(`Simulation error: ${err.message || 'Check squads'}`, 'error');
        }
    };

    // Reset Tournament
    const handleResetTournament = () => {
        const freshWL = initializeWorldLeague(gameData);
        setGameData(prev => prev ? { ...prev, worldLeague: freshWL, championsLeague: freshWL } : null);
        setShowConfirmReset(false);
        playSFX('success');
        showFeedback('World League tournament reset to Match 1!', 'success');
    };

    // Gather all players with stats for the Scouting/Leaderboard tab
    const scoutPlayers = useMemo(() => {
        const list: { player: Player; teamName: string }[] = [];
        wlState.teams.forEach(t => {
            t.squad.forEach(p => {
                list.push({ player: p, teamName: t.name });
            });
        });

        return list.filter(item => {
            if (leaderCategory === 'BAT' && item.player.role !== PlayerRole.BATSMAN && item.player.role !== PlayerRole.WICKET_KEEPER && item.player.role !== PlayerRole.ALL_ROUNDER) return false;
            if (leaderCategory === 'BOWL' && item.player.role !== PlayerRole.FAST_BOWLER && item.player.role !== PlayerRole.SPIN_BOWLER && item.player.role !== PlayerRole.ALL_ROUNDER) return false;
            if (leaderCategory === 'MVP' && (!item.player.worldLeagueStats || item.player.worldLeagueStats.matches === 0)) return false;

            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return item.player.name.toLowerCase().includes(q) || item.teamName.toLowerCase().includes(q) || (item.player.nationality || '').toLowerCase().includes(q);
        }).sort((a, b) => {
            if (leaderCategory === 'BAT') {
                return (b.player.worldLeagueStats?.runs || 0) - (a.player.worldLeagueStats?.runs || 0);
            }
            if (leaderCategory === 'BOWL') {
                return (b.player.worldLeagueStats?.wickets || 0) - (a.player.worldLeagueStats?.wickets || 0);
            }
            const perfA = a.player.worldLeaguePerformance || 50;
            const perfB = b.player.worldLeaguePerformance || 50;
            return perfB - perfA;
        });
    }, [wlState, searchQuery, leaderCategory]);

    return (
        <div className="p-4 md:p-6 bg-slate-950 text-white min-h-screen space-y-6">
            {/* World League Top Header Banner */}
            <div className="relative overflow-hidden bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 p-6 rounded-3xl border border-blue-500/40 shadow-2xl">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <Globe size={180} />
                </div>
                
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-black uppercase text-cyan-400 tracking-widest">
                            <Sparkles size={16} />
                            <span>Global Premier Tournament • 20 City Franchises • 4 Groups</span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white mt-1 flex items-center gap-3">
                            <Globe className="text-cyan-400" size={38} />
                            <span>World League</span>
                            <span className="text-sm px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded-xl border border-cyan-500/40 font-mono">
                                Season {wlState.season}
                            </span>
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
                            An AI vs AI global spectacle. 20 world city franchises battle across 4 groups and knockouts. Observe matches, simulate fixtures, and scout global performers for the upcoming Player Draft!
                        </p>
                    </div>

                    {/* Simulation Action Bar */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        <div className="px-3 py-2 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg border bg-cyan-500/10 border-cyan-500/30 text-cyan-300">
                            <Eye size={15} className="text-cyan-400" />
                            <span>AI vs AI League (Spectator Mode)</span>
                        </div>

                        {!isComplete ? (
                            <>
                                <button
                                    id="btn-sim-wl-single"
                                    onClick={handleSimulateSingleMatch}
                                    className="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
                                >
                                    <Play size={15} />
                                    <span>Play / Sim Match</span>
                                </button>
                                <button
                                    id="btn-sim-wl-groups"
                                    onClick={handleSimulateGroupStage}
                                    className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
                                >
                                    <FastForward size={15} />
                                    <span>Sim Groups</span>
                                </button>
                                <button
                                    id="btn-sim-wl-all"
                                    onClick={handleSimulateAllWL}
                                    className="px-4 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
                                >
                                    <Trophy size={15} />
                                    <span>Sim Tournament</span>
                                </button>
                            </>
                        ) : (
                            <button
                                id="btn-proceed-post-wl"
                                onClick={() => {
                                    if (onCompleteWorldLeague) onCompleteWorldLeague();
                                    else setScreen('SEASON_TRANSITION');
                                }}
                                className="px-5 py-3 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider flex items-center gap-2 shadow-xl animate-pulse active:scale-95 transition-all"
                            >
                                <span>Proceed to Pre-Season Retentions & Draft</span>
                                <ArrowRight size={16} />
                            </button>
                        )}

                        <button
                            onClick={() => setShowConfirmReset(true)}
                            title="Reset World League"
                            className="p-2.5 bg-slate-900 border border-slate-700 hover:border-red-500/50 rounded-2xl text-slate-400 hover:text-red-400 transition-colors"
                        >
                            <RotateCcw size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Champion Celebration Banner when Tournament Complete */}
            {isComplete && wlState.championTeamName && (
                <div className="bg-gradient-to-br from-amber-950/80 via-slate-900 to-indigo-950/80 p-6 rounded-3xl border-2 border-amber-400/60 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300 shadow-inner">
                            <Trophy size={36} className="animate-bounce" />
                        </div>
                        <div>
                            <div className="text-xs font-black uppercase text-amber-400 tracking-wider">World League Champion</div>
                            <h2 className="text-2xl sm:text-3xl font-black text-white">{wlState.championTeamName}</h2>
                            <p className="text-xs text-slate-300 mt-0.5">Defeated {wlState.runnerUpTeamName} in the World Grand Final.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto">
                        {wlState.mvpPlayer && (
                            <div className="bg-slate-900/90 border border-amber-500/40 p-3 rounded-2xl text-center min-w-[150px]">
                                <div className="text-[10px] text-amber-400 font-extrabold uppercase">🏆 Tournament MVP</div>
                                <div className="font-black text-sm text-white mt-1">{wlState.mvpPlayer.playerName}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5 font-mono">{wlState.mvpPlayer.statsSummary}</div>
                            </div>
                        )}
                        {wlState.goldenBat && (
                            <div className="bg-slate-900/90 border border-cyan-500/40 p-3 rounded-2xl text-center min-w-[150px]">
                                <div className="text-[10px] text-cyan-400 font-extrabold uppercase">🏏 Golden Bat</div>
                                <div className="font-black text-sm text-white mt-1">{wlState.goldenBat.playerName}</div>
                                <div className="text-[10px] text-cyan-300 mt-0.5 font-bold">{wlState.goldenBat.runs} Runs • SR {wlState.goldenBat.strikeRate}</div>
                            </div>
                        )}
                        {wlState.goldenBall && (
                            <div className="bg-slate-900/90 border border-emerald-500/40 p-3 rounded-2xl text-center min-w-[150px]">
                                <div className="text-[10px] text-emerald-400 font-extrabold uppercase">⚡ Golden Ball</div>
                                <div className="font-black text-sm text-white mt-1">{wlState.goldenBall.playerName}</div>
                                <div className="text-[10px] text-emerald-300 mt-0.5 font-bold">{wlState.goldenBall.wickets} Wkts • Econ {wlState.goldenBall.economy}</div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-800 space-x-2 overflow-x-auto pb-2">
                {[
                    { id: 'fixtures', label: 'Fixtures & Knockouts', count: wlState.matches.length },
                    { id: 'standings', label: '4-Group Standings & Brackets' },
                    { id: 'teams', label: '20 World City Teams', count: 20 },
                    { id: 'leaders', label: 'Draft Scouting & Leaders', count: scoutPlayers.length }
                ].map(t => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id as any)}
                        className={`px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-2 ${
                            activeTab === t.id
                                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                                : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                    >
                        <span>{t.label}</span>
                        {t.count !== undefined && (
                            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${activeTab === t.id ? 'bg-slate-950/20 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'}`}>
                                {t.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* TAB 1: Fixtures */}
            {activeTab === 'fixtures' && (
                <div className="space-y-4">
                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-2">
                        {[
                            { id: 'ALL', label: 'All Matches' },
                            { id: 'Group A', label: 'Group A' },
                            { id: 'Group B', label: 'Group B' },
                            { id: 'Group C', label: 'Group C' },
                            { id: 'Group D', label: 'Group D' },
                            { id: 'KNOCKOUTS', label: 'Knockout Stage' }
                        ].map(f => (
                            <button
                                key={f.id}
                                onClick={() => setSelectedGroup(f.id as any)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                    selectedGroup === f.id
                                        ? 'bg-slate-800 text-cyan-400 border border-cyan-500/40'
                                        : 'bg-slate-900/40 text-slate-400 hover:text-white border border-transparent'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* Fixture Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {wlState.matches
                            .filter(m => {
                                if (selectedGroup === 'ALL') return true;
                                if (selectedGroup === 'KNOCKOUTS') return m.stage !== 'Group Stage';
                                return m.group === selectedGroup;
                            })
                            .map((m) => {
                                const resolved = resolveWorldLeagueMatch(m, wlState);
                                const isCurrent = m.id === currentMatch?.id;

                                return (
                                    <div
                                        key={m.id}
                                        className={`p-4 rounded-3xl border transition-all ${
                                            isCurrent
                                                ? 'bg-slate-900 border-cyan-500/80 shadow-xl shadow-cyan-500/10 ring-1 ring-cyan-500/50'
                                                : m.result
                                                    ? 'bg-slate-900/40 border-slate-800/80 opacity-90'
                                                    : 'bg-slate-900/70 border-slate-800'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] font-black uppercase text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                                                    {m.matchNumber}
                                                </span>
                                                {m.group && (
                                                    <span className="text-[10px] font-mono text-slate-400">
                                                        {m.group}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-[10px] font-medium text-slate-400">{m.stage}</span>
                                        </div>

                                        <div className="flex items-center justify-between py-2 border-y border-slate-800/80 my-2">
                                            <div className="flex-1 text-left">
                                                <div className="font-black text-sm text-white flex items-center gap-1.5">
                                                    {WORLD_CITY_LOGOS[resolved.teamA] && (
                                                        <div className="w-5 h-5 shrink-0" dangerouslySetInnerHTML={{ __html: WORLD_CITY_LOGOS[resolved.teamA] }} />
                                                    )}
                                                    <span>{resolved.teamA}</span>
                                                </div>
                                                {m.result && (
                                                    <div className="text-xs font-mono text-cyan-300 font-bold mt-0.5">
                                                        {m.result.firstInning.teamName === resolved.teamA ? `${m.result.firstInning.score}/${m.result.firstInning.wickets} (${m.result.firstInning.overs} ov)` : `${m.result.secondInning.score}/${m.result.secondInning.wickets} (${m.result.secondInning.overs} ov)`}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="px-3 text-center text-xs font-black text-slate-500">VS</div>

                                            <div className="flex-1 text-right">
                                                <div className="font-black text-sm text-white flex items-center justify-end gap-1.5">
                                                    <span>{resolved.teamB}</span>
                                                    {WORLD_CITY_LOGOS[resolved.teamB] && (
                                                        <div className="w-5 h-5 shrink-0" dangerouslySetInnerHTML={{ __html: WORLD_CITY_LOGOS[resolved.teamB] }} />
                                                    )}
                                                </div>
                                                {m.result && (
                                                    <div className="text-xs font-mono text-cyan-300 font-bold mt-0.5">
                                                        {m.result.firstInning.teamName === resolved.teamB ? `${m.result.firstInning.score}/${m.result.firstInning.wickets} (${m.result.firstInning.overs} ov)` : `${m.result.secondInning.score}/${m.result.secondInning.wickets} (${m.result.secondInning.overs} ov)`}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {m.result ? (
                                            <div className="text-[11px] text-emerald-400 font-medium truncate mt-2 bg-emerald-950/30 px-2 py-1 rounded border border-emerald-500/20">
                                                ✓ {m.result.summary}
                                            </div>
                                        ) : isCurrent ? (
                                            <div className="text-[11px] text-cyan-300 font-bold mt-2 animate-pulse flex items-center justify-between">
                                                <span>⚡ UP NEXT</span>
                                                <button
                                                    onClick={handleSimulateSingleMatch}
                                                    className="px-2.5 py-1 bg-cyan-400 text-slate-950 font-black rounded-lg text-[10px] uppercase shadow hover:bg-cyan-300"
                                                >
                                                    Simulate
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="text-[10px] text-slate-500 font-mono mt-2">
                                                Scheduled • {resolved.date}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                    </div>
                </div>
            )}

            {/* TAB 2: Standings & Brackets */}
            {activeTab === 'standings' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {[
                            { name: 'Group A', data: groupAStandings },
                            { name: 'Group B', data: groupBStandings },
                            { name: 'Group C', data: groupCStandings },
                            { name: 'Group D', data: groupDStandings }
                        ].map(grp => (
                            <div key={grp.name} className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-base font-black text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                                        <Shield size={18} />
                                        <span>{grp.name} Standings</span>
                                    </h3>
                                    <span className="text-[11px] text-slate-400 font-mono">Top 2 Advance to QFs</span>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-800 text-slate-400 font-mono">
                                                <th className="pb-2">#</th>
                                                <th className="pb-2">Franchise</th>
                                                <th className="pb-2 text-center">P</th>
                                                <th className="pb-2 text-center">W</th>
                                                <th className="pb-2 text-center">L</th>
                                                <th className="pb-2 text-center">PTS</th>
                                                <th className="pb-2 text-right">NRR</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/60 font-mono">
                                            {grp.data.map((st, i) => {
                                                return (
                                                    <tr key={st.teamId} className={`hover:bg-slate-800/40 ${i < 2 ? 'bg-cyan-950/20' : ''}`}>
                                                        <td className="py-2.5 font-bold text-slate-400">{i + 1}</td>
                                                        <td className="py-2.5 font-sans font-black text-white flex items-center gap-2">
                                                            {WORLD_CITY_LOGOS[st.teamName] && (
                                                                <div className="w-4 h-4 shrink-0" dangerouslySetInnerHTML={{ __html: WORLD_CITY_LOGOS[st.teamName] }} />
                                                            )}
                                                            <span>{st.teamName}</span>
                                                            {i < 2 && <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1 rounded font-mono">Q</span>}
                                                        </td>
                                                        <td className="py-2.5 text-center text-slate-300">{st.played}</td>
                                                        <td className="py-2.5 text-center text-emerald-400 font-bold">{st.won}</td>
                                                        <td className="py-2.5 text-center text-rose-400">{st.lost}</td>
                                                        <td className="py-2.5 text-center font-black text-white text-sm bg-slate-800/40">{st.points}</td>
                                                        <td className={`py-2.5 text-right font-bold ${st.netRunRate >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                            {st.netRunRate > 0 ? `+${st.netRunRate}` : st.netRunRate}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Knockout Stage Bracket Visualizer */}
                    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
                        <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                            <Trophy size={18} className="text-amber-400" />
                            <span>Knockout Bracket & Finals Pathway</span>
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Quarter Finals */}
                            <div className="space-y-3">
                                <div className="text-xs font-black uppercase tracking-wider text-cyan-400">Quarter-Finals (8 Teams)</div>
                                {wlState.matches.filter(m => m.stage === 'Quarter-Finals').map(m => {
                                    const res = resolveWorldLeagueMatch(m, wlState);
                                    return (
                                        <div key={m.id} className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs">
                                            <div className="text-[10px] text-slate-500 font-bold mb-1">{m.matchNumber}</div>
                                            <div className="flex justify-between font-bold text-white">
                                                <span>{res.teamA}</span>
                                                <span className="text-slate-400">vs</span>
                                                <span>{res.teamB}</span>
                                            </div>
                                            {m.result && (
                                                <div className="text-[10px] text-emerald-400 mt-1 truncate">✓ {m.result.summary}</div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Semi Finals */}
                            <div className="space-y-3">
                                <div className="text-xs font-black uppercase tracking-wider text-indigo-400">Semi-Finals</div>
                                {wlState.matches.filter(m => m.stage === 'Semi-Finals').map(m => {
                                    const res = resolveWorldLeagueMatch(m, wlState);
                                    return (
                                        <div key={m.id} className="bg-slate-950 p-3 rounded-2xl border border-indigo-500/30 text-xs">
                                            <div className="text-[10px] text-indigo-400 font-bold mb-1">{m.matchNumber}</div>
                                            <div className="flex justify-between font-bold text-white">
                                                <span>{res.teamA}</span>
                                                <span className="text-slate-400">vs</span>
                                                <span>{res.teamB}</span>
                                            </div>
                                            {m.result && (
                                                <div className="text-[10px] text-emerald-400 mt-1 truncate">✓ {m.result.summary}</div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Grand Final */}
                            <div className="space-y-3">
                                <div className="text-xs font-black uppercase tracking-wider text-amber-400">World Grand Final</div>
                                {wlState.matches.filter(m => m.stage === 'Final').map(m => {
                                    const res = resolveWorldLeagueMatch(m, wlState);
                                    return (
                                        <div key={m.id} className="bg-gradient-to-br from-amber-950/40 to-slate-950 p-4 rounded-2xl border-2 border-amber-500/40 text-xs">
                                            <div className="text-[10px] text-amber-400 font-black uppercase mb-1">🏆 Championship Decider</div>
                                            <div className="flex justify-between font-black text-sm text-white">
                                                <span>{res.teamA}</span>
                                                <span className="text-amber-400 font-light">vs</span>
                                                <span>{res.teamB}</span>
                                            </div>
                                            {m.result && (
                                                <div className="text-xs text-amber-300 font-bold mt-2 bg-amber-950/60 p-2 rounded-xl border border-amber-500/30">
                                                    🏆 Champion: {wlState.championTeamName}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: 20 World City Teams */} {/* TAB 3: 20 World City Teams */}
            {activeTab === 'teams' && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
                        <div>
                            <h3 className="text-base font-black text-white flex items-center gap-2">
                                <Users size={18} className="text-cyan-400" />
                                <span>20 International City Franchises</span>
                            </h3>
                            <p className="text-xs text-slate-400">
                                Observe all 15-player global rosters, AI Playing XIs, star captains, and skill ratings across the 4 groups.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {wlState.teams.map(t => {
                            return (
                                <div 
                                    key={t.id} 
                                    className="p-4 rounded-3xl border flex flex-col justify-between transition-all bg-slate-900/80 border-slate-800 hover:border-slate-700"
                                >
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                                                {t.group || 'World League'}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-medium">{t.origin}</span>
                                        </div>

                                        <div className="flex items-center gap-3 mb-3">
                                            <div 
                                                className="w-10 h-10 shrink-0 rounded-xl bg-slate-950 p-1 border border-slate-800"
                                                dangerouslySetInnerHTML={{ __html: t.logo }}
                                            />
                                            <div>
                                                <h4 className="font-black text-lg text-white leading-tight">
                                                    {t.name}
                                                </h4>
                                                <div className="text-[10px] text-slate-400 font-mono">15-Player Squad</div>
                                            </div>
                                        </div>

                                        {/* Squad preview */}
                                        <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800/80 max-h-44 overflow-y-auto mb-3">
                                            {t.squad.map((p, idx) => {
                                                const isXI = t.playingXI?.includes(p.id) || idx < 11;
                                                const isCapt = t.captainId === p.id;
                                                const isWk = t.wicketKeeperId === p.id;

                                                return (
                                                    <div key={p.id} className={`flex items-center justify-between text-[11px] py-0.5 px-1 rounded ${isXI ? 'text-slate-200' : 'text-slate-500'}`}>
                                                        <div className="flex items-center gap-1 truncate max-w-[140px]">
                                                            <span className="font-medium truncate">{p.name}</span>
                                                            {isCapt && <span className="text-[8px] bg-amber-500 text-slate-950 font-extrabold px-1 rounded">C</span>}
                                                            {isWk && <span className="text-[8px] bg-cyan-500 text-slate-950 font-extrabold px-1 rounded">WK</span>}
                                                        </div>
                                                        <span className="text-[10px] font-mono text-cyan-400 font-bold shrink-0">
                                                            {Math.max(p.battingSkill, p.secondarySkill)}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="pt-2 border-t border-slate-800/80">
                                        <button
                                            onClick={() => handleOpenSquadViewer(t)}
                                            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition-colors"
                                        >
                                            <Users size={13} />
                                            <span>View Full Squad & XI</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* TAB 4: Leaders & Draft Scouting */}
            {activeTab === 'leaders' && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
                        <div>
                            <h3 className="text-base font-black text-white flex items-center gap-2">
                                <Target size={18} className="text-cyan-400" />
                                <span>World League Scouting & Draft Ratings</span>
                            </h3>
                            <p className="text-xs text-slate-400">
                                Real performances logged across the World League dynamically boost player draft ratings and auction base valuations.
                            </p>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                                {[
                                    { id: 'ALL', label: 'All' },
                                    { id: 'BAT', label: 'Batting' },
                                    { id: 'BOWL', label: 'Bowling' },
                                    { id: 'MVP', label: 'Impact' }
                                ].map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setLeaderCategory(cat.id as any)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                            leaderCategory === cat.id ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>

                            <div className="relative w-full sm:w-60">
                                <Search className="absolute left-3 top-2.5 text-slate-500" size={15} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search player, city..."
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-medium"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 overflow-x-auto shadow-2xl">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                                    <th className="pb-3">Player</th>
                                    <th className="pb-3">City Franchise</th>
                                    <th className="pb-3">Role</th>
                                    <th className="pb-3 text-center">Mat</th>
                                    <th className="pb-3 text-center">Runs</th>
                                    <th className="pb-3 text-center">SR</th>
                                    <th className="pb-3 text-center">Wkts</th>
                                    <th className="pb-3 text-center">Econ</th>
                                    <th className="pb-3 text-center">WL Score</th>
                                    <th className="pb-3 text-center">Draft Boost</th>
                                    <th className="pb-3 text-right">Draft Valuation</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 font-mono">
                                {scoutPlayers.slice(0, 60).map(({ player, teamName }, i) => {
                                    const ws = player.worldLeagueStats || { matches: 0, runs: 0, strikeRate: 0, wickets: 0, economy: 0 };
                                    const wlScore = player.worldLeaguePerformance || 50;
                                    const primarySkill = Math.max(player.battingSkill, player.secondarySkill);
                                    
                                    // Calculate Draft valuation boost based on World League
                                    const baseVal = (primarySkill / 10) * 1.5;
                                    const multiplier = 1 + ((wlScore - 50) * 0.01);
                                    const draftValue = (baseVal * multiplier).toFixed(1);
                                    const ratingDelta = wlScore >= 85 ? '+2' : wlScore >= 70 ? '+1' : '0';

                                    return (
                                        <tr key={player.id} className="hover:bg-slate-800/40">
                                            <td className="py-2.5 font-sans font-bold text-white flex items-center gap-2">
                                                <span className="text-slate-500 font-mono text-[10px] w-5">{i + 1}</span>
                                                <span>{player.name}</span>
                                            </td>
                                            <td className="py-2.5 text-slate-300 font-sans">{teamName}</td>
                                            <td className="py-2.5 text-cyan-300 font-sans">{player.role}</td>
                                            <td className="py-2.5 text-center text-slate-300">{ws.matches}</td>
                                            <td className="py-2.5 text-center font-bold text-emerald-400">{ws.runs}</td>
                                            <td className="py-2.5 text-center text-slate-300">{ws.strikeRate || '-'}</td>
                                            <td className="py-2.5 text-center font-bold text-cyan-400">{ws.wickets}</td>
                                            <td className="py-2.5 text-center text-slate-300">{ws.economy || '-'}</td>
                                            <td className="py-2.5 text-center">
                                                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                                    wlScore >= 80 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : wlScore >= 65 ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'
                                                }`}>
                                                    {wlScore} / 100
                                                </span>
                                            </td>
                                            <td className="py-2.5 text-center font-bold text-emerald-400">
                                                {ratingDelta !== '0' ? (
                                                    <span className="px-1.5 py-0.5 bg-emerald-950 text-emerald-300 rounded border border-emerald-500/30 text-[10px]">
                                                        {ratingDelta} Skill
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-500 text-[10px]">-</span>
                                                )}
                                            </td>
                                            <td className="py-2.5 text-right font-black text-amber-300">
                                                PKR {draftValue} Cr
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MODAL: Squad & Playing XI Viewer for any Franchise */}
            {showSquadModal && selectedTeamForView && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] flex flex-col justify-between shadow-2xl">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div 
                                        className="w-12 h-12 rounded-2xl bg-slate-950 p-1.5 border border-slate-800"
                                        dangerouslySetInnerHTML={{ __html: selectedTeamForView.logo }}
                                    />
                                    <div>
                                        <h3 className="text-xl font-black text-white flex items-center gap-2">
                                            <span>{selectedTeamForView.name}</span>
                                            <span className="text-xs px-2 py-0.5 bg-cyan-950 text-cyan-400 rounded-lg border border-cyan-500/30">
                                                {selectedTeamForView.group}
                                            </span>
                                        </h3>
                                        <p className="text-xs text-slate-400">
                                            {selectedTeamForView.origin} • 15-Player Squad & AI Tactical XI
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setShowSquadModal(false)}
                                    className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Squad Breakdown */}
                            <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
                                {selectedTeamForView.squad.map((player, idx) => {
                                    const isXI = selectedTeamForView.playingXI?.includes(player.id) || idx < 11;
                                    const isCapt = selectedTeamForView.captainId === player.id;
                                    const isWk = selectedTeamForView.wicketKeeperId === player.id;
                                    const topSkill = Math.max(player.battingSkill, player.secondarySkill);

                                    return (
                                        <div
                                            key={player.id}
                                            className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                                                isXI 
                                                    ? 'bg-slate-950/80 border-cyan-500/30 text-white' 
                                                    : 'bg-slate-950/30 border-slate-800/80 text-slate-400'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                                                    isXI ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-slate-800 text-slate-500'
                                                }`}>
                                                    {idx + 1}
                                                </div>

                                                <div>
                                                    <div className="font-bold text-sm flex items-center gap-2">
                                                        <span className="text-white">{player.name}</span>
                                                        <span className={`text-[10px] ${getRoleColor(player.role)}`}>
                                                            {getRoleFullName(player.role)}
                                                        </span>
                                                        {isCapt && (
                                                            <span className="text-[9px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.2 rounded">
                                                                CAPTAIN
                                                            </span>
                                                        )}
                                                        {isWk && (
                                                            <span className="text-[9px] bg-cyan-400 text-slate-950 font-black px-1.5 py-0.2 rounded">
                                                                KEEPER
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[11px] text-slate-400 font-mono">
                                                        Bat: {player.battingSkill} • Bowl: {player.secondarySkill} • Nationality: {player.nationality || 'Global'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <div className="text-right">
                                                    <div className="text-xs font-black text-cyan-400 font-mono">Rating {topSkill}</div>
                                                    <div className="text-[10px] text-slate-500 font-mono">
                                                        {isXI ? 'Playing XI' : 'Bench'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-800 flex justify-end">
                            <button
                                onClick={() => setShowSquadModal(false)}
                                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs uppercase"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Reset Modal */}
            <ConfirmModal
                isOpen={showConfirmReset}
                title="Reset World League?"
                message="This will reset all World League match results, group standings, and knockout brackets back to Match 1 for the current season."
                confirmText="Reset Tournament"
                icon="restart"
                onConfirm={handleResetTournament}
                onCancel={() => setShowConfirmReset(false)}
            />
        </div>
    );
};

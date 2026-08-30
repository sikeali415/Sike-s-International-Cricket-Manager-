import React, { useState, useMemo } from 'react';
import { GameData, Player, Format, PlayerRole, TeamOfTheSeasonPlayer, SeasonTeamsOfTournament } from '../types';
import { generateAutoTeamOfTheTournament } from '../utils/awardUtils';
import { calculatePlayerSeasonEvaluation } from '../utils/seasonEvaluation';
import { 
    Users, 
    Trophy, 
    Sparkles, 
    Check, 
    Crown, 
    Shield, 
    Zap, 
    Globe, 
    Search, 
    Filter, 
    Award,
    CheckCircle2,
    RotateCcw,
    SlidersHorizontal,
    Star
} from 'lucide-react';
import { playSFX } from '../utils/soundManager';

interface TeamOfTheSeasonSelectorProps {
    gameData: GameData;
    season: number;
    format?: Format;
    savedUserTeam?: SeasonTeamsOfTournament['userTeamOfTheSeason'];
    onSaveUserTeam?: (team: SeasonTeamsOfTournament['userTeamOfTheSeason']) => void;
    readOnly?: boolean;
}

export const TeamOfTheSeasonSelector: React.FC<TeamOfTheSeasonSelectorProps> = ({
    gameData,
    season,
    format = Format.T20,
    savedUserTeam,
    onSaveUserTeam,
    readOnly = false
}) => {
    const [activeTab, setActiveTab] = useState<'USER_SELECT' | 'AUTO_XI' | 'COMPARISON'>('USER_SELECT');
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<'ALL' | PlayerRole | 'FOREIGN'>('ALL');
    
    // User selection state: 11 player IDs
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(() => {
        if (savedUserTeam && savedUserTeam.players && savedUserTeam.players.length > 0) {
            return savedUserTeam.players.map(p => p.player?.id || (p as any).playerId).filter(Boolean);
        }
        return [];
    });

    const [captainId, setCaptainId] = useState<string | undefined>(savedUserTeam?.captainId);
    const [wicketKeeperId, setWicketKeeperId] = useState<string | undefined>(savedUserTeam?.wicketKeeperId);

    // Auto-generated Official Team of the Tournament
    const autoTeam = useMemo(() => {
        const stored = gameData.teamOfTheSeasonHistory?.[season]?.autoTeamOfTheTournament;
        if (stored && stored.players && stored.players.length > 0) return stored;
        return generateAutoTeamOfTheTournament(gameData, season, format);
    }, [gameData, season, format]);

    // All players who played in this season with calculated evaluation
    const evaluatedPlayers = useMemo(() => {
        return gameData.allPlayers.map(p => {
            const evalStats = calculatePlayerSeasonEvaluation(p, season);
            return {
                player: p,
                eval: evalStats
            };
        }).sort((a, b) => b.eval.totalScore - a.eval.totalScore);
    }, [gameData.allPlayers, season]);

    const playerMap = useMemo(() => {
        const map = new Map<string, Player>();
        gameData.allPlayers.forEach(p => map.set(p.id, p));
        return map;
    }, [gameData.allPlayers]);

    // Selected Player objects
    const selectedPlayers = useMemo(() => {
        return selectedPlayerIds.map(id => playerMap.get(id)).filter((p): p is Player => !!p);
    }, [selectedPlayerIds, playerMap]);

    // Validation Metrics
    const foreignCount = useMemo(() => {
        return selectedPlayers.filter(p => p.isForeign).length;
    }, [selectedPlayers]);

    const wkCount = useMemo(() => {
        return selectedPlayers.filter(p => p.role === PlayerRole.WICKET_KEEPER || p.id === wicketKeeperId).length;
    }, [selectedPlayers, wicketKeeperId]);

    const bowlerCount = useMemo(() => {
        return selectedPlayers.filter(p => 
            p.role === PlayerRole.FAST_BOWLER || 
            p.role === PlayerRole.SPIN_BOWLER || 
            p.role === PlayerRole.ALL_ROUNDER
        ).length;
    }, [selectedPlayers]);

    const filteredAvailablePlayers = useMemo(() => {
        return evaluatedPlayers.filter(({ player }) => {
            const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (player.teamName && player.teamName.toLowerCase().includes(searchQuery.toLowerCase()));
            if (!matchesSearch) return false;

            if (roleFilter === 'FOREIGN') return player.isForeign;
            if (roleFilter !== 'ALL') return player.role === roleFilter;
            return true;
        });
    }, [evaluatedPlayers, searchQuery, roleFilter]);

    const handleTogglePlayer = (player: Player) => {
        if (readOnly) return;
        const isSelected = selectedPlayerIds.includes(player.id);

        if (isSelected) {
            setSelectedPlayerIds(prev => prev.filter(id => id !== player.id));
            if (captainId === player.id) setCaptainId(undefined);
            if (wicketKeeperId === player.id) setWicketKeeperId(undefined);
            playSFX('click');
        } else {
            if (selectedPlayerIds.length >= 11) {
                playSFX('error');
                return;
            }
            if (player.isForeign && foreignCount >= 4) {
                playSFX('error');
                return;
            }
            setSelectedPlayerIds(prev => [...prev, player.id]);
            if (player.role === PlayerRole.WICKET_KEEPER && !wicketKeeperId) {
                setWicketKeeperId(player.id);
            }
            if (!captainId && selectedPlayerIds.length === 0) {
                setCaptainId(player.id);
            }
            playSFX('click');
        }
    };

    const handleAutoFill = () => {
        if (readOnly) return;
        const autoIds = autoTeam.players.map(p => p.player.id);
        setSelectedPlayerIds(autoIds);
        setCaptainId(autoTeam.captainId || autoIds[0]);
        setWicketKeeperId(autoTeam.wicketKeeperId || autoIds.find(id => playerMap.get(id)?.role === PlayerRole.WICKET_KEEPER));
        playSFX('success');
    };

    const handleClear = () => {
        if (readOnly) return;
        setSelectedPlayerIds([]);
        setCaptainId(undefined);
        setWicketKeeperId(undefined);
        playSFX('click');
    };

    const handleSave = () => {
        if (!onSaveUserTeam) return;
        if (selectedPlayerIds.length !== 11) return;

        const playersWithRoles: TeamOfTheSeasonPlayer[] = selectedPlayers.map((p, idx) => {
            const evalData = calculatePlayerSeasonEvaluation(p, season);
            let assignedRole: TeamOfTheSeasonPlayer['assignedRole'] = 'Middle Order';
            if (idx < 2) assignedRole = 'Opener';
            else if (idx < 4) assignedRole = 'Top Order';
            else if (p.role === PlayerRole.WICKET_KEEPER || p.id === wicketKeeperId) assignedRole = 'Wicket Keeper';
            else if (p.role === PlayerRole.ALL_ROUNDER) assignedRole = 'All-Rounder';
            else if (p.role === PlayerRole.FAST_BOWLER) assignedRole = 'Pace Bowler';
            else if (p.role === PlayerRole.SPIN_BOWLER) assignedRole = 'Spin Bowler';

            return {
                player: p,
                position: idx + 1,
                assignedRole,
                isCaptain: p.id === captainId,
                isWicketKeeper: p.id === wicketKeeperId,
                isForeign: !!p.isForeign,
                seasonRuns: p.stats?.[format]?.runs || 0,
                seasonWickets: p.stats?.[format]?.wickets || 0,
                seasonAvg: p.stats?.[format]?.average || 0,
                seasonSrOrEcon: p.stats?.[format]?.strikeRate || p.stats?.[format]?.economy || 0,
                seasonScore: evalData.totalScore
            };
        });

        const userXI: SeasonTeamsOfTournament['userTeamOfTheSeason'] = {
            submittedAt: new Date().toLocaleDateString(),
            captainId: captainId || selectedPlayerIds[0],
            wicketKeeperId: wicketKeeperId || selectedPlayerIds.find(id => playerMap.get(id)?.role === PlayerRole.WICKET_KEEPER) || selectedPlayerIds[0],
            players: playersWithRoles
        };

        onSaveUserTeam(userXI);
        playSFX('success');
    };

    // Comparison Stats
    const consensusCount = useMemo(() => {
        const autoIds = new Set(autoTeam.players.map(p => p.player.id));
        return selectedPlayerIds.filter(id => autoIds.has(id)).length;
    }, [autoTeam, selectedPlayerIds]);

    const userBattingPower = useMemo(() => {
        return Math.round(selectedPlayers.reduce((acc, p) => acc + p.battingSkill, 0) / (selectedPlayers.length || 1));
    }, [selectedPlayers]);

    const userBowlingPower = useMemo(() => {
        return Math.round(selectedPlayers.reduce((acc, p) => acc + p.secondarySkill, 0) / (selectedPlayers.length || 1));
    }, [selectedPlayers]);

    const autoBattingPower = useMemo(() => {
        return Math.round(autoTeam.players.reduce((acc, p) => acc + p.player.battingSkill, 0) / (autoTeam.players.length || 11));
    }, [autoTeam]);

    const autoBowlingPower = useMemo(() => {
        return Math.round(autoTeam.players.reduce((acc, p) => acc + p.player.secondarySkill, 0) / (autoTeam.players.length || 11));
    }, [autoTeam]);

    return (
        <div className="space-y-4 text-slate-100">
            {/* Navigation Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 p-3 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">
                        <Trophy size={18} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-wider text-white">Season {season} Team of the Tournament</h3>
                        <p className="text-[11px] text-slate-400">Select your Dream 11 or inspect the Official Auto-Generated XI</p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                        onClick={() => setActiveTab('USER_SELECT')}
                        className={`px-3 py-1.5 text-xs font-black uppercase rounded-lg transition-all ${
                            activeTab === 'USER_SELECT'
                                ? 'bg-teal-500 text-slate-950 shadow-md'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        My Selection ({selectedPlayerIds.length}/11)
                    </button>
                    <button
                        onClick={() => setActiveTab('AUTO_XI')}
                        className={`px-3 py-1.5 text-xs font-black uppercase rounded-lg transition-all ${
                            activeTab === 'AUTO_XI'
                                ? 'bg-teal-500 text-slate-950 shadow-md'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        Official Auto XI
                    </button>
                    <button
                        onClick={() => setActiveTab('COMPARISON')}
                        className={`px-3 py-1.5 text-xs font-black uppercase rounded-lg transition-all ${
                            activeTab === 'COMPARISON'
                                ? 'bg-teal-500 text-slate-950 shadow-md'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        XI Comparison
                    </button>
                </div>
            </div>

            {/* TAB 1: User Team of the Season Selection */}
            {activeTab === 'USER_SELECT' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Left: Interactive Field / Current Selection */}
                    <div className="lg:col-span-5 space-y-3">
                        <div className="bg-gradient-to-b from-slate-900 via-slate-900/90 to-teal-950/40 p-4 rounded-3xl border border-teal-500/30 space-y-3 shadow-xl">
                            <div className="flex items-center justify-between">
                                <div className="text-xs font-black uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                                    <Sparkles size={14} />
                                    <span>Selected Roster ({selectedPlayerIds.length}/11)</span>
                                </div>
                                {!readOnly && (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleAutoFill}
                                            className="text-[10px] uppercase font-bold text-teal-300 hover:text-teal-200 bg-teal-950/60 px-2 py-1 rounded-md border border-teal-500/30 flex items-center gap-1"
                                        >
                                            <Zap size={11} /> Auto Fill
                                        </button>
                                        <button
                                            onClick={handleClear}
                                            className="text-[10px] uppercase font-bold text-rose-400 hover:text-rose-300 bg-rose-950/40 px-2 py-1 rounded-md border border-rose-500/30 flex items-center gap-1"
                                        >
                                            <RotateCcw size={11} /> Clear
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Constraints Tracker */}
                            <div className="grid grid-cols-3 gap-2 bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800 text-center text-xs">
                                <div>
                                    <div className="text-[10px] text-slate-400 uppercase font-bold">Foreign</div>
                                    <div className={`font-mono font-black ${foreignCount > 4 ? 'text-rose-400' : 'text-teal-400'}`}>
                                        {foreignCount} / 4 Max
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-slate-400 uppercase font-bold">Wicket-Keeper</div>
                                    <div className={`font-mono font-black ${wkCount < 1 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                        {wkCount >= 1 ? '✓ Selected' : 'Required'}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-slate-400 uppercase font-bold">Bowlers/AR</div>
                                    <div className={`font-mono font-black ${bowlerCount < 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                        {bowlerCount} / 5 Rec.
                                    </div>
                                </div>
                            </div>

                            {/* Selected Lineup List */}
                            <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                                {selectedPlayers.length === 0 ? (
                                    <div className="text-center py-8 text-slate-500 text-xs italic">
                                        Click players from the catalog on the right to build your Season {season} Team of the Tournament.
                                    </div>
                                ) : (
                                    selectedPlayers.map((p, index) => {
                                        const isCap = p.id === captainId;
                                        const isWk = p.id === wicketKeeperId;
                                        return (
                                            <div
                                                key={p.id}
                                                className="bg-slate-950/80 hover:bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between gap-2 group transition-all"
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-mono font-black flex items-center justify-center shrink-0">
                                                        {index + 1}
                                                    </span>
                                                    <div className="truncate">
                                                        <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                                                            <span className="truncate">{p.name}</span>
                                                            {p.isForeign && <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1 rounded font-bold">✈️</span>}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 flex items-center gap-2">
                                                            <span>{p.teamName || 'Free Agent'}</span>
                                                            <span>•</span>
                                                            <span className="text-teal-400">{p.role}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1 shrink-0">
                                                    {!readOnly && (
                                                        <>
                                                            <button
                                                                onClick={() => setCaptainId(isCap ? undefined : p.id)}
                                                                title="Designate as Captain"
                                                                className={`p-1 rounded text-[10px] font-black uppercase tracking-wider ${
                                                                    isCap ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-amber-400'
                                                                }`}
                                                            >
                                                                <Crown size={12} />
                                                            </button>
                                                            {(p.role === PlayerRole.WICKET_KEEPER || p.role === PlayerRole.BATSMAN) && (
                                                                <button
                                                                    onClick={() => setWicketKeeperId(isWk ? undefined : p.id)}
                                                                    title="Designate as Wicket-Keeper"
                                                                    className={`p-1 rounded text-[10px] font-black uppercase tracking-wider ${
                                                                        isWk ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-cyan-400'
                                                                    }`}
                                                                >
                                                                    <Shield size={12} />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleTogglePlayer(p)}
                                                                className="text-slate-500 hover:text-rose-400 p-1"
                                                                title="Remove"
                                                            >
                                                                ✕
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Save Action */}
                            {!readOnly && onSaveUserTeam && (
                                <button
                                    onClick={handleSave}
                                    disabled={selectedPlayerIds.length !== 11 || foreignCount > 4}
                                    className={`w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all ${
                                        selectedPlayerIds.length === 11 && foreignCount <= 4
                                            ? 'bg-gradient-to-r from-teal-400 to-cyan-400 text-slate-950 hover:brightness-110'
                                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    }`}
                                >
                                    <CheckCircle2 size={15} />
                                    <span>Lock &amp; Save My Season {season} XI</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right: Full Player Catalog & Search */}
                    <div className="lg:col-span-7 space-y-3">
                        <div className="bg-slate-900/90 p-4 rounded-3xl border border-slate-800 space-y-3">
                            {/* Search & Filters */}
                            <div className="flex flex-col sm:flex-row gap-2">
                                <div className="relative flex-1">
                                    <Search size={14} className="absolute left-3 top-3 text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="Search by player or team name..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                                    />
                                </div>

                                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                                    {(['ALL', PlayerRole.BATSMAN, PlayerRole.ALL_ROUNDER, PlayerRole.FAST_BOWLER, PlayerRole.WICKET_KEEPER, 'FOREIGN'] as const).map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setRoleFilter(f)}
                                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase shrink-0 transition-all ${
                                                roleFilter === f
                                                    ? 'bg-teal-500 text-slate-950'
                                                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                                            }`}
                                        >
                                            {f === 'FOREIGN' ? '✈️ Foreign' : f}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Player Cards */}
                            <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
                                {filteredAvailablePlayers.map(({ player, eval: evalData }) => {
                                    const isSelected = selectedPlayerIds.includes(player.id);
                                    const stats = player.stats[format];
                                    return (
                                        <div
                                            key={player.id}
                                            onClick={() => handleTogglePlayer(player)}
                                            className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                                                isSelected
                                                    ? 'bg-teal-950/40 border-teal-500/60 shadow-lg shadow-teal-950/20'
                                                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                                    isSelected ? 'bg-teal-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                                                }`}>
                                                    {isSelected ? <Check size={16} /> : (evalData.grade || 'A')}
                                                </div>

                                                <div className="truncate">
                                                    <div className="font-bold text-xs text-white flex items-center gap-1.5">
                                                        <span className="truncate">{player.name}</span>
                                                        <span className="text-[10px] text-slate-400 font-mono">Age {player.age}</span>
                                                        {player.isForeign && <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded font-bold">✈️ {player.nationality}</span>}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                                        <span className="text-slate-300 font-semibold">{player.teamName || 'Free Agent'}</span>
                                                        <span>•</span>
                                                        <span className="text-teal-400 font-bold">{player.role}</span>
                                                        <span>•</span>
                                                        <span>Bat {player.battingSkill} | Bowl {player.secondarySkill}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-right shrink-0">
                                                <div className="text-xs font-mono font-black text-teal-400">
                                                    {evalData.totalScore} pts
                                                </div>
                                                <div className="text-[10px] text-slate-400">
                                                    {stats?.runs || 0}r • {stats?.wickets || 0}w
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: Official Auto Generated Team of the Tournament */}
            {activeTab === 'AUTO_XI' && (
                <div className="space-y-4">
                    <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-cyan-950 p-5 rounded-3xl border border-teal-500/40 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-black uppercase text-teal-400 tracking-wider">
                            <Crown size={16} />
                            <span>Official Season {season} Auto-Generated XI</span>
                        </div>
                        <h4 className="text-xl font-black text-white">
                            League Best 11 • Formed by Season Evaluation Algorithm
                        </h4>
                        <p className="text-xs text-slate-300">
                            Strict 4-foreign player maximum, designated openers, wicket-keeper, all-rounders, and elite strike bowlers.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {autoTeam.players.map((item, idx) => (
                            <div
                                key={item.player.id}
                                className="bg-slate-900/90 border border-slate-800 hover:border-teal-500/40 p-4 rounded-2xl flex items-center justify-between gap-3 shadow-md"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-teal-500/30 text-teal-300 font-mono font-black text-sm flex items-center justify-center shrink-0">
                                        #{idx + 1}
                                    </div>
                                    <div className="truncate">
                                        <div className="font-bold text-xs text-white flex items-center gap-1.5 truncate">
                                            <span className="truncate">{item.player.name}</span>
                                            {item.isCaptain && <span className="text-[8px] bg-amber-500 text-slate-950 font-black px-1 rounded">C</span>}
                                            {item.isWicketKeeper && <span className="text-[8px] bg-cyan-500 text-slate-950 font-black px-1 rounded">WK</span>}
                                            {item.isForeign && <span className="text-[8px] bg-amber-500/20 text-amber-300 font-bold px-1 rounded">✈️</span>}
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-0.5">
                                            <span>{item.player.teamName || 'Free Agent'}</span> • <span className="text-teal-400 font-semibold">{item.assignedRole}</span>
                                        </div>
                                        <div className="text-[10px] text-slate-500 mt-0.5">
                                            Bat {item.player.battingSkill} • Bowl {item.player.secondarySkill}
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right shrink-0">
                                    <div className="text-xs font-mono font-black text-cyan-400">
                                        {item.seasonScore || 0} pts
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono">
                                        {(item.seasonRuns || 0) > 0 && `${item.seasonRuns} runs`}
                                        {(item.seasonRuns || 0) > 0 && (item.seasonWickets || 0) > 0 && ' • '}
                                        {(item.seasonWickets || 0) > 0 && `${item.seasonWickets} wkts`}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 3: Lineup Comparison */}
            {activeTab === 'COMPARISON' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl text-center space-y-1">
                            <div className="text-[10px] font-black uppercase text-slate-400">Consensus Rate</div>
                            <div className="text-2xl font-black text-teal-400">{consensusCount} / 11 Matches</div>
                            <div className="text-xs text-slate-400">Players common to both selections</div>
                        </div>

                        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl text-center space-y-1">
                            <div className="text-[10px] font-black uppercase text-slate-400">Average Batting Rating</div>
                            <div className="text-2xl font-black text-cyan-400">{userBattingPower} vs {autoBattingPower}</div>
                            <div className="text-xs text-slate-400">Your XI vs Official Auto XI</div>
                        </div>

                        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl text-center space-y-1">
                            <div className="text-[10px] font-black uppercase text-slate-400">Average Bowling Rating</div>
                            <div className="text-2xl font-black text-emerald-400">{userBowlingPower} vs {autoBowlingPower}</div>
                            <div className="text-xs text-slate-400">Your XI vs Official Auto XI</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-900/80 p-4 rounded-3xl border border-slate-800 space-y-2">
                            <div className="font-black text-xs uppercase text-teal-400 flex items-center gap-2">
                                <Users size={15} /> Your Selected XI
                            </div>
                            <div className="space-y-1 text-xs">
                                {selectedPlayers.length === 0 ? (
                                    <div className="text-slate-500 py-4 text-center">No players selected yet</div>
                                ) : (
                                    selectedPlayers.map((p, i) => (
                                        <div key={p.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-500 font-mono text-[10px]">#{i+1}</span>
                                                <span className="font-bold text-white">{p.name}</span>
                                                {p.id === captainId && <span className="text-[8px] bg-amber-500 text-slate-950 font-black px-1 rounded">C</span>}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-mono">{p.role}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="bg-slate-900/80 p-4 rounded-3xl border border-slate-800 space-y-2">
                            <div className="font-black text-xs uppercase text-cyan-400 flex items-center gap-2">
                                <Crown size={15} /> Official Auto XI
                            </div>
                            <div className="space-y-1 text-xs">
                                {autoTeam.players.map((item, i) => (
                                    <div key={item.player.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-500 font-mono text-[10px]">#{i+1}</span>
                                            <span className="font-bold text-white">{item.player.name}</span>
                                            {item.isCaptain && <span className="text-[8px] bg-amber-500 text-slate-950 font-black px-1 rounded">C</span>}
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-mono">{item.assignedRole}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamOfTheSeasonSelector;

import React, { useState, useMemo, useEffect } from 'react';
import { GameData, Team, Player, PlayerRole, Format } from '../types';
import { Icons } from './Icons';
import { getRoleColor, getRoleFullName } from '../utils';
import { playSFX } from '../utils/soundManager';
import { MAX_SQUAD_SIZE, MIN_SQUAD_SIZE, MAX_TRANSFERS_PER_SEASON } from '../data';
import { 
    UserPlus, UserMinus, Lock, Unlock, 
    AlertTriangle, ShieldCheck, Search, Filter, Sparkles, CheckCircle2,
    Globe, Users, ShieldAlert, Award
} from 'lucide-react';

interface TransfersProps {
    gameData: GameData;
    userTeam: Team | null;
    setGameData: React.Dispatch<React.SetStateAction<GameData | null>>;
    showFeedback: (message: string, type?: 'success' | 'error') => void;
}

type RoleFilter = 'ALL' | 'BATSMAN' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKET_KEEPER';

const Transfers: React.FC<TransfersProps> = ({ gameData, userTeam, setGameData, showFeedback }) => {
    const [selectedTeamId, setSelectedTeamId] = useState<string>(userTeam?.id || gameData.teams[0]?.id || '');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');

    const selectedTeam = useMemo(() => {
        return gameData.teams.find(t => t.id === selectedTeamId) || userTeam || gameData.teams[0];
    }, [gameData.teams, selectedTeamId, userTeam]);

    const isUserManagingSelectedTeam = selectedTeam?.id === gameData.userTeamId;

    // Check if season has started (any match played or started in the season opener)
    const totalMatchesPlayed = useMemo(() => {
        return (Object.values(gameData.matchResults || {}) as Array<{ length?: number } | undefined>).reduce(
            (sum: number, resList) => sum + (resList?.length || 0), 
            0
        );
    }, [gameData.matchResults]);

    const isSeasonOpenerStarted = totalMatchesPlayed > 0 || (gameData.currentMatchIndex?.[Format.T20] || 0) > 0;

    // Transfers tracking (max 3 additions/removals per season)
    const transfersUsed = gameData.transfersMadeThisSeason || 0;
    const transfersRemaining = Math.max(0, MAX_TRANSFERS_PER_SEASON - transfersUsed);
    const isTransferLimitReached = transfersUsed >= MAX_TRANSFERS_PER_SEASON;

    // Available national reserve players strictly matching the selected country's nationality
    const nationalReserves = useMemo(() => {
        if (!selectedTeam) return [];
        const allSquadPlayerIds = new Set(gameData.teams.flatMap(t => t.squad.map(p => p.id)));
        
        const teamCountryName = selectedTeam.name.trim().toLowerCase();

        return gameData.allPlayers
            .filter(p => {
                // Must not currently be in any active squad
                if (allSquadPlayerIds.has(p.id)) return false;
                // STRICT INTERNATIONAL RULE: Player nationality MUST match the national team's country
                const playerCountry = (p.nationality || '').trim().toLowerCase();
                return playerCountry === teamCountryName;
            })
            .sort((a, b) => (b.battingSkill + b.secondarySkill) - (a.battingSkill + a.secondarySkill));
    }, [gameData, selectedTeam]);

    const filteredReserves = useMemo(() => {
        return nationalReserves.filter(p => {
            const matchesSearch = searchQuery.trim() === '' || 
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                p.nationality.toLowerCase().includes(searchQuery.toLowerCase());
            
            let matchesRole = true;
            if (roleFilter === 'BATSMAN') matchesRole = p.role === PlayerRole.BATSMAN;
            else if (roleFilter === 'BOWLER') matchesRole = p.role === PlayerRole.FAST_BOWLER || p.role === PlayerRole.SPIN_BOWLER;
            else if (roleFilter === 'ALL_ROUNDER') matchesRole = p.role === PlayerRole.ALL_ROUNDER;
            else if (roleFilter === 'WICKET_KEEPER') matchesRole = p.role === PlayerRole.WICKET_KEEPER;

            return matchesSearch && matchesRole;
        });
    }, [nationalReserves, searchQuery, roleFilter]);

    // Validation checks
    const canPerformTransfers = !isSeasonOpenerStarted && !isTransferLimitReached;

    // Call up player from national reserves to active squad
    const handleCallUpPlayer = (player: Player) => {
        if (isSeasonOpenerStarted) {
            showFeedback("National Selection Window is closed! Tournaments have commenced for the year.", "error");
            playSFX('error');
            return;
        }

        if (isTransferLimitReached) {
            showFeedback(`Maximum ${MAX_TRANSFERS_PER_SEASON} squad changes per season reached!`, "error");
            playSFX('error');
            return;
        }

        // STRICT INTERNATIONAL ELIGIBILITY ENFORCEMENT
        const playerCountry = (player.nationality || '').trim().toLowerCase();
        const teamCountry = (selectedTeam.name || '').trim().toLowerCase();
        if (playerCountry !== teamCountry) {
            showFeedback(`International Ineligibility: ${player.name} (${player.nationality}) cannot represent ${selectedTeam.name}. Foreign players are strictly prohibited from representing another nation!`, "error");
            playSFX('error');
            return;
        }

        // National players can be added without squad limits
        setGameData(prev => {
            if (!prev) return null;
            const updatedTeams = prev.teams.map(t => {
                if (t.id === selectedTeamId) {
                    return { ...t, squad: [...t.squad, player] };
                }
                return t;
            });

            return {
                ...prev,
                teams: updatedTeams,
                transfersMadeThisSeason: (prev.transfersMadeThisSeason || 0) + 1
            };
        });

        playSFX('success');
        showFeedback(`Successfully called up ${player.name} to the ${selectedTeam.name} squad! (${transfersUsed + 1}/${MAX_TRANSFERS_PER_SEASON} changes used)`, "success");
    };

    // Release Player to National Reserves
    const handleReleasePlayer = (playerId: string) => {
        if (isSeasonOpenerStarted) {
            showFeedback("Selection Window is closed! Squad releases are not permitted after tournament matches begin.", "error");
            playSFX('error');
            return;
        }

        if (isTransferLimitReached) {
            showFeedback(`Maximum ${MAX_TRANSFERS_PER_SEASON} squad changes per season reached!`, "error");
            playSFX('error');
            return;
        }

        if (selectedTeam.squad.length <= MIN_SQUAD_SIZE) {
            showFeedback(`National squad cannot fall below the minimum ${MIN_SQUAD_SIZE} players.`, "error");
            playSFX('error');
            return;
        }

        const releasedPlayer = selectedTeam.squad.find(p => p.id === playerId);

        setGameData(prev => {
            if (!prev) return null;
            const updatedTeams = prev.teams.map(t => {
                if (t.id === selectedTeamId) {
                    return { ...t, squad: t.squad.filter(p => p.id !== playerId) };
                }
                return t;
            });

            return {
                ...prev,
                teams: updatedTeams,
                transfersMadeThisSeason: (prev.transfersMadeThisSeason || 0) + 1
            };
        });

        playSFX('click');
        showFeedback(`Moved ${releasedPlayer?.name || 'Player'} to ${selectedTeam.name} National Reserves. (${transfersUsed + 1}/${MAX_TRANSFERS_PER_SEASON} changes used)`, "success");
    };

    const teamData = gameData.allTeamsData.find(t => t.id === selectedTeam.id);

    return (
        <div className="p-3 md:p-6 bg-slate-950 text-white min-h-screen space-y-4">
            
            {/* Header & Window Status Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-teal-950/70 to-slate-900 p-4 md:p-5 rounded-3xl border border-teal-500/30 shadow-2xl space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-teal-400">
                            <Globe size={16} />
                            <span>International Squad Selection &amp; Call-ups • Year {gameData.currentSeason}</span>
                        </div>
                        <h2 className="text-xl md:text-2xl font-black uppercase text-white tracking-tight mt-1">
                            National Team Transfers &amp; Reserves
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Manage national squad selections from domestic reserves before Match 1 of the international season.
                        </p>
                    </div>

                    {/* Window Status & Quota Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Window Status Badge */}
                        <div className={`px-3 py-2 rounded-2xl border text-xs font-extrabold flex items-center gap-1.5 shadow-sm ${
                            isSeasonOpenerStarted 
                                ? 'bg-red-950/80 border-red-500/50 text-red-300' 
                                : 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                        }`}>
                            {isSeasonOpenerStarted ? <Lock size={15} className="text-red-400" /> : <Unlock size={15} className="text-emerald-400" />}
                            <span>
                                {isSeasonOpenerStarted ? 'Window: LOCKED (Matches In Progress)' : 'Window: OPEN (Pre-Tournament)'}
                            </span>
                        </div>

                        {/* Season Limit Badge */}
                        <div className="px-3 py-2 bg-slate-900 border border-teal-500/40 rounded-2xl text-xs font-bold text-slate-200">
                            <span>Changes Used: </span>
                            <span className={`font-black ${isTransferLimitReached ? 'text-red-400' : 'text-teal-400'}`}>
                                {transfersUsed} / {MAX_TRANSFERS_PER_SEASON}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Strict International Eligibility Rule Banner */}
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-200">
                    <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
                    <span>
                        <strong>National Eligibility Policy:</strong> International cricket teams select strictly from their own country's citizens and national talent pool. Foreign players are 100% prohibited from representing other countries.
                    </span>
                </div>

                {/* Warning message if locked or limit reached */}
                {isSeasonOpenerStarted && (
                    <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-2xl flex items-center gap-2 text-xs text-red-200">
                        <AlertTriangle size={16} className="text-red-400 shrink-0" />
                        <span>
                            <strong>Selection Window is Locked:</strong> International tournament matches have commenced. No additions or releases can be made until the next season.
                        </span>
                    </div>
                )}

                {!isSeasonOpenerStarted && isTransferLimitReached && (
                    <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-2xl flex items-center gap-2 text-xs text-amber-200">
                        <AlertTriangle size={16} className="text-amber-400 shrink-0" />
                        <span>
                            <strong>Season Limit Reached:</strong> You have utilized your maximum allowance of {MAX_TRANSFERS_PER_SEASON} squad selections for Season {gameData.currentSeason}.
                        </span>
                    </div>
                )}
            </div>

            {/* Team Selection Bar & Squad Counter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-3 flex-1">
                    {teamData?.logo && (
                        <div 
                            className="w-7 h-7 shrink-0 rounded-full overflow-hidden shadow-sm"
                            dangerouslySetInnerHTML={{ __html: teamData.logo }} 
                        />
                    )}
                    <label className="text-xs font-black uppercase text-slate-400 tracking-wider whitespace-nowrap">
                        National Team:
                    </label>
                    <select
                        value={selectedTeamId}
                        onChange={(e) => setSelectedTeamId(e.target.value)}
                        className="bg-slate-950 text-white border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-teal-400 w-full max-w-xs"
                    >
                        {gameData.teams.map(t => (
                            <option key={t.id} value={t.id}>
                                {t.name} {t.id === gameData.userTeamId ? '(Your Managed Country)' : ''}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-2 text-xs">
                    <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                        <span className="text-slate-400">Active Squad: </span>
                        <span className="font-black text-teal-400">{selectedTeam.squad.length}/{MAX_SQUAD_SIZE}</span>
                    </div>
                    <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                        <span className="text-slate-400">Available Reserves: </span>
                        <span className="font-black text-emerald-400">{nationalReserves.length} {selectedTeam.name} Players</span>
                    </div>
                </div>
            </div>

            {/* Dual Grid: Current Squad vs National Reserves */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                
                {/* LEFT COLUMN: Current National Team Squad */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 flex flex-col h-[600px]">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div>
                            <h3 className="font-black text-sm text-white uppercase flex items-center gap-2">
                                <span>{selectedTeam.name} National Squad</span>
                            </h3>
                            <p className="text-[10px] text-slate-400">
                                100% {selectedTeam.name} International Players (Min: {MIN_SQUAD_SIZE}, Max: {MAX_SQUAD_SIZE})
                            </p>
                        </div>
                        <span className="text-xs font-bold text-teal-400 bg-teal-950 px-2 py-1 rounded border border-teal-500/30">
                            {selectedTeam.squad.length} / {MAX_SQUAD_SIZE}
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                        {selectedTeam.squad.map((p, idx) => (
                            <div
                                key={p.id}
                                className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs hover:border-slate-700 transition-all"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono text-slate-500">{idx + 1}.</span>
                                    <div>
                                        <div className="font-bold text-white flex items-center gap-1.5">
                                            <span>{p.name}</span>
                                            <span className="text-[9px] bg-teal-500/20 text-teal-300 px-1 py-0.2 rounded font-extrabold">{p.nationality}</span>
                                        </div>
                                        <div className={`text-[10px] font-semibold ${getRoleColor(p.role)}`}>
                                            {getRoleFullName(p.role)} • Bat: {p.battingSkill} | Bowl: {p.secondarySkill}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleReleasePlayer(p.id)}
                                    disabled={!canPerformTransfers}
                                    title={canPerformTransfers ? `Drop ${p.name} to ${selectedTeam.name} reserves` : "Selection window locked"}
                                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border flex items-center gap-1 transition-all ${
                                        canPerformTransfers 
                                            ? 'bg-red-950/60 hover:bg-red-900 border-red-500/40 text-red-300 active:scale-95' 
                                            : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                                    }`}
                                >
                                    <UserMinus size={13} />
                                    <span>To Reserves</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT COLUMN: Available National Reserves Pool (Same Country ONLY) */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 flex flex-col h-[600px]">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div>
                            <h3 className="font-black text-sm text-white uppercase flex items-center gap-2">
                                <span>{selectedTeam.name} Reserves &amp; Domestic Talent</span>
                            </h3>
                            <p className="text-[10px] text-slate-400">
                                Uncontracted {selectedTeam.name} players eligible for international call-up
                            </p>
                        </div>
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-950 px-2 py-1 rounded border border-emerald-500/30">
                            {filteredReserves.length} Available
                        </span>
                    </div>

                    {/* Search & Filter Controls */}
                    <div className="space-y-2">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                placeholder={`Search ${selectedTeam.name} reserve players...`}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
                            />
                        </div>

                        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                            {[
                                { id: 'ALL', label: 'All Reserves' },
                                { id: 'BATSMAN', label: 'Batters' },
                                { id: 'BOWLER', label: 'Bowlers' },
                                { id: 'ALL_ROUNDER', label: 'All-Rounders' },
                                { id: 'WICKET_KEEPER', label: 'Keepers' },
                            ].map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setRoleFilter(f.id as RoleFilter)}
                                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg whitespace-nowrap transition-all border ${
                                        roleFilter === f.id
                                            ? 'bg-teal-500 text-slate-950 border-teal-400 font-black'
                                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* National Reserves List */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                        {filteredReserves.length === 0 ? (
                            <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                                <Users size={24} className="mx-auto text-slate-600" />
                                <p>No {selectedTeam.name} reserve players found matching your filter.</p>
                                <p className="text-[10px] text-slate-600">All registered {selectedTeam.name} cricketers are already in the active squad or filter is active.</p>
                            </div>
                        ) : (
                            filteredReserves.map(p => (
                                <div
                                    key={p.id}
                                    className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs hover:border-slate-700 transition-all"
                                >
                                    <div>
                                        <div className="font-bold text-white flex items-center gap-1.5">
                                            <span>{p.name}</span>
                                            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded font-extrabold flex items-center gap-1">
                                                <span>{p.nationality}</span>
                                                <CheckCircle2 size={10} className="text-emerald-400" />
                                            </span>
                                        </div>
                                        <div className={`text-[10px] font-semibold ${getRoleColor(p.role)}`}>
                                            {getRoleFullName(p.role)} • Bat: {p.battingSkill} | Bowl: {p.secondarySkill} • Rating: {Math.max(p.battingSkill, p.secondarySkill)}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleCallUpPlayer(p)}
                                        disabled={!canPerformTransfers || selectedTeam.squad.length >= MAX_SQUAD_SIZE}
                                        title={canPerformTransfers ? `Call up ${p.name} to ${selectedTeam.name} squad` : "Selection window locked"}
                                        className={`px-3 py-1.5 text-[11px] font-black rounded-lg border flex items-center gap-1 transition-all ${
                                            canPerformTransfers && selectedTeam.squad.length < MAX_SQUAD_SIZE
                                                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-slate-950 border-emerald-400 active:scale-95 shadow-md' 
                                                : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                                        }`}
                                    >
                                        <UserPlus size={13} />
                                        <span>Call Up</span>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Transfers;

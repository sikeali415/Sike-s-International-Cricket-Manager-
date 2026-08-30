import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Player, Team, GameData, PlayerRole, BattingStyle, Format } from '../types';
import { getRoleColor } from '../utils';
import { playSFX } from '../utils/soundManager';
import { 
    DRAFT_SQUAD_SIZE, DRAFT_FOREIGN_PLAYERS, DRAFT_NATIONAL_PLAYERS
} from '../data';
import { 
    FOREIGN_COUNTRY_RULES, getCountryForeignLimit, 
    buildYearlyForeignPool, getPlayerSubRole, matchesForeignFilters,
    ForeignFilterCriteria
} from '../utils/foreignPlayerSystem';
import { 
    selectBestDraftPickForTeam
} from '../utils/draftAiEngine';
import { autoAssignTeamCaptainsAndViceCaptains } from '../utils/domesticStatsGenerator';
import { 
    Search, Users, Zap, ChevronRight, 
    Sparkles, Trophy, UserCheck, AlertCircle, Globe,
    SlidersHorizontal, Filter, Activity
} from 'lucide-react';

interface AuctionRoomProps {
    gameData: GameData;
    onAuctionComplete: (updatedTeams: Team[]) => void;
}

type MainDraftPoolTab = 'BATTERS' | 'BOWLERS' | 'ALL_ROUNDERS' | 'FOREIGN' | 'NATIONAL' | 'ALL';

export const AuctionRoom: React.FC<AuctionRoomProps> = ({ gameData, onAuctionComplete }) => {
    const [phase, setPhase] = useState<'RETENTION' | 'DRAFT' | 'COMPLETED'>('RETENTION');

    const userTeamOriginal = useMemo(() => {
        return gameData.teams.find(t => t.id === gameData.userTeamId) || gameData.teams[0];
    }, [gameData]);

    // Pre-draft user retention state (Max 5 National, 0 Foreign)
    const [userRetainedIds, setUserRetainedIds] = useState<Set<string>>(() => {
        const squad = userTeamOriginal.squad || [];
        const sortedNational = squad.filter(p => !p.isForeign).sort((a,b) => (b.battingSkill + b.secondarySkill) - (a.battingSkill + a.secondarySkill));
        const initial = new Set<string>();
        sortedNational.slice(0, 5).forEach(p => initial.add(p.id));
        return initial;
    });

    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Finalized draft teams state
    const [draftTeams, setDraftTeams] = useState<Team[]>([]);
    // All available draft pool players
    const [availablePool, setAvailablePool] = useState<Player[]>([]);
    
    // Snake Draft state
    const [currentPickIndex, setCurrentPickIndex] = useState<number>(0);
    const [draftLog, setDraftLog] = useState<{ round: number; pick: number; teamName: string; isUser: boolean; player: Player; reason?: string }[]>([]);
    
    // Pool & Filtering States
    const [activePoolTab, setActivePoolTab] = useState<MainDraftPoolTab>('BATTERS');
    const [subRoleFilter, setSubRoleFilter] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [showCountryLimitsModal, setShowCountryLimitsModal] = useState<boolean>(false);
    const [showRosterModal, setShowRosterModal] = useState<boolean>(false);
    const [selectedTeamRosterId, setSelectedTeamRosterId] = useState<string>(gameData.userTeamId);
    const [showAdvancedForeignFilters, setShowAdvancedForeignFilters] = useState<boolean>(false);

    // Advanced Foreign Player Filters
    const [foreignFilters, setForeignFilters] = useState<ForeignFilterCriteria>({
        country: 'ALL',
        role: 'ALL',
        battingStyle: 'ALL',
        bowlingStyle: 'ALL',
        subRole: 'ALL',
        minRating: 40,
        minForm: 50,
        minPrevSeason: 0,
        minChampionsLeague: 0,
        searchQuery: ''
    });

    // Country Limits for Current Season
    const countryRulesSummary = useMemo(() => {
        return Object.keys(FOREIGN_COUNTRY_RULES).map(country => {
            const rule = FOREIGN_COUNTRY_RULES[country];
            const { limit, isExpired } = getCountryForeignLimit(country, gameData.currentSeason);
            return {
                country,
                limit,
                isExpired,
                notes: rule.notes || (rule.isFixed ? 'Fixed quota' : 'Annual quota')
            };
        });
    }, [gameData.currentSeason]);

    // Sub-role definitions per primary pool tab
    const subRoleOptions = useMemo(() => {
        switch (activePoolTab) {
            case 'BATTERS':
                return ['ALL', 'Opening Batter', 'Middle-Order Batter', 'Finisher', 'Specialist Batter'];
            case 'BOWLERS':
                return ['ALL', 'Fast Bowler', 'Medium Pacer', 'Spinner', 'Powerplay Bowler', 'Death Bowler'];
            case 'ALL_ROUNDERS':
                return ['ALL', 'Batting All-Rounder', 'Bowling All-Rounder'];
            case 'FOREIGN':
                return ['ALL', 'Opening Batter', 'Middle-Order Batter', 'Finisher', 'Death Bowler', 'Powerplay Bowler', 'Spinner', 'Fast Bowler', 'Batting All-Rounder', 'Bowling All-Rounder', 'Wicket Keeper'];
            default:
                return ['ALL'];
        }
    }, [activePoolTab]);

    // Reset sub-role filter when main pool tab changes
    const handleTabChange = (tab: MainDraftPoolTab) => {
        playSFX('click');
        setActivePoolTab(tab);
        setSubRoleFilter('ALL');
    };

    // Filtered pool based on Tab, SubRole, Search, and Advanced Foreign Filters
    const filteredAvailablePool = useMemo(() => {
        return availablePool.filter(p => {
            const pSubRole = getPlayerSubRole(p);
            const matchesSearch = searchQuery.trim() === '' || 
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                p.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.nationality.toLowerCase().includes(searchQuery.toLowerCase()) ||
                pSubRole.toLowerCase().includes(searchQuery.toLowerCase());

            if (!matchesSearch) return false;

            // Tab Filtering
            if (activePoolTab === 'BATTERS') {
                if (p.role !== PlayerRole.BATSMAN && p.role !== PlayerRole.WICKET_KEEPER) return false;
                if (subRoleFilter !== 'ALL' && !pSubRole.toLowerCase().includes(subRoleFilter.toLowerCase())) return false;
                return true;
            }

            if (activePoolTab === 'BOWLERS') {
                if (p.role !== PlayerRole.FAST_BOWLER && p.role !== PlayerRole.SPIN_BOWLER) return false;
                if (subRoleFilter !== 'ALL' && !pSubRole.toLowerCase().includes(subRoleFilter.toLowerCase())) return false;
                return true;
            }

            if (activePoolTab === 'ALL_ROUNDERS') {
                if (p.role !== PlayerRole.ALL_ROUNDER) return false;
                if (subRoleFilter !== 'ALL' && !pSubRole.toLowerCase().includes(subRoleFilter.toLowerCase())) return false;
                return true;
            }

            if (activePoolTab === 'FOREIGN') {
                if (!p.isForeign) return false;
                const criteria: ForeignFilterCriteria = {
                    ...foreignFilters,
                    subRole: subRoleFilter !== 'ALL' ? subRoleFilter : foreignFilters.subRole,
                    searchQuery
                };
                return matchesForeignFilters(p, criteria);
            }

            if (activePoolTab === 'NATIONAL') {
                return !p.isForeign;
            }

            // 'ALL'
            return true;
        });
    }, [availablePool, activePoolTab, subRoleFilter, searchQuery, foreignFilters]);

    // Snake Draft scheduling
    const numTeams = draftTeams.length || gameData.teams.length || 6;

    // Find next team to pick using snake order
    const nextPickInfo = useMemo(() => {
        if (draftTeams.length === 0) return null;

        const round = Math.floor(currentPickIndex / numTeams);
        const pickInRound = currentPickIndex % numTeams;
        const isReverse = round % 2 === 1;
        const teamIndex = isReverse ? (numTeams - 1 - pickInRound) : pickInRound;
        const team = draftTeams[teamIndex];

        return {
            round: round + 1,
            pickNumber: currentPickIndex + 1,
            teamIndex,
            team
        };
    }, [currentPickIndex, numTeams, draftTeams]);

    const activeTeam = nextPickInfo?.team || null;
    const isUserTurn = activeTeam?.id === gameData.userTeamId;

    // AI Pick Logic: multi-factor intelligent evaluation using draftAiEngine
    const selectAiDraftPick = useCallback((team: Team, pool: Player[]): Player | null => {
        return selectBestDraftPickForTeam(team, pool, gameData.currentSeason);
    }, [gameData.currentSeason]);

    // Execute Draft Pick
    const executeDraftPick = useCallback((playerToDraft: Player, pickReason?: string) => {
        if (!nextPickInfo || !nextPickInfo.team) return;

        const currentTeam = nextPickInfo.team;
        const teamIndex = nextPickInfo.teamIndex;
        const squad = currentTeam.squad || [];

        const foreignCount = squad.filter(p => p.isForeign).length;
        const nationalCount = squad.filter(p => !p.isForeign).length;

        // Quota check
        if (playerToDraft.isForeign && foreignCount >= DRAFT_FOREIGN_PLAYERS) {
            setErrorMessage(`Cannot draft foreign player. ${currentTeam.name} has already reached the maximum of ${DRAFT_FOREIGN_PLAYERS} foreign players.`);
            return;
        }

        if (!playerToDraft.isForeign && nationalCount >= DRAFT_NATIONAL_PLAYERS) {
            setErrorMessage(`Cannot draft national player. ${currentTeam.name} has already reached the maximum of ${DRAFT_NATIONAL_PLAYERS} national players.`);
            return;
        }

        if (squad.length >= DRAFT_SQUAD_SIZE) {
            setErrorMessage(`${currentTeam.name} has already completed their 22-man draft roster.`);
            return;
        }

        setErrorMessage(null);
        playSFX('click');

        // 1. Add to team squad
        const updatedTeams = draftTeams.map((t, idx) => {
            if (idx === teamIndex) {
                return { ...t, squad: [...t.squad, playerToDraft] };
            }
            return t;
        });

        // 2. Remove from pool
        const updatedPool = availablePool.filter(p => p.id !== playerToDraft.id);

        // 3. Log pick with reason
        const sub = getPlayerSubRole(playerToDraft);
        const reason = pickReason || (playerToDraft.isForeign ? `Foreign Quota • ${sub}` : `National Core • ${sub}`);

        const newLogEntry = {
            round: nextPickInfo.round,
            pick: nextPickInfo.pickNumber,
            teamName: currentTeam.name,
            isUser: currentTeam.id === gameData.userTeamId,
            player: playerToDraft,
            reason
        };

        setDraftTeams(updatedTeams);
        setAvailablePool(updatedPool);
        setDraftLog(prev => [newLogEntry, ...prev]);

        const nextIndex = currentPickIndex + 1;
        setCurrentPickIndex(nextIndex);

        // Check if all teams reached 22 players
        const allCompleted = updatedTeams.every(t => t.squad.length >= DRAFT_SQUAD_SIZE);
        if (allCompleted) {
            const finalizedWithCaptains = autoAssignTeamCaptainsAndViceCaptains(updatedTeams);
            setDraftTeams(finalizedWithCaptains);
            setPhase('COMPLETED');
            playSFX('success');
        }
    }, [nextPickInfo, draftTeams, availablePool, currentPickIndex, gameData.userTeamId]);

    // AI automated turns
    useEffect(() => {
        if (phase !== 'DRAFT') return;
        if (!nextPickInfo || !nextPickInfo.team) return;

        if (!isUserTurn && activeTeam && availablePool.length > 0) {
            const timer = setTimeout(() => {
                const aiPick = selectAiDraftPick(activeTeam, availablePool);
                if (aiPick) {
                    const sub = getPlayerSubRole(aiPick);
                    executeDraftPick(aiPick, `Tactical Selection • ${sub}`);
                }
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [phase, nextPickInfo, isUserTurn, activeTeam, availablePool, selectAiDraftPick, executeDraftPick]);

    // Start Draft from Retention Screen (Enforcing strict Foreign Year Quotas)
    const handleConfirmRetentionsAndStartDraft = () => {
        playSFX('click');

        const updatedTeamsList: Team[] = gameData.teams.map(t => {
            if (t.id === gameData.userTeamId) {
                const retained = (t.squad || []).filter(p => !p.isForeign && userRetainedIds.has(p.id)).slice(0, 5);
                return { ...t, squad: retained };
            } else {
                // AI teams retain only top 5 national performers (0 foreign)
                const squad = t.squad || [];
                const national = squad.filter(p => !p.isForeign).sort((a,b) => (b.battingSkill + b.secondarySkill) - (a.battingSkill + a.secondarySkill));
                const aiRetained = national.slice(0, 5);
                return { ...t, squad: aiRetained };
            }
        });

        const allRetainedIds = new Set(updatedTeamsList.flatMap(t => t.squad.map(p => p.id)));
        
        // Build Yearly Foreign Pool with strict nationality availability limits & season expirations
        const { pool: yearlyForeignPool } = buildYearlyForeignPool(
            gameData.allPlayers, 
            gameData.currentSeason, 
            allRetainedIds
        );

        // National candidates not retained
        const nationalPool = gameData.allPlayers.filter(p => !p.isForeign && !allRetainedIds.has(p.id));

        const fullDraftPool = [...yearlyForeignPool, ...nationalPool].sort((a, b) => 
            (Math.max(b.battingSkill, b.secondarySkill) + ((b.form || 70) * 0.2)) - 
            (Math.max(a.battingSkill, a.secondarySkill) + ((a.form || 70) * 0.2))
        );

        setDraftTeams(updatedTeamsList);
        setAvailablePool(fullDraftPool);
        setCurrentPickIndex(0);
        setDraftLog([]);
        setPhase('DRAFT');
    };

    // Skip retentions and start a 100% fresh 22-player draft
    const handleStartFreshFullDraft = () => {
        playSFX('click');
        const emptyTeams: Team[] = gameData.teams.map(t => ({ ...t, squad: [] }));
        
        const { pool: yearlyForeignPool } = buildYearlyForeignPool(
            gameData.allPlayers, 
            gameData.currentSeason, 
            new Set()
        );
        const nationalPool = gameData.allPlayers.filter(p => !p.isForeign);

        const fullPool = [...yearlyForeignPool, ...nationalPool].sort((a, b) => 
            Math.max(b.battingSkill, b.secondarySkill) - Math.max(a.battingSkill, a.secondarySkill)
        );

        setDraftTeams(emptyTeams);
        setAvailablePool(fullPool);
        setCurrentPickIndex(0);
        setDraftLog([]);
        setPhase('DRAFT');
    };

    // User pick action
    const handleUserPick = (player: Player) => {
        if (!isUserTurn) return;
        const sub = getPlayerSubRole(player);
        executeDraftPick(player, `User Selection • ${sub}`);
    };

    const handleAutoPickUser = () => {
        if (!isUserTurn || !activeTeam || availablePool.length === 0) return;
        const best = selectAiDraftPick(activeTeam, availablePool);
        if (best) {
            const sub = getPlayerSubRole(best);
            executeDraftPick(best, `AI Auto-Pick • ${sub}`);
        }
    };

    // Fast Forward / Simulate Entire Remaining Draft
    const handleSimulateRestOfDraft = () => {
        playSFX('click');
        let tempTeams = draftTeams.map(t => ({ ...t, squad: [...t.squad] }));
        let tempPool = [...availablePool];
        let tempLog = [...draftLog];
        let pickIdx = currentPickIndex;

        while (!tempTeams.every(t => t.squad.length >= DRAFT_SQUAD_SIZE) && tempPool.length > 0) {
            const r = Math.floor(pickIdx / numTeams);
            const pInR = pickIdx % numTeams;
            const rev = r % 2 === 1;
            const tIdx = rev ? (numTeams - 1 - pInR) : pInR;
            const team = tempTeams[tIdx];

            if (team.squad.length < DRAFT_SQUAD_SIZE) {
                const pick = selectAiDraftPick(team, tempPool) || tempPool[0];
                if (pick) {
                    tempTeams[tIdx].squad.push(pick);
                    tempPool = tempPool.filter(p => p.id !== pick.id);

                    const sub = getPlayerSubRole(pick);
                    tempLog.unshift({
                        round: r + 1,
                        pick: pickIdx + 1,
                        teamName: team.name,
                        isUser: team.id === gameData.userTeamId,
                        player: pick,
                        reason: `AI Draft Simulation • ${sub}`
                    });
                }
            }
            pickIdx++;
        }

        const finalizedWithCaptains = autoAssignTeamCaptainsAndViceCaptains(tempTeams);
        setDraftTeams(finalizedWithCaptains);
        setAvailablePool(tempPool);
        setDraftLog(tempLog);
        setCurrentPickIndex(pickIdx);
        setPhase('COMPLETED');
        playSFX('success');
    };

    // User squad stats
    const userTeamInDraft = draftTeams.find(t => t.id === gameData.userTeamId) || userTeamOriginal;
    const userForeignCount = userTeamInDraft?.squad.filter(p => p.isForeign).length || 0;
    const userNationalCount = userTeamInDraft?.squad.filter(p => !p.isForeign).length || 0;

    // ----------------------------------------------------
    // STAGE 1: SQUAD RETENTION / PRE-DRAFT SELECTION UI
    // ----------------------------------------------------
    if (phase === 'RETENTION') {
        const squad = userTeamOriginal.squad || [];
        const retainedPlayers = squad.filter(p => userRetainedIds.has(p.id));
        const retainedForeign = retainedPlayers.filter(p => p.isForeign).length;
        const retainedNational = retainedPlayers.filter(p => !p.isForeign).length;

        const toggleRetain = (pId: string) => {
            playSFX('click');
            const player = squad.find(p => p.id === pId);
            if (!player) return;

            if (player.isForeign) {
                setErrorMessage(`Foreign players cannot be retained! All foreign players must enter the Draft pool.`);
                return;
            }

            setUserRetainedIds(prev => {
                const next = new Set(prev);
                if (next.has(pId)) {
                    next.delete(pId);
                } else {
                    if (retainedNational >= 5) {
                        setErrorMessage(`Maximum 5 National players can be retained! All others enter the Draft.`);
                        return prev;
                    }
                    next.add(pId);
                }
                return next;
            });
        };

        return (
            <div className="p-4 md:p-6 bg-slate-950 text-white min-h-screen space-y-6">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-slate-950 p-6 rounded-3xl border border-teal-500/30 shadow-2xl space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-teal-400 font-black text-xs uppercase tracking-widest">
                                <Sparkles size={16} />
                                <span>Official Season {gameData.currentSeason} Draft • 22-Player Squad System</span>
                            </div>
                            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                                <span>22-Player Franchise Draft</span>
                                <span className="text-teal-400">🏏</span>
                            </h2>
                            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                                Retain up to <strong>5 National core players</strong>. All foreign and other domestic players enter the Draft pool. In the Draft, build your complete 22-player squad with all world players available.
                            </p>
                        </div>

                        {/* Quota Indicators */}
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="bg-slate-900 border border-teal-500/40 px-4 py-2.5 rounded-2xl text-center shadow-inner">
                                <div className="text-[10px] text-slate-400 font-bold uppercase">National Retained</div>
                                <div className="text-lg font-black text-teal-400">
                                    {retainedNational} <span className="text-xs text-slate-400">/ 5 Max</span>
                                </div>
                            </div>
                            <div className="bg-slate-900 border border-amber-500/40 px-4 py-2.5 rounded-2xl text-center shadow-inner opacity-80">
                                <div className="text-[10px] text-slate-400 font-bold uppercase">✈️ Foreign</div>
                                <div className="text-xs font-black text-amber-400 mt-1">
                                    All in Draft (0/0)
                                </div>
                            </div>
                            <div className="bg-slate-900 border border-cyan-500/40 px-4 py-2.5 rounded-2xl text-center shadow-inner">
                                <div className="text-[10px] text-slate-400 font-bold uppercase">Picks in Draft</div>
                                <div className="text-lg font-black text-cyan-400">
                                    {22 - retainedNational} <span className="text-xs text-slate-400">/ 22</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Mode & Foreign Rules Buttons */}
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                        <button
                            onClick={handleStartFreshFullDraft}
                            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-teal-300 border border-teal-500/40 text-xs font-black rounded-xl transition-all flex items-center gap-1.5"
                        >
                            <Zap size={14} />
                            <span>Start 100% Fresh 22-Round Draft</span>
                        </button>

                        <button
                            onClick={() => setShowCountryLimitsModal(true)}
                            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40 text-xs font-black rounded-xl transition-all flex items-center gap-1.5"
                        >
                            <Globe size={14} />
                            <span>View Foreign Nation Availability Quotas</span>
                        </button>
                    </div>
                </div>

                {errorMessage && (
                    <div className="bg-red-950/60 border border-red-500/50 p-3 rounded-2xl text-xs text-red-200 flex items-center gap-2 font-mono">
                        <AlertCircle size={16} className="text-red-400 shrink-0" />
                        <span>{errorMessage}</span>
                    </div>
                )}

                {/* Pre-Draft Retainable Squad */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                            <UserCheck size={16} className="text-teal-400" />
                            <span>Select Existing Core Players To Retain (Or proceed to draft all 22)</span>
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {squad.map(p => {
                            const isRetained = userRetainedIds.has(p.id);
                            const topSkill = Math.max(p.battingSkill, p.secondarySkill);
                            const subRole = getPlayerSubRole(p);

                            return (
                                <div
                                    key={p.id}
                                    onClick={() => toggleRetain(p.id)}
                                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between gap-3 ${
                                        isRetained
                                            ? 'bg-teal-950/50 border-teal-500/80 shadow-lg shadow-teal-950/50 scale-[1.01]'
                                            : 'bg-slate-900/60 border-slate-800/80 opacity-60 hover:opacity-100 hover:border-slate-700'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <div className="flex items-center gap-1.5 font-bold text-sm text-white">
                                                <span>{p.name}</span>
                                                {p.isForeign ? (
                                                    <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 font-extrabold rounded">✈️ {p.nationality}</span>
                                                ) : (
                                                    <span className="text-[10px] px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 font-extrabold rounded">🏠 National</span>
                                                )}
                                            </div>
                                            <div className={`text-[11px] font-semibold ${getRoleColor(p.role)}`}>
                                                {subRole} • Age {p.age}
                                            </div>
                                        </div>

                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                                            isRetained ? 'bg-teal-400 text-slate-950' : 'bg-slate-800 text-slate-500 border border-slate-700'
                                        }`}>
                                            {isRetained ? '✓' : '+'}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-1 bg-slate-950/80 p-2 rounded-xl text-center text-xs">
                                        <div>
                                            <div className="text-[9px] text-slate-400 font-bold uppercase">Bat</div>
                                            <div className="font-black text-amber-400">{p.battingSkill}</div>
                                        </div>
                                        <div>
                                            <div className="text-[9px] text-slate-400 font-bold uppercase">Bowl</div>
                                            <div className="font-black text-cyan-400">{p.secondarySkill}</div>
                                        </div>
                                        <div>
                                            <div className="text-[9px] text-slate-400 font-bold uppercase">Overall</div>
                                            <div className="font-black text-teal-400">{topSkill}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Confirm Action Bar */}
                <div className="sticky bottom-4 z-20 bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl border border-teal-500/40 shadow-2xl flex items-center justify-between gap-4 max-w-4xl mx-auto">
                    <div>
                        <div className="text-xs text-slate-200 font-bold">
                            {retainedPlayers.length} retained • {DRAFT_SQUAD_SIZE - retainedPlayers.length} picks to draft in Draft Room
                        </div>
                        <div className="text-[11px] text-slate-400">
                            Draft target: 22 players per team (10 Foreign, 12 National)
                        </div>
                    </div>

                    <button
                        onClick={handleConfirmRetentionsAndStartDraft}
                        className="px-6 py-3 bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                    >
                        <span>Enter 22-Player Draft Room</span>
                        <ChevronRight size={18} />
                    </button>
                </div>

                {/* Foreign Country Limits Modal */}
                {showCountryLimitsModal && (
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-2xl w-full space-y-4 max-h-[85vh] overflow-y-auto">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <div className="flex items-center gap-2">
                                    <Globe className="text-amber-400" size={20} />
                                    <h3 className="text-lg font-black uppercase text-white">Foreign Nation Availability Quotas (Season {gameData.currentSeason})</h3>
                                </div>
                                <button
                                    onClick={() => setShowCountryLimitsModal(false)}
                                    className="text-slate-400 hover:text-white text-xs font-black px-3 py-1 bg-slate-800 rounded-lg"
                                >
                                    Close
                                </button>
                            </div>

                            <p className="text-xs text-slate-300">
                                Foreign players enter the draft based on strict country availability quotas. Note that small nations become unavailable in future seasons as scheduled, but historical statistics are strictly preserved.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                {countryRulesSummary.map(r => (
                                    <div key={r.country} className={`p-3 rounded-xl border flex items-center justify-between ${
                                        r.isExpired ? 'bg-red-950/20 border-red-900/40 opacity-60' : 'bg-slate-950 border-slate-800'
                                    }`}>
                                        <div>
                                            <div className="font-bold text-white flex items-center gap-1.5">
                                                <span>{r.country}</span>
                                                {r.isExpired && <span className="text-[9px] px-1.5 py-0.2 bg-red-500/20 text-red-400 rounded">Expired</span>}
                                            </div>
                                            <div className="text-[10px] text-slate-400">{r.notes}</div>
                                        </div>
                                        <div className={`font-black text-sm px-2.5 py-1 rounded-lg ${
                                            r.isExpired ? 'bg-slate-800 text-slate-500' : 'bg-amber-500/20 text-amber-300'
                                        }`}>
                                            {r.limit} Players
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ----------------------------------------------------
    // STAGE 3: DRAFT COMPLETED SUMMARY UI
    // ----------------------------------------------------
    if (phase === 'COMPLETED') {
        return (
            <div className="p-4 md:p-6 bg-slate-950 text-white min-h-screen space-y-6">
                <div className="text-center py-8 space-y-3 bg-gradient-to-b from-slate-900 via-teal-950/40 to-slate-950 border border-teal-500/40 rounded-3xl shadow-2xl">
                    <Trophy size={64} className="text-amber-400 mx-auto animate-bounce" />
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
                        22-PLAYER DRAFT COMPLETE! 🏏🏆
                    </h2>
                    <p className="text-xs md:text-sm text-slate-300 max-w-lg mx-auto">
                        All {draftTeams.length} franchises have finalized their 22-player squads with 10 Foreign and 12 National players! Pre-season transfers and trades are active until Match 1 opener (max squad 25).
                    </p>

                    <button
                        onClick={() => {
                            playSFX('success');
                            onAuctionComplete(draftTeams);
                        }}
                        className="mt-4 px-8 py-4 bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all inline-flex items-center gap-2"
                    >
                        <span>Proceed to Tournament Hub</span>
                        <ChevronRight size={20} />
                    </button>
                </div>

                {/* Final Roster Grids */}
                <div className="space-y-4">
                    <h3 className="text-base font-black uppercase text-slate-300 flex items-center gap-2">
                        <Users size={20} className="text-teal-400" />
                        <span>Franchise Roster Breakdowns (22 Players: 10 Foreign / 12 National)</span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {draftTeams.map(t => {
                            const fCount = t.squad.filter(p => p.isForeign).length;
                            const nCount = t.squad.filter(p => !p.isForeign).length;

                            return (
                                <div key={t.id} className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-3 shadow-lg">
                                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                        <div className="font-extrabold text-sm text-white">{t.name}</div>
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold">
                                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded">
                                                ✈️ {fCount}/10
                                            </span>
                                            <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded">
                                                🏠 {nCount}/12
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                                        {t.squad.map((p, idx) => {
                                            const isCaptain = t.captainId === p.id || t.captains?.[Format.T20] === p.id;
                                            const isViceCaptain = t.viceCaptainId === p.id || t.viceCaptains?.[Format.T20] === p.id;

                                            return (
                                                <div key={p.id} className="flex items-center justify-between text-xs py-1 px-2 bg-slate-950/80 rounded-lg">
                                                    <div className="flex items-center gap-1.5 truncate">
                                                        <span className="font-mono text-[10px] text-slate-500">{idx + 1}.</span>
                                                        <span className="font-semibold text-slate-200 truncate">{p.name}</span>
                                                        {isCaptain && (
                                                            <span className="text-[9px] px-1.5 py-0.2 bg-amber-400 text-slate-950 font-black rounded shadow">
                                                                ⭐ C
                                                            </span>
                                                        )}
                                                        {isViceCaptain && (
                                                            <span className="text-[9px] px-1.5 py-0.2 bg-teal-400 text-slate-950 font-black rounded shadow">
                                                                🎖️ VC
                                                            </span>
                                                        )}
                                                        {p.isForeign && <span className="text-[9px] text-amber-400">✈️ {p.nationality}</span>}
                                                    </div>
                                                    <span className={`text-[10px] font-bold shrink-0 ${getRoleColor(p.role)}`}>
                                                        {getPlayerSubRole(p)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // ----------------------------------------------------
    // STAGE 2: DRAFT ROOM MAIN LIVE VIEW
    // ----------------------------------------------------
    const activeForeignCount = activeTeam?.squad.filter(p => p.isForeign).length || 0;
    const activeNationalCount = activeTeam?.squad.filter(p => !p.isForeign).length || 0;

    return (
        <div className="p-3 md:p-6 bg-slate-950 text-white min-h-screen space-y-4">
            
            {/* Top Draft Control Bar */}
            <div className="bg-gradient-to-r from-slate-900 via-teal-950/60 to-slate-900 p-4 md:p-5 rounded-3xl border border-teal-500/30 shadow-2xl space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-teal-500/20 border border-teal-500/40 text-teal-400 rounded-2xl">
                            <Sparkles size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-xs font-black text-teal-400 uppercase tracking-widest">
                                <span>22-Player Draft • Season {gameData.currentSeason}</span>
                                <span>•</span>
                                <span>Round {nextPickInfo?.round || 1}</span>
                            </div>
                            <h2 className="text-xl md:text-2xl font-black uppercase text-white tracking-tight">
                                Pick #{nextPickInfo?.pickNumber || 1} • Draft Command Center
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowCountryLimitsModal(true)}
                            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-black rounded-xl border border-amber-500/40 transition-all flex items-center gap-1.5"
                        >
                            <Globe size={15} />
                            <span>Foreign Quotas</span>
                        </button>

                        <button
                            onClick={() => setShowRosterModal(true)}
                            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black rounded-xl border border-slate-700 transition-all flex items-center gap-1.5"
                        >
                            <Users size={15} className="text-teal-400" />
                            <span>Franchise Rosters</span>
                        </button>

                        <button
                            onClick={handleSimulateRestOfDraft}
                            className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-black rounded-xl border border-amber-500/40 transition-all flex items-center gap-1.5"
                        >
                            <Zap size={15} />
                            <span>Auto-Simulate Rest</span>
                        </button>
                    </div>
                </div>

                {/* ON THE CLOCK BANNER */}
                <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
                    isUserTurn
                        ? 'bg-gradient-to-r from-teal-950 to-emerald-950 border-teal-400 text-white animate-pulse shadow-lg shadow-teal-950'
                        : 'bg-slate-900/90 border-slate-800 text-slate-300'
                }`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-3.5 h-3.5 rounded-full shrink-0 ${isUserTurn ? 'bg-teal-400 animate-ping' : 'bg-amber-400'}`} />
                        <div>
                            <div className="text-[10px] uppercase font-black text-slate-400 tracking-wider">ON THE CLOCK</div>
                            <div className="text-base font-black text-white flex items-center gap-2">
                                <span>{activeTeam?.name}</span>
                                {isUserTurn && (
                                    <span className="text-xs px-2.5 py-0.5 bg-teal-400 text-slate-950 font-black rounded-full">
                                        YOUR TURN TO PICK
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Active team quota status */}
                    <div className="flex items-center gap-2">
                        <div className="text-xs font-bold bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
                            <span className="text-slate-400">Squad: </span>
                            <span className="text-white font-black">{activeTeam?.squad.length || 0}/22</span>
                        </div>
                        <div className="text-xs font-bold bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
                            <span className="text-slate-400">✈️ Foreign: </span>
                            <span className="text-amber-400 font-black">{activeForeignCount}/10</span>
                        </div>
                        <div className="text-xs font-bold bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
                            <span className="text-slate-400">🏠 National: </span>
                            <span className="text-cyan-400 font-black">{activeNationalCount}/12</span>
                        </div>

                        {isUserTurn && (
                            <button
                                onClick={handleAutoPickUser}
                                className="px-3 py-1.5 bg-teal-400 hover:bg-teal-300 text-slate-950 text-xs font-black rounded-xl shadow transition-all flex items-center gap-1 shrink-0 ml-2"
                            >
                                <Zap size={14} />
                                <span>AI Auto-Pick</span>
                            </button>
                        )}
                    </div>
                </div>

                {errorMessage && (
                    <div className="bg-red-950/60 border border-red-500/50 p-2.5 rounded-xl text-xs text-red-200 flex items-center gap-2 font-mono">
                        <AlertCircle size={15} className="text-red-400 shrink-0" />
                        <span>{errorMessage}</span>
                    </div>
                )}
            </div>

            {/* MAIN DRAFT GRID: Separate Draft Pools (Left 2 cols) + Live Feed (Right 1 col) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* LEFT COL: SEPARATE DRAFT POOLS & SEARCH */}
                <div className="lg:col-span-2 space-y-4">
                    
                    {/* PRIMARY DRAFT POOLS TABS (Batters, Bowlers, All-Rounders, Foreign, National, All) */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                        {[
                            { id: 'BATTERS', label: '🏏 BATTERS POOL' },
                            { id: 'BOWLERS', label: '🎯 BOWLERS POOL' },
                            { id: 'ALL_ROUNDERS', label: '⚡ ALL-ROUNDERS POOL' },
                            { id: 'FOREIGN', label: '✈️ FOREIGN PLAYERS (10 MAX)' },
                            { id: 'NATIONAL', label: '🏠 NATIONAL (12 MAX)' },
                            { id: 'ALL', label: 'ALL CANDIDATES' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id as MainDraftPoolTab)}
                                className={`px-3.5 py-2 text-xs font-black rounded-xl whitespace-nowrap transition-all border ${
                                    activePoolTab === tab.id
                                        ? 'bg-teal-400 text-slate-950 border-teal-300 shadow-md font-black'
                                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* SUB-CATEGORY ROLES FILTER (Opening batters, Middle-order, Finishers, Death bowlers, PP bowlers, Spinners, etc.) */}
                    {subRoleOptions.length > 1 && (
                        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none bg-slate-900/60 p-2 rounded-2xl border border-slate-800">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Role Type:</span>
                            {subRoleOptions.map(sub => (
                                <button
                                    key={sub}
                                    onClick={() => {
                                        playSFX('click');
                                        setSubRoleFilter(sub);
                                    }}
                                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg whitespace-nowrap transition-all ${
                                        subRoleFilter === sub
                                            ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                                            : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                                    }`}
                                >
                                    {sub}
                                </button>
                            ))}

                            {activePoolTab === 'FOREIGN' && (
                                <button
                                    onClick={() => setShowAdvancedForeignFilters(prev => !prev)}
                                    className={`ml-auto px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 ${
                                        showAdvancedForeignFilters
                                            ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                                    }`}
                                >
                                    <Filter size={12} />
                                    <span>Deep Foreign Filters</span>
                                </button>
                            )}
                        </div>
                    )}

                    {/* ADVANCED FOREIGN PLAYER MULTI-CRITERIA FILTERS */}
                    {activePoolTab === 'FOREIGN' && showAdvancedForeignFilters && (
                        <div className="p-4 bg-slate-900/90 border border-amber-500/30 rounded-2xl space-y-3 text-xs shadow-xl animate-fadeIn">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                <span className="font-black text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                                    <SlidersHorizontal size={14} />
                                    <span>Foreign Search & Filtering Matrix</span>
                                </span>
                                <button
                                    onClick={() => setForeignFilters({
                                        country: 'ALL',
                                        role: 'ALL',
                                        battingStyle: 'ALL',
                                        bowlingStyle: 'ALL',
                                        subRole: 'ALL',
                                        minRating: 40,
                                        minForm: 50,
                                        minPrevSeason: 0,
                                        minChampionsLeague: 0,
                                        searchQuery: ''
                                    })}
                                    className="text-[10px] text-slate-400 hover:text-white underline"
                                >
                                    Reset Filters
                                </button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                <div>
                                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Country</label>
                                    <select
                                        value={foreignFilters.country}
                                        onChange={e => setForeignFilters(prev => ({ ...prev, country: e.target.value }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-white"
                                    >
                                        <option value="ALL">All Nations</option>
                                        {Object.keys(FOREIGN_COUNTRY_RULES).map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Primary Role</label>
                                    <select
                                        value={foreignFilters.role}
                                        onChange={e => setForeignFilters(prev => ({ ...prev, role: e.target.value }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-white"
                                    >
                                        <option value="ALL">All Roles</option>
                                        <option value={PlayerRole.BATSMAN}>Batsman</option>
                                        <option value={PlayerRole.FAST_BOWLER}>Fast Bowler</option>
                                        <option value={PlayerRole.SPIN_BOWLER}>Spin Bowler</option>
                                        <option value={PlayerRole.ALL_ROUNDER}>All-Rounder</option>
                                        <option value={PlayerRole.WICKET_KEEPER}>Wicket Keeper</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Batting Style</label>
                                    <select
                                        value={foreignFilters.battingStyle}
                                        onChange={e => setForeignFilters(prev => ({ ...prev, battingStyle: e.target.value }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-white"
                                    >
                                        <option value="ALL">All Batting Styles</option>
                                        <option value="A">Aggressive (A)</option>
                                        <option value="D">Defensive (D)</option>
                                        <option value="N">Normal (N)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Bowling Style</label>
                                    <select
                                        value={foreignFilters.bowlingStyle}
                                        onChange={e => setForeignFilters(prev => ({ ...prev, bowlingStyle: e.target.value }))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-white"
                                    >
                                        <option value="ALL">All Bowling Types</option>
                                        <option value="fb">Fast Bowler (Pace)</option>
                                        <option value="fbs">Fast Swing / Death</option>
                                        <option value="mv">Medium Variation</option>
                                        <option value="os">Off Spin</option>
                                        <option value="ls">Leg Spin</option>
                                        <option value="laos">Left-Arm Orthodox</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                                <div>
                                    <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                                        <span>Min Rating</span>
                                        <span className="text-teal-400">{foreignFilters.minRating}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="40"
                                        max="95"
                                        value={foreignFilters.minRating}
                                        onChange={e => setForeignFilters(prev => ({ ...prev, minRating: Number(e.target.value) }))}
                                        className="w-full accent-teal-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                                        <span>Min Form</span>
                                        <span className="text-amber-400">{foreignFilters.minForm}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="50"
                                        max="95"
                                        value={foreignFilters.minForm}
                                        onChange={e => setForeignFilters(prev => ({ ...prev, minForm: Number(e.target.value) }))}
                                        className="w-full accent-amber-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                                        <span>Prev Season Perf</span>
                                        <span className="text-purple-400">{foreignFilters.minPrevSeason}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="90"
                                        value={foreignFilters.minPrevSeason}
                                        onChange={e => setForeignFilters(prev => ({ ...prev, minPrevSeason: Number(e.target.value) }))}
                                        className="w-full accent-purple-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                                        <span>Champions League</span>
                                        <span className="text-cyan-400">{foreignFilters.minChampionsLeague}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="90"
                                        value={foreignFilters.minChampionsLeague}
                                        onChange={e => setForeignFilters(prev => ({ ...prev, minChampionsLeague: Number(e.target.value) }))}
                                        className="w-full accent-cyan-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Search & Pool Counter Bar */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                placeholder={`Search ${activePoolTab} by name, role, country, or trait...`}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 transition-all"
                            />
                        </div>

                        <div className="text-xs text-slate-400 font-bold px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl whitespace-nowrap">
                            {filteredAvailablePool.length} Candidates Available
                        </div>
                    </div>

                    {/* PLAYERS DRAFT CARDS GRID */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[580px] overflow-y-auto pr-1">
                        {filteredAvailablePool.length === 0 ? (
                            <div className="col-span-2 p-8 text-center text-slate-500 text-xs bg-slate-900/50 border border-slate-800 rounded-2xl space-y-2">
                                <p>No available players found in the {activePoolTab} pool matching this filter.</p>
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        setSubRoleFilter('ALL');
                                    }}
                                    className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-700"
                                >
                                    Clear Filter Search
                                </button>
                            </div>
                        ) : (
                            filteredAvailablePool.map(p => {
                                const topRating = Math.max(p.battingSkill, p.secondarySkill);
                                const subRole = getPlayerSubRole(p);
                                const form = p.form || 72;
                                const prevSeason = p.previousSeasonPerformance || p.seasonPerformanceScore?.totalScore || 65;

                                const isForeignDisabled = isUserTurn && p.isForeign && userForeignCount >= DRAFT_FOREIGN_PLAYERS;
                                const isNationalDisabled = isUserTurn && !p.isForeign && userNationalCount >= DRAFT_NATIONAL_PLAYERS;
                                const isPickDisabled = !isUserTurn || isForeignDisabled || isNationalDisabled;

                                return (
                                    <div
                                        key={p.id}
                                        className={`p-3.5 bg-slate-900/90 border rounded-2xl space-y-2.5 transition-all flex flex-col justify-between ${
                                            isPickDisabled && isUserTurn
                                                ? 'border-slate-800/50 opacity-50'
                                                : 'border-slate-800 hover:border-slate-700'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="font-extrabold text-sm text-white flex items-center gap-1.5 flex-wrap">
                                                    <span>{p.name}</span>
                                                    {p.isForeign ? (
                                                        <span className="text-[9px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 font-extrabold rounded">
                                                            ✈️ {p.nationality}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[9px] px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 font-extrabold rounded">
                                                            🏠 National
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[11px] font-semibold mt-0.5">
                                                    <span className={getRoleColor(p.role)}>{subRole}</span>
                                                    <span className="text-slate-500">•</span>
                                                    <span className="text-slate-400">Age {p.age}</span>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <div className="text-xs font-black text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                                                    ⭐ {topRating}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Skill & Performance Metrics Grid */}
                                        <div className="grid grid-cols-4 gap-1 text-center bg-slate-950/80 p-2 rounded-xl text-xs">
                                            <div>
                                                <div className="text-[8px] text-slate-400 font-bold uppercase">Batting</div>
                                                <div className="font-black text-amber-400">{p.battingSkill}</div>
                                            </div>
                                            <div>
                                                <div className="text-[8px] text-slate-400 font-bold uppercase">Bowling</div>
                                                <div className="font-black text-cyan-400">{p.secondarySkill}</div>
                                            </div>
                                            <div>
                                                <div className="text-[8px] text-slate-400 font-bold uppercase">Form</div>
                                                <div className="font-black text-emerald-400">{form}</div>
                                            </div>
                                            <div>
                                                <div className="text-[8px] text-slate-400 font-bold uppercase">Prev Score</div>
                                                <div className="font-black text-purple-400">{prevSeason}</div>
                                            </div>
                                        </div>

                                        {/* DRAFT BUTTON */}
                                        <button
                                            onClick={() => handleUserPick(p)}
                                            disabled={isPickDisabled}
                                            className={`w-full py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                                                !isPickDisabled
                                                    ? 'bg-teal-400 hover:bg-teal-300 text-slate-950 shadow-md active:scale-95'
                                                    : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                                            }`}
                                        >
                                            <Zap size={14} />
                                            <span>
                                                {!isUserTurn 
                                                    ? 'Waiting for Turn' 
                                                    : isForeignDisabled 
                                                        ? 'Foreign Limit Full (10/10)' 
                                                        : isNationalDisabled 
                                                            ? 'National Limit Full (12/12)' 
                                                            : 'DRAFT PLAYER'}
                                            </span>
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* RIGHT COL: LIVE DRAFT FEED */}
                <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                        <span>📋 Live Draft Selection Board</span>
                        <span className="text-teal-400 text-[10px]">{draftLog.length} Picks • Round {nextPickInfo?.round || 1}</span>
                    </h3>

                    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 space-y-2 max-h-[620px] overflow-y-auto">
                        {draftLog.length === 0 ? (
                            <div className="p-8 text-center text-xs text-slate-500 space-y-1">
                                <Activity size={24} className="mx-auto text-slate-600 animate-pulse" />
                                <p>Draft picks will appear here in real-time as franchises make selections...</p>
                            </div>
                        ) : (
                            draftLog.map(item => (
                                <div
                                    key={`log-${item.pick}`}
                                    className={`p-2.5 rounded-xl border text-xs space-y-1 transition-all ${
                                        item.isUser
                                            ? 'bg-teal-950/40 border-teal-500/50 shadow-md'
                                            : 'bg-slate-950/70 border-slate-800/80'
                                    }`}
                                >
                                    <div className="flex items-center justify-between text-[11px]">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-mono text-[10px] text-slate-500 font-bold">#{item.pick}</span>
                                            <span className={`font-extrabold ${item.isUser ? 'text-teal-300' : 'text-slate-300'}`}>
                                                {item.teamName}
                                            </span>
                                        </div>
                                        <span className="text-[9px] text-slate-500 font-bold">R{item.round}</span>
                                    </div>

                                    <div className="flex items-center justify-between gap-2">
                                        <div className="font-black text-white text-xs truncate flex items-center gap-1">
                                            <span>{item.player.name}</span>
                                            {item.player.isForeign ? (
                                                <span className="text-[9px] text-amber-300 bg-amber-500/20 px-1 rounded font-bold">
                                                    ✈️ {item.player.nationality}
                                                </span>
                                            ) : (
                                                <span className="text-[9px] text-cyan-300 bg-cyan-500/20 px-1 rounded font-bold">
                                                    🏠
                                                </span>
                                            )}
                                        </div>
                                        <span className={`text-[10px] font-bold shrink-0 ${getRoleColor(item.player.role)}`}>
                                            {getPlayerSubRole(item.player)}
                                        </span>
                                    </div>

                                    {item.reason && (
                                        <div className="text-[9px] text-slate-400 font-mono">
                                            {item.reason}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* FRANCHISE ROSTERS MODAL */}
            {showRosterModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-4xl w-full space-y-4 max-h-[85vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <Users className="text-teal-400" size={20} />
                                <h3 className="text-lg font-black uppercase text-white">All Franchise 22-Player Rosters</h3>
                            </div>
                            <button
                                onClick={() => setShowRosterModal(false)}
                                className="text-slate-400 hover:text-white text-xs font-black px-3 py-1 bg-slate-800 rounded-lg"
                            >
                                Close
                            </button>
                        </div>

                        {/* Team selector tabs */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                            {draftTeams.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setSelectedTeamRosterId(t.id)}
                                    className={`px-3 py-1.5 text-xs font-black rounded-xl whitespace-nowrap border transition-all ${
                                        selectedTeamRosterId === t.id
                                            ? 'bg-teal-400 text-slate-950 border-teal-300 font-black'
                                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                                    }`}
                                >
                                    {t.name} ({t.squad.length}/22)
                                </button>
                            ))}
                        </div>

                        {/* Selected Team Roster */}
                        {(() => {
                            const team = draftTeams.find(t => t.id === selectedTeamRosterId) || draftTeams[0];
                            if (!team) return null;

                            const fCount = team.squad.filter(p => p.isForeign).length;
                            const nCount = team.squad.filter(p => !p.isForeign).length;

                            return (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between bg-slate-950 p-3 rounded-2xl border border-slate-800">
                                        <div className="font-black text-white">{team.name} Squad</div>
                                        <div className="flex items-center gap-2 text-xs font-bold">
                                            <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 rounded-lg">✈️ Foreign: {fCount}/10</span>
                                            <span className="px-2.5 py-1 bg-cyan-500/20 text-cyan-300 rounded-lg">🏠 National: {nCount}/12</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-[400px] overflow-y-auto">
                                        {team.squad.map((p, idx) => (
                                            <div key={p.id} className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
                                                <div className="truncate pr-1">
                                                    <span className="font-mono text-[10px] text-slate-500 mr-1">{idx+1}.</span>
                                                    <span className="font-bold text-slate-200">{p.name}</span>
                                                    {p.isForeign ? (
                                                        <span className="text-[9px] text-amber-400 ml-1">({p.nationality})</span>
                                                    ) : (
                                                        <span className="text-[9px] text-cyan-400 ml-1">🏠</span>
                                                    )}
                                                </div>
                                                <span className={`text-[10px] font-bold ${getRoleColor(p.role)}`}>
                                                    {getPlayerSubRole(p)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* FOREIGN NATION AVAILABILITY MODAL */}
            {showCountryLimitsModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-2xl w-full space-y-4 max-h-[85vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <Globe className="text-amber-400" size={20} />
                                <h3 className="text-lg font-black uppercase text-white">Foreign Nation Availability Quotas (Season {gameData.currentSeason})</h3>
                            </div>
                            <button
                                onClick={() => setShowCountryLimitsModal(false)}
                                className="text-slate-400 hover:text-white text-xs font-black px-3 py-1 bg-slate-800 rounded-lg"
                            >
                                Close
                            </button>
                        </div>

                        <p className="text-xs text-slate-300">
                            Foreign players enter the draft based on strict country availability quotas. Note that small nations become unavailable in future seasons as scheduled, but historical statistics are strictly preserved.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {countryRulesSummary.map(r => (
                                <div key={r.country} className={`p-3 rounded-xl border flex items-center justify-between ${
                                    r.isExpired ? 'bg-red-950/20 border-red-900/40 opacity-60' : 'bg-slate-950 border-slate-800'
                                }`}>
                                    <div>
                                        <div className="font-bold text-white flex items-center gap-1.5">
                                            <span>{r.country}</span>
                                            {r.isExpired && <span className="text-[9px] px-1.5 py-0.2 bg-red-500/20 text-red-400 rounded">Expired</span>}
                                        </div>
                                        <div className="text-[10px] text-slate-400">{r.notes}</div>
                                    </div>
                                    <div className={`font-black text-sm px-2.5 py-1 rounded-lg ${
                                        r.isExpired ? 'bg-slate-800 text-slate-500' : 'bg-amber-500/20 text-amber-300'
                                    }`}>
                                        {r.limit} Players
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuctionRoom;

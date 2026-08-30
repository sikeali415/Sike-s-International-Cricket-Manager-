import React, { useState, useEffect, useMemo } from 'react';
import { GameData, Team, Format, Player, PlayerRole, CareerScreen } from '../types';
import { Icons } from './Icons';
import { getRoleColor, generateAutoXI, getPlayerBadges } from '../utils';
import { playSFX } from '../utils/soundManager';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

const ROLE_OPTIONS = [
    { id: 'WK', label: 'Wicket-keeper', icon: '🤲' },
    { id: 'CA', label: 'Captain', icon: '⭐' },
    { id: 'VC', label: 'Vice-Captain', icon: '🎖️' },
    { id: 'OP', label: 'Opening Batter', icon: '🏏' },
];

interface LineupsProps {
    gameData: GameData;
    userTeam: Team | null;
    handleUpdatePlayingXI: (teamId: string, format: Format, newXI: string[]) => void;
    handleUpdateCaptain: (teamId: string, format: Format, playerId: string) => void;
    showFeedback: (message: string, type?: 'success' | 'error') => void;
    setGameData: React.Dispatch<React.SetStateAction<GameData | null>>;
    setSelectedPlayer?: (player: Player) => void;
    setScreen?: (screen: CareerScreen) => void;
}

const LINEUP_REQUIREMENTS = [
    "Opener or Batter All-rounder",
    "Opener or Batter All-rounder",
    "Opener or Batter All-rounder",
    "Opener or Batter All-rounder",
    "Opener or Batter All-rounder",
    "Opener or Batter All-rounder",
    "Opener or Batter All-rounder",
    "Bowler, Opener or Batter All-rounder",
    "Bowler, Opener or Batter All-rounder",
    "Bowler, Opener or Batter All-rounder",
    "Bowler, Opener or Batter All-rounder",
];

const Lineups: React.FC<LineupsProps> = ({ gameData, userTeam, handleUpdatePlayingXI, handleUpdateCaptain, showFeedback, setGameData, setSelectedPlayer, setScreen }) => {
    const [selectedTeamId, setSelectedTeamId] = useState(userTeam?.id || '');
    const selectedTeam = useMemo(() => gameData.teams.find(t => t.id === selectedTeamId), [gameData.teams, selectedTeamId]);
    const [category, setCategory] = useState<'T20' | 'ODI' | 'Test'>('T20');
    const [selectedFormat, setSelectedFormat] = useState<Format>(gameData.currentFormat);
    const [playingXI, setPlayingXI] = useState<Player[]>([]);
    const [bench, setBench] = useState<Player[]>([]);
    const [playerToSwap, setPlayerToSwap] = useState<Player | null>(null);
    const [showFirstAidModal, setShowFirstAidModal] = useState<{playerId: string, name: string} | null>(null);

    // Sync selectedTeamId if userTeam changes
    useEffect(() => {
        if (userTeam && !selectedTeamId) {
            setSelectedTeamId(userTeam.id);
        }
    }, [userTeam, selectedTeamId]);

    // Helper to get formats for a category
    const getFormatsForCategory = (cat: 'T20' | 'ODI' | 'Test') => {
        switch(cat) {
            case 'T20': return [Format.T20];
            case 'ODI': return [Format.ODI];
            case 'Test': return [Format.SHIELD];
        }
    };

    // Auto-switch selected format when category changes
    useEffect(() => {
        const formats = getFormatsForCategory(category);
        if (!formats.includes(selectedFormat)) {
            setSelectedFormat(formats[0]);
        }
    }, [category, selectedFormat]);

    useEffect(() => {
        setPlayerToSwap(null);
    }, [selectedTeamId, selectedFormat]);

    useEffect(() => {
        if (!selectedTeamId) return;
        const teamData = gameData.teams.find(t => t.id === selectedTeamId);
        if (!teamData) return;

        // Sync squad with latest allPlayers records strictly from teamData.squad
        const squadMap = new Map<string, Player>();
        
        if (teamData.squad) {
            teamData.squad.forEach(sp => {
                const latest = gameData.allPlayers.find(ap => ap.id === sp.id) || sp;
                squadMap.set(latest.id, latest);
            });
        }

        const currentSquad = Array.from(squadMap.values());

        const rawXiIds = gameData.playingXIs[teamData.id]?.[selectedFormat] || [];
        const xiIds = Array.from(new Set(rawXiIds));
        let xiPlayers: Player[] = [];

        if (xiIds.length === 11) {
             const foundPlayers = xiIds.map(id => currentSquad.find(p => p.id === id)).filter(Boolean) as Player[];
             const uniqueFound = Array.from(new Set(foundPlayers));
             if (uniqueFound.length === 11) {
                xiPlayers = uniqueFound;
             } else {
                xiPlayers = generateAutoXI(currentSquad, selectedFormat);
                handleUpdatePlayingXI(teamData.id, selectedFormat, xiPlayers.map(p => p.id));
             }
        } else {
            xiPlayers = generateAutoXI(currentSquad, selectedFormat);
            handleUpdatePlayingXI(teamData.id, selectedFormat, xiPlayers.map(p => p.id));
        }
        
        // Ensure xiPlayers has strictly unique players by ID
        const uniqueXI: Player[] = [];
        const xiSeen = new Set<string>();
        xiPlayers.forEach(p => {
            if (p && !xiSeen.has(p.id)) {
                xiSeen.add(p.id);
                uniqueXI.push(p);
            }
        });

        setPlayingXI(uniqueXI);
        const xiIdSet = new Set(uniqueXI.map(p => p.id));
        const newBench = currentSquad.filter(p => !xiIdSet.has(p.id));
        setBench(newBench);
    }, [selectedTeamId, selectedFormat, gameData.teams, gameData.allPlayers, gameData.playingXIs, handleUpdatePlayingXI]); // Avoid deep gameData dependency

    const captainId = selectedTeam?.captains?.[selectedFormat] || selectedTeam?.captainId || '';
    const viceCaptainId = selectedTeam?.viceCaptains?.[selectedFormat] || selectedTeam?.viceCaptainId || '';

    const handleOnDragEnd = (result: DropResult) => {
        if (!result.destination) return;
        const items: Player[] = Array.from(playingXI);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        
        // Update batting positions correctly
        const updatedIds = items.map((p: Player) => p.id);
        setPlayingXI(items);
        handleUpdatePlayingXI(selectedTeam!.id, selectedFormat, updatedIds);
        showFeedback("Batting order updated!", "success");
    };

    const setViceCaptain = (playerId: string | null) => {
        if (!selectedTeam || !setGameData) return;
        setGameData(prev => {
            if (!prev) return null;
            const newTeams = prev.teams.map(t => {
                if (t.id === selectedTeam.id) {
                    const currentVCs = { ...(t.viceCaptains || {}) };
                    if (playerId) {
                        currentVCs[selectedFormat] = playerId;
                    } else {
                        delete currentVCs[selectedFormat];
                    }
                    return {
                        ...t,
                        viceCaptains: currentVCs,
                        viceCaptainId: playerId || t.viceCaptainId
                    };
                }
                return t;
            });
            return { ...prev, teams: newTeams };
        });
        if (playerId) {
            const player = playingXI.find(p => p.id === playerId);
            showFeedback(`${player?.name} appointed as Vice-Captain! 🎖️`, "success");
        } else {
            showFeedback("Vice-Captain removed.", "success");
        }
    };

    const toggleRole = (playerId: string, role: string) => {
        if (!selectedTeam) return;
        
        if (role === 'CA') {
            setCaptain(playerId === captainId ? null : playerId);
        } else if (role === 'VC') {
            setViceCaptain(playerId === viceCaptainId ? null : playerId);
        } else if (role === 'WK') {
            // Assign as Wicketkeeper - usually depends on player role, 
            // but we can move them to a 'WK' slot if we had one.
            // For now, let's ensure they are the only WK in XI if possible, 
            // or just highlight them.
            const player = playingXI.find(p => p.id === playerId);
            if (player?.role !== PlayerRole.WICKET_KEEPER) {
                showFeedback(`Warning: ${player?.name} is not a specialist Wicket-keeper!`, "error");
            }
            showFeedback(`${player?.name} assigned as active Wicket-keeper 🤲`, "success");
        } else if (role === 'OP') {
            // Assign as Opener - move to position 1 or 2
            const index = playingXI.findIndex(p => p.id === playerId);
            if (index < 2) {
                showFeedback(`${playingXI[index].name} is already an opening batter.`, "success");
                return;
            }
            
            const newXI = [...playingXI];
            const [player] = newXI.splice(index, 1);
            // Move to first available opener slot (0 or 1)
            newXI.splice(0, 0, player);
            setPlayingXI(newXI);
            handleUpdatePlayingXI(selectedTeam.id, selectedFormat, newXI.map(p => p.id));
            showFeedback(`${player.name} moved to Opening Slot 🏏`, "success");
        }
    };

    const setCaptain = (playerId: string | null) => {
        if (playerId) {
            const player = playingXI.find(p => p.id === playerId);
            handleUpdateCaptain(selectedTeam!.id, selectedFormat, playerId);
            showFeedback(`${player?.name} appointed as Captain!`, "success");
        } else {
            handleUpdateCaptain(selectedTeam!.id, selectedFormat, "");
            showFeedback("Captain removed.", "success");
        }
    };

    const selectPlayerForSwap = (player: Player) => {
        if (playerToSwap && playerToSwap.id === player.id) {
            setPlayerToSwap(null);
        } else {
            setPlayerToSwap(player);
            showFeedback(`Selected ${player.name} to swap. Select a player from the bench below to finish.`, "success");
        }
    };

    const completeSwap = (playerFromBench: Player) => {
        if (!playerToSwap || !selectedTeam) return;
        if (playerFromBench.injury) {
            showFeedback(`Cannot select ${playerFromBench.name} as they are injured!`, "error");
            return;
        }
        
        if (playingXI.some(p => p.id === playerFromBench.id)) {
            showFeedback(`${playerFromBench.name} is already in the Playing XI!`, "error");
            setPlayerToSwap(null);
            return;
        }

        const newXI = playingXI.map(p => p.id === playerToSwap.id ? playerFromBench : p);

        const squadMap = new Map<string, Player>();
        if (selectedTeam.squad) {
            selectedTeam.squad.forEach(sp => {
                const latest = gameData.allPlayers.find(ap => ap.id === sp.id) || sp;
                squadMap.set(latest.id, latest);
            });
        }
        const currentSquad = Array.from(squadMap.values());

        const xiIdSet = new Set(newXI.map(p => p.id));
        const newBench = currentSquad.filter(p => !xiIdSet.has(p.id));

        setPlayingXI(newXI);
        setBench(newBench);
        handleUpdatePlayingXI(selectedTeam.id, selectedFormat, newXI.map(p => p.id));
        setPlayerToSwap(null);
        showFeedback("Players swapped successfully!", "success");
    };

    const useFirstAid = (playerId: string) => {
        const player = selectedTeam?.squad.find(p => p.id === playerId);
        if (!player) return;
        setShowFirstAidModal({ playerId, name: player.name });
    };

    const handleFirstAidAction = (action: 'quick' | 'emergency' | 'save') => {
        if (!showFirstAidModal || !setGameData) return;
        const playerId = showFirstAidModal.playerId;
        setGameData(prev => {
            if (!prev) return null;
            const newTeams = prev.teams.map(t => {
                if (t.id === prev.userTeamId) {
                    return { ...t, firstAidKits: Math.max(0, (t.firstAidKits || 0) - 1) };
                }
                return t;
            });
            const updatePlayer = (p: Player) => {
                if (p.id !== playerId) return p;
                const newP = { ...p };
                if (action === 'quick') {
                    if (newP.injury) newP.injury = { ...newP.injury, durationValue: Math.max(1, Math.floor(newP.injury.durationValue / 2)) };
                } else if (action === 'emergency') {
                    newP.healthStatus = 'temporary_fit';
                    newP.injury = null;
                } else if (action === 'save') {
                    if (newP.injury && newP.injury.durationType === 'seasons') newP.injury = { ...newP.injury, durationValue: 1 };
                }
                return newP;
            };
            return {
                ...prev,
                teams: newTeams.map(t => ({ ...t, squad: t.squad.map(updatePlayer) })),
                allPlayers: prev.allPlayers.map(updatePlayer)
            };
        });
        setShowFirstAidModal(null);
        showFeedback("Medical treatment applied!", "success");
    };

    return (
        <div className="p-2 h-[calc(100vh-90px)] flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
            <header className="mb-4">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white text-center tracking-tight">TEAM MANAGEMENT</h2>
                <div className="mt-2">
                    <select 
                        value={selectedTeamId} 
                        onChange={(e) => setSelectedTeamId(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl font-bold text-sm shadow-sm"
                    >
                        {gameData.teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                    </select>
                </div>
            </header>

            {/* Medical status if user team */}
            {selectedTeam?.id === gameData.userTeamId && (
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-3 rounded-xl mb-4 border border-slate-700/50 flex justify-between items-center shadow-lg">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center text-xl">🚑</div>
                        <div>
                            <p className="text-white font-bold text-sm uppercase">Medical Facility</p>
                            <p className="text-slate-400 text-[10px]">Active Kits: {selectedTeam.firstAidKits || 0}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Format Selection */}
            <div className="grid grid-cols-3 gap-1 mb-4 bg-slate-200 dark:bg-slate-900 p-1 rounded-xl border border-slate-300 dark:border-slate-800 overflow-x-auto">
                {(['T20', 'ODI', 'Test'] as const).map((cat) => (
                    <button 
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`py-2 text-xs uppercase font-black rounded-lg transition-all ${category === cat ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-md scale-[1.02]' : 'text-slate-500'}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            <div className="flex-1 flex flex-col min-h-0">
                <div className="flex justify-between items-center mb-2 px-1">
                    <div className="flex items-center gap-2">
                        <h3 className="font-black text-xs uppercase tracking-widest text-slate-500">Active XI <span className="text-teal-500">[{playingXI.length}/11]</span></h3>
                    </div>
                    <button
                        onClick={() => {
                            const optimalXI = generateAutoXI(selectedTeam!.squad, selectedFormat);
                            setPlayingXI(optimalXI);
                            const xiSet = new Set(optimalXI.map(p => p.id));
                            setBench(selectedTeam!.squad.filter(p => !xiSet.has(p.id)));
                            handleUpdatePlayingXI(selectedTeam!.id, selectedFormat, optimalXI.map(p => p.id));
                            showFeedback("Auto-Optimization Complete 🔘", "success");
                        }}
                        className="text-[10px] bg-teal-600 hover:bg-teal-500 text-white font-black px-3 py-1 rounded-full uppercase transition-all flex items-center gap-1 shadow-sm"
                    >
                         <span>Optimize 🔘</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                    <DragDropContext onDragEnd={handleOnDragEnd}>
                        <Droppable droppableId="lineup">
                            {(provided) => (
                                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-1.5">
                                    {playingXI.map((player, index) => (
                                        <Draggable {...({ draggableId: player.id, index: index } as any)} key={player.id}>
                                            {(provided: any, snapshot: any) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    className={`group relative flex items-center bg-white dark:bg-slate-900 border ${snapshot.isDragging ? 'border-teal-500 ring-4 ring-teal-500/10 z-50' : 'border-slate-200 dark:border-slate-800'} p-2 rounded-xl transition-all ${playerToSwap?.id === player.id ? 'bg-teal-50 dark:bg-teal-900/30' : ''}`}
                                                >
                                                    {/* Drag Handle */}
                                                    <div {...provided.dragHandleProps} className="mr-2 text-slate-300 dark:text-slate-700 hover:text-slate-500 transition-colors">
                                                        <Icons.DragHandle />
                                                    </div>

                                                    {/* Position Number & Requirement */}
                                                    <div className="flex flex-col items-center mr-3 w-8">
                                                        <span className="text-[10px] font-black text-slate-400">{index + 1}</span>
                                                        <div className="w-1.5 h-1.5 rounded-full bg-teal-500/20 mt-0.5"></div>
                                                    </div>

                                                    <div 
                                                        className="flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-all"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (setSelectedPlayer && setScreen) {
                                                                playSFX('click');
                                                                setSelectedPlayer(player);
                                                                setScreen('PLAYER_PROFILE');
                                                            }
                                                        }}
                                                        title="Click to view Player Performance & Stats Trend"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black text-white ${getRoleColor(player.role)}`}>{player.role}</span>
                                                            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate flex items-center gap-1.5">
                                                                {player.name}
                                                                {player.isForeign && <span className="text-[8px] bg-sky-500 text-white px-1 rounded shadow-sm">F</span>}
                                                                {player.id === captainId && <span className="text-[8px] bg-yellow-500 text-white px-1 rounded shadow-sm font-bold">C</span>}
                                                                {player.id === viceCaptainId && <span className="text-[8px] bg-teal-500 text-white px-1 rounded shadow-sm font-bold">VC</span>}
                                                                {player.role === PlayerRole.WICKET_KEEPER && <span className="text-[8px] bg-green-500 text-white px-1 rounded shadow-sm">WK</span>}
                                                                {index < 2 && <span className="text-[8px] bg-slate-500 text-white px-1 rounded shadow-sm">OP</span>}
                                                            </h4>
                                                        </div>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-[8px] uppercase text-slate-400 font-bold">Age</span>
                                                                <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400">{player.age}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-[8px] uppercase text-slate-400 font-bold">Skill</span>
                                                                <span className="text-[10px] font-mono text-teal-600 dark:text-teal-400">{Math.max(player.battingSkill, player.secondarySkill)}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1 text-[8px] text-slate-400 italic">
                                                                {LINEUP_REQUIREMENTS[index]}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Actions Toolbar */}
                                                    <div className="flex items-center gap-1 ml-2">
                                                        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 mr-1">
                                                            {ROLE_OPTIONS.map(opt => (
                                                                <button
                                                                    key={opt.id}
                                                                    onClick={() => toggleRole(player.id, opt.id)}
                                                                    className={`p-1.5 rounded-md transition-all ${
                                                                        (opt.id === 'CA' && player.id === captainId) || 
                                                                        (opt.id === 'VC' && player.id === viceCaptainId) ||
                                                                        (opt.id === 'WK' && player.role === PlayerRole.WICKET_KEEPER) ||
                                                                        (opt.id === 'OP' && index < 2)
                                                                        ? 'bg-teal-500 text-white shadow-sm' 
                                                                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                                                    }`}
                                                                    title={`Assign as ${opt.label}`}
                                                                >
                                                                    <span className="text-[10px]">{opt.icon}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <button 
                                                            onClick={() => {
                                                                // Slot Optimization Logic
                                                                const requirement = LINEUP_REQUIREMENTS[index];
                                                                const availableBench = bench.filter(p => !p.injury);
                                                                if (availableBench.length === 0) {
                                                                    showFeedback("No healthy players available on bench for this format.", "error");
                                                                    return;
                                                                }
                                                                
                                                                // Scoring function based on requirement
                                                                const getScore = (p: Player) => {
                                                                    let score = p.battingSkill;
                                                                    if (requirement.includes("Bowler")) score = Math.max(p.battingSkill, p.secondarySkill);
                                                                    if (requirement.includes("All-rounder")) score = (p.battingSkill + p.secondarySkill) / 1.5;
                                                                    return score;
                                                                };
                                                                
                                                                const best = [...availableBench].sort((a, b) => getScore(b) - getScore(a))[0];
                                                                if (best && getScore(best) > getScore(player)) {
                                                                    completeSwap(best);
                                                                    showFeedback(`Optimized Slot ${index + 1} with ${best.name} 🔘`, "success");
                                                                } else {
                                                                    showFeedback(`Slot ${index + 1} is already optimized! 🔘`, "success");
                                                                }
                                                            }}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:bg-teal-500/10 hover:text-teal-500 transition-all"
                                                            title="Optimize this slot"
                                                        >
                                                            <span className="text-sm">🔘</span>
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setCaptain(player.id === captainId ? null : player.id); }}
                                                            className={`p-1.5 rounded-lg transition-all ${player.id === captainId ? 'bg-yellow-500 text-white' : 'text-slate-400 hover:bg-yellow-500/10 hover:text-yellow-500'}`}
                                                            title={player.id === captainId ? "Remove Captain" : "Make Captain"}
                                                        >
                                                            <Icons.Trophy className="h-4 w-4" />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); selectPlayerForSwap(player); }}
                                                            className={`p-1.5 rounded-lg transition-all text-red-500 hover:bg-red-500/10`}
                                                            title="Swap with bench"
                                                        >
                                                            <Icons.RemoveCircle className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>

                    {/* Bench Section */}
                    <div className="mt-8">
                        <div className="sticky top-0 bg-slate-50 dark:bg-slate-950 z-10 py-2 border-b border-slate-200 dark:border-slate-800 mb-3 flex justify-between items-center">
                            <h3 className="font-black text-xs uppercase tracking-widest text-slate-500">Subs & Reserves</h3>
                            {playerToSwap && (
                                <span className="text-[9px] bg-teal-500 text-white px-2 py-0.5 rounded-full font-black animate-pulse uppercase">Select replacement</span>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            {bench.map((player) => (
                                <div key={player.id} className={`flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl ${player.injury ? 'border-l-4 border-l-amber-500' : ''}`}>
                                    <div 
                                        className="flex-1 min-w-0 ml-1 cursor-pointer hover:opacity-80 transition-all"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (setSelectedPlayer && setScreen) {
                                                playSFX('click');
                                                setSelectedPlayer(player);
                                                setScreen('PLAYER_PROFILE');
                                            }
                                        }}
                                        title="Click to view Player Performance & Stats Trend"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black text-white ${getRoleColor(player.role)}`}>{player.role}</span>
                                            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{player.name}</h4>
                                            {player.isForeign && <span className="text-[8px] bg-sky-500 text-white px-1 rounded">F</span>}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[10px] font-mono text-slate-500">Age: {player.age}</span>
                                            <span className="text-[10px] font-mono text-slate-500">Bat: {player.battingSkill}</span>
                                            {player.injury && <span className="text-[9px] text-amber-500 font-black animate-pulse">! INJURED</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {player.injury && (
                                            <button 
                                                onClick={() => useFirstAid(player.id)}
                                                className="p-1 px-2.5 bg-red-600 text-white text-[8px] font-black rounded-lg hover:bg-red-500 transition-colors uppercase shadow-sm"
                                            >
                                                Medic
                                            </button>
                                        )}
                                        <button 
                                            disabled={!playerToSwap || !!player.injury}
                                            onClick={() => completeSwap(player)}
                                            className={`p-2 rounded-xl transition-all ${playerToSwap ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
                                        >
                                            <Icons.PlusCircle className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal remains identical in spirit */}
            {showFirstAidModal && (
                <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-800 rounded-3xl border border-slate-700 w-full max-w-sm p-6 shadow-2xl scale-in-center">
                        <h3 className="text-white font-black text-xl mb-2">Medical Emergency</h3>
                        <p className="text-slate-400 text-sm mb-6">Select treatment for <span className="text-teal-400 font-bold">{showFirstAidModal.name}</span>:</p>
                        <div className="space-y-2">
                            {['quick', 'emergency', 'save'].map((action) => (
                                <button 
                                    key={action}
                                    onClick={() => handleFirstAidAction(action as any)}
                                    className="w-full p-4 bg-slate-700/50 hover:bg-teal-600 border border-slate-600/50 hover:border-teal-400 rounded-2xl text-left transition-all flex items-center gap-4 group"
                                >
                                    <span className="text-2xl group-hover:scale-110 transition-transform">{action === 'quick' ? '⚡' : action === 'emergency' ? '🚑' : '🏛️'}</span>
                                    <div>
                                        <p className="text-white font-bold text-sm capitalize">{action} Mode</p>
                                        <p className="text-[10px] text-slate-400 uppercase">{action === 'quick' ? 'Speed up recovery' : action === 'emergency' ? 'Play immediately' : 'Season rescue'}</p>
                                    </div>
                                </button>
                            ))}
                            <button 
                                onClick={() => setShowFirstAidModal(null)}
                                className="w-full py-4 text-slate-500 font-bold hover:text-white transition-colors text-sm"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Lineups;
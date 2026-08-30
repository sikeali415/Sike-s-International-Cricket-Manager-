import React, { useState, useMemo } from 'react';
import { GameData, Team, Player, PlayerRole, Format, NewsArticle } from '../types';
import { Icons } from './Icons';
import { getRoleColor, getRoleFullName, getBattingStyleLabel } from '../utils';
import { playSFX } from '../utils/soundManager';
import { 
    Users, 
    Crown, 
    Award, 
    ShieldCheck, 
    Check, 
    AlertCircle, 
    Sparkles, 
    X, 
    UserPlus, 
    UserMinus, 
    ChevronRight,
    Flame,
    Swords,
    Radio
} from 'lucide-react';
import { generateSquadAnnouncementNews } from '../utils/dynamicNewsEngine';

interface MatchSquadModalProps {
    isOpen: boolean;
    onClose: () => void;
    gameData: GameData;
    userTeam: Team;
    setGameData: React.Dispatch<React.SetStateAction<GameData | null>>;
    showFeedback: (msg: string, type?: 'success' | 'error') => void;
    onConfirmed?: () => void;
    upcomingMatch?: { teamA: string; teamB: string; matchNumber?: string; format?: Format; ground?: string } | null;
}

export const MatchSquadModal: React.FC<MatchSquadModalProps> = ({
    isOpen,
    onClose,
    gameData,
    userTeam,
    setGameData,
    showFeedback,
    onConfirmed,
    upcomingMatch
}) => {
    const currentFormat = (upcomingMatch?.format || gameData.currentFormat || Format.T20) as Format;
    
    // Existing saved captain and squad
    const initialCaptainId = userTeam.captains?.[currentFormat] || userTeam.captainId || userTeam.squad[0]?.id || '';
    const initialViceCaptainId = userTeam.viceCaptains?.[currentFormat] || userTeam.viceCaptainId || userTeam.squad[1]?.id || '';

    // Initialize 15-player selection
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(() => {
        const squadIds = userTeam.squad.map(p => p.id);
        if (squadIds.length <= 15) return squadIds;
        // Prioritize Playing XI first, then highest skilled
        const existingXI = gameData.playingXIs?.[userTeam.id]?.[currentFormat] || [];
        const combined = Array.from(new Set([...existingXI, ...squadIds]));
        return combined.slice(0, 15);
    });

    const [selectedCaptainId, setSelectedCaptainId] = useState<string>(initialCaptainId);
    const [selectedViceCaptainId, setSelectedViceCaptainId] = useState<string>(initialViceCaptainId);
    const [roleFilter, setRoleFilter] = useState<'ALL' | 'BAT' | 'BOWL' | 'AR' | 'WK'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    if (!isOpen) return null;

    const opponentName = upcomingMatch 
        ? (upcomingMatch.teamA.toLowerCase() === userTeam.name.toLowerCase() ? upcomingMatch.teamB : upcomingMatch.teamA)
        : 'Upcoming Match';

    // Synchronize squad player objects
    const allSquadPlayers = userTeam.squad.map(sp => {
        return gameData.allPlayers.find(ap => ap.id === sp.id) || sp;
    });

    const togglePlayerSelection = (playerId: string) => {
        playSFX('click');
        if (selectedPlayerIds.includes(playerId)) {
            setSelectedPlayerIds(prev => prev.filter(id => id !== playerId));
            // If captain was removed, clear captain
            if (selectedCaptainId === playerId) {
                const remaining = selectedPlayerIds.filter(id => id !== playerId);
                setSelectedCaptainId(remaining[0] || '');
            }
            if (selectedViceCaptainId === playerId) {
                const remaining = selectedPlayerIds.filter(id => id !== playerId);
                setSelectedViceCaptainId(remaining[1] || remaining[0] || '');
            }
        } else {
            if (selectedPlayerIds.length >= 15) {
                showFeedback("Squad is already capped at 15 players. Deselect a player first.", "error");
                playSFX('error');
                return;
            }
            setSelectedPlayerIds(prev => [...prev, playerId]);
            // If no captain selected, set as captain
            if (!selectedCaptainId) {
                setSelectedCaptainId(playerId);
            }
        }
    };

    const handleAutoPickBest15 = () => {
        playSFX('click');
        // Sort players by best rating & fitness
        const sorted = [...allSquadPlayers].sort((a, b) => {
            const aRating = (a.battingSkill + a.secondarySkill) * (a.injury ? 0.4 : 1.0);
            const bRating = (b.battingSkill + b.secondarySkill) * (b.injury ? 0.4 : 1.0);
            return bRating - aRating;
        });

        // Ensure at least 1 WK, 4 Batters, 4 Bowlers, 2 All-Rounders
        const wks = sorted.filter(p => p.role === PlayerRole.WICKET_KEEPER && !p.injury);
        const bats = sorted.filter(p => p.role === PlayerRole.BATSMAN && !p.injury);
        const bowlers = sorted.filter(p => (p.role === PlayerRole.FAST_BOWLER || p.role === PlayerRole.SPIN_BOWLER) && !p.injury);
        const ars = sorted.filter(p => p.role === PlayerRole.ALL_ROUNDER && !p.injury);

        const picked = new Set<string>();
        wks.slice(0, 2).forEach(p => picked.add(p.id));
        bats.slice(0, 5).forEach(p => picked.add(p.id));
        bowlers.slice(0, 5).forEach(p => picked.add(p.id));
        ars.slice(0, 3).forEach(p => picked.add(p.id));

        // Fill up remaining to 15
        for (const p of sorted) {
            if (picked.size >= 15) break;
            if (!p.injury) picked.add(p.id);
        }
        for (const p of sorted) {
            if (picked.size >= 15) break;
            picked.add(p.id);
        }

        const new15 = Array.from(picked).slice(0, 15);
        setSelectedPlayerIds(new15);

        if (!new15.includes(selectedCaptainId)) {
            setSelectedCaptainId(new15[0] || '');
        }
        if (!new15.includes(selectedViceCaptainId)) {
            setSelectedViceCaptainId(new15[1] || new15[0] || '');
        }
        showFeedback("Auto-selected balanced 15-player squad based on current ratings!", "success");
    };

    const handleConfirmSquad = () => {
        if (selectedPlayerIds.length < 11) {
            showFeedback("You must select at least 11 players for the squad.", "error");
            playSFX('error');
            return;
        }

        if (!selectedCaptainId || !selectedPlayerIds.includes(selectedCaptainId)) {
            showFeedback("Please select a Team Captain from your 15-man squad.", "error");
            playSFX('error');
            return;
        }

        const selectedPlayers = allSquadPlayers.filter(p => selectedPlayerIds.includes(p.id));
        const droppedPlayers = allSquadPlayers.filter(p => !selectedPlayerIds.includes(p.id));
        const captainPlayer = allSquadPlayers.find(p => p.id === selectedCaptainId) || selectedPlayers[0];

        // Generate dynamic news article announcing the squad, captain, incomers & dropped players
        const newsArticle = generateSquadAnnouncementNews(
            userTeam,
            opponentName,
            selectedPlayers,
            droppedPlayers,
            captainPlayer,
            currentFormat,
            true
        );

        // Also generate squad news for AI teams if applicable
        const aiTeamsNews: NewsArticle[] = [];
        const otherTeams = gameData.teams.filter(t => t.id !== userTeam.id);
        if (otherTeams.length > 0) {
            const randomAiTeam = otherTeams[Math.floor(Math.random() * otherTeams.length)];
            const aiSquad = randomAiTeam.squad;
            const ai15 = aiSquad.slice(0, 15);
            const aiDropped = aiSquad.slice(15);
            const aiCaptain = aiSquad.find(p => p.id === randomAiTeam.captains?.[currentFormat]) || aiSquad[0];
            if (aiCaptain) {
                aiTeamsNews.push(generateSquadAnnouncementNews(
                    randomAiTeam,
                    userTeam.name,
                    ai15,
                    aiDropped,
                    aiCaptain,
                    currentFormat,
                    false
                ));
            }
        }

        setGameData(prev => {
            if (!prev) return null;

            const updatedTeams = prev.teams.map(t => {
                if (t.id === userTeam.id) {
                    const newCaptains = { ...(t.captains || {}), [currentFormat]: selectedCaptainId };
                    const newViceCaptains = { ...(t.viceCaptains || {}), [currentFormat]: selectedViceCaptainId };
                    return {
                        ...t,
                        captains: newCaptains,
                        viceCaptains: newViceCaptains,
                        captainId: selectedCaptainId,
                        viceCaptainId: selectedViceCaptainId
                    };
                }
                return t;
            });

            // Ensure playing XI is a subset of the selected 15 players
            const currentXI = prev.playingXIs?.[userTeam.id]?.[currentFormat] || [];
            const validXI = currentXI.filter(id => selectedPlayerIds.includes(id));
            let finalXI = [...validXI];
            if (finalXI.length < 11) {
                for (const pid of selectedPlayerIds) {
                    if (!finalXI.includes(pid)) {
                        finalXI.push(pid);
                        if (finalXI.length === 11) break;
                    }
                }
            }

            const updatedPlayingXIs = {
                ...(prev.playingXIs || {}),
                [userTeam.id]: {
                    ...(prev.playingXIs?.[userTeam.id] || {}),
                    [currentFormat]: finalXI
                }
            };

            return {
                ...prev,
                teams: updatedTeams,
                playingXIs: updatedPlayingXIs,
                news: [newsArticle, ...aiTeamsNews, ...(prev.news || [])].slice(0, 60)
            };
        });

        playSFX('success');
        showFeedback(`15-Man Squad & Captain confirmed! Press release published in News.`, "success");
        onClose();
        if (onConfirmed) onConfirmed();
    };

    // Role counts among selected 15
    const selectedPlayers = allSquadPlayers.filter(p => selectedPlayerIds.includes(p.id));
    const wkCount = selectedPlayers.filter(p => p.role === PlayerRole.WICKET_KEEPER).length;
    const batCount = selectedPlayers.filter(p => p.role === PlayerRole.BATSMAN).length;
    const bowlCount = selectedPlayers.filter(p => p.role === PlayerRole.FAST_BOWLER || p.role === PlayerRole.SPIN_BOWLER).length;
    const arCount = selectedPlayers.filter(p => p.role === PlayerRole.ALL_ROUNDER).length;

    const filteredPlayers = allSquadPlayers.filter(p => {
        const matchesSearch = searchQuery.trim() === '' || 
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            p.nationality.toLowerCase().includes(searchQuery.toLowerCase());
        
        let matchesRole = true;
        if (roleFilter === 'BAT') matchesRole = p.role === PlayerRole.BATSMAN;
        else if (roleFilter === 'BOWL') matchesRole = p.role === PlayerRole.FAST_BOWLER || p.role === PlayerRole.SPIN_BOWLER;
        else if (roleFilter === 'AR') matchesRole = p.role === PlayerRole.ALL_ROUNDER;
        else if (roleFilter === 'WK') matchesRole = p.role === PlayerRole.WICKET_KEEPER;

        return matchesSearch && matchesRole;
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <div className="bg-slate-900 border border-teal-500/30 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 p-4 sm:p-5 border-b border-teal-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-400 flex items-center justify-center font-black">
                            <Radio className="w-5 h-5 animate-pulse text-teal-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-teal-400 bg-teal-950 px-2 py-0.5 rounded border border-teal-500/30">
                                    Official Tour Selection
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold">2 Days Pre-Match</span>
                            </div>
                            <h3 className="text-lg sm:text-xl font-black uppercase text-white tracking-tight">
                                {userTeam.name} 15-Man Match Squad &amp; Captain
                            </h3>
                            <p className="text-xs text-slate-400">
                                Select 15 players for the clash vs <span className="text-teal-300 font-bold">{opponentName}</span> ({currentFormat})
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Squad Count & Role Distribution Bar */}
                <div className="bg-slate-950/80 p-3 sm:p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className={`px-3 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 ${
                            selectedPlayerIds.length === 15 
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : selectedPlayerIds.length > 15
                                ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}>
                            <Users size={14} />
                            <span>{selectedPlayerIds.length} / 15 Players Selected</span>
                        </div>

                        {/* Breakdown pills */}
                        <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold">
                            <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded-lg border border-slate-700">🏏 Bat: {batCount}</span>
                            <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded-lg border border-slate-700">🤲 WK: {wkCount}</span>
                            <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded-lg border border-slate-700">⚡ AR: {arCount}</span>
                            <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded-lg border border-slate-700">🎯 Bowl: {bowlCount}</span>
                        </div>
                    </div>

                    <button
                        onClick={handleAutoPickBest15}
                        className="bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
                    >
                        <Sparkles size={14} className="text-teal-400" />
                        <span>Auto-Pick Best 15</span>
                    </button>
                </div>

                {/* Search & Filter */}
                <div className="p-3 sm:px-4 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row gap-2 items-center justify-between">
                    <input 
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search squad player name or nationality..."
                        className="w-full sm:w-64 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    />

                    <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto">
                        {(['ALL', 'BAT', 'WK', 'AR', 'BOWL'] as const).map(role => (
                            <button
                                key={role}
                                onClick={() => setRoleFilter(role)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                    roleFilter === role
                                        ? 'bg-teal-500 text-slate-950'
                                        : 'bg-slate-800 text-slate-400 hover:text-white'
                                }`}
                            >
                                {role === 'ALL' ? 'All' : role}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Player Selection List */}
                <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-2">
                    {filteredPlayers.map(player => {
                        const isSelected = selectedPlayerIds.includes(player.id);
                        const isCaptain = selectedCaptainId === player.id;
                        const isViceCaptain = selectedViceCaptainId === player.id;
                        const hasInjury = !!player.injury;

                        return (
                            <div
                                key={player.id}
                                onClick={() => togglePlayerSelection(player.id)}
                                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                    isSelected
                                        ? 'bg-teal-950/40 border-teal-500/50 shadow-md ring-1 ring-teal-500/30'
                                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-75'
                                }`}
                            >
                                {/* Left Info */}
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border ${
                                        isSelected 
                                            ? 'bg-teal-500 text-slate-950 border-teal-400 font-black' 
                                            : 'bg-slate-900 border-slate-700 text-slate-600'
                                    }`}>
                                        {isSelected ? <Check size={14} strokeWidth={3} /> : null}
                                    </div>

                                    {/* Player Avatar */}
                                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                                        {player.image || player.avatar ? (
                                            <img src={player.image || player.avatar} alt={player.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                        ) : (
                                            <span className="text-sm font-black text-slate-400">{player.name.substring(0, 2).toUpperCase()}</span>
                                        )}
                                    </div>

                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <h4 className="text-xs sm:text-sm font-black text-white truncate">{player.name}</h4>
                                            {isCaptain && (
                                                <span className="bg-amber-500 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded flex items-center gap-0.5">
                                                    <Crown size={10} /> C
                                                </span>
                                            )}
                                            {isViceCaptain && !isCaptain && (
                                                <span className="bg-cyan-500 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded flex items-center gap-0.5">
                                                    <Award size={10} /> VC
                                                </span>
                                            )}
                                            {hasInjury && (
                                                <span className="bg-red-500/20 text-red-400 border border-red-500/40 text-[9px] font-bold px-1.5 py-0.2 rounded">
                                                    Injured
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                            <span className={`font-bold ${getRoleColor(player.role)}`}>{getRoleFullName(player.role)}</span>
                                            <span>•</span>
                                            <span>Bat: <strong className="text-white">{player.battingSkill}</strong></span>
                                            <span>Bowl: <strong className="text-white">{player.secondarySkill}</strong></span>
                                            <span>•</span>
                                            <span>{player.nationality}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Controls: Captain & Vice-Captain assignment */}
                                {isSelected && (
                                    <div 
                                        onClick={e => e.stopPropagation()} 
                                        className="flex items-center gap-1.5 shrink-0"
                                    >
                                        <button
                                            onClick={() => {
                                                playSFX('click');
                                                setSelectedCaptainId(player.id);
                                                if (selectedViceCaptainId === player.id) setSelectedViceCaptainId('');
                                            }}
                                            className={`p-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all ${
                                                isCaptain 
                                                    ? 'bg-amber-500 text-slate-950 shadow-md ring-1 ring-amber-400' 
                                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-400'
                                            }`}
                                            title="Make Captain"
                                        >
                                            <Crown size={12} />
                                            <span className="hidden sm:inline">Captain</span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                playSFX('click');
                                                setSelectedViceCaptainId(player.id);
                                                if (selectedCaptainId === player.id) setSelectedCaptainId('');
                                            }}
                                            className={`p-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all ${
                                                isViceCaptain 
                                                    ? 'bg-cyan-500 text-slate-950 shadow-md ring-1 ring-cyan-400' 
                                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-cyan-400'
                                            }`}
                                            title="Make Vice-Captain"
                                        >
                                            <Award size={12} />
                                            <span className="hidden sm:inline">VC</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Footer Buttons */}
                <div className="bg-slate-950 p-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs text-slate-400 text-center sm:text-left">
                        Captain: <strong className="text-amber-400">{allSquadPlayers.find(p => p.id === selectedCaptainId)?.name || 'Not Selected'}</strong>
                        {selectedViceCaptainId && (
                            <span> • Vice-Captain: <strong className="text-cyan-400">{allSquadPlayers.find(p => p.id === selectedViceCaptainId)?.name}</strong></span>
                        )}
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                            onClick={onClose}
                            className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirmSquad}
                            className="flex-1 sm:flex-none px-6 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                        >
                            <ShieldCheck size={16} />
                            <span>Confirm 15 &amp; Announce</span>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
export default MatchSquadModal;

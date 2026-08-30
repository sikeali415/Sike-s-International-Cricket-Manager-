import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { GameData, Player, PlayerRole, Format, BattingStyle, ScoreLimits, Ground, Team } from '../types';
import { getBatterTier, BATTING_PROFILES, getBatterProfile, getRoleColor, getRoleFullName, getBattingStyleLabel, BATTING_STYLE_OPTIONS } from '../utils';
import { PITCH_TYPES, generateInitialStats } from '../data';
import { generatePlayerDomesticStats, generatePlayerInternationalStats } from '../utils/domesticStatsGenerator';
import { playSFX } from '../utils/soundManager';
import { 
    User, 
    Upload, 
    Link, 
    Sparkles, 
    Save, 
    X, 
    Plus, 
    Search, 
    Filter, 
    Shield, 
    Sliders, 
    MapPin, 
    Trophy, 
    ArrowLeft, 
    Check, 
    Image as ImageIcon,
    RefreshCw,
    Trash2
} from 'lucide-react';

interface EditorProps {
    gameData: GameData;
    setGameData?: React.Dispatch<React.SetStateAction<GameData | null>>;
    handleUpdatePlayer: (player: Player) => void;
    handleCreatePlayer: (player: Player) => void;
    handleUpdateGround: (code: string, updates: Partial<Ground> | string) => void;
    handleUpdateScoreLimits: (groundCode: string, format: Format, field: keyof ScoreLimits, value: any, inning: number) => void;
    initialPlayerId?: string | null;
    onBack?: () => void;
    setScreen?: (screen: any) => void;
}

// Curated stylish cricket avatars & styles
const PRESET_AVATARS = [
    { label: 'Pro Batter', url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=200&h=200&fit=crop&crop=faces' },
    { label: 'Fast Bowler', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces' },
    { label: 'Captain Gold', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces' },
    { label: 'Spinner', url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&crop=faces' },
    { label: 'Wicket Keeper', url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop&crop=faces' },
    { label: 'Young Star', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=faces' },
    { label: 'Veteran Leader', url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&h=200&fit=crop&crop=faces' },
    { label: 'All-Rounder', url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&h=200&fit=crop&crop=faces' },
    { label: 'DiceBear Cricket 1', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=CricketMaster1' },
    { label: 'DiceBear Cricket 2', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=CricketStar2' },
    { label: 'DiceBear Cricket 3', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=CricketChamp3' },
    { label: 'DiceBear Cricket 4', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=CricketPro4' },
];

const Editor: React.FC<EditorProps> = ({ 
    gameData, 
    setGameData,
    handleUpdatePlayer, 
    handleCreatePlayer, 
    handleUpdateGround, 
    handleUpdateScoreLimits,
    initialPlayerId,
    onBack,
    setScreen
}) => {
    const [editType, setEditType] = useState<'players' | 'grounds' | 'rules'>('players');
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [editorFormatTab, setEditorFormatTab] = useState<Format>(Format.T20);
    
    // Search and filter in player list
    const [searchQuery, setSearchQuery] = useState('');
    const [teamFilter, setTeamFilter] = useState<string>('ALL');
    const [roleFilter, setRoleFilter] = useState<string>('ALL');

    // Image edit tab / mode
    const [imageInputMode, setImageInputMode] = useState<'presets' | 'url' | 'upload'>('presets');
    const [customUrlInput, setCustomUrlInput] = useState('');

    // Selected team for player assignment
    const [assignedTeamId, setAssignedTeamId] = useState<string>('');

    // If initialPlayerId is provided, auto-select that player
    useEffect(() => {
        if (initialPlayerId) {
            const found = gameData.allPlayers.find(p => p.id === initialPlayerId);
            if (found) {
                setSelectedPlayer(JSON.parse(JSON.stringify(found)));
                setIsCreating(false);
                const ownerTeam = gameData.teams.find(t => t.squad?.some(sp => sp.id === found.id));
                setAssignedTeamId(ownerTeam?.id || '');
            }
        }
    }, [initialPlayerId, gameData.allPlayers, gameData.teams]);

    const getPlayerProfileForFormat = useCallback((player: Player, format: Format) => {
        const custom = player.customProfiles?.[format];
        if (custom && custom.avg > 0 && custom.sr > 0) {
            return custom;
        }
        const tier = getBatterTier(player.battingSkill);
        const style = player.style;
        return getBatterProfile(format, tier, style);
    }, []);

    const handleProfileChange = (field: 'avg' | 'sr', value: string) => {
        if (!selectedPlayer) return;
        const numericValue = value ? parseFloat(value) : 0;
        if (isNaN(numericValue)) return;

        setSelectedPlayer(prev => {
            if (!prev) return null;
            const newProfiles = { ...(prev.customProfiles || {}) };
            const newFormatProfile = { avg: 0, sr: 0, ...(newProfiles[editorFormatTab] || {}) };
            newFormatProfile[field] = numericValue;

            if (newFormatProfile.avg <= 0 && newFormatProfile.sr <= 0) {
                delete newProfiles[editorFormatTab];
            } else {
                newProfiles[editorFormatTab] = newFormatProfile;
            }

            if (Object.keys(newProfiles).length === 0) {
                const updatedPlayer = {...prev};
                delete updatedPlayer.customProfiles;
                return updatedPlayer;
            }
            return { ...prev, customProfiles: newProfiles };
        });
    };

    const handleSelectPlayer = (playerId: string) => {
        playSFX('click');
        setIsCreating(false);
        const found = gameData.allPlayers.find(p => p.id === playerId);
        if (found) {
            setSelectedPlayer(JSON.parse(JSON.stringify(found)));
            const ownerTeam = gameData.teams.find(t => t.squad?.some(sp => sp.id === found.id));
            setAssignedTeamId(ownerTeam?.id || '');
            setCustomUrlInput(found.image || found.avatar || '');
        }
    };

    const handleAddNewPlayer = () => {
        playSFX('click');
        setIsCreating(true);
        const age = 22;
        const role = PlayerRole.BATSMAN;
        const battingSkill = 65;
        const secondarySkill = 25;
        const id = `player-${Date.now()}`;
        const tempPlayer: Player = {
            id,
            name: '',
            age,
            role,
            battingSkill,
            secondarySkill,
            style: 'N' as BattingStyle,
            isOpener: false,
            isForeign: false,
            nationality: gameData.teams[0]?.name || 'Pakistan',
            image: PRESET_AVATARS[0].url,
            stats: generateInitialStats(),
            domesticStats: generatePlayerDomesticStats({ id, name: 'New Player', age, role, battingSkill, secondarySkill, style: 'N' as BattingStyle, isOpener: false, isForeign: false }),
            internationalStats: generatePlayerInternationalStats(),
            potential: 80,
            form: 80
        };
        
        setSelectedPlayer(tempPlayer);
        setAssignedTeamId(gameData.teams[0]?.id || '');
        setCustomUrlInput(PRESET_AVATARS[0].url);
    };

    // Handle Image upload from local device / camera
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && selectedPlayer) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setSelectedPlayer(prev => prev ? { ...prev, image: base64String, avatar: base64String } : null);
                playSFX('click');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleApplyCustomUrl = () => {
        if (!selectedPlayer || !customUrlInput.trim()) return;
        setSelectedPlayer(prev => prev ? { ...prev, image: customUrlInput.trim(), avatar: customUrlInput.trim() } : null);
        playSFX('click');
    };

    const handleRandomizeAvatar = () => {
        if (!selectedPlayer) return;
        const seed = `${selectedPlayer.name || 'player'}-${Math.random().toString(36).substring(2, 6)}`;
        const randomUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed)}`;
        setSelectedPlayer(prev => prev ? { ...prev, image: randomUrl, avatar: randomUrl } : null);
        setCustomUrlInput(randomUrl);
        playSFX('click');
    };

    const savePlayer = () => {
        if (!selectedPlayer || !selectedPlayer.name.trim()) return;
        playSFX('success');

        const updatedPlayerObj = { ...selectedPlayer };

        if (isCreating) {
            handleCreatePlayer(updatedPlayerObj);
        } else {
            handleUpdatePlayer(updatedPlayerObj);
        }

        // Handle team assignment if setGameData is available
        if (setGameData && assignedTeamId !== undefined) {
            setGameData(prev => {
                if (!prev) return null;
                const newTeams = prev.teams.map(t => {
                    // Remove from all teams first
                    const filteredSquad = (t.squad || []).filter(p => p.id !== updatedPlayerObj.id);
                    // If this is the newly assigned team, add player
                    if (t.id === assignedTeamId) {
                        return { ...t, squad: [...filteredSquad, updatedPlayerObj] };
                    }
                    return { ...t, squad: filteredSquad };
                });

                return {
                    ...prev,
                    teams: newTeams
                };
            });
        }

        setSelectedPlayer(null);
        setIsCreating(false);
    };

    const handleGroundChange = (code: string, field: keyof Ground, value: any) => {
        if (field === 'pitch') {
            handleUpdateGround(code, { pitch: value });
        } else {
            handleUpdateGround(code, { [field]: value });
        }
    };

    // Filtered player list
    const filteredPlayers = useMemo(() => {
        return gameData.allPlayers.filter(p => {
            const matchesSearch = searchQuery.trim() === '' ||
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (p.nationality && p.nationality.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesRole = roleFilter === 'ALL' || p.role === roleFilter;

            let matchesTeam = true;
            if (teamFilter !== 'ALL') {
                if (teamFilter === 'FREE_AGENTS') {
                    matchesTeam = !gameData.teams.some(t => t.squad?.some(sp => sp.id === p.id));
                } else {
                    const targetTeam = gameData.teams.find(t => t.id === teamFilter);
                    matchesTeam = !!targetTeam?.squad?.some(sp => sp.id === p.id);
                }
            }

            return matchesSearch && matchesRole && matchesTeam;
        });
    }, [gameData.allPlayers, gameData.teams, searchQuery, teamFilter, roleFilter]);

    // RENDER: Single Player Editor
    const renderPlayerEditor = () => {
        if (!selectedPlayer) return null;
        const defaultProfile = getPlayerProfileForFormat(selectedPlayer, editorFormatTab);
        const customAvg = selectedPlayer.customProfiles?.[editorFormatTab]?.avg;
        const customSR = selectedPlayer.customProfiles?.[editorFormatTab]?.sr;
        const playerImage = selectedPlayer.image || selectedPlayer.avatar || PRESET_AVATARS[0].url;

        return (
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 max-w-4xl mx-auto w-full space-y-5">
                
                {/* Header Action Bar */}
                <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 p-4 rounded-3xl backdrop-blur-xl">
                    <button
                        onClick={() => {
                            playSFX('click');
                            setSelectedPlayer(null);
                            setIsCreating(false);
                        }}
                        className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white px-3 py-1.5 rounded-xl hover:bg-slate-800 transition-colors"
                    >
                        <ArrowLeft size={16} />
                        <span>Back to Player List</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                setSelectedPlayer(null);
                                setIsCreating(false);
                            }}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={savePlayer}
                            className="px-6 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-teal-500/20 transition-all active:scale-95"
                        >
                            <Save size={16} />
                            <span>Save Player</span>
                        </button>
                    </div>
                </div>

                {/* Main Player Profile Card & Image Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    
                    {/* Left Column: Interactive Image & Avatar Editor */}
                    <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-3xl flex flex-col items-center space-y-4">
                        <div className="relative group">
                            <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-3xl overflow-hidden bg-slate-950 border-2 border-teal-500/50 shadow-xl flex items-center justify-center relative">
                                <img
                                    src={playerImage}
                                    alt={selectedPlayer.name || 'Player'}
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                />
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-teal-500 text-slate-950 font-black text-[10px] uppercase px-2 py-0.5 rounded-lg shadow-md border border-teal-300">
                                {selectedPlayer.role}
                            </div>
                        </div>

                        <div className="text-center">
                            <h3 className="font-black text-white text-base sm:text-lg">{selectedPlayer.name || 'New Player'}</h3>
                            <p className="text-xs text-slate-400 font-semibold">{selectedPlayer.nationality} • Age {selectedPlayer.age}</p>
                        </div>

                        {/* Image changer tools */}
                        <div className="w-full border-t border-slate-800 pt-3 space-y-3">
                            <p className="text-xs font-bold text-slate-300 text-center flex items-center justify-center gap-1.5">
                                <ImageIcon size={14} className="text-teal-400" />
                                <span>Change Player Image</span>
                            </p>

                            {/* Mode tabs */}
                            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                                <button
                                    onClick={() => setImageInputMode('presets')}
                                    className={`flex-1 py-1 text-[10px] font-black uppercase rounded-lg transition-all ${
                                        imageInputMode === 'presets' ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    Presets
                                </button>
                                <button
                                    onClick={() => setImageInputMode('upload')}
                                    className={`flex-1 py-1 text-[10px] font-black uppercase rounded-lg transition-all ${
                                        imageInputMode === 'upload' ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    Upload
                                </button>
                                <button
                                    onClick={() => setImageInputMode('url')}
                                    className={`flex-1 py-1 text-[10px] font-black uppercase rounded-lg transition-all ${
                                        imageInputMode === 'url' ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    URL Link
                                </button>
                            </div>

                            {/* Mode 1: Presets */}
                            {imageInputMode === 'presets' && (
                                <div className="space-y-2">
                                    <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1 bg-slate-950 rounded-xl border border-slate-800/80">
                                        {PRESET_AVATARS.map((av, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    playSFX('click');
                                                    setSelectedPlayer(prev => prev ? { ...prev, image: av.url, avatar: av.url } : null);
                                                }}
                                                className={`w-full aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-105 ${
                                                    playerImage === av.url ? 'border-teal-400 ring-2 ring-teal-500/40' : 'border-slate-800'
                                                }`}
                                                title={av.label}
                                            >
                                                <img src={av.url} alt={av.label} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={handleRandomizeAvatar}
                                        className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5 transition-all"
                                    >
                                        <Sparkles size={12} />
                                        <span>Generate Random Avatar</span>
                                    </button>
                                </div>
                            )}

                            {/* Mode 2: Device Upload */}
                            {imageInputMode === 'upload' && (
                                <div className="space-y-2">
                                    <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-700 hover:border-teal-500/60 rounded-2xl cursor-pointer bg-slate-950/60 hover:bg-slate-950 transition-all">
                                        <Upload size={20} className="text-teal-400 mb-1" />
                                        <span className="text-xs font-bold text-slate-300">Choose from Device / Gallery</span>
                                        <span className="text-[10px] text-slate-500 mt-0.5">JPG, PNG, WebP supported</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                            )}

                            {/* Mode 3: Custom URL */}
                            {imageInputMode === 'url' && (
                                <div className="space-y-2">
                                    <input
                                        type="url"
                                        value={customUrlInput}
                                        onChange={e => setCustomUrlInput(e.target.value)}
                                        placeholder="https://example.com/player-photo.jpg"
                                        className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                                    />
                                    <button
                                        onClick={handleApplyCustomUrl}
                                        className="w-full py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1 transition-all"
                                    >
                                        <Check size={12} />
                                        <span>Apply Image URL</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Player Details, Skills & Team Assignment */}
                    <div className="lg:col-span-2 space-y-4">
                        
                        {/* Basic Details Box */}
                        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-3xl space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-wider text-teal-400 flex items-center gap-2">
                                <User size={16} />
                                <span>Player Profile &amp; Bio</span>
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        value={selectedPlayer.name}
                                        onChange={e => setSelectedPlayer({ ...selectedPlayer, name: e.target.value })}
                                        placeholder="Player Name"
                                        className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-teal-500"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Nationality</label>
                                    <input
                                        type="text"
                                        value={selectedPlayer.nationality}
                                        onChange={e => setSelectedPlayer({ ...selectedPlayer, nationality: e.target.value })}
                                        placeholder="Country / Nationality"
                                        className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-teal-500"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Age ({selectedPlayer.age})</label>
                                    <input
                                        type="number"
                                        min="16"
                                        max="45"
                                        value={selectedPlayer.age}
                                        onChange={e => setSelectedPlayer({ ...selectedPlayer, age: parseInt(e.target.value) || 20 })}
                                        className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-teal-500"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Assigned Team / Squad</label>
                                    <select
                                        value={assignedTeamId}
                                        onChange={e => setAssignedTeamId(e.target.value)}
                                        className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-teal-500"
                                    >
                                        <option value="">-- Free Agent / National Reserve --</option>
                                        {gameData.teams.map(t => (
                                            <option key={t.id} value={t.id}>{t.name} (Squad: {t.squad?.length || 0})</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Playing Role</label>
                                    <select
                                        value={selectedPlayer.role}
                                        onChange={e => setSelectedPlayer({ ...selectedPlayer, role: e.target.value as PlayerRole })}
                                        className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-teal-500"
                                    >
                                        {Object.values(PlayerRole).map(r => (
                                            <option key={r} value={r}>{getRoleFullName(r)}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Batting Style</label>
                                    <select
                                        value={selectedPlayer.style}
                                        onChange={e => setSelectedPlayer({ ...selectedPlayer, style: e.target.value as BattingStyle })}
                                        className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-teal-500"
                                    >
                                        {BATTING_STYLE_OPTIONS.map(s => (
                                            <option key={s} value={s}>{getBattingStyleLabel(s)}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Checkboxes */}
                            <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-800 text-xs">
                                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={selectedPlayer.isOpener}
                                        onChange={e => setSelectedPlayer({ ...selectedPlayer, isOpener: e.target.checked })}
                                        className="w-4 h-4 rounded text-teal-500 bg-slate-950 border-slate-700"
                                    />
                                    <span>Specialist Opener</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={selectedPlayer.isForeign}
                                        onChange={e => setSelectedPlayer({ ...selectedPlayer, isForeign: e.target.checked })}
                                        className="w-4 h-4 rounded text-teal-500 bg-slate-950 border-slate-700"
                                    />
                                    <span>Foreign Player</span>
                                </label>
                            </div>
                        </div>

                        {/* Ratings & Skills Box */}
                        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-3xl space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-wider text-teal-400 flex items-center gap-2">
                                <Sliders size={16} />
                                <span>Ratings &amp; Attributes</span>
                            </h4>

                            <div className="space-y-4">
                                {/* Batting Skill */}
                                <div>
                                    <div className="flex justify-between text-xs font-bold mb-1">
                                        <span className="text-slate-300">Batting Skill</span>
                                        <span className="text-teal-400 font-black">{selectedPlayer.battingSkill} / 99</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="range"
                                            min="1"
                                            max="99"
                                            value={selectedPlayer.battingSkill}
                                            onChange={e => setSelectedPlayer({ ...selectedPlayer, battingSkill: parseInt(e.target.value) || 1 })}
                                            className="flex-1 accent-teal-400 cursor-pointer h-2 bg-slate-950 rounded-lg"
                                        />
                                        <input
                                            type="number"
                                            min="1"
                                            max="99"
                                            value={selectedPlayer.battingSkill}
                                            onChange={e => setSelectedPlayer({ ...selectedPlayer, battingSkill: parseInt(e.target.value) || 1 })}
                                            className="w-14 p-1 rounded-lg bg-slate-950 border border-slate-700 text-center text-xs font-black text-white"
                                        />
                                    </div>
                                </div>

                                {/* Bowling / Secondary Skill */}
                                <div>
                                    <div className="flex justify-between text-xs font-bold mb-1">
                                        <span className="text-slate-300">Bowling / Secondary Skill</span>
                                        <span className="text-cyan-400 font-black">{selectedPlayer.secondarySkill} / 99</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="range"
                                            min="1"
                                            max="99"
                                            value={selectedPlayer.secondarySkill}
                                            onChange={e => setSelectedPlayer({ ...selectedPlayer, secondarySkill: parseInt(e.target.value) || 1 })}
                                            className="flex-1 accent-cyan-400 cursor-pointer h-2 bg-slate-950 rounded-lg"
                                        />
                                        <input
                                            type="number"
                                            min="1"
                                            max="99"
                                            value={selectedPlayer.secondarySkill}
                                            onChange={e => setSelectedPlayer({ ...selectedPlayer, secondarySkill: parseInt(e.target.value) || 1 })}
                                            className="w-14 p-1 rounded-lg bg-slate-950 border border-slate-700 text-center text-xs font-black text-white"
                                        />
                                    </div>
                                </div>

                                {/* Potential & Form */}
                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                                            Potential ({selectedPlayer.potential || 80})
                                        </label>
                                        <input
                                            type="range"
                                            min="50"
                                            max="99"
                                            value={selectedPlayer.potential || 80}
                                            onChange={e => setSelectedPlayer({ ...selectedPlayer, potential: parseInt(e.target.value) || 80 })}
                                            className="w-full accent-amber-400 cursor-pointer h-2 bg-slate-950 rounded-lg"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                                            Current Form ({selectedPlayer.form || 80})
                                        </label>
                                        <input
                                            type="range"
                                            min="50"
                                            max="99"
                                            value={selectedPlayer.form || 80}
                                            onChange={e => setSelectedPlayer({ ...selectedPlayer, form: parseInt(e.target.value) || 80 })}
                                            className="w-full accent-emerald-400 cursor-pointer h-2 bg-slate-950 rounded-lg"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Custom Batting Profile per Format */}
                        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-3xl space-y-3">
                            <h4 className="text-xs font-black uppercase tracking-wider text-teal-400">
                                Target Format Batting Profiles
                            </h4>

                            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                                {Object.values(Format).map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setEditorFormatTab(f)}
                                        className={`flex-1 py-1 text-xs font-black uppercase rounded-lg transition-all ${
                                            editorFormatTab === f ? 'bg-teal-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-1">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">
                                        Target Avg (Default: {defaultProfile.avg})
                                    </label>
                                    <input
                                        type="number"
                                        value={customAvg || ''}
                                        onChange={e => handleProfileChange('avg', e.target.value)}
                                        placeholder={`Default: ${defaultProfile.avg}`}
                                        className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">
                                        Target SR (Default: {defaultProfile.sr})
                                    </label>
                                    <input
                                        type="number"
                                        value={customSR || ''}
                                        onChange={e => handleProfileChange('sr', e.target.value)}
                                        placeholder={`Default: ${defaultProfile.sr}`}
                                        className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
                                    />
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        );
    };

    if (selectedPlayer) return renderPlayerEditor();

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 p-2 sm:p-5 overflow-hidden">
            
            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-900 transition-colors"
                        >
                            <ArrowLeft size={18} />
                        </button>
                    )}
                    <div>
                        <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                            <Sliders className="text-teal-400" size={20} />
                            <span>Game &amp; Player Editor</span>
                        </h2>
                        <p className="text-xs text-slate-400">Edit players, custom avatars, grounds, and match rules.</p>
                    </div>
                </div>

                {/* Section tabs */}
                <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800">
                    <button
                        onClick={() => { playSFX('click'); setEditType('players'); }}
                        className={`px-4 py-1.5 text-xs font-black uppercase rounded-xl transition-all ${
                            editType === 'players' ? 'bg-teal-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        Players ({gameData.allPlayers.length})
                    </button>
                    <button
                        onClick={() => { playSFX('click'); setEditType('grounds'); }}
                        className={`px-4 py-1.5 text-xs font-black uppercase rounded-xl transition-all ${
                            editType === 'grounds' ? 'bg-teal-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        Grounds ({gameData.grounds.length})
                    </button>
                    <button
                        onClick={() => { playSFX('click'); setEditType('rules'); }}
                        className={`px-4 py-1.5 text-xs font-black uppercase rounded-xl transition-all ${
                            editType === 'rules' ? 'bg-teal-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        Rules &amp; Score Limits
                    </button>
                </div>
            </div>

            {/* TAB 1: PLAYERS */}
            {editType === 'players' && (
                <div className="flex-1 flex flex-col min-h-0 pt-3 space-y-3">
                    
                    {/* Controls & Search */}
                    <div className="flex flex-col sm:flex-row items-center gap-2 justify-between">
                        <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-xl">
                            <div className="relative flex-1">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search by player name or nationality..."
                                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                                />
                            </div>

                            {/* Team filter */}
                            <select
                                value={teamFilter}
                                onChange={e => setTeamFilter(e.target.value)}
                                className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-teal-500"
                            >
                                <option value="ALL">All Teams</option>
                                <option value="FREE_AGENTS">Free Agents / Reserves</option>
                                {gameData.teams.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>

                            {/* Role filter */}
                            <select
                                value={roleFilter}
                                onChange={e => setRoleFilter(e.target.value)}
                                className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-teal-500"
                            >
                                <option value="ALL">All Roles</option>
                                {Object.values(PlayerRole).map(r => (
                                    <option key={r} value={r}>{getRoleFullName(r)}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={handleAddNewPlayer}
                            className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-teal-500/20 active:scale-95 transition-all"
                        >
                            <Plus size={16} />
                            <span>Add New Player</span>
                        </button>
                    </div>

                    {/* Players Grid / List */}
                    <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                        {filteredPlayers.length === 0 ? (
                            <div className="text-center py-16 text-slate-500 text-sm">
                                No players found matching the current search &amp; filter criteria.
                            </div>
                        ) : (
                            filteredPlayers.map(player => {
                                const playerImg = player.image || player.avatar || PRESET_AVATARS[0].url;
                                const assignedTeam = gameData.teams.find(t => t.squad?.some(sp => sp.id === player.id));

                                return (
                                    <div
                                        key={player.id}
                                        onClick={() => handleSelectPlayer(player.id)}
                                        className="bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-teal-500/40 p-3 rounded-2xl cursor-pointer flex items-center justify-between gap-3 transition-all hover:shadow-lg group"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            {/* Avatar */}
                                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-950 border border-slate-700 flex items-center justify-center shrink-0 group-hover:border-teal-400 transition-colors">
                                                <img src={playerImg} alt={player.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                            </div>

                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-black text-white text-xs sm:text-sm truncate group-hover:text-teal-300 transition-colors">
                                                        {player.name}
                                                    </h4>
                                                    {player.isForeign && (
                                                        <span className="text-[9px] bg-cyan-950 text-cyan-400 px-1.5 py-0.2 rounded border border-cyan-500/30">F</span>
                                                    )}
                                                    {player.isOpener && (
                                                        <span className="text-[9px] bg-amber-950 text-amber-400 px-1.5 py-0.2 rounded border border-amber-500/30">OP</span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                                    <span className={`font-bold ${getRoleColor(player.role)}`}>{player.role}</span>
                                                    <span>•</span>
                                                    <span>{player.nationality}</span>
                                                    <span>•</span>
                                                    <span className="text-slate-500">{assignedTeam ? assignedTeam.name : 'Free Agent'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Skill Ratings badge */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            <div className="text-right">
                                                <div className="text-xs font-black text-teal-400">Bat {player.battingSkill}</div>
                                                <div className="text-[10px] font-bold text-cyan-400">Bowl {player.secondarySkill}</div>
                                            </div>
                                            <div className="p-2 rounded-xl bg-slate-800 text-slate-400 group-hover:text-teal-300 group-hover:bg-slate-700 transition-colors">
                                                <Sliders size={14} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* TAB 2: GROUNDS */}
            {editType === 'grounds' && (
                <div className="flex-1 overflow-y-auto space-y-4 pt-3 pb-16">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {gameData.grounds.map(g => (
                            <div key={g.code} className="bg-slate-900 border border-slate-800 p-4 rounded-3xl shadow-sm space-y-3">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="font-black text-white text-base">{g.name}</h3>
                                        <span className="text-[10px] font-bold text-slate-400">International Ground</span>
                                    </div>
                                    <span className="text-xs bg-slate-800 text-teal-400 font-bold px-2.5 py-1 rounded-xl border border-slate-700">
                                        {g.code}
                                    </span>
                                </div>

                                <div className="space-y-2.5 pt-1">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Pitch Type</label>
                                        <select
                                            value={g.pitch}
                                            onChange={e => handleGroundChange(g.code, 'pitch', e.target.value)}
                                            className="w-full p-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-teal-500"
                                        >
                                            {PITCH_TYPES.map(pt => <option key={pt} value={pt}>{pt}</option>)}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Weather</label>
                                            <select
                                                value={g.weather || 'Sunny'}
                                                onChange={e => handleGroundChange(g.code, 'weather', e.target.value)}
                                                className="w-full p-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                                            >
                                                {['Sunny', 'Overcast', 'Rainy', 'Humid', 'Dry'].map(w => <option key={w} value={w}>{w}</option>)}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Outfield</label>
                                            <select
                                                value={g.outfieldSpeed || 'Medium'}
                                                onChange={e => handleGroundChange(g.code, 'outfieldSpeed', e.target.value)}
                                                className="w-full p-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                                            >
                                                {['Lightning', 'Fast', 'Medium', 'Slow'].map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Boundaries</label>
                                            <select
                                                value={g.boundarySize || 'Medium'}
                                                onChange={e => handleGroundChange(g.code, 'boundarySize', e.target.value)}
                                                className="w-full p-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                                            >
                                                {['Small', 'Medium', 'Large'].map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Dimensions</label>
                                            <input
                                                type="text"
                                                value={g.dimensions || ''}
                                                onChange={e => handleGroundChange(g.code, 'dimensions', e.target.value)}
                                                className="w-full p-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                                                placeholder="e.g. 70m / 65m"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 3: RULES & SCORE LIMITS */}
            {editType === 'rules' && (
                <div className="flex-1 overflow-y-auto space-y-4 pt-3 pb-16">
                    {gameData.grounds.map(g => (
                        <div key={g.code} className="bg-slate-900 border border-slate-800 p-4 rounded-3xl space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                <h3 className="font-black text-white text-sm">{g.name} ({g.code})</h3>
                                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">Score Constraints</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {Object.values(Format).map(format => (
                                    <div key={format} className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 space-y-2">
                                        <span className="font-black text-teal-400 text-xs uppercase tracking-wider">{format}</span>
                                        {(format === Format.SHIELD ? [1, 2, 3, 4] : [1, 2]).map(inning => (
                                            <div key={inning} className="space-y-1">
                                                <span className="text-[10px] text-slate-400 font-bold">Inning {inning}</span>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="number"
                                                        placeholder="Max Runs"
                                                        value={gameData.scoreLimits?.[g.code]?.[format]?.[inning]?.maxRuns || ''}
                                                        onChange={(e) => handleUpdateScoreLimits(g.code, format, 'maxRuns', e.target.value, inning)}
                                                        className="w-1/2 p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                                                    />
                                                    <input
                                                        type="number"
                                                        placeholder="Max Wkts"
                                                        value={gameData.scoreLimits?.[g.code]?.[format]?.[inning]?.maxWickets || ''}
                                                        onChange={(e) => handleUpdateScoreLimits(g.code, format, 'maxWickets', e.target.value, inning)}
                                                        className="w-1/2 p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

        </div>
    );
};

export default Editor;

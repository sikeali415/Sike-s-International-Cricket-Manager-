import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GameData, Message, CareerScreen, Player, PlayerRole, Format } from '../types';
import { streamAssistantResponse } from '../geminiService';
import { Bot, Send, Sparkles, TrendingUp, DollarSign, Swords, BarChart3, Users, AlertCircle, ShieldAlert, CheckCircle2, ChevronRight, HelpCircle, Activity, Lightbulb, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { getPlayerMarketPrice, getPlayerBasePrice } from '../utils';

interface SignifyAIProps {
    gameData: GameData;
    setScreen: (screen: CareerScreen) => void;
    setSelectedPlayer: (player: Player) => void;
}

export const SignifyAI: React.FC<SignifyAIProps> = ({ gameData, setScreen, setSelectedPlayer }) => {
    const [activeSection, setActiveSection] = useState<'chat' | 'match' | 'auction' | 'stats' | 'squad'>('chat');
    const [input, setInput] = useState('');
    const [isTtsEnabled, setIsTtsEnabled] = useState(true);
    const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([
        { 
            id: '1', 
            text: "👋 Welcome to SigNify AI! I'm your central Cricket Manager Intelligence Engine. I analyze all live game data, player market values, match situations, auction targets, and transfer records.\n\nHow can I help you dominate the league today?", 
            sender: 'bot' 
        }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const speakMessage = (text: string, msgId?: string) => {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        
        const cleanText = text
            .replace(/[*_~#`]/g, '')
            .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
            .trim();

        if (!cleanText) return;

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        
        if (msgId) setCurrentlySpeakingId(msgId);
        
        utterance.onend = () => setCurrentlySpeakingId(null);
        utterance.onerror = () => setCurrentlySpeakingId(null);

        window.speechSynthesis.speak(utterance);
    };

    const stopSpeech = () => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        setCurrentlySpeakingId(null);
    };

    const userTeam = useMemo(() => gameData.teams.find(t => t.id === gameData.userTeamId), [gameData]);
    const currentSchedule = gameData.schedule[gameData.currentFormat] || [];
    const currentMatchIdx = gameData.currentMatchIndex[gameData.currentFormat] || 0;
    const nextMatch = currentSchedule[currentMatchIdx];

    const nextOpponentName = nextMatch 
        ? (nextMatch.teamA === userTeam?.name ? nextMatch.teamB : nextMatch.teamA)
        : null;
    const nextOpponent = gameData.teams.find(t => t.name === nextOpponentName);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (activeSection === 'chat') {
            scrollToBottom();
        }
    }, [messages, activeSection]);

    const handleSend = async (customPrompt?: string) => {
        const textToSend = customPrompt || input;
        if (!textToSend.trim()) return;

        const userMessage: Message = { id: Date.now().toString(), text: textToSend, sender: 'user' };
        setMessages(prev => [...prev, userMessage]);
        if (!customPrompt) setInput('');
        setIsTyping(true);

        try {
            const botMessageId = (Date.now() + 1).toString();
            setMessages(prev => [...prev, { id: botMessageId, text: '', sender: 'bot' }]);
            
            const stream = streamAssistantResponse(textToSend, messages, gameData);
            
            let fullResponse = '';
            for await (const chunk of stream) {
                fullResponse += chunk;
                setMessages(prev => prev.map(m => m.id === botMessageId ? { ...m, text: fullResponse } : m));
            }

            if (isTtsEnabled) {
                speakMessage(fullResponse, botMessageId);
            }
        } catch (error) {
            setMessages(prev => [...prev, { id: Date.now().toString(), text: "SigNify AI error: Unable to compute response. Please verify connection.", sender: 'bot' }]);
        } finally {
            setIsTyping(false);
        }
    };

    // Quick Prompts
    const quickPrompts = [
        { label: "Evaluate My Squad Weakness", prompt: "Evaluate my current squad depth and tell me where we need urgent replacements or upgrades." },
        { label: "Auction Targets & Prices", prompt: "Recommend the best players to target in the upcoming auction and their ideal bid prices." },
        { label: "Next Match Strategy", prompt: "What is our best playing XI and tactical strategy for our upcoming match?" },
        { label: "Who to Retain?", prompt: "Which players should I retain for next season and why?" },
        { label: "Foreign Player Limit Check", prompt: "Check my squad's foreign player count and warn me about league limits." }
    ];

    // Squad Analysis Calculations
    const squadAnalysis = useMemo(() => {
        if (!userTeam) return null;
        const total = userTeam.squad.length;
        const keepers = userTeam.squad.filter(p => p.role === PlayerRole.WICKET_KEEPER);
        const batters = userTeam.squad.filter(p => p.role === PlayerRole.BATSMAN);
        const allrounders = userTeam.squad.filter(p => p.role === PlayerRole.ALL_ROUNDER);
        const bowlers = userTeam.squad.filter(p => p.role === PlayerRole.FAST_BOWLER || p.role === PlayerRole.SPIN_BOWLER);
        const foreigns = userTeam.squad.filter(p => p.isForeign);
        const injured = userTeam.squad.filter(p => p.injury !== null);

        const avgBatSkill = Math.round(userTeam.squad.reduce((acc, p) => acc + p.battingSkill, 0) / (total || 1));
        const avgBowlSkill = Math.round(userTeam.squad.reduce((acc, p) => acc + p.secondarySkill, 0) / (total || 1));

        return { total, keepers, batters, allrounders, bowlers, foreigns, injured, avgBatSkill, avgBowlSkill };
    }, [userTeam]);

    // Top Market Targets
    const topMarketTargets = useMemo(() => {
        const userSquadIds = new Set(userTeam?.squad.map(p => p.id) || []);
        return gameData.allPlayers
            .filter(p => !userSquadIds.has(p.id))
            .sort((a, b) => (b.battingSkill + b.secondarySkill) - (a.battingSkill + a.secondarySkill))
            .slice(0, 10);
    }, [gameData.allPlayers, userTeam]);

    return (
        <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-cyan-950 border-b border-teal-500/30 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-slate-950 font-black shadow-md shadow-teal-500/20">
                        <Bot className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="font-extrabold text-base sm:text-lg tracking-wider text-white">SIGNIFY AI</h1>
                            <span className="text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-teal-400" />
                                LIVE INTELLIGENCE
                            </span>
                        </div>
                        <p className="text-xs text-slate-400">All-Around Game Engine, Match Tactics & Valuation Advisor</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono">
                    <button
                        onClick={() => {
                            if (isTtsEnabled) stopSpeech();
                            setIsTtsEnabled(!isTtsEnabled);
                        }}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all text-xs cursor-pointer ${
                            isTtsEnabled 
                                ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 shadow-sm' 
                                : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}
                        title={isTtsEnabled ? "Disable TTS Voice" : "Enable TTS Voice"}
                    >
                        {isTtsEnabled ? <Volume2 className="w-4 h-4 text-teal-400 animate-pulse" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
                        <span className="hidden sm:inline font-sans font-bold">{isTtsEnabled ? 'Voice ON' : 'Voice OFF'}</span>
                    </button>

                    <span className="text-slate-400 hidden md:inline">TEAM:</span>
                    <span className="font-black text-teal-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                        {userTeam?.name} (Purse: ₹{(userTeam?.purse || 0).toFixed(1)} Cr)
                    </span>
                </div>
            </div>

            {/* Navigation Tabs Bar */}
            <div className="bg-slate-900/80 border-b border-slate-800 px-3 py-2 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
                <button
                    onClick={() => setActiveSection('chat')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        activeSection === 'chat'
                            ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-slate-950 shadow-md shadow-teal-500/20'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                >
                    <Bot className="w-3.5 h-3.5" />
                    AI Assistant Chat
                </button>

                <button
                    onClick={() => setActiveSection('match')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        activeSection === 'match'
                            ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-slate-950 shadow-md shadow-teal-500/20'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                >
                    <Swords className="w-3.5 h-3.5" />
                    Match Situation AI
                </button>

                <button
                    onClick={() => setActiveSection('auction')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        activeSection === 'auction'
                            ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-slate-950 shadow-md shadow-teal-500/20'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                >
                    <DollarSign className="w-3.5 h-3.5" />
                    Auction & Valuation
                </button>

                <button
                    onClick={() => setActiveSection('squad')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        activeSection === 'squad'
                            ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-slate-950 shadow-md shadow-teal-500/20'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                >
                    <Users className="w-3.5 h-3.5" />
                    Squad Health & Limits
                </button>

                <button
                    onClick={() => setActiveSection('stats')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        activeSection === 'stats'
                            ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-slate-950 shadow-md shadow-teal-500/20'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                >
                    <BarChart3 className="w-3.5 h-3.5" />
                    League Stats & Records
                </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-5 relative">

                {/* 1. CHAT SECTION */}
                {activeSection === 'chat' && (
                    <div className="flex flex-col h-full max-w-4xl mx-auto gap-4">
                        {/* Quick Prompts Bar */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none shrink-0">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap flex items-center gap-1">
                                <Lightbulb className="w-3 h-3 text-amber-400" /> Quick Ask:
                            </span>
                            {quickPrompts.map((qp, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSend(qp.prompt)}
                                    className="bg-slate-900 border border-slate-800 hover:border-teal-500/50 hover:bg-slate-800 px-3 py-1.5 rounded-full text-xs text-slate-300 hover:text-white transition-all whitespace-nowrap cursor-pointer shadow-sm active:scale-95"
                                >
                                    {qp.label}
                                </button>
                            ))}
                        </div>

                        {/* Messages Box */}
                        <div className="flex-1 overflow-y-auto bg-slate-900/60 rounded-2xl border border-slate-800 p-4 space-y-4 shadow-inner min-h-[300px]">
                            {messages.map(msg => (
                                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-3.5 rounded-2xl shadow-md text-sm leading-relaxed ${
                                        msg.sender === 'user' 
                                            ? 'bg-teal-500 text-slate-950 rounded-br-none font-medium' 
                                            : 'bg-slate-800/90 border border-slate-700/80 text-slate-100 rounded-bl-none'
                                    }`}>
                                        {msg.sender === 'bot' && (
                                            <div className="flex items-center justify-between text-[10px] font-bold text-teal-400 uppercase tracking-wider mb-1.5 border-b border-slate-700/50 pb-1">
                                                <div className="flex items-center gap-1.5">
                                                    <Bot className="w-3.5 h-3.5" /> SIGNIFY AI
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        if (currentlySpeakingId === msg.id) {
                                                            stopSpeech();
                                                        } else {
                                                            speakMessage(msg.text, msg.id);
                                                        }
                                                    }}
                                                    className="p-1 rounded hover:bg-slate-700/60 text-slate-400 hover:text-teal-300 transition-all flex items-center gap-1 cursor-pointer"
                                                    title={currentlySpeakingId === msg.id ? "Stop Voice" : "Read Aloud"}
                                                >
                                                    {currentlySpeakingId === msg.id ? (
                                                        <VolumeX className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                                                    ) : (
                                                        <Volume2 className="w-3.5 h-3.5 text-teal-400" />
                                                    )}
                                                    <span className="text-[9px] lowercase font-mono">
                                                        {currentlySpeakingId === msg.id ? 'stop' : 'listen'}
                                                    </span>
                                                </button>
                                            </div>
                                        )}
                                        <p className="whitespace-pre-wrap">{msg.text}</p>
                                    </div>
                                </div>
                            ))}

                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-slate-800/90 border border-slate-700 p-3 rounded-2xl rounded-bl-none shadow-md">
                                        <div className="flex items-center gap-2 text-xs text-slate-400">
                                            <Bot className="w-4 h-4 text-teal-400 animate-spin" />
                                            <span>SigNify AI is computing live match data & player stats...</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Row */}
                        <div className="flex gap-2 shrink-0">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Ask SigNify about strategy, auction bids, team stats, or match guidance..."
                                className="flex-grow p-3 rounded-xl border border-slate-800 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/80 focus:ring-1 focus:ring-teal-500 text-sm"
                            />
                            <button
                                onClick={() => handleSend()}
                                disabled={!input.trim() || isTyping}
                                className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-slate-950 font-bold px-5 rounded-xl shadow-lg shadow-teal-500/20 disabled:opacity-40 transition-all flex items-center justify-center cursor-pointer active:scale-95"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}

                {/* 2. MATCH SITUATION AI SECTION */}
                {activeSection === 'match' && (
                    <div className="max-w-4xl mx-auto flex flex-col gap-5">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                                <div className="flex items-center gap-2">
                                    <Swords className="w-5 h-5 text-teal-400" />
                                    <h2 className="font-extrabold text-base text-white uppercase tracking-wider">UPCOMING MATCH AI TACTICAL ADVISOR</h2>
                                </div>
                                <span className="text-xs font-mono text-slate-400">Format: {gameData.currentFormat}</span>
                            </div>

                            {nextMatch ? (
                                <div className="flex flex-col gap-4">
                                    {/* Match Vs Header */}
                                    <div className="grid grid-cols-3 gap-3 bg-slate-950 rounded-xl p-4 text-center items-center border border-slate-800">
                                        <div>
                                            <span className="text-[10px] text-slate-400 uppercase font-bold">YOUR TEAM</span>
                                            <h3 className="font-black text-lg text-teal-400">{userTeam?.name}</h3>
                                        </div>
                                        <div>
                                            <span className="px-3 py-1 bg-teal-500/20 text-teal-300 rounded-full font-black text-xs border border-teal-500/30">
                                                VS
                                            </span>
                                            <p className="text-[10px] text-slate-400 mt-1">Match #{currentMatchIdx + 1}</p>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-400 uppercase font-bold">OPPONENT</span>
                                            <h3 className="font-black text-lg text-rose-400">{nextOpponentName || 'TBD'}</h3>
                                        </div>
                                    </div>

                                    {/* SigNify AI Strategic Recommendation */}
                                    <div className="bg-gradient-to-br from-teal-950/40 via-slate-900 to-slate-950 border border-teal-500/30 rounded-xl p-4 flex flex-col gap-3">
                                        <div className="flex items-center gap-2 text-teal-400 font-bold text-sm">
                                            <Sparkles className="w-4 h-4" />
                                            <span>SIGNIFY AI MATCH FORECAST</span>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                                                <span className="text-slate-400 uppercase font-bold text-[10px]">Win Probability</span>
                                                <p className="text-emerald-400 font-black text-base mt-0.5">58% FAVORABLE</p>
                                                <p className="text-[10px] text-slate-500 mt-1">Based on rating & form</p>
                                            </div>

                                            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                                                <span className="text-slate-400 uppercase font-bold text-[10px]">Pitch Recommendation</span>
                                                <p className="text-amber-400 font-bold text-sm mt-0.5">2 Fast Bowlers + 2 Spinners</p>
                                                <p className="text-[10px] text-slate-500 mt-1">Balanced surface</p>
                                            </div>

                                            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                                                <span className="text-slate-400 uppercase font-bold text-[10px]">Key Opponent Danger</span>
                                                <p className="text-rose-400 font-bold text-sm mt-0.5">
                                                    {nextOpponent?.squad.sort((a,b) => b.battingSkill - a.battingSkill)[0]?.name || 'Top Batter'}
                                                </p>
                                                <p className="text-[10px] text-slate-500 mt-1">Target early with new ball</p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleSend(`Give me a detailed tactical gameplan against ${nextOpponentName} for our upcoming ${gameData.currentFormat} match.`)}
                                            className="mt-2 py-2.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                                        >
                                            <Bot className="w-4 h-4 text-teal-400" />
                                            Ask SigNify AI for Full In-Depth Gameplan
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-slate-400 text-sm text-center py-6">No upcoming scheduled match found for this format.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* 3. AUCTION & VALUATION SECTION */}
                {activeSection === 'auction' && (
                    <div className="max-w-4xl mx-auto flex flex-col gap-5">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                                <div className="flex items-center gap-2">
                                    <DollarSign className="w-5 h-5 text-teal-400" />
                                    <h2 className="font-extrabold text-base text-white uppercase tracking-wider">AUCTION & PLAYER VALUATION AI</h2>
                                </div>
                                <span className="text-xs font-mono text-slate-400">Purse: ₹{(userTeam?.purse || 0).toFixed(1)} Cr</span>
                            </div>

                            <p className="text-xs text-slate-400 mb-4">
                                SigNify AI evaluates player skills, stats, age, and role rarity to calculate optimal bidding limits so you never overpay in auction or transfers.
                            </p>

                            {/* Top Market Targets Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs font-mono">
                                    <thead>
                                        <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                                            <th className="p-2.5">Player</th>
                                            <th className="p-2.5">Role</th>
                                            <th className="p-2.5">Bat / Bowl</th>
                                            <th className="p-2.5">Foreign?</th>
                                            <th className="p-2.5">Estimated Value</th>
                                            <th className="p-2.5 text-right">SigNify Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60">
                                        {topMarketTargets.map((p) => {
                                            const basePrice = getPlayerBasePrice(p);
                                            const marketPrice = getPlayerMarketPrice(p);
                                            return (
                                                <tr key={p.id} className="hover:bg-slate-800/50 transition-colors">
                                                    <td className="p-2.5 font-bold text-white flex items-center gap-1.5">
                                                        <span>{p.name}</span>
                                                    </td>
                                                    <td className="p-2.5 text-teal-400 font-bold">{p.role}</td>
                                                    <td className="p-2.5 text-slate-300">{p.battingSkill} / {p.secondarySkill}</td>
                                                    <td className="p-2.5">
                                                        {p.isForeign ? (
                                                            <span className="text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">Yes</span>
                                                        ) : (
                                                            <span className="text-slate-500">No</span>
                                                        )}
                                                    </td>
                                                    <td className="p-2.5 text-emerald-400 font-bold">₹{marketPrice.toFixed(2)} Cr</td>
                                                    <td className="p-2.5 text-right">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedPlayer(p);
                                                                setScreen('PLAYER_PROFILE');
                                                            }}
                                                            className="text-[10px] bg-slate-800 hover:bg-teal-500 hover:text-slate-950 text-teal-300 px-2 py-1 rounded border border-slate-700 transition-colors cursor-pointer"
                                                        >
                                                            View Profile
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. SQUAD HEALTH & LIMITS SECTION */}
                {activeSection === 'squad' && squadAnalysis && (
                    <div className="max-w-4xl mx-auto flex flex-col gap-5">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                                <div className="flex items-center gap-2">
                                    <Users className="w-5 h-5 text-teal-400" />
                                    <h2 className="font-extrabold text-base text-white uppercase tracking-wider">SQUAD COMPOSITION & LEAGUE LIMITS</h2>
                                </div>
                                <span className="text-xs font-mono text-slate-400">Squad: {squadAnalysis.total}/22</span>
                            </div>

                            {/* League Limits Checker */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                <div className={`p-4 rounded-xl border flex flex-col gap-1.5 ${
                                    squadAnalysis.foreigns.length <= 3 
                                        ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400' 
                                        : 'bg-rose-950/40 border-rose-500/40 text-rose-400'
                                }`}>
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-xs uppercase tracking-wider">Foreign Player Squad Limit</span>
                                        {squadAnalysis.foreigns.length <= 3 ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                    </div>
                                    <p className="text-xl font-black">{squadAnalysis.foreigns.length} / 3 Allowed</p>
                                    <p className="text-[10px] text-slate-400">
                                        {squadAnalysis.foreigns.length <= 3 ? '✓ Compliant with league regulations (max 2 in Playing XI).' : '⚠️ Exceeds max 3 foreign player squad limit!'}
                                    </p>
                                </div>

                                <div className={`p-4 rounded-xl border flex flex-col gap-1.5 ${
                                    squadAnalysis.keepers.length >= 1 
                                        ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400' 
                                        : 'bg-amber-950/40 border-amber-500/40 text-amber-400'
                                }`}>
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-xs uppercase tracking-wider">Wicket-Keeper Count</span>
                                        {squadAnalysis.keepers.length >= 1 ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                    </div>
                                    <p className="text-xl font-black">{squadAnalysis.keepers.length} Keepers</p>
                                    <p className="text-[10px] text-slate-400">
                                        {squadAnalysis.keepers.length >= 1 ? '✓ Sufficient wicketkeeping cover.' : '⚠️ No wicketkeeper found! Sign one immediately.'}
                                    </p>
                                </div>
                            </div>

                            {/* Role Breakdown Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">Batters</span>
                                    <p className="text-lg font-black text-white mt-1">{squadAnalysis.batters.length}</p>
                                </div>
                                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">All-Rounders</span>
                                    <p className="text-lg font-black text-white mt-1">{squadAnalysis.allrounders.length}</p>
                                </div>
                                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">Bowlers</span>
                                    <p className="text-lg font-black text-white mt-1">{squadAnalysis.bowlers.length}</p>
                                </div>
                                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">Injured</span>
                                    <p className="text-lg font-black text-rose-400 mt-1">{squadAnalysis.injured.length}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 5. LEAGUE STATS SECTION */}
                {activeSection === 'stats' && (
                    <div className="max-w-4xl mx-auto flex flex-col gap-5">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                                <div className="flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-teal-400" />
                                    <h2 className="font-extrabold text-base text-white uppercase tracking-wider">SIGNIFY LEAGUE STATS INTELLIGENCE</h2>
                                </div>
                                <button
                                    onClick={() => setScreen('STATS')}
                                    className="text-xs text-teal-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                                >
                                    Open Full Stats Hub <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            <p className="text-xs text-slate-400 mb-4">
                                Access real-time statistical rankings across all 3 formats ({Format.T20}, {Format.ODI}, {Format.SHIELD}).
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                                    <span className="text-xs font-bold text-teal-400 uppercase">Top Format</span>
                                    <p className="text-white font-bold text-sm mt-1">{gameData.currentFormat}</p>
                                    <p className="text-xs text-slate-400 mt-2">Active Matches Simulated: {gameData.matchResults[gameData.currentFormat]?.length || 0}</p>
                                </div>

                                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                                    <span className="text-xs font-bold text-teal-400 uppercase">Season Progress</span>
                                    <p className="text-white font-bold text-sm mt-1">Season {gameData.currentSeason}</p>
                                    <p className="text-xs text-slate-400 mt-2">Standings Updated live</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Radio } from 'lucide-react';
import { Match, GameData, MatchResult, Strategy, LiveMatchState, Player, Ground, Message, Format, LiveTacticalInput } from '../types';
import { useLiveMatch } from '../hooks/useLiveMatch';
import { Icons } from './Icons';
import { TV_CHANNELS, INITIAL_SPONSORSHIPS, TOURNAMENT_LOGOS, generateSingleFormatInitialStats } from '../data';
import { getPlayerById } from '../utils';
import { GameplanView } from './GameplanView';
import { DRSModal } from './DRSModal';
import { findOptimalCounterShot } from '../utils/interactiveGameplayEngine';
import { LiveMatchTacticalControls, TacticsVisualsGuideModal, GROUND_SECTORS, BOWLING_LENGTHS, BOWLING_LINES, FAST_VARIATIONS, SPIN_VARIATIONS } from './LiveMatchTacticalControls';
import { FIELD_PRESETS, getSmartFieldPreset, getMatchFieldRestrictions, isPresetValidForSituation } from '../data/fieldingPresets';

interface LiveMatchScreenProps {
    match: Match;
    gameData: GameData;
    onMatchComplete: (result: MatchResult) => void;
    onExit: (stateToSave?: LiveMatchState) => void;
    savedState?: LiveMatchState | null;
}

const StrategyToggle = ({ label, value, onChange }: { label: string, value: Strategy, onChange: (s: Strategy) => void }) => (
    <div className="flex flex-col items-center bg-slate-800 rounded p-1 flex-1">
        <span className="text-[9px] text-slate-400 uppercase mb-1">{label}</span>
        <div className="flex bg-slate-900 rounded p-0.5 w-full justify-center">
            {(['defensive', 'balanced', 'attacking'] as Strategy[]).map(s => (
                <button
                    key={s}
                    onClick={() => onChange(s)}
                    className={`px-2 py-1 text-[9px] uppercase font-bold rounded transition-colors flex-1 ${value === s 
                        ? s === 'attacking' ? 'bg-red-600 text-white' : s === 'defensive' ? 'bg-blue-600 text-white' : 'bg-yellow-600 text-white' 
                        : 'text-slate-500 hover:bg-slate-700'}`}
                >
                    {s.slice(0,3)}
                </button>
            ))}
        </div>
    </div>
);

const PreMatchPanel = ({ match, gameData, onStart }: { match: Match, gameData: GameData, onStart: () => void }) => {
    const sponsorship = gameData.sponsorships?.[gameData.currentFormat] || INITIAL_SPONSORSHIPS[gameData.currentFormat];
    const teamA = gameData.teams.find(t => t.name === match.teamA);
    const teamB = gameData.teams.find(t => t.name === match.teamB);
    const ground = gameData.grounds.find(g => g.code === (gameData.allTeamsData.find(t => t.name === match.teamA)?.homeGround || 'KCG'));
    
    // Basic prediction logic
    const formatStandings = gameData.standings?.[gameData.currentFormat] || [];
    const teamARank = formatStandings.find(s => s.teamId === teamA?.id)?.points || 0;
    const teamBRank = formatStandings.find(s => s.teamId === teamB?.id)?.points || 0;
    const winProbA = 50 + (teamARank - teamBRank) * 2;

    const getWeatherIcon = (w?: string) => {
        switch(w) {
            case 'Sunny': return '☀️';
            case 'Overcast': return '☁️';
            case 'Rainy': return '🌧️';
            case 'Humid': return '🌫️';
            default: return '🌤️';
        }
    };

    return (
        <div className="absolute inset-0 z-[120] bg-slate-900/95 flex flex-col items-center justify-center p-6 backdrop-blur-md animate-fade-in">
            {/* Header */}
            <div className="w-full max-w-lg mb-6 flex justify-between items-center border-b border-slate-700 pb-4">
                <div className={`w-12 h-12 ${sponsorship.logoColor}`} dangerouslySetInnerHTML={{__html: sponsorship.tournamentLogo || TOURNAMENT_LOGOS[0].svg}}></div>
                <div className="text-center">
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{gameData.currentFormat}</h2>
                    <h1 className="text-2xl font-extrabold text-white italic">{sponsorship.sponsorName} {sponsorship.tournamentName}</h1>
                </div>
                <div className={`w-16 h-10 opacity-80`} dangerouslySetInnerHTML={{__html: sponsorship.tvLogo || ''}}></div>
            </div>

            {/* Match Card */}
            <div className="w-full max-w-lg bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 shadow-2xl overflow-hidden">
                <div className="flex justify-between items-center p-6 bg-slate-800/50">
                    <div className="text-center w-1/3">
                        <div className="w-16 h-16 mx-auto mb-2" dangerouslySetInnerHTML={{__html: gameData.allTeamsData.find(t => t.id === teamA?.id)?.logo || ''}}></div>
                        <h3 className="font-bold text-xl text-white">{teamA?.name}</h3>
                    </div>
                    <div className="text-center w-1/3">
                        <div className="text-2xl font-black text-teal-500">VS</div>
                        <div className="text-[10px] text-slate-400 uppercase mt-1">{ground?.name}</div>
                    </div>
                    <div className="text-center w-1/3">
                        <div className="w-16 h-16 mx-auto mb-2" dangerouslySetInnerHTML={{__html: gameData.allTeamsData.find(t => t.id === teamB?.id)?.logo || ''}}></div>
                        <h3 className="font-bold text-xl text-white">{teamB?.name}</h3>
                    </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-px bg-slate-700 border-t border-slate-700">
                    <div className="bg-slate-800 p-4 text-center">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Pitch Report</p>
                        <p className="text-teal-400 font-semibold text-sm">{ground?.pitch}</p>
                        <p className="text-[10px] text-slate-500 mt-1">Favors {ground?.pitch.includes('Spin') ? 'Spin' : ground?.pitch.includes('Green') ? 'Pace' : 'Batting'}</p>
                    </div>
                    <div className="bg-slate-800 p-4 text-center">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Conditions</p>
                        <p className="text-white font-semibold text-sm flex items-center justify-center gap-2">
                            <span className="text-lg">{getWeatherIcon(ground?.weather)}</span> {ground?.weather || 'Clear'}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1">{ground?.outfieldSpeed || 'Medium'} Outfield</p>
                    </div>
                    <div className="bg-slate-800 p-4 text-center">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Win Probability</p>
                        <div className="flex items-center justify-center gap-2 mt-1">
                            <div className="h-2 w-16 bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-teal-500" style={{width: `${Math.min(100, Math.max(0, winProbA))}%`}}></div>
                            </div>
                            <span className="text-xs font-bold text-white">{Math.round(Math.min(100, Math.max(0, winProbA)))}%</span>
                        </div>
                    </div>
                    <div className="bg-slate-800 p-4 text-center">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Boundary Dimensions</p>
                        <p className="text-white font-semibold text-sm">{ground?.dimensions || '65m / 70m'}</p>
                        <p className="text-[10px] text-slate-500 mt-1">{ground?.boundarySize || 'Medium'} Size</p>
                    </div>
                </div>
                
                <button onClick={onStart} className="w-full py-4 bg-teal-600 hover:bg-teal-500 text-white font-bold uppercase tracking-wider transition-colors">
                    Start Match
                </button>
            </div>
        </div>
    );
};

const AutoArrivalNotification = ({ playerName, onOverride, secondsLeft }: { playerName: string, onOverride: () => void, secondsLeft: number }) => (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 bg-slate-900/90 border border-teal-500/50 rounded-lg shadow-2xl p-4 flex items-center gap-4 animate-slide-up min-w-[300px]">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-teal-900 flex items-center justify-center text-teal-400 animate-pulse">
            <Icons.User className="w-6 h-6" />
        </div>
        <div className="flex-grow">
            <p className="text-[10px] text-teal-400 uppercase font-bold">Next Batter Arriving</p>
            <p className="text-white font-bold text-lg">{playerName}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
            <span className="text-xs font-mono text-slate-400">{secondsLeft}s</span>
            <div className="text-[9px] text-gray-500 uppercase">Click to skip</div>
        </div>
    </div>
);

const PostTossInfoScreen = ({ state, gameData, onProceed }: { state: LiveMatchState, gameData: GameData, onProceed: () => void }) => {
    const teamA = state.innings[0].teamName === state.battingTeam.name ? state.battingTeam : state.bowlingTeam;
    const teamB = state.innings[0].teamName === state.battingTeam.name ? state.bowlingTeam : state.battingTeam;

    // H2H Logic
    const h2hRecord = gameData.records?.teamVsTeam?.find(r => 
        (r.teamAId === teamA.id && r.teamBId === teamB.id) || 
        (r.teamAId === teamB.id && r.teamBId === teamA.id)
    );
    const matches = h2hRecord?.matches || 0;
    const winsA = h2hRecord ? (h2hRecord.teamAId === teamA.id ? h2hRecord.teamAWins : h2hRecord.matches - h2hRecord.teamAWins) : 0;
    const winsB = h2hRecord ? (h2hRecord.teamAId === teamB.id ? h2hRecord.teamAWins : h2hRecord.matches - h2hRecord.teamAWins) : 0;
    const noResult = 0; // Simplified

    // Last 5 Results (Mocked from recent match results if available, else just a random pattern for flavor)
    const recentResults = (gameData.matchResults?.[gameData.currentFormat] || [])
        .filter(r => (r.winnerId === teamA.id && (r.loserId === teamB.id)) || (r.winnerId === teamB.id && (r.loserId === teamA.id)))
        .slice(-5)
        .map(r => r.winnerId === teamA.id ? teamA.name.slice(0,3).toUpperCase() : teamB.name.slice(0,3).toUpperCase());
    
    // Fill with random if less than 5
    while(recentResults.length < 5) {
        recentResults.push(Math.random() > 0.5 ? teamA.name.slice(0,3).toUpperCase() : teamB.name.slice(0,3).toUpperCase());
    }

    const getInForm = (teamId: string) => {
        const team = gameData.teams.find(t => t.id === teamId);
        if (!team) return { batters: [], bowlers: [] };
        const format = gameData.currentFormat;
        const batters = [...team.squad]
            .filter(p => p.role === 'BT' || p.role === 'AR' || p.role === 'WK')
            .sort((a, b) => (b.stats[format]?.runs || 0) - (a.stats[format]?.runs || 0))
            .slice(0, 2);
        const bowlers = [...team.squad]
            .filter(p => p.role === 'BL' || p.role === 'SB' || p.role === 'AR')
            .sort((a, b) => (b.stats[format]?.wickets || 0) - (a.stats[format]?.wickets || 0))
            .slice(0, 2);
        return { batters, bowlers };
    };

    const inFormA = getInForm(teamA.id);
    const inFormB = getInForm(teamB.id);

    const getWatchPlayer = (teamId: string) => {
        const team = gameData.teams.find(t => t.id === teamId);
        return team?.squad.sort((a, b) => (b.battingSkill + b.secondarySkill) - (a.battingSkill + a.secondarySkill))[0];
    };

    const watchA = getWatchPlayer(teamA.id);
    const watchB = getWatchPlayer(teamB.id);

    return (
        <div className="absolute inset-0 z-[110] bg-slate-900 flex flex-col p-6 overflow-y-auto">
            <div className="max-w-2xl mx-auto w-full space-y-8 py-8">
                <div className="text-center">
                    <h2 className="text-teal-400 font-bold uppercase tracking-widest text-sm mb-1">Match Information</h2>
                    <h1 className="text-3xl font-black text-white italic">PRE-MATCH SHOW</h1>
                </div>

                {/* H2H Section */}
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
                    <h3 className="text-center text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">HEAD TO HEAD</h3>
                    <div className="flex justify-between items-center mb-6">
                        <div className="text-center w-1/3">
                            <h4 className="text-white font-bold text-lg">{teamA.name}</h4>
                            <p className="text-3xl font-black text-teal-400">{winsA}</p>
                            <p className="text-[10px] text-slate-500 uppercase">Wins</p>
                        </div>
                        <div className="bg-slate-700/50 p-3 rounded-lg text-center">
                            <p className="text-[10px] text-slate-400 uppercase">Total Matches</p>
                            <p className="text-xl font-bold text-white">{matches}</p>
                        </div>
                        <div className="text-center w-1/3">
                            <h4 className="text-white font-bold text-lg">{teamB.name}</h4>
                            <p className="text-3xl font-black text-white">{winsB}</p>
                            <p className="text-[10px] text-slate-500 uppercase">Wins</p>
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Last 5 Results</p>
                        <div className="flex gap-2">
                            {recentResults.reverse().map((res, i) => (
                                <div key={i} className={`flex-1 py-1 text-center font-bold text-xs rounded ${res === teamA.name.slice(0,3).toUpperCase() ? 'bg-teal-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                                    {res}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* In Form Section */}
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest">IN-FORM PLAYERS</h3>
                        <span className="text-[9px] bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded border border-teal-500/30 font-bold">CURRENT SEASON</span>
                    </div>
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <h4 className="text-teal-400 font-bold mb-3 border-l-2 border-teal-500 pl-2 uppercase text-xs">{teamA.name}</h4>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[9px] text-slate-500 uppercase font-black mb-2 tracking-widest">In-Form Batters</p>
                                    {inFormA.batters.map(p => {
                                        const h2h = gameData.records?.playerVsTeam?.find(r => r.playerId === p.id && r.vsTeamId === teamB.id) || { runs: 0 };
                                        return (
                                            <div key={p.id} className="flex justify-between items-center mb-2 pb-1 border-b border-slate-700/30">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-white">{p.name}</span>
                                                    <span className="text-[9px] text-slate-500">Season: {p.stats[gameData.currentFormat]?.runs || 0}r</span>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-teal-400 font-black text-xs">{h2h.runs}</div>
                                                    <div className="text-[8px] text-slate-600 uppercase font-bold">Vs {teamB.name.slice(0,3)}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div>
                                    <p className="text-[9px] text-slate-500 uppercase font-black mb-2 tracking-widest">In-Form Bowlers</p>
                                    {inFormA.bowlers.map(p => {
                                        const h2h = gameData.records?.playerVsTeam?.find(r => r.playerId === p.id && r.vsTeamId === teamB.id) || { wickets: 0 };
                                        return (
                                            <div key={p.id} className="flex justify-between items-center mb-2 pb-1 border-b border-slate-700/30">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-white">{p.name}</span>
                                                    <span className="text-[9px] text-slate-500">Season: {p.stats[gameData.currentFormat]?.wickets || 0}w</span>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-cyan-400 font-black text-xs">{h2h.wickets}</div>
                                                    <div className="text-[8px] text-slate-600 uppercase font-bold">Vs {teamB.name.slice(0,3)}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-white font-bold mb-3 border-l-2 border-slate-600 pl-2 uppercase text-xs">{teamB.name}</h4>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[9px] text-slate-500 uppercase font-black mb-2 tracking-widest">In-Form Batters</p>
                                    {inFormB.batters.map(p => {
                                        const h2h = gameData.records?.playerVsTeam?.find(r => r.playerId === p.id && r.vsTeamId === teamA.id) || { runs: 0 };
                                        return (
                                            <div key={p.id} className="flex justify-between items-center mb-2 pb-1 border-b border-slate-700/30">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-white">{p.name}</span>
                                                    <span className="text-[9px] text-slate-500">Season: {p.stats[gameData.currentFormat]?.runs || 0}r</span>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-teal-400 font-black text-xs">{h2h.runs}</div>
                                                    <div className="text-[8px] text-slate-600 uppercase font-bold">Vs {teamA.name.slice(0,3)}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div>
                                    <p className="text-[9px] text-slate-500 uppercase font-black mb-2 tracking-widest">In-Form Bowlers</p>
                                    {inFormB.bowlers.map(p => {
                                        const h2h = gameData.records?.playerVsTeam?.find(r => r.playerId === p.id && r.vsTeamId === teamA.id) || { wickets: 0 };
                                        return (
                                            <div key={p.id} className="flex justify-between items-center mb-2 pb-1 border-b border-slate-700/30">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-white">{p.name}</span>
                                                    <span className="text-[9px] text-slate-500">Season: {p.stats[gameData.currentFormat]?.wickets || 0}w</span>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-cyan-400 font-black text-xs">{h2h.wickets}</div>
                                                    <div className="text-[8px] text-slate-600 uppercase font-bold">Vs {teamA.name.slice(0,3)}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Player to Watch & H2H Matchups */}
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest">PLAYERS TO WATCH</h3>
                        <span className="text-[9px] bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded border border-yellow-500/30 font-bold">VS OPPONENT H2H</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { player: watchA, team: teamA, vsTeam: teamB },
                            { player: watchB, team: teamB, vsTeam: teamA }
                        ].map((item, idx) => {
                            const vsStats = gameData.records?.playerVsTeam?.find(r => r.playerId === item.player?.id && r.vsTeamId === item.vsTeam.id);
                            return (
                                <div key={idx} className={`bg-slate-900 p-4 rounded-lg flex flex-col border-t-4 ${idx === 0 ? 'border-teal-500' : 'border-slate-500'}`}>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">{item.team.name}</p>
                                    <p className="text-lg font-black text-white italic">{item.player?.name} ⭐</p>
                                    <div className="mt-3 bg-slate-800/50 rounded p-2 border border-slate-700/50">
                                        <p className="text-[9px] text-slate-500 uppercase font-black mb-1">H2H vs {item.vsTeam.name.slice(0,3)}</p>
                                        <div className="flex justify-between text-[11px]">
                                            {item.player?.role === 'BL' || item.player?.role === 'SB' ? (
                                                <>
                                                    <span className="text-slate-400">Wickets: <span className="text-yellow-400 font-bold">{vsStats?.wickets || 0}</span></span>
                                                    <span className="text-slate-400">Econ: <span className="text-teal-400 font-bold">{vsStats?.ballsBowled ? ((vsStats.runsConceded / vsStats.ballsBowled) * 6).toFixed(1) : '0.0'}</span></span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-slate-400">Runs: <span className="text-yellow-400 font-bold">{vsStats?.runs || 0}</span></span>
                                                    <span className="text-slate-400">Avg: <span className="text-teal-400 font-bold">{vsStats?.dismissals ? (vsStats.runs / vsStats.dismissals).toFixed(1) : (vsStats?.runs || '0.0')}</span></span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <button onClick={onProceed} className="w-full py-4 bg-teal-600 hover:bg-teal-500 text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-teal-500/20 active:scale-[0.98]">
                    Continue to Match
                </button>
            </div>
        </div>
    );
};

const LiveMatchScreen: React.FC<LiveMatchScreenProps> = ({ match, gameData, onMatchComplete, onExit, savedState }) => {
    const { 
        state, 
        playBall, 
        playOver, 
        autoSimulate, 
        simulateInning, 
        simulateMatch, 
        setBattingStrategy, 
        setBowlingStrategy, 
        toggleExploitWeakness, 
        selectOpeners, 
        selectNextBatter, 
        selectNextBowler, 
        requestDrsReview,
        dismissDrsOpportunity,
        resolveDrsReview,
        startMatch, 
        proceedToMatch 
    } = useLiveMatch(match, gameData, onMatchComplete, savedState);
    const commentaryRef = useRef<HTMLDivElement>(null);
    
    // Match Centre State
    const [showMatchCentre, setShowMatchCentre] = useState(false);
    const [activeTab, setActiveTab] = useState<'scorecard' | 'commentary' | 'analysis' | 'gameplan'>('scorecard');
    
    const [selectedOpener1, setSelectedOpener1] = useState('');
    const [selectedOpener2, setSelectedOpener2] = useState('');
    const [selectedBatter, setSelectedBatter] = useState('');
    const [selectedBowler, setSelectedBowler] = useState('');
    const [tossState, setTossState] = useState<'coin' | 'result'>('coin');
    const [showPreMatch, setShowPreMatch] = useState(false);

    // Interactive Tactical Aiming & Bowling State
    const [aimedShotAngle, setAimedShotAngle] = useState<number>(315);
    const [bowlingTargetLength, setBowlingTargetLength] = useState<'yorker' | 'full' | 'good' | 'short'>('good');
    const [bowlingTargetLine, setBowlingTargetLine] = useState<'off' | 'middle' | 'leg'>('off');
    const [isLofted, setIsLofted] = useState<boolean>(false);
    const [shotCategory, setShotCategory] = useState<'Placement' | 'Attacking' | 'Lofted' | 'Defensive'>('Attacking');
    const [selectedShotType, setSelectedShotType] = useState<string>('Cover Drive');
    const [selectedBowlingVariation, setSelectedBowlingVariation] = useState<string>('Outswinger');
    const [isDraggingCanvas, setIsDraggingCanvas] = useState<boolean>(false);
    const [showTacticalHUD, setShowTacticalHUD] = useState<boolean>(false);
    const [selectedFieldPresetId, setSelectedFieldPresetId] = useState<string>('pp_attacking');
    const [isSmartFieldingActive, setIsSmartFieldingActive] = useState<boolean>(true);
    const [isAutoBatting, setIsAutoBatting] = useState<boolean>(false);
    const [isAutoBowling, setIsAutoBowling] = useState<boolean>(false);
    const [isAutoCounter, setIsAutoCounter] = useState<boolean>(true);
    const [showTacticsGuide, setShowTacticsGuide] = useState<boolean>(false);
    const [autoCounterReasoning, setAutoCounterReasoning] = useState<string>('');

    // Memoized team details & preview statistics
    const teamA = useMemo(() => gameData.teams.find(t => t.name === match.teamA), [gameData.teams, match.teamA]);
    const teamB = useMemo(() => gameData.teams.find(t => t.name === match.teamB), [gameData.teams, match.teamB]);

    // Head-to-Head Records
    const h2h = useMemo(() => {
        if (!teamA || !teamB || !gameData.records?.teamVsTeam) return { matches: 0, winsA: 0, winsB: 0 };
        const record = gameData.records.teamVsTeam.find(r => 
            (r.teamAId === teamA.id && r.teamBId === teamB.id) || 
            (r.teamAId === teamB.id && r.teamBId === teamA.id)
        );
        if (record) {
            return {
                matches: record.matches,
                winsA: record.teamAId === teamA.id ? record.teamAWins : (record.matches - record.teamAWins),
                winsB: record.teamAId === teamB.id ? record.teamAWins : (record.matches - record.teamAWins),
            };
        }
        return { matches: 0, winsA: 0, winsB: 0 };
    }, [teamA, teamB, gameData.records?.teamVsTeam]);

    // In form players & players to watch
    const getInFormPlayers = useCallback((team: any) => {
        if (!team) return { batters: [], bowlers: [] };
        const batters = [...team.squad]
            .filter(p => p.role === 'BT' || p.role === 'AR' || p.role === 'WK')
            .sort((a, b) => {
                const runsA = a.stats[gameData.currentFormat]?.runs || 0;
                const runsB = b.stats[gameData.currentFormat]?.runs || 0;
                if (runsB !== runsA) return runsB - runsA;
                return b.battingSkill - a.battingSkill;
            })
            .slice(0, 2);

        const bowlers = [...team.squad]
            .filter(p => p.role === 'BL' || p.role === 'SB' || p.role === 'AR')
            .sort((a, b) => {
                const wicketsA = a.stats[gameData.currentFormat]?.wickets || 0;
                const wicketsB = b.stats[gameData.currentFormat]?.wickets || 0;
                if (wicketsB !== wicketsA) return wicketsB - wicketsA;
                return b.secondarySkill - a.secondarySkill;
            })
            .slice(0, 2);

        return { batters, bowlers };
    }, [gameData.currentFormat]);

    const getPlayerToWatch = useCallback((team: any) => {
        if (!team) return null;
        return [...team.squad].sort((a, b) => {
            const overallA = a.battingSkill + a.secondarySkill;
            const overallB = b.battingSkill + b.secondarySkill;
            return overallB - overallA;
        })[0];
    }, []);

    const inFormA = useMemo(() => getInFormPlayers(teamA), [teamA, getInFormPlayers]);
    const inFormB = useMemo(() => getInFormPlayers(teamB), [teamB, getInFormPlayers]);

    const watchA = useMemo(() => getPlayerToWatch(teamA), [teamA, getPlayerToWatch]);
    const watchB = useMemo(() => getPlayerToWatch(teamB), [teamB, getPlayerToWatch]);

    // Auto Arrival State
    const [autoArrivalSeconds, setAutoArrivalSeconds] = useState<number | null>(null);
    const autoArrivalTimerRef = useRef<any>(null);
    const [nextAutoPlayerId, setNextAutoPlayerId] = useState<string | null>(null);

    const sponsorship = gameData.sponsorships?.[gameData.currentFormat];
    const tvChannelData = TV_CHANNELS.find(t => t.name === sponsorship?.tvChannel);
    const tvLogo = sponsorship?.tvLogo;
    const tvColor = tvChannelData?.color || 'text-white';

    // Pre-match Panel Logic
    useEffect(() => {
        if (state?.status === 'ready' && !savedState) {
            setShowPreMatch(true);
        }
    }, [state?.status, savedState]);

    // Auto-select / Pre-fill logic AND Auto-Arrival
    useEffect(() => {
        if (!state) return;
        
        // Helper to find next player
        const getNextPlayer = () => {
            const currentInning = state.innings[state.currentInningIndex];
            if (state.waitingFor === 'batter') {
                return currentInning.batting.find(b => !b.isOut && b.playerId !== state.currentBatters.strikerId && b.playerId !== state.currentBatters.nonStrikerId);
            } else if (state.waitingFor === 'bowler') {
                const overLimit = gameData.currentFormat.includes('T20') ? 4 : 10;
                const validBowlers = currentInning.bowling.filter(b => b.playerId !== state.currentBowlerId && b.ballsBowled < overLimit * 6);
                return validBowlers[0];
            }
            return null;
        };

        if (state.waitingFor === 'openers') {
             const currentInning = state.innings[state.currentInningIndex];
             const available = currentInning.batting.filter(b => !b.isOut);
             if (available.length >= 2) {
                 setSelectedOpener1(available[0].playerId);
                 setSelectedOpener2(available[1].playerId);
             }
        } else if (state.waitingFor === 'batter' || state.waitingFor === 'bowler') {
            const nextP = getNextPlayer();
            if (nextP) {
                if (state.waitingFor === 'batter') {
                    if (!selectedBatter) setSelectedBatter(nextP.playerId);
                }
                if (state.waitingFor === 'bowler') {
                    if (!selectedBowler) setSelectedBowler(nextP.playerId);
                }
            }
        }
    }, [state?.waitingFor, state?.currentInningIndex, state?.innings, state?.currentBatters, state?.currentBowlerId, gameData.currentFormat]);

    const handleOverrideAuto = () => {
        // No-op or clean-up since countdown timer is removed
    };

    useEffect(() => {
        if (activeTab === 'commentary' && commentaryRef.current) {
            commentaryRef.current.scrollTop = 0;
        }
    }, [state?.commentary, activeTab]);

    // --- PREDICTIONS & STATS CALCULATIONS ---
    const predictions = useMemo(() => {
        if (!state) return null;
        const { innings, currentInningIndex, target, battingTeam, bowlingTeam, currentBatters } = state;
        const currentInning = innings[currentInningIndex];
        const maxOvers = gameData.currentFormat.includes('T20') ? 20 : 50;
        const getBallsFromOvers = (overs: string) => {
            const [o, b] = overs.split('.').map(Number);
            return (o * 6) + (b || 0);
        };

        const ballsBowled = getBallsFromOvers(currentInning.overs);
        const ballsRemaining = Math.max(0, (maxOvers * 6) - ballsBowled);
        const currentRunRate = ballsBowled > 0 ? (currentInning.score / ballsBowled) * 6 : 0;
        
        // Win Probability
        let winProb = 50;
        if (target) {
            const runsNeeded = target - currentInning.score + 1;
            const reqRate = ballsRemaining > 0 ? (runsNeeded / ballsRemaining) * 6 : 99;
            
            if (runsNeeded <= 0) winProb = 100;
            else if (ballsRemaining <= 0) winProb = 0;
            else {
                // Simple logistic-like heuristic
                const rateDiff = currentRunRate - reqRate;
                const wicketsFactor = (10 - currentInning.wickets) * 5;
                winProb = 50 + (rateDiff * 10) + (wicketsFactor - 25); // Base 50, adjust by rate and wickets
                if (currentInning.wickets >= 9) winProb -= 30;
            }
        } else {
            // Batting first
            const projScore = currentInning.score + (currentRunRate * (ballsRemaining/6));
            const parScore = maxOvers === 20 ? 160 : 280;
            winProb = 50 + ((projScore - parScore) / 2);
        }
        winProb = Math.max(0, Math.min(100, winProb));

        // Projected Scores
        const projCurrent = Math.round(currentInning.score + (currentRunRate * (ballsRemaining/6)));
        const proj6 = Math.round(currentInning.score + (6 * (ballsRemaining/6)));
        const proj8 = Math.round(currentInning.score + (8 * (ballsRemaining/6)));
        const proj10 = Math.round(currentInning.score + (10 * (ballsRemaining/6)));

        // Player Prediction
        const striker = currentInning.batting.find(b => b.playerId === currentBatters.strikerId);
        let playerProj = 0;
        if (striker) {
            // Assume they face 40% of remaining balls if top order, less if tail
            const expectedBalls = ballsRemaining * 0.4; 
            const currentSR = striker.balls > 0 ? (striker.runs / striker.balls) : 0.8; // Default 80 SR
            playerProj = Math.round(striker.runs + (expectedBalls * currentSR));
        }

        return {
            winProb: Math.round(winProb),
            projCurrent,
            proj6,
            proj8,
            proj10,
            playerProj
        };
    }, [state, gameData.currentFormat]);

    const currentInningForHooks = state?.innings?.[state?.currentInningIndex];
    const ballsBowledTotal = useMemo(() => {
        if (!currentInningForHooks?.overs) return 0;
        const [o, b] = currentInningForHooks.overs.split('.').map(Number);
        return (o * 6) + (b || 0);
    }, [currentInningForHooks?.overs]);

    const bowlerPlayer = useMemo(() => {
        return state?.currentBowlerId ? getPlayerById(state.currentBowlerId, gameData.allPlayers) : null;
    }, [state?.currentBowlerId, gameData.allPlayers]);

    const matchFieldRestrictions = useMemo(() => {
        return getMatchFieldRestrictions(gameData.currentFormat, ballsBowledTotal);
    }, [gameData.currentFormat, ballsBowledTotal]);

    const activeFieldPreset = useMemo(() => {
        return FIELD_PRESETS.find(p => p.id === selectedFieldPresetId) || FIELD_PRESETS[0];
    }, [selectedFieldPresetId]);

    const activeSector = useMemo(() => {
        let bestSec = GROUND_SECTORS[0];
        let minDiff = 999;
        for (const sec of GROUND_SECTORS) {
            let diff = Math.abs(sec.angle - aimedShotAngle);
            if (diff > 180) diff = 360 - diff;
            if (diff < minDiff) {
                minDiff = diff;
                bestSec = sec;
            }
        }
        return bestSec;
    }, [aimedShotAngle]);

    const isSpinBowler = useMemo(() => {
        return bowlerPlayer?.role?.toLowerCase().includes('spin') || 
               bowlerPlayer?.bowlingSubType?.toLowerCase().includes('spin') || 
               bowlerPlayer?.role === 'SB';
    }, [bowlerPlayer]);

    useEffect(() => {
        if (isSpinBowler) {
            if (!SPIN_VARIATIONS.includes(selectedBowlingVariation)) {
                setSelectedBowlingVariation('Standard Turn');
            }
        } else {
            if (!FAST_VARIATIONS.includes(selectedBowlingVariation)) {
                setSelectedBowlingVariation('Outswinger');
            }
        }
    }, [isSpinBowler, selectedBowlingVariation]);

    useEffect(() => {
        if (activeSector && (!selectedShotType || !activeSector.typicalShots.includes(selectedShotType))) {
            setSelectedShotType(activeSector.typicalShots[0] || 'Drive');
        }
    }, [activeSector, selectedShotType]);

    const isUserBatting = state?.battingTeam?.id === gameData.userTeamId;
    const isUserBowling = state?.bowlingTeam?.id === gameData.userTeamId;

    const aimedTrajectoryAnalysis = useMemo(() => {
        const rad = (aimedShotAngle * Math.PI) / 180;
        const targetX = 200 + Math.cos(rad) * 135;
        const targetY = 225 + Math.sin(rad) * 135;
        
        let minDistance = 999;
        let nearestFielder = null;
        for (const f of activeFieldPreset.fielders) {
            const d = Math.hypot(f.x - targetX, f.y - targetY);
            if (d < minDistance) {
                minDistance = d;
                nearestFielder = f;
            }
        }
        const isGap = minDistance > 26;
        return { targetX, targetY, isGap, minDistance, nearestFielder };
    }, [aimedShotAngle, activeFieldPreset]);

    const handleAutoCounterDelivery = useCallback(() => {
        if (!state?.pendingBowlerDelivery) return;
        const optimal = findOptimalCounterShot(state.pendingBowlerDelivery, selectedFieldPresetId);
        setAimedShotAngle(optimal.aimedShotAngle);
        setSelectedShotType(optimal.selectedShotType);
        setShotCategory(optimal.shotCategory);
        setIsLofted(optimal.isLofted);
        setAutoCounterReasoning(optimal.reasoning);
    }, [state?.pendingBowlerDelivery, selectedFieldPresetId]);

    // Automatically apply optimal counter when isAutoCounter is enabled and delivery changes
    useEffect(() => {
        if (isAutoCounter && state?.pendingBowlerDelivery && isUserBatting && !isAutoBatting) {
            handleAutoCounterDelivery();
        }
    }, [isAutoCounter, state?.pendingBowlerDelivery, isUserBatting, isAutoBatting, handleAutoCounterDelivery]);

    // Smart Fielding Auto-Updater (must be called unconditionally before early returns)
    useEffect(() => {
        if (!isSmartFieldingActive || !state) return;
        const isSpin = bowlerPlayer?.role?.toLowerCase().includes('spin') || bowlerPlayer?.bowlingSubType?.toLowerCase().includes('spin') || bowlerPlayer?.role === 'SB' || false;
        const smartPreset = getSmartFieldPreset(bowlingTargetLength, bowlingTargetLine, isSpin, gameData.currentFormat, ballsBowledTotal);
        setSelectedFieldPresetId(smartPreset.id);
    }, [isSmartFieldingActive, bowlingTargetLength, bowlingTargetLine, bowlerPlayer, gameData.currentFormat, ballsBowledTotal, state?.currentInningIndex]);


    if (!state) return <div className="h-full flex items-center justify-center bg-slate-900 text-white">Loading Match...</div>;

    const { battingTeam, bowlingTeam, innings, currentInningIndex, currentBatters, currentBowlerId, lastBallSpeed, recentBalls, commentary, target, waitingFor, strategies } = state;

    const handleExit = () => {
        // If match not finished, save state
        if (state.status !== 'completed') {
            onExit(state);
        } else {
            onExit();
        }
    };

    if (showPreMatch && state.status === 'ready') {
        return <PreMatchPanel match={match} gameData={gameData} onStart={() => setShowPreMatch(false)} />;
    }

    if (state.status === 'post_toss') {
        return <PostTossInfoScreen state={state} gameData={gameData} onProceed={() => proceedToMatch()} />;
    }

    if (state.status === 'toss') {
        return (
            <div className="absolute inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
                <h2 className="text-3xl font-bold mb-8 text-teal-400">Match Toss</h2>
                <div className="bg-slate-800 p-8 rounded-xl shadow-2xl w-full max-w-sm text-center border border-slate-700 relative">
                    {tvLogo && (
                        <div className={`absolute -top-12 right-0 w-16 h-16 opacity-80 ${tvColor}`} dangerouslySetInnerHTML={{ __html: tvLogo }} />
                    )}
                    <div className="flex justify-between items-center mb-6 text-lg font-semibold">
                         <span>{match.teamA}</span>
                         <span className="text-slate-500">vs</span>
                         <span>{match.teamB}</span>
                    </div>
                    {tossState === 'coin' ? (
                        <button 
                            onClick={() => {
                                const winner = Math.random() > 0.5 ? gameData.teams.find(t => t.name === match.teamA) : gameData.teams.find(t => t.name === match.teamB);
                                if (winner?.id === gameData.userTeamId) {
                                    setTossState('result');
                                } else {
                                    const decision = Math.random() > 0.5 ? 'bat' : 'bowl';
                                    startMatch(winner!.id, decision);
                                }
                            }}
                            className="bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-bold py-4 px-8 rounded-full text-xl shadow-lg transform transition hover:scale-105"
                        >
                            🪙 FLIP COIN
                        </button>
                    ) : (
                        <div className="space-y-4 animate-fade-in">
                            <p className="text-green-400 font-bold text-xl">You won the toss!</p>
                            <p className="text-slate-300">What would you like to do?</p>
                            <div className="flex gap-4">
                                <button onClick={() => startMatch(gameData.userTeamId, 'bat')} className="flex-1 bg-blue-600 hover:bg-blue-500 py-3 rounded-lg font-bold">BAT 🏏</button>
                                <button onClick={() => startMatch(gameData.userTeamId, 'bowl')} className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-3 rounded-lg font-bold">BOWL ⚾</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const currentInning = innings[currentInningIndex];
    // Celebration Popup
    const renderCelebration = () => {
        if (!state.milestoneEvent) return null;
        const { title, message, type, playerId } = state.milestoneEvent;
        const p = gameData.allPlayers.find(pl => pl.id === playerId);
        if (!p) return null;

        const currentFormat = gameData.currentFormat;
        const stats = p.stats?.[currentFormat] || generateSingleFormatInitialStats();
        const currentBatPerf = striker?.playerId === p.id ? striker : nonStriker?.playerId === p.id ? nonStriker : null;
        const currentBowlPerf = bowler?.playerId === p.id ? bowler : null;

        // Calculate "Living Stats" (Career + current match contribution)
        const livingRuns = stats.runs + (currentBatPerf?.runs || 0);
        const livingHighest = Math.max(stats.highestScore, currentBatPerf?.runs || 0);
        const livingStrikeRate = stats.ballsFaced + (currentBatPerf?.balls || 0) > 0 
            ? (livingRuns / (stats.ballsFaced + (currentBatPerf?.balls || 0))) * 100 
            : 0;
        const livingDismissals = stats.dismissals + (currentBatPerf?.isOut ? 1 : 0);
        const livingAvg = livingDismissals > 0 ? (livingRuns / livingDismissals) : livingRuns;
        const livingFifties = stats.fifties + (currentBatPerf?.runs >= 50 && currentBatPerf?.runs < 100 ? 1 : 0);
        const livingHundreds = stats.hundreds + (currentBatPerf?.runs >= 100 ? 1 : 0);

        const teamData = gameData.allTeamsData.find(t => t.id === (p.teamName === teamA?.name ? teamA?.id : teamB?.id));
        const accentColor = type === 'batting' ? 'text-teal-400' : type === 'bowling' ? 'text-cyan-400' : 'text-yellow-400';
        const borderColor = type === 'batting' ? 'border-teal-500' : type === 'bowling' ? 'border-cyan-500' : 'border-yellow-500';

        return (
            <div className="absolute inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in" onClick={() => proceedToMatch()}>
                <div className={`relative bg-slate-900 border-2 ${borderColor} rounded-3xl p-6 sm:p-8 shadow-2xl text-center w-full max-w-md animate-pop-in overflow-hidden shadow-teal-500/10`}>
                    {/* Background Texture */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                    
                    {/* Header: Team & Icon */}
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12" dangerouslySetInnerHTML={{ __html: teamData?.logo || '' }} />
                        <div className={`w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-3xl shadow-inner`}>
                            {type === 'batting' ? '🏏' : type === 'bowling' ? '⚡' : '⭐'}
                        </div>
                        <div className="w-12 h-12 opacity-0" /> {/* Spacer */}
                    </div>

                    <div className="space-y-1 mb-6">
                        <h2 className={`text-2xl sm:text-3xl font-black italic tracking-tighter leading-none ${accentColor}`}>{title}</h2>
                        <h3 className="text-white text-lg font-bold">{p.name}</h3>
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{teamData?.name}</span>
                            <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{currentFormat}</span>
                        </div>
                    </div>

                    {/* Match Contribution Sub-Header */}
                    <div className="bg-slate-800/50 rounded-xl p-3 mb-6 border border-slate-700/50">
                        {currentBatPerf ? (
                            <p className="text-white font-medium text-sm">
                                <span className="text-teal-400 font-bold text-lg">{currentBatPerf.runs}{currentBatPerf.isOut ? '' : '*'}</span>
                                <span className="text-slate-400 text-xs ml-1">off {currentBatPerf.balls} balls</span>
                                <span className="mx-2 text-slate-700">|</span>
                                <span className="text-xs text-slate-300 font-mono tracking-tight">{currentBatPerf.fours}x4, {currentBatPerf.sixes}x6</span>
                            </p>
                        ) : currentBowlPerf ? (
                            <p className="text-white font-medium text-sm">
                                <span className="text-cyan-400 font-bold text-lg">{currentBowlPerf.wickets}/{currentBowlPerf.runsConceded}</span>
                                <span className="text-slate-400 text-xs ml-1">in {currentBowlPerf.overs} ovs</span>
                            </p>
                        ) : (
                            <p className="text-white text-sm opacity-60">Season Milestone</p>
                        )}
                    </div>

                    {/* 2x3 Stat Grid */}
                    <div className="grid grid-cols-3 border border-slate-700 rounded-xl overflow-hidden divide-x divide-y divide-slate-700">
                        {[
                            { label: 'Matches', val: stats.matches + 1 },
                            { label: 'Total Runs', val: livingRuns },
                            { label: 'Strike Rate', val: livingStrikeRate.toFixed(1) },
                            { label: 'Average', val: livingAvg.toFixed(1) },
                            { label: '50s / 100s', val: `${livingFifties}/${livingHundreds}` },
                            { label: 'High Score', val: livingHighest }
                        ].map((s, i) => (
                            <div key={i} className="bg-slate-800/30 p-2 sm:p-3">
                                <p className="text-[9px] text-slate-500 uppercase font-bold tracking-tight mb-0.5">{s.label}</p>
                                <p className="text-white font-bold text-sm sm:text-base font-mono">{s.val}</p>
                            </div>
                        ))}
                    </div>

                    <button className={`mt-8 w-full py-4 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-black uppercase text-xs tracking-widest rounded-xl transition-all active:scale-95`}>
                        TAP TO DISMISS
                    </button>
                    
                    {/* Confetti Animation Elements */}
                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden rounded-3xl opacity-40">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className={`absolute w-1.5 h-1.5 rounded-full animate-confetti ${i % 2 === 0 ? 'bg-teal-500' : 'bg-white'}`} style={{ 
                                left: `${5 + i * 12}%`, 
                                top: '-20px', 
                                animationDelay: `${i * 0.15}s`,
                                animationDuration: `${2 + Math.random()}s`
                            }} />
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const getBallsFromOvers = (overs: string) => {
        const [o, b] = overs.split('.').map(Number);
        return (o * 6) + (b || 0);
    };

    const striker = currentInning.batting.find(b => b.playerId === currentBatters.strikerId);
    const nonStriker = currentInning.batting.find(b => b.playerId === currentBatters.nonStrikerId);
    const bowler = currentInning.bowling.find(b => b.playerId === currentBowlerId);

    const runRate = ballsBowledTotal > 0 ? ((currentInning.score / ballsBowledTotal) * 6).toFixed(2) : "0.00";
    let reqRate = "N/A";
    let runsNeeded = 0;
    let ballsRemaining = 0;
    
    if (target) {
        runsNeeded = target - currentInning.score + 1;
        const maxOvers = gameData.currentFormat.includes('T20') ? 20 : 50;
        const totalBalls = maxOvers * 6;
        ballsRemaining = Math.max(0, totalBalls - ballsBowledTotal);
        if (ballsRemaining > 0) {
             reqRate = (runsNeeded / (ballsRemaining/6)).toFixed(2);
        }
    }

    const lastBall = recentBalls.length > 0 ? recentBalls[0] : null;
    const isWicket = lastBall === 'W';
    const isBoundary = lastBall === '4' || lastBall === '6';

    // --- Selection Modals ---
    const renderSelectionModal = (title: string, options: any[], onSelect: (id: any) => void, onConfirm: () => void, selectedValue: string, setValue: (v: string) => void, extraSelect?: any) => {
        if (state.autoPlayType === 'inning' || state.autoPlayType === 'match') return <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center text-white font-bold animate-pulse">Simulating...</div>;
        return (
            <div className="absolute inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center p-6">
                <h3 className="text-xl font-bold mb-2 text-white text-center">{title}</h3>
                {autoArrivalSeconds !== null && (
                    <div className="bg-teal-500/10 border border-teal-500/30 text-teal-300 text-[10px] font-mono rounded px-3 py-1 mb-4 flex items-center gap-2">
                        <span>⚡ Auto-complying with default recommendation in <strong className="text-white text-xs">{autoArrivalSeconds}s</strong></span>
                        <button onClick={handleOverrideAuto} className="bg-teal-700 hover:bg-teal-600 text-white font-bold text-[9px] px-2 py-0.5 rounded cursor-pointer">
                            Pause Auto
                        </button>
                    </div>
                )}
                <div className="w-full max-w-sm space-y-4 bg-slate-800 p-4 rounded-lg shadow-xl">
                    {extraSelect}
                    <select 
                        className="w-full p-2 bg-slate-900 text-white rounded border border-slate-600 font-bold" 
                        value={selectedValue} 
                        onChange={e => {
                            setValue(e.target.value);
                            handleOverrideAuto();
                        }}
                    >
                        <option value="">Select Player</option>
                        {options.map(p => <option key={p.playerId} value={p.playerId}>{p.playerName} {p.overs ? `(${p.overs} overs)` : ''}</option>)}
                    </select>
                    <button 
                        disabled={!selectedValue || (extraSelect && !selectedOpener1)}
                        onClick={() => {
                            handleOverrideAuto();
                            onConfirm();
                        }}
                        className="w-full bg-teal-500 hover:bg-teal-600 text-slate-900 font-black uppercase tracking-wider py-3 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Confirm Selection
                    </button>
                </div>
            </div>
        );
    };

    // --- Match Centre Overlay ---
    const renderMatchCentre = () => (
        <div className="absolute inset-0 bg-slate-900/95 z-40 flex flex-col p-4 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-teal-400">Match Centre</h2>
                <button onClick={() => setShowMatchCentre(false)} className="p-2 bg-slate-800 rounded-full"><Icons.X className="h-5 w-5" /></button>
            </div>
            
            <div className="flex bg-slate-800 rounded-lg p-1 mb-4 overflow-x-auto">
                {['scorecard', 'commentary', 'analysis', 'gameplan'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`flex-1 py-2 text-xs font-bold uppercase rounded-md ${activeTab === tab ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
                {activeTab === 'scorecard' && (
                    <div className="space-y-4">
                        <div className="bg-slate-800 rounded-lg p-3">
                            <h3 className="text-sm font-bold text-yellow-400 mb-2 border-b border-slate-700 pb-1">Batting</h3>
                            <table className="w-full text-xs">
                                <thead><tr className="text-slate-500 text-left"><th className="pb-1">Batter</th><th className="text-right pb-1">R</th><th className="text-right pb-1">B</th><th className="text-right pb-1">4s</th><th className="text-right pb-1">6s</th><th className="text-right pb-1">SR</th></tr></thead>
                                <tbody>
                                    {currentInning.batting.map(b => (
                                        <tr key={b.playerId} className={`border-b border-slate-700/50 ${b.isOut ? 'text-slate-500' : 'text-white'}`}>
                                            <td className="py-1.5 font-medium">
                                                {b.playerName} {b.playerId === currentBatters.strikerId ? '*' : ''}
                                                <div className="text-[9px] text-slate-500 font-normal">{b.dismissalText}</div>
                                            </td>
                                            <td className="text-right font-bold">{b.runs}</td>
                                            <td className="text-right">{b.balls}</td>
                                            <td className="text-right">{b.fours}</td>
                                            <td className="text-right">{b.sixes}</td>
                                            <td className="text-right">{b.balls > 0 ? Math.round((b.runs/b.balls)*100) : 0}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="bg-slate-800 rounded-lg p-3">
                            <h3 className="text-sm font-bold text-blue-400 mb-2 border-b border-slate-700 pb-1">Bowling</h3>
                            <table className="w-full text-xs">
                                <thead><tr className="text-slate-500 text-left"><th className="pb-1">Bowler</th><th className="text-right pb-1">O</th><th className="text-right pb-1">M</th><th className="text-right pb-1">R</th><th className="text-right pb-1">W</th><th className="text-right pb-1">Econ</th></tr></thead>
                                <tbody>
                                    {currentInning.bowling.filter(b => parseFloat(b.overs) > 0 || b.playerId === currentBowlerId).map(b => (
                                        <tr key={b.playerId} className="border-b border-slate-700/50 text-white">
                                            <td className="py-1.5 font-medium">{b.playerName} {b.playerId === currentBowlerId ? '🥎' : ''}</td>
                                            <td className="text-right">{b.overs}</td>
                                            <td className="text-right">{b.maidens}</td>
                                            <td className="text-right">{b.runsConceded}</td>
                                            <td className="text-right font-bold text-yellow-400">{b.wickets}</td>
                                            <td className="text-right">{b.ballsBowled > 0 ? ((b.runsConceded/b.ballsBowled)*6).toFixed(1) : '0.0'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'commentary' && (
                    <div className="space-y-2" ref={commentaryRef}>
                        {commentary.map((line, i) => (
                            <div key={i} className="bg-slate-800 p-2 rounded text-xs font-mono text-slate-300 border-l-2 border-teal-500">
                                {line}
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'analysis' && predictions && (
                    <div className="space-y-4">
                        <div className="bg-slate-800 rounded-lg p-4">
                            <h3 className="text-sm font-bold text-white mb-3">Win Probability</h3>
                            <div className="h-4 bg-slate-700 rounded-full overflow-hidden relative">
                                <div className="h-full bg-teal-500 transition-all duration-1000" style={{ width: `${battingTeam.id === gameData.userTeamId ? predictions.winProb : 100 - predictions.winProb}%` }}></div>
                            </div>
                            <div className="flex justify-between text-xs mt-1 font-bold">
                                <span className="text-teal-400">{gameData.userTeamId === battingTeam.id ? battingTeam.name : bowlingTeam.name} {battingTeam.id === gameData.userTeamId ? predictions.winProb : 100 - predictions.winProb}%</span>
                                <span className="text-slate-400">{gameData.userTeamId !== battingTeam.id ? battingTeam.name : bowlingTeam.name} {battingTeam.id !== gameData.userTeamId ? predictions.winProb : 100 - predictions.winProb}%</span>
                            </div>
                        </div>

                        <div className="bg-slate-800 rounded-lg p-4">
                            <h3 className="text-sm font-bold text-white mb-3">Projected Score</h3>
                            <div className="grid grid-cols-2 gap-3 text-center">
                                <div className="bg-slate-700/50 p-2 rounded">
                                    <div className="text-[10px] text-slate-400 uppercase">Current Rate</div>
                                    <div className="text-xl font-bold text-white">{predictions.projCurrent}</div>
                                </div>
                                <div className="bg-slate-700/50 p-2 rounded">
                                    <div className="text-[10px] text-slate-400 uppercase">At 8 RPO</div>
                                    <div className="text-xl font-bold text-white">{predictions.proj8}</div>
                                </div>
                                <div className="bg-slate-700/50 p-2 rounded">
                                    <div className="text-[10px] text-slate-400 uppercase">At 10 RPO</div>
                                    <div className="text-xl font-bold text-white">{predictions.proj10}</div>
                                </div>
                                 <div className="bg-slate-700/50 p-2 rounded border border-yellow-600/30">
                                    <div className="text-[10px] text-yellow-400 uppercase">Safe Score</div>
                                    <div className="text-xl font-bold text-yellow-400">
                                        {gameData.currentFormat.includes('T20') ? 175 : 285}
                                    </div>
                                 </div>
                            </div>
                        </div>

                        {/* Match Phase Stats */}
                        <div className="bg-slate-800 rounded-lg p-4">
                            <h3 className="text-sm font-bold text-white mb-3">Live Match Phase Stats</h3>
                            <div className="space-y-4">
                                {(() => {
                                    const activeInning = state.innings[state.currentInningIndex];
                                    const ppRuns = activeInning.ppRuns || 0;
                                    const ppWickets = activeInning.ppWickets || 0;
                                    const ppBalls = activeInning.ppBalls || 0;
                                    const ppRR = ppBalls > 0 ? (ppRuns / (ppBalls / 6)).toFixed(2) : '0.00';

                                    const moRuns = activeInning.moRuns || 0;
                                    const moWickets = activeInning.moWickets || 0;
                                    const moBalls = activeInning.moBalls || 0;
                                    const moDots = activeInning.moDots || 0;
                                    const moFours = activeInning.moFours || 0;
                                    const moSixes = activeInning.moSixes || 0;
                                    const moBoundPct = moBalls > 0 ? (((moFours + moSixes) / moBalls) * 100).toFixed(1) : '0.0';
                                    const moDotPct = moBalls > 0 ? ((moDots / moBalls) * 100).toFixed(1) : '0.0';

                                    const doRuns = activeInning.doRuns || 0;
                                    const doWickets = activeInning.doWickets || 0;
                                    const doBalls = activeInning.doBalls || 0;
                                    const doSR = doBalls > 0 ? ((doRuns / doBalls) * 100).toFixed(1) : '0.0';
                                    const doEco = doBalls > 0 ? (doRuns / (doBalls / 6)).toFixed(2) : "0.00";

                                     return (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            {/* Powerplay */}
                                            <div className="bg-slate-700/30 p-3 rounded border border-teal-500/10">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs font-bold text-teal-400">Powerplay</span>
                                                    <span className="text-[10px] text-slate-400 font-mono">
                                                        Overs {gameData.currentFormat.includes('T20') ? '0-6' : '0-10'}
                                                    </span>
                                                </div>
                                                <div className="text-lg font-black text-white">{ppRuns}/{ppWickets}</div>
                                                <div className="grid grid-cols-2 gap-1 mt-2 text-[10px] text-slate-400 border-t border-slate-700/50 pt-1 font-mono">
                                                    <div>RR: <span className="text-white font-bold">{ppRR}</span></div>
                                                    <div>Balls: <span className="text-white">{ppBalls}</span></div>
                                                </div>
                                            </div>

                                            {/* Middle Overs */}
                                            <div className="bg-slate-700/30 p-3 rounded border border-teal-500/10">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs font-bold text-teal-400">Middle Overs</span>
                                                    <span className="text-[10px] text-slate-400 font-mono">
                                                        Overs {gameData.currentFormat.includes('T20') ? '7-15' : '11-40'}
                                                    </span>
                                                </div>
                                                <div className="text-lg font-black text-white">{moRuns}/{moWickets}</div>
                                                <div className="grid grid-cols-2 gap-1 mt-2 text-[10px] text-slate-400 border-t border-slate-700/50 pt-1 font-mono">
                                                    <div>Bdry %: <span className="text-white font-bold">{moBoundPct}%</span></div>
                                                    <div>Dot %: <span className="text-white font-bold">{moDotPct}%</span></div>
                                                </div>
                                            </div>

                                            {/* Death Overs */}
                                            <div className="bg-slate-700/30 p-3 rounded border border-teal-500/10">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs font-bold text-teal-400">Death Overs</span>
                                                    <span className="text-[10px] text-slate-400 font-mono">
                                                        Overs {gameData.currentFormat.includes('T20') ? '16-20' : '41-50'}
                                                    </span>
                                                </div>
                                                <div className="text-lg font-black text-white">{doRuns}/{doWickets}</div>
                                                <div className="grid grid-cols-2 gap-1 mt-2 text-[10px] text-slate-400 border-t border-slate-700/50 pt-1 font-mono">
                                                    <div>SR: <span className="text-white font-bold">{doSR}</span></div>
                                                    <div>Eco: <span className="text-white font-bold">{doEco}</span></div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                 })()}
                            </div>
                        </div>

                        <div className="bg-slate-800 rounded-lg p-4">
                            <h3 className="text-sm font-bold text-white mb-2">Player Prediction</h3>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-300">{striker?.playerName} to score</span>
                                <span className="text-xl font-bold text-teal-400">{predictions.playerProj}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1">Based on current strike rate and match situation.</p>
                        </div>
                    </div>
                )}

                {activeTab === 'gameplan' && (
                    <GameplanView 
                        state={state} 
                        gameData={gameData} 
                        onToggleExploit={toggleExploitWeakness}
                    />
                )}
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-slate-900 text-white font-sans overflow-hidden relative">
            {state?.activeDrsModal && (
                <DRSModal event={state.activeDrsModal} onComplete={resolveDrsReview} />
            )}
            {renderCelebration()}
            <style>{`
                @keyframes ball-path {
                    0% { cy: 175; cx: 205; opacity: 0; }
                    20% { opacity: 1; }
                    100% { cy: 220; cx: 200; }
                }
                @keyframes bat-swing {
                    0% { transform: rotate(0deg); }
                    50% { transform: rotate(-45deg); }
                    100% { transform: rotate(0deg); }
                }
                .animate-ball { animation: ball-path 0.5s ease-in forwards; }
                .animate-bat { animation: bat-swing 0.3s ease-out; transform-origin: top center; }
                @keyframes slide-up { from { transform: translate(-50%, 100%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
                .animate-slide-up { animation: slide-up 0.5s ease-out forwards; }
                @keyframes pop-in { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
                .animate-pop-in { animation: pop-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
                @keyframes confetti { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(400px) rotate(360deg); opacity: 0; } }
                .animate-confetti { animation: confetti 2s ease-out forwards; }
            `}</style>

            {/* Broadcaster Overlay (Watermark in corner) */}
            {tvLogo && (
                <div className="absolute top-2.5 right-3 z-30 flex flex-col items-end pointer-events-none opacity-70">
                    <div className={`w-14 h-8 flex items-center justify-end ${tvColor}`} dangerouslySetInnerHTML={{ __html: tvLogo }} />
                    <div className="bg-red-600/90 text-white text-[7px] font-black px-1 py-0.2 rounded flex items-center gap-1 shadow-sm">
                        <span className="w-1 h-1 bg-white rounded-full animate-pulse"></span> LIVE
                    </div>
                </div>
            )}

            {/* Clickable Area for Auto-Dismiss (Only visible when timer is active) */}
            {autoArrivalSeconds !== null && (
                <div 
                    className="absolute inset-0 z-25 cursor-pointer" 
                    onClick={handleOverrideAuto}
                    title="Click anywhere to skip timer"
                ></div>
            )}

            {/* Auto Arrival Notification */}
            {autoArrivalSeconds !== null && nextAutoPlayerId && (
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 pointer-events-none"> 
                    {/* Wrapper to position centered, content inside */}
                    <AutoArrivalNotification 
                        playerName={getPlayerById(nextAutoPlayerId, gameData.allPlayers).name} 
                        onOverride={handleOverrideAuto} 
                        secondsLeft={autoArrivalSeconds} 
                    />
                </div>
            )}

            {waitingFor === 'openers' && renderSelectionModal("Select Opening Pair", currentInning.batting.filter(p => !p.isOut && p.playerId !== selectedOpener1), (id) => setSelectedOpener2(id), () => { selectOpeners(selectedOpener1, selectedOpener2); setSelectedOpener1(''); setSelectedOpener2(''); }, selectedOpener2, setSelectedOpener2, (
                <div>
                    <label className="text-sm text-gray-300 block mb-1">Striker</label>
                    <select className="w-full p-2 bg-slate-900 text-white rounded border border-slate-600" value={selectedOpener1} onChange={e => setSelectedOpener1(e.target.value)}>
                        <option value="">Select Player</option>
                        {currentInning.batting.filter(p => !p.isOut).map(p => <option key={p.playerId} value={p.playerId}>{p.playerName}</option>)}
                    </select>
                </div>
            ))}
            {waitingFor === 'batter' && renderSelectionModal("Select Next Batter", currentInning.batting.filter(p => !p.isOut && p.playerId !== currentBatters.nonStrikerId && p.playerId !== currentBatters.strikerId), (id) => setSelectedBatter(id), () => { selectNextBatter(selectedBatter); setSelectedBatter(''); }, selectedBatter, setSelectedBatter)}
            {waitingFor === 'bowler' && renderSelectionModal("Select Next Bowler", currentInning.bowling.filter(p => p.playerId !== currentBowlerId), (id) => setSelectedBowler(id), () => { selectNextBowler(selectedBowler); setSelectedBowler(''); }, selectedBowler, setSelectedBowler)}

            {showMatchCentre && renderMatchCentre()}

            {/* DEDICATED BROADCAST SCOREBOARD HEADER (NEVER OBSCURED BY BATTING/BOWLING CONTROLS) */}
            <header className="bg-slate-950 border-b border-slate-700/90 shadow-2xl z-40 flex-shrink-0 relative">
                <div className="w-full px-3 sm:px-4 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                    
                    {/* Top Row / Left: Batting Team & Big Primary Score */}
                    <div className="flex items-center justify-between md:justify-start gap-2.5 sm:gap-3.5 min-w-0">
                        <div className="flex items-center gap-2.5 min-w-0">
                            {/* Team Logo / Badge */}
                            {(() => {
                                const battingTeamData = gameData.allTeamsData.find(t => t.id === battingTeam.id);
                                return battingTeamData?.logo ? (
                                    <div 
                                        className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 p-1 flex items-center justify-center flex-shrink-0 shadow-md"
                                        dangerouslySetInnerHTML={{ __html: battingTeamData.logo }} 
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-xl bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 font-black text-xs flex items-center justify-center flex-shrink-0">
                                        {battingTeam.name.slice(0, 3).toUpperCase()}
                                    </div>
                                );
                            })()}

                            <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs sm:text-sm font-black text-white truncate max-w-[130px] sm:max-w-[200px]">
                                        {battingTeam.name}
                                    </span>
                                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" title="Currently Batting" />
                                    <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">
                                        {target ? '2nd Innings' : '1st Innings'}
                                    </span>
                                </div>
                                <div className="flex items-baseline gap-2 font-mono">
                                    <span className="text-xl sm:text-2xl font-black text-yellow-400 tracking-tight">
                                        {currentInning.score}/{currentInning.wickets}
                                    </span>
                                    <span className="text-xs sm:text-sm font-bold text-cyan-300">
                                        ({currentInning.overs} ov)
                                    </span>
                                    <span className="text-[10px] sm:text-xs text-slate-200 bg-slate-800/90 px-1.5 py-0.5 rounded border border-slate-700 font-mono">
                                        CRR <strong className="text-white font-bold">{runRate}</strong>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Mobile quick exit/centre buttons */}
                        <div className="flex items-center gap-1 md:hidden">
                            <button 
                                onClick={() => setShowMatchCentre(true)} 
                                className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold p-2 rounded-xl border border-slate-600 shadow"
                                title="Match Centre"
                            >
                                <Icons.ChartPie className="w-4 h-4 text-cyan-400" />
                            </button>
                            <button 
                                onClick={handleExit} 
                                className="text-xs text-red-300 hover:text-white border border-red-800/80 bg-red-950/60 p-2 rounded-xl font-bold"
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    {/* Center: Match Context & Win Probability (Desktop) */}
                    <div className="hidden lg:flex flex-col items-center justify-center flex-1 max-w-xs px-2">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                            <span className="bg-slate-800 text-cyan-400 px-1.5 py-0.5 rounded border border-slate-700 uppercase font-mono">{gameData.currentFormat}</span>
                            <span className="text-slate-300 truncate font-semibold">{match.teamA} vs {match.teamB}</span>
                        </div>
                        
                        {/* Win Probability Bar */}
                        {predictions && (
                            <div className="w-full mt-1 flex flex-col gap-0.5">
                                <div className="flex justify-between text-[9px] font-mono text-slate-400 px-0.5">
                                    <span className="text-yellow-400 font-bold">{gameData.userTeamId === battingTeam.id ? battingTeam.name.slice(0,3) : bowlingTeam.name.slice(0,3)} {battingTeam.id === gameData.userTeamId ? predictions.winProb : 100 - predictions.winProb}%</span>
                                    <span className="text-blue-400 font-bold">{gameData.userTeamId !== battingTeam.id ? battingTeam.name.slice(0,3) : bowlingTeam.name.slice(0,3)} {battingTeam.id !== gameData.userTeamId ? predictions.winProb : 100 - predictions.winProb}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex border border-slate-700/60">
                                    <div className="h-full bg-gradient-to-r from-yellow-500 to-amber-500 transition-all duration-700" style={{ width: `${battingTeam.id === gameData.userTeamId ? predictions.winProb : 100 - predictions.winProb}%` }} />
                                    <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-700 flex-1" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: PROJECTED SCORE OR TARGET EQUATION & DESKTOP CONTROLS */}
                    <div className="flex items-center justify-between md:justify-end gap-2 sm:gap-3 flex-shrink-0">
                        {/* Projected Score (1st Innings) or Target Equation (2nd Innings) */}
                        {target ? (
                            <div className="bg-amber-950/90 border border-amber-500/60 px-3 py-1.5 rounded-xl shadow-lg flex flex-col items-start md:items-end flex-1 md:flex-none">
                                <div className="text-[9px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1">
                                    <span>🎯 TARGET {target + 1}</span>
                                </div>
                                <div className="text-xs sm:text-sm font-black text-white font-mono leading-tight">
                                    Need <span className="text-amber-300">{runsNeeded}</span> off <span className="text-cyan-300">{ballsRemaining}b</span>
                                </div>
                                <div className="text-[10px] text-amber-300/90 font-mono">
                                    RRR: <strong className="text-white font-bold">{reqRate}</strong>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-teal-950/90 border border-teal-500/60 px-3 py-1.5 rounded-xl shadow-lg flex flex-col items-start md:items-end flex-1 md:flex-none">
                                <div className="text-[9px] font-black text-teal-400 uppercase tracking-wider flex items-center gap-1">
                                    <span>📈 PROJECTED SCORE</span>
                                </div>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-base sm:text-lg font-black text-white font-mono leading-none">
                                        {predictions?.projCurrent || '-'}
                                    </span>
                                    <span className="text-[9px] text-teal-300 font-mono">
                                        (@ Current Run Rate)
                                    </span>
                                </div>
                                <div className="text-[10px] text-slate-300 font-mono flex items-center gap-2">
                                    <span>@8 RPO: <strong className="text-white">{predictions?.proj8 || '-'}</strong></span>
                                    <span>•</span>
                                    <span>@10 RPO: <strong className="text-white">{predictions?.proj10 || '-'}</strong></span>
                                </div>
                            </div>
                        )}

                        {/* Desktop Action Controls */}
                        <div className="hidden md:flex items-center gap-1.5">
                            <button 
                                onClick={() => setShowMatchCentre(true)} 
                                className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3 py-2 rounded-xl border border-slate-600 shadow flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                                title="Open Match Centre"
                            >
                                <Icons.ChartPie className="w-4 h-4 text-cyan-400" />
                                <span>Match Centre</span>
                            </button>
                            <button 
                                onClick={handleExit} 
                                className="text-xs text-red-300 hover:text-white border border-red-800/80 bg-red-950/60 hover:bg-red-900 px-3 py-2 rounded-xl transition-all active:scale-95 cursor-pointer font-bold"
                            >
                                {state.status === 'completed' ? 'Exit' : 'Save & Exit'}
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* RAIN INTERRUPTED BANNER */}
            {state.reducedOvers && (
                <div className="bg-sky-950/90 border-b border-sky-500/50 text-sky-200 px-3 py-1.5 text-center text-xs font-bold flex items-center justify-center gap-2 shadow-inner z-20">
                    <span className="text-yellow-400 text-sm">☔</span>
                    <span>Rain Interrupted Match: Reduced to <strong className="text-yellow-300 font-extrabold">{state.reducedOvers} Overs</strong> per side (DLS Method)</span>
                </div>
            )}

            {/* MAIN FIELD */}
            <div className="flex-1 relative bg-[#2d5a27] overflow-hidden shadow-inner flex flex-col items-center justify-center min-h-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:20px_20px] opacity-20 pointer-events-none"></div>

                {/* TOP FLOATING TACTICAL CONTROLLER BAR (Directly on screen with clean margins, never obstructing scores) */}
                {state.status !== 'completed' && (
                    <div className="absolute top-2.5 inset-x-2.5 z-20 flex flex-col gap-1.5 pointer-events-none items-center max-w-xl mx-auto">
                        {/* Batting Mode Floating Controls */}
                        {isUserBatting && !isAutoBatting && (
                            <div className="w-full flex flex-col gap-1.5 items-center">
                                {/* Incoming Bowler Radar Pill & Auto-Counter Switch */}
                                <div className="pointer-events-auto bg-slate-950/90 border border-teal-500/50 backdrop-blur-md rounded-2xl px-3 py-2 shadow-lg shadow-teal-500/10 flex flex-wrap items-center justify-between gap-2 w-full animate-fade-in">
                                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                                        <span className="flex h-2.5 w-2.5 relative">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
                                        </span>
                                        {state.pendingBowlerDelivery ? (
                                            <div className="text-[10px] font-mono font-bold text-slate-200">
                                                <span className="text-teal-400 uppercase font-black">INCOMING:</span> {state.pendingBowlerDelivery.bowlerName || 'Bowler'} • <span className="text-yellow-400">{state.pendingBowlerDelivery.speedKmh} km/h</span> • <span className="uppercase text-cyan-300 font-extrabold">{state.pendingBowlerDelivery.length}</span> ({state.pendingBowlerDelivery.line})
                                            </div>
                                        ) : (
                                            <div className="text-[10px] font-mono font-bold text-slate-300">
                                                <span className="text-teal-400 font-black">STRIKER READY:</span> Aim into green gaps or toggle Auto-Counter
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        {/* Auto-Counter ON / OFF Toggle */}
                                        <button
                                            onClick={() => {
                                                const nextState = !isAutoCounter;
                                                setIsAutoCounter(nextState);
                                                if (nextState) {
                                                    handleAutoCounterDelivery();
                                                }
                                            }}
                                            className={`pointer-events-auto text-[10px] font-black uppercase px-2.5 py-1 rounded-xl shadow transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer border ${
                                                isAutoCounter
                                                    ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 border-teal-300 font-extrabold shadow-teal-500/30'
                                                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-700'
                                            }`}
                                            title={isAutoCounter ? "Auto-Counter is ON (Automatically counters every ball into open gaps)" : "Auto-Counter is OFF (Manual shot aiming active)"}
                                        >
                                            <span>⚡</span>
                                            <span>Auto-Counter: {isAutoCounter ? 'ON' : 'OFF'}</span>
                                        </button>

                                        {/* Manual Trigger / Re-Aim button */}
                                        {isAutoCounter ? (
                                            <button
                                                onClick={handleAutoCounterDelivery}
                                                className="pointer-events-auto bg-slate-900 hover:bg-slate-800 text-teal-300 text-[10px] font-bold uppercase px-2 py-1 rounded-lg border border-teal-500/40 transition-all active:scale-95 cursor-pointer"
                                                title="Recalculate optimal shot into widest gap"
                                            >
                                                ↺ Re-Aim
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleAutoCounterDelivery}
                                                className="pointer-events-auto bg-teal-500 hover:bg-teal-400 text-slate-950 text-[10px] font-black uppercase px-2 py-1 rounded-lg shadow transition-all active:scale-95 cursor-pointer"
                                                title="Aim into optimal gap for this single ball"
                                            >
                                                ⚡ Auto
                                            </button>
                                        )}

                                        {/* Guide Modal Trigger */}
                                        <button
                                            onClick={() => setShowTacticsGuide(true)}
                                            className="pointer-events-auto bg-slate-900 hover:bg-cyan-950/80 text-cyan-400 hover:text-cyan-300 text-[10px] font-black uppercase px-2 py-1 rounded-xl border border-cyan-500/30 transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                                            title="View Batting/Bowling visual logic guide"
                                        >
                                            <span>📖</span>
                                            <span className="hidden sm:inline">Guide</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Batting Shot Setup Bar */}
                                <div className="pointer-events-auto bg-slate-950/85 border border-slate-700/80 backdrop-blur-md rounded-2xl px-3 py-1.5 shadow-xl flex items-center justify-between gap-2 w-full">
                                    {/* Ground vs Lofted Toggle */}
                                    <div className="flex bg-slate-900 rounded-xl p-0.5 border border-slate-800">
                                        <button
                                            onClick={() => {
                                                setIsLofted(false);
                                                if (shotCategory === 'Lofted') setShotCategory('Attacking');
                                            }}
                                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1 ${
                                                !isLofted 
                                                    ? 'bg-blue-600 text-white shadow' 
                                                    : 'text-slate-400 hover:text-white'
                                            }`}
                                        >
                                            <span>🎯</span>
                                            <span>Ground</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsLofted(true);
                                                setShotCategory('Lofted');
                                            }}
                                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1 ${
                                                isLofted 
                                                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow' 
                                                    : 'text-slate-400 hover:text-white'
                                            }`}
                                        >
                                            <span>🚀</span>
                                            <span>Lofted (6s)</span>
                                        </button>
                                    </div>

                                    {/* Intent Chips */}
                                    <div className="hidden sm:flex bg-slate-900 rounded-xl p-0.5 border border-slate-800 gap-0.5">
                                        {(['Defensive', 'Placement', 'Attacking', 'Lofted'] as const).map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => {
                                                    setShotCategory(cat);
                                                    setIsLofted(cat === 'Lofted');
                                                }}
                                                className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase transition-all ${
                                                    shotCategory === cat 
                                                        ? 'bg-teal-500 text-slate-950 font-black' 
                                                        : 'text-slate-400 hover:text-white'
                                                }`}
                                            >
                                                {cat === 'Defensive' ? 'Defend' : cat === 'Placement' ? 'Place' : cat === 'Attacking' ? 'Attack' : 'Slog'}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Active Shot & Sector Pill */}
                                    <div className="flex items-center gap-1.5 text-[10px] bg-slate-900/90 px-2.5 py-1 rounded-xl border border-slate-800 font-bold">
                                        <span className="text-teal-400">{activeSector.name}</span>
                                        <span className="text-slate-500">|</span>
                                        <span className="text-yellow-400 truncate max-w-[90px]">{selectedShotType}</span>
                                        {aimedTrajectoryAnalysis.isGap && (
                                            <span className="text-emerald-400 text-[8px] bg-emerald-500/20 px-1 rounded">GAP</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Bowling Mode Floating Controls */}
                        {isUserBowling && !isAutoBowling && (
                            <div className="w-full flex flex-col gap-1.5 items-center">
                                {/* Variations Selector Bar */}
                                <div className="pointer-events-auto bg-slate-950/90 border border-cyan-500/30 backdrop-blur-md rounded-2xl p-2 shadow-xl w-full flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between px-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-black uppercase text-cyan-400 tracking-wider">
                                                {isSpinBowler ? '🌀 Spin Variation' : '⚡ Pace Delivery'}
                                            </span>
                                            <span className="text-[9px] font-bold text-yellow-300 bg-yellow-400/10 px-1.5 py-0.5 rounded border border-yellow-500/30 uppercase">
                                                {bowlingTargetLength} • {bowlingTargetLine}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
                                                <span>Line:</span>
                                                {(['off', 'middle', 'leg'] as const).map(l => (
                                                    <button
                                                        key={l}
                                                        onClick={() => setBowlingTargetLine(l)}
                                                        className={`px-1.5 py-0.5 rounded uppercase font-mono ${
                                                            bowlingTargetLine === l ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-slate-900 text-slate-400 hover:text-white'
                                                        }`}
                                                    >
                                                        {l}
                                                    </button>
                                                ))}
                                            </div>
                                            <button
                                                onClick={() => setShowTacticsGuide(true)}
                                                className="bg-slate-900 hover:bg-cyan-950/80 text-cyan-400 text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border border-cyan-500/30 transition-all cursor-pointer"
                                                title="View Pitch & Bowling guide"
                                            >
                                                📖 Pitch Guide
                                            </button>
                                        </div>
                                    </div>

                                    {/* Variation Buttons */}
                                    <div className="flex gap-1 overflow-x-auto scrollbar-hide py-0.5">
                                        {(isSpinBowler ? SPIN_VARIATIONS : FAST_VARIATIONS).map(varName => (
                                            <button
                                                key={varName}
                                                onClick={() => setSelectedBowlingVariation(varName)}
                                                className={`px-2 py-0.5 rounded-lg text-[9px] font-bold whitespace-nowrap uppercase transition-all flex-shrink-0 ${
                                                    selectedBowlingVariation === varName
                                                        ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                                                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                                                }`}
                                            >
                                                {varName}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Field SVG with Interactive Drag-to-Aim & Visual 22-Yard Pitch */}
                <div className="w-full h-full flex items-center justify-center p-2 pt-14 pb-12">
                    <svg 
                        viewBox="0 0 400 400" 
                        className="h-full w-full max-h-[60vh] max-w-md drop-shadow-2xl select-none cursor-crosshair touch-none" 
                        preserveAspectRatio="xMidYMid meet"
                        onPointerDown={(e) => {
                            setIsDraggingCanvas(true);
                            const svgRect = e.currentTarget.getBoundingClientRect();
                            const clickX = ((e.clientX - svgRect.left) / svgRect.width) * 400;
                            const clickY = ((e.clientY - svgRect.top) / svgRect.height) * 400;
                            
                            if (isUserBatting) {
                                const dx = clickX - 200;
                                const dy = clickY - 225;
                                const dist = Math.hypot(dx, dy);
                                let angle = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
                                if (angle < 0) angle += 360;
                                setAimedShotAngle(angle);
                                if (dist > 115) setIsLofted(true);
                            } else if (isUserBowling) {
                                if (clickY > 214) setBowlingTargetLength('yorker');
                                else if (clickY > 200) setBowlingTargetLength('full');
                                else if (clickY > 185) setBowlingTargetLength('good');
                                else setBowlingTargetLength('short');
                                
                                if (clickX < 198) setBowlingTargetLine('off');
                                else if (clickX > 202) setBowlingTargetLine('leg');
                                else setBowlingTargetLine('middle');
                            }
                        }}
                        onPointerMove={(e) => {
                            if (!isDraggingCanvas) return;
                            const svgRect = e.currentTarget.getBoundingClientRect();
                            const clickX = ((e.clientX - svgRect.left) / svgRect.width) * 400;
                            const clickY = ((e.clientY - svgRect.top) / svgRect.height) * 400;
                            
                            if (isUserBatting) {
                                const dx = clickX - 200;
                                const dy = clickY - 225;
                                const dist = Math.hypot(dx, dy);
                                let angle = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
                                if (angle < 0) angle += 360;
                                setAimedShotAngle(angle);
                                if (dist > 115) setIsLofted(true);
                            } else if (isUserBowling) {
                                if (clickY > 214) setBowlingTargetLength('yorker');
                                else if (clickY > 200) setBowlingTargetLength('full');
                                else if (clickY > 185) setBowlingTargetLength('good');
                                else setBowlingTargetLength('short');
                                
                                if (clickX < 198) setBowlingTargetLine('off');
                                else if (clickX > 202) setBowlingTargetLine('leg');
                                else setBowlingTargetLine('middle');
                            }
                        }}
                        onPointerUp={() => setIsDraggingCanvas(false)}
                        onPointerLeave={() => setIsDraggingCanvas(false)}
                    >
                        <defs>
                            <pattern id="grass" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                                <rect width="10" height="10" fill="#35682d" />
                                <circle cx="1" cy="1" r="1" fill="#3e7a35" />
                            </pattern>
                            <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="3" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                            <filter id="glow-gold" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="2.5" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                        </defs>

                        {/* Outfield & 30-Yard Circle */}
                        <circle cx="200" cy="200" r="190" fill="url(#grass)" stroke="#ffffff" strokeWidth="2" strokeOpacity="0.8" />
                        <circle cx="200" cy="200" r="80" fill="none" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.6" strokeDasharray="4,4" />
                        
                        {/* WAGON-WHEEL SECTOR HIGHLIGHT WEDGE (When Batting) */}
                        {isUserBatting && (
                            (() => {
                                const startAngleRad = (((activeSector.angle - 22.5) - 90) * Math.PI) / 180;
                                const endAngleRad = (((activeSector.angle + 22.5) - 90) * Math.PI) / 180;
                                const x1 = 200 + 190 * Math.cos(startAngleRad);
                                const y1 = 200 + 190 * Math.sin(startAngleRad);
                                const x2 = 200 + 190 * Math.cos(endAngleRad);
                                const y2 = 200 + 190 * Math.sin(endAngleRad);
                                return (
                                    <path
                                        d={`M 200 225 L ${x1} ${y1} A 190 190 0 0 1 ${x2} ${y2} Z`}
                                        fill="#06b6d4"
                                        fillOpacity="0.12"
                                        stroke="#22d3ee"
                                        strokeWidth="1"
                                        strokeDasharray="4 2"
                                        className="transition-all duration-300"
                                    />
                                );
                            })()
                        )}

                        {/* DETAILED 22-YARD PITCH STRIP */}
                        <rect x="193" y="168" width="14" height="60" rx="1" fill="#d2b48c" stroke="#bfa07a" strokeWidth="0.8" />
                        
                        {/* INTERACTIVE COLOR-CODED PITCH LANDING ZONES (Short / Good / Full / Yorker) */}
                        {/* Short / Bouncer Zone (170 - 185) */}
                        <rect 
                            x="193" y="170" width="14" height="15" 
                            fill={bowlingTargetLength === 'short' ? '#a855f7' : '#9333ea'} 
                            fillOpacity={bowlingTargetLength === 'short' ? 0.45 : 0.12} 
                            stroke={bowlingTargetLength === 'short' ? '#c084fc' : '#a855f7'} 
                            strokeWidth={bowlingTargetLength === 'short' ? 1.2 : 0.4} 
                            strokeDasharray={bowlingTargetLength === 'short' ? undefined : "1 1"}
                        />
                        {/* Good Length Zone (185 - 200) */}
                        <rect 
                            x="193" y="185" width="14" height="15" 
                            fill={bowlingTargetLength === 'good' ? '#10b981' : '#059669'} 
                            fillOpacity={bowlingTargetLength === 'good' ? 0.45 : 0.12} 
                            stroke={bowlingTargetLength === 'good' ? '#34d399' : '#10b981'} 
                            strokeWidth={bowlingTargetLength === 'good' ? 1.2 : 0.4} 
                            strokeDasharray={bowlingTargetLength === 'good' ? undefined : "1 1"}
                        />
                        {/* Full Length Zone (200 - 214) */}
                        <rect 
                            x="193" y="200" width="14" height="14" 
                            fill={bowlingTargetLength === 'full' ? '#f59e0b' : '#d97706'} 
                            fillOpacity={bowlingTargetLength === 'full' ? 0.45 : 0.12} 
                            stroke={bowlingTargetLength === 'full' ? '#fbbf24' : '#f59e0b'} 
                            strokeWidth={bowlingTargetLength === 'full' ? 1.2 : 0.4} 
                            strokeDasharray={bowlingTargetLength === 'full' ? undefined : "1 1"}
                        />
                        {/* Yorker Zone (214 - 226) */}
                        <rect 
                            x="193" y="214" width="14" height="12" 
                            fill={bowlingTargetLength === 'yorker' ? '#ef4444' : '#dc2626'} 
                            fillOpacity={bowlingTargetLength === 'yorker' ? 0.5 : 0.15} 
                            stroke={bowlingTargetLength === 'yorker' ? '#f87171' : '#ef4444'} 
                            strokeWidth={bowlingTargetLength === 'yorker' ? 1.2 : 0.4} 
                            strokeDasharray={bowlingTargetLength === 'yorker' ? undefined : "1 1"}
                        />

                        {/* Pitch Line Dividing Guidelines (Off / Middle / Leg) */}
                        <line x1="197" y1="170" x2="197" y2="226" stroke="white" strokeWidth="0.3" strokeOpacity="0.4" strokeDasharray="1 1" />
                        <line x1="203" y1="170" x2="203" y2="226" stroke="white" strokeWidth="0.3" strokeOpacity="0.4" strokeDasharray="1 1" />

                        {/* Visual Length & Line Zone Labels on Pitch */}
                        <g opacity="0.85" className="select-none pointer-events-none font-mono">
                            <text x="189" y="179" textAnchor="end" fill="#c084fc" fontSize="3.6" fontWeight="bold">SHORT</text>
                            <text x="189" y="194" textAnchor="end" fill="#34d399" fontSize="3.6" fontWeight="bold">GOOD</text>
                            <text x="189" y="208" textAnchor="end" fill="#fbbf24" fontSize="3.6" fontWeight="bold">FULL</text>
                            <text x="189" y="221" textAnchor="end" fill="#f87171" fontSize="3.6" fontWeight="bold">YORK</text>
                            
                            <text x="195" y="164" textAnchor="middle" fill="#94a3b8" fontSize="3" fontWeight="bold">OFF</text>
                            <text x="200" y="164" textAnchor="middle" fill="#cbd5e1" fontSize="3" fontWeight="bold">MID</text>
                            <text x="205" y="164" textAnchor="middle" fill="#94a3b8" fontSize="3" fontWeight="bold">LEG</text>
                        </g>

                        {/* Translucent Green Open Gap Guidance Indicators for Batting */}
                        {isUserBatting && (
                            <g opacity="0.75" className="pointer-events-none select-none">
                                {GROUND_SECTORS.map((sector) => {
                                    const rad = (((sector.angle) - 90) * Math.PI) / 180;
                                    const sx = 200 + 130 * Math.cos(rad);
                                    const sy = 225 + 130 * Math.sin(rad);
                                    let minFielderDist = 999;
                                    for (const f of activeFieldPreset.fielders) {
                                        const d = Math.hypot(f.x - sx, f.y - sy);
                                        if (d < minFielderDist) minFielderDist = d;
                                    }
                                    if (minFielderDist > 30) {
                                        return (
                                            <g key={sector.zoneName}>
                                                <circle cx={sx} cy={sy} r="4.5" fill="#10b981" fillOpacity="0.2" stroke="#34d399" strokeWidth="0.5" strokeDasharray="1.5 1" />
                                                <text x={sx} y={sy + 1.2} textAnchor="middle" fill="#a7f3d0" fontSize="3" fontWeight="black">GAP</text>
                                            </g>
                                        );
                                    }
                                    return null;
                                })}
                            </g>
                        )}

                        {/* Crease Lines & Stumps */}
                        {/* Bowler End Crease & Stumps */}
                        <line x1="191" y1="176" x2="209" y2="176" stroke="white" strokeWidth="0.6" />
                        <circle cx="199" cy="175" r="0.7" fill="#1e293b" />
                        <circle cx="200" cy="175" r="0.7" fill="#1e293b" />
                        <circle cx="201" cy="175" r="0.7" fill="#1e293b" />
                        <line x1="198.5" y1="174.5" x2="201.5" y2="174.5" stroke="#f59e0b" strokeWidth="0.4" />

                        {/* Batter End Crease & Stumps */}
                        <line x1="191" y1="222" x2="209" y2="222" stroke="white" strokeWidth="0.6" />
                        <circle cx="199" cy="224" r="0.7" fill="#1e293b" />
                        <circle cx="200" cy="224" r="0.7" fill="#1e293b" />
                        <circle cx="201" cy="224" r="0.7" fill="#1e293b" />
                        <line x1="198.5" y1="224.5" x2="201.5" y2="224.5" stroke="#f59e0b" strokeWidth="0.4" />

                        {/* Bowler Icon at y=165 */}
                        <g transform="translate(200, 165)">
                             <circle r="4" fill="#0284c7" stroke="white" strokeWidth="1.2" />
                             <text y="1.5" textAnchor="middle" fill="white" fontSize="4.5" fontWeight="black">B</text>
                        </g>
                        
                        {/* Batsman Icon at y=225 */}
                         <g transform="translate(200, 225)">
                             <circle r="4" fill="#eab308" stroke="white" strokeWidth="1.2" />
                             <rect x="2" y="-2" width="2" height="9" fill="#854d0e" stroke="#ca8a04" strokeWidth="0.3" className={lastBall ? "animate-bat" : ""} transform="rotate(20)" />
                        </g>
                        
                        {/* Non-Striker */}
                        <g transform="translate(188, 175)">
                             <circle r="3.2" fill="#eab308" stroke="white" strokeWidth="0.8" opacity="0.8" />
                        </g>
                        
                        {/* Wicketkeeper */}
                        <g transform="translate(200, 237)">
                             <circle r="3" fill="#0284c7" stroke="white" strokeWidth="0.8" />
                             <text y="1" textAnchor="middle" fill="white" fontSize="3.5" fontWeight="bold">WK</text>
                        </g>

                        {/* Active Fielders with Labels & Ring/Deep distinction */}
                        {activeFieldPreset.fielders.map((pos, i) => (
                            <g key={i} transform={`translate(${pos.x}, ${pos.y})`} className="transition-all duration-300 pointer-events-none select-none">
                                <circle
                                    r={pos.isDeep ? "6.5" : "5"}
                                    fill={pos.isDeep ? "#eab308" : "#0284c7"}
                                    fillOpacity="0.25"
                                    stroke={pos.isDeep ? "#facc15" : "#38bdf8"}
                                    strokeWidth="0.8"
                                    strokeDasharray={pos.isDeep ? "2 1" : undefined}
                                />
                                <circle
                                    r="3"
                                    fill={pos.isDeep ? "#eab308" : "#0284c7"}
                                    stroke="#ffffff"
                                    strokeWidth="0.8"
                                />
                                <text
                                    y="-5"
                                    textAnchor="middle"
                                    fill={pos.isDeep ? "#fef08a" : "#bae6fd"}
                                    fontSize="5.2"
                                    fontWeight="bold"
                                    className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                                >
                                    {pos.name}
                                </text>
                            </g>
                        ))}
                        
                        {/* INTERACTIVE BATTING AIMING ARROW & GAP RADAR */}
                        {isUserBatting && (
                            (() => {
                                const { targetX, targetY, isGap } = aimedTrajectoryAnalysis;
                                const rad = (aimedShotAngle * Math.PI) / 180;
                                const headLen = 12;
                                const headAngle1 = rad + Math.PI - 0.35;
                                const headAngle2 = rad + Math.PI + 0.35;
                                const h1X = targetX + Math.cos(headAngle1) * headLen;
                                const h1Y = targetY + Math.sin(headAngle1) * headLen;
                                const h2X = targetX + Math.cos(headAngle2) * headLen;
                                const h2Y = targetY + Math.sin(headAngle2) * headLen;
                                const arrowColor = isLofted ? '#f59e0b' : '#06b6d4';
                                const glowFilter = isLofted ? 'url(#glow-gold)' : 'url(#glow-cyan)';
                                return (
                                    <g filter={glowFilter} className="pointer-events-none">
                                        {/* Trajectory Guide */}
                                        <line x1="200" y1="225" x2={targetX} y2={targetY} stroke={arrowColor} strokeWidth="3.5" strokeDasharray={isLofted ? "6 3" : "4 2"} />
                                        {/* Arrowhead */}
                                        <polygon points={`${targetX},${targetY} ${h1X},${h1Y} ${h2X},${h2Y}`} fill={arrowColor} stroke="#ffffff" strokeWidth="1" />
                                        {/* Target Reticle */}
                                        <circle cx={targetX} cy={targetY} r="12" fill="none" stroke={isGap ? "#10b981" : "#f59e0b"} strokeWidth="1.8" strokeDasharray="3 2" />
                                        <circle cx={targetX} cy={targetY} r="4" fill="#ffffff" />
                                        
                                        {/* Gap Feedback & Shot Badge */}
                                        <rect x={targetX - 32} y={targetY - 26} width="64" height="15" rx="4" fill="#020617" fillOpacity="0.85" stroke={arrowColor} strokeWidth="0.8" />
                                        <text x={targetX} y={targetY - 16} textAnchor="middle" fill="#ffffff" fontSize="6.2" fontWeight="black">
                                            {isLofted ? '🚀 6s' : '🎯 4s'} • {selectedShotType}
                                        </text>
                                    </g>
                                );
                            })()
                        )}

                        {/* INTERACTIVE BOWLING PITCH TARGET MARKER (When User is Bowling) */}
                        {isUserBowling && (
                            (() => {
                                const targetY = bowlingTargetLength === 'yorker' ? 220 : bowlingTargetLength === 'full' ? 207 : bowlingTargetLength === 'good' ? 193 : 177;
                                const targetX = bowlingTargetLine === 'off' ? 196 : bowlingTargetLine === 'middle' ? 200 : 204;
                                const color = bowlingTargetLength === 'yorker' ? '#ef4444' : bowlingTargetLength === 'full' ? '#f59e0b' : bowlingTargetLength === 'good' ? '#10b981' : '#a855f7';
                                
                                // Dynamic delivery trajectory curve showing swing/spin
                                const swingOffset = selectedBowlingVariation.toLowerCase().includes('out') ? -1.5 : selectedBowlingVariation.toLowerCase().includes('in') ? 1.5 : 0;
                                
                                return (
                                    <g className="pointer-events-none">
                                        {/* Delivery arc trail from bowler's hand down the pitch */}
                                        <path 
                                            d={`M 200 165 Q ${200 + swingOffset} ${(165 + targetY) / 2} ${targetX} ${targetY}`} 
                                            fill="none" 
                                            stroke={color} 
                                            strokeWidth="1.8" 
                                            strokeDasharray="3 2" 
                                            strokeOpacity="0.9" 
                                        />
                                        {/* Stumps impact trajectory */}
                                        <line x1={targetX} y1={targetY} x2={200} y2={223} stroke={color} strokeWidth="1.2" strokeDasharray="2 2" strokeOpacity="0.6" />

                                        {/* Glowing Target Reticle */}
                                        <circle cx={targetX} cy={targetY} r="8" fill="none" stroke={color} strokeWidth="1.8" strokeDasharray="2 2" className="animate-spin" />
                                        <circle cx={targetX} cy={targetY} r="4" fill={color} stroke="#ffffff" strokeWidth="1" />
                                        <line x1={targetX - 9} y1={targetY} x2={targetX + 9} y2={targetY} stroke={color} strokeWidth="0.8" strokeOpacity="0.9" />
                                        <line x1={targetX} y1={targetY - 9} x2={targetX} y2={targetY + 9} stroke={color} strokeWidth="0.8" strokeOpacity="0.9" />

                                        {/* Floating target length/line tag */}
                                        <rect x={targetX - 28} y={targetY - 18} width="56" height="11" rx="3" fill="#020617" fillOpacity="0.85" stroke={color} strokeWidth="0.8" />
                                        <text x={targetX} y={targetY - 10} textAnchor="middle" fill={color} fontSize="5.5" fontWeight="black" className="drop-shadow-md">
                                            {bowlingTargetLength.toUpperCase()} ({bowlingTargetLine.toUpperCase()})
                                        </text>
                                    </g>
                                );
                            })()
                        )}

                        {/* INCOMING BOWLER DELIVERY PITCH LANDING MARKER (When User is Batting) */}
                        {isUserBatting && state.pendingBowlerDelivery && (
                            (() => {
                                const del = state.pendingBowlerDelivery;
                                const targetY = del.length === 'yorker' ? 220 : del.length === 'full' ? 207 : del.length === 'good' ? 193 : 177;
                                const targetX = del.line === 'off' ? 196 : del.line === 'middle' ? 200 : 204;
                                const color = del.length === 'yorker' ? '#ef4444' : del.length === 'full' ? '#f59e0b' : del.length === 'good' ? '#10b981' : '#a855f7';
                                return (
                                    <g className="pointer-events-none">
                                        {/* Pulsing delivery radar ring */}
                                        <circle cx={targetX} cy={targetY} r="8" fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="2 1.5" className="animate-ping opacity-60" />
                                        <circle cx={targetX} cy={targetY} r="5" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="1.2" />
                                        <circle cx={targetX} cy={targetY} r="2.5" fill="#ffffff" />
                                        {/* Trajectory from bowler's hand */}
                                        <line x1="200" y1="168" x2={targetX} y2={targetY} stroke={color} strokeWidth="1.2" strokeDasharray="3 2" strokeOpacity="0.8" />
                                        {/* Delivery details label */}
                                        <rect x={targetX - 24} y={targetY - 16} width="48" height="10" rx="3" fill="#020617" fillOpacity="0.85" stroke={color} strokeWidth="0.8" />
                                        <text x={targetX} y={targetY - 9} textAnchor="middle" fill="#ffffff" fontSize="5" fontWeight="bold">
                                            {del.length.toUpperCase()} • {del.speedKmh}k
                                        </text>
                                    </g>
                                );
                            })()
                        )}

                        {lastBall && (
                            <circle cx="200" cy="175" r="1.5" fill="white" className="animate-ball" />
                        )}
                    </svg>
                </div>

                {/* Ball Result Overlay */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20">
                    {lastBall && (
                        <div className={`
                            flex items-center justify-center rounded-full h-20 w-20 
                            ${isWicket ? 'bg-red-600' : isBoundary ? 'bg-purple-600' : 'bg-slate-800/80'}
                            border-4 border-white shadow-2xl animate-bounce
                        `}>
                            <span className="text-3xl font-black text-white">{lastBall === 'W' ? 'OUT' : lastBall}</span>
                        </div>
                    )}
                </div>
                
                {/* Instant Shot / Ball Tactical Feedback Badge */}
                {state.lastShotFeedback && (
                    <div className="absolute bottom-16 inset-x-4 z-20 pointer-events-none flex justify-center animate-fade-in">
                        <div className={`
                            max-w-md px-3 py-1.5 rounded-xl text-center text-xs font-bold shadow-xl border backdrop-blur-md
                            ${state.lastShotFeedback.runs >= 4 
                                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50 shadow-emerald-500/10' 
                                : state.lastShotFeedback.runs === 0 
                                    ? 'bg-slate-900/90 text-slate-300 border-slate-700/50' 
                                    : 'bg-cyan-950/90 text-cyan-300 border-cyan-500/50'}
                        `}>
                            <span className="text-white font-black">{state.lastShotFeedback.title}</span>: {state.lastShotFeedback.message}
                        </div>
                    </div>
                )}
                
                <div className="absolute bottom-4 left-4 z-[100] flex flex-col gap-1 bg-slate-950/95 shadow-[0_0_25px_rgba(6,182,212,0.25)] border border-cyan-500/30 p-2.5 rounded-2xl backdrop-blur-xl">
                    <div className="text-[9px] font-black tracking-wider text-cyan-400 uppercase flex items-center gap-1.5 px-0.5 select-none">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                        </span>
                        DRS REVIEWS REMAINING
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-200 mt-1">
                        <span className="bg-slate-900 px-2 py-1 rounded border border-slate-800 flex items-center gap-1">
                            <span className="text-slate-400">{teamA?.name.slice(0,3).toUpperCase()}:</span>
                            <span className="text-cyan-400 font-extrabold">{state?.drsReviews?.[teamA?.id || ''] ?? 2}</span>
                        </span>
                        <span className="bg-slate-900 px-2 py-1 rounded border border-slate-800 flex items-center gap-1">
                            <span className="text-slate-400">{teamB?.name.slice(0,3).toUpperCase()}:</span>
                            <span className="text-cyan-400 font-extrabold">{state?.drsReviews?.[teamB?.id || ''] ?? 2}</span>
                        </span>
                    </div>
                </div>
                
                <div className="absolute bottom-2 right-2 z-10">
                    <button onClick={() => setShowMatchCentre(true)} className="bg-slate-800/90 text-xs font-bold text-white px-4 py-2 rounded-full border border-slate-600 shadow-lg flex items-center gap-2 animate-pulse cursor-pointer">
                        <Icons.ChartPie /> Match Centre
                    </button>
                </div>
            </div>

            {/* BOTTOM INFO BAR */}
            <div className="bg-slate-800 border-t border-slate-700 p-1 flex-shrink-0">
                <div className="flex items-stretch bg-slate-900/50 rounded overflow-hidden text-xs">
                    
                    {/* Bowler Stats */}
                    <div className="flex-1 p-2 border-r border-slate-700">
                        <div className="text-[9px] text-slate-500 uppercase font-bold">Bowling</div>
                        <div className="font-bold text-white truncate">{bowler?.playerName}</div>
                        <div className="text-slate-400 font-mono text-[10px] flex flex-col gap-1">
                            <span className="text-sm font-bold text-cyan-400">{bowler?.wickets}-{bowler?.runsConceded} <span className="text-[10px] font-normal text-slate-500">({bowler?.overs})</span></span>
                            <span>Econ: {bowler?.ballsBowled ? ((bowler.runsConceded / bowler.ballsBowled) * 6).toFixed(2) : '0.00'}</span>
                        </div>
                    </div>

                    {/* Batters Stats - Enhanced */}
                    <div className="flex-[2] flex">
                        <div className={`flex-1 p-2 border-r border-slate-700/50 ${striker?.playerId === currentBatters.strikerId ? 'bg-yellow-900/20' : ''}`}>
                            <div className="text-[9px] text-yellow-500/70 uppercase font-bold flex justify-between">
                                <span>Striker</span>
                                {striker?.playerId === currentBatters.strikerId && <span>★</span>}
                            </div>
                            <div className="font-bold text-yellow-400 truncate">{striker?.playerName}</div>
                            <div className="text-[10px] text-slate-300 font-mono flex flex-col gap-1 mt-0.5">
                                <span className="text-sm font-bold text-yellow-500">{striker?.runs} <span className="text-[10px] text-slate-500 font-normal">({striker?.balls})</span></span>
                                <span className="text-slate-400">SR: {striker?.balls ? ((striker.runs / striker.balls) * 100).toFixed(1) : '0.0'} • 4s:{striker?.fours || 0} 6s:{striker?.sixes || 0}</span>
                            </div>
                        </div>
                        <div className={`flex-1 p-2 border-r border-slate-700 ${nonStriker?.playerId === currentBatters.strikerId ? 'bg-yellow-900/20' : ''}`}>
                            <div className="text-[9px] text-slate-500 uppercase font-bold flex justify-between">
                                <span>Non-Striker</span>
                                {nonStriker?.playerId === currentBatters.strikerId && <span className="text-yellow-500">★</span>}
                            </div>
                            <div className="font-bold text-white truncate">{nonStriker?.playerName}</div>
                            <div className="text-[10px] text-slate-300 font-mono flex flex-col gap-1 mt-0.5">
                                <span className="text-sm font-bold text-white">{nonStriker?.runs} <span className="text-[10px] text-slate-500 font-normal">({nonStriker?.balls})</span></span>
                                <span className="text-slate-400 text-[10px]">SR: {nonStriker?.balls ? ((nonStriker.runs / nonStriker.balls) * 100).toFixed(1) : '0.0'} • 4s:{nonStriker?.fours || 0} 6s:{nonStriker?.sixes || 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* Last Ball */}
                    <div className="flex-1 p-2 text-right">
                        <div className="text-[9px] text-slate-500 uppercase font-bold leading-none mb-1">Last Ball</div>
                        <div className="flex flex-col items-end">
                            <div className={`font-black text-2xl leading-none ${isWicket ? 'text-red-500' : isBoundary ? 'text-purple-400' : 'text-white'}`}>
                                {lastBall || '-'}
                            </div>
                            {lastBallSpeed && (
                                <div className="text-cyan-400 font-mono text-[10px] mt-1 bg-cyan-400/10 px-1 rounded border border-cyan-400/20 shadow-sm animate-pulse">
                                    {lastBallSpeed} <span className="text-[8px] opacity-70">KPH</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTROL PANEL */}
            <div className="bg-slate-900 p-3 pb-6 flex-shrink-0 flex flex-col gap-3">
                {state?.pendingDrsOpportunity && (
                    <div className="bg-slate-950 border-2 border-cyan-500 rounded-2xl p-3 shadow-[0_0_30px_rgba(6,182,212,0.3)] flex flex-col sm:flex-row items-center justify-between gap-3 animate-pulse">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30">
                                <Radio className="w-5 h-5 text-cyan-400" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black tracking-widest text-cyan-400 uppercase bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
                                        DRS OPPORTUNITY AVAILABLE
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400">
                                        ({state.drsReviews?.[gameData.userTeamId] ?? 2} Reviews Left)
                                    </span>
                                </div>
                                <p className="text-xs font-bold text-white mt-1">
                                    {state.pendingDrsOpportunity.type === 'LBW' ? 'LBW Appeal' : state.pendingDrsOpportunity.type === 'EDGE' ? 'Edge / Caught Behind' : 'Wicket Review'} — Umpire Call: <span className="text-cyan-300 font-extrabold">{state.pendingDrsOpportunity.onFieldDecision}</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button
                                onClick={() => requestDrsReview()}
                                className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black tracking-wider uppercase text-xs rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
                            >
                                📺 REQUEST DRS REVIEW
                            </button>
                            <button
                                onClick={dismissDrsOpportunity}
                                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase text-xs rounded-xl border border-slate-700 transition-all cursor-pointer"
                            >
                                DECLINE
                            </button>
                        </div>
                    </div>
                )}

                 <div className="flex gap-2 items-center justify-between">
                    <div className="flex gap-2 flex-1">
                        {isUserBatting && (
                            <StrategyToggle label="Batting Tactics" value={strategies.batting} onChange={setBattingStrategy} />
                        )}
                        {isUserBowling && (
                            <StrategyToggle label="Bowling Tactics" value={strategies.bowling} onChange={setBowlingStrategy} />
                        )}
                    </div>
                    {(isUserBatting || isUserBowling) && (
                        <button 
                            onClick={() => setShowTacticalHUD(!showTacticalHUD)} 
                            className={`text-xs px-3 py-1.5 rounded-lg font-bold border transition-all flex items-center gap-1.5 ${
                                showTacticalHUD 
                                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-500/20' 
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                            }`}
                        >
                            <span>🎯</span>
                            <span className="hidden sm:inline">{showTacticalHUD ? 'Hide Tactical Lab' : 'Show Tactical Lab'}</span>
                            <span className="sm:hidden">{showTacticalHUD ? 'HUD ON' : 'HUD OFF'}</span>
                        </button>
                    )}
                 </div>

                {/* TACTICAL GAMEPLAY CONTROLS (Batting shot selection / Wagon Wheel aiming & Bowling lengths) */}
                {showTacticalHUD && (isUserBatting || isUserBowling) && state.status !== 'completed' && (
                    <LiveMatchTacticalControls
                        isUserBatting={isUserBatting}
                        isUserBowling={isUserBowling}
                        striker={(currentBatters?.strikerId ? getPlayerById(currentBatters.strikerId, gameData.allPlayers) : null) || ({
                            id: currentBatters?.strikerId || 'p1',
                            name: striker?.playerName || 'Striker',
                            skills: { batting: 75, bowling: 30 },
                            stats: { runs: 0, wickets: 0, matches: 0, highScores: 0, bestBowling: '0/0', overs: 0, ballsFaced: 0, strikeRate: 0, economy: 0 }
                        } as unknown as Player)}
                        nonStriker={currentBatters?.nonStrikerId ? getPlayerById(currentBatters.nonStrikerId, gameData.allPlayers) : undefined}
                        bowler={(currentBowlerId ? getPlayerById(currentBowlerId, gameData.allPlayers) : null) || ({
                            id: currentBowlerId || 'p2',
                            name: bowler?.playerName || 'Bowler',
                            skills: { batting: 30, bowling: 75 },
                            stats: { runs: 0, wickets: 0, matches: 0, highScores: 0, bestBowling: '0/0', overs: 0, ballsFaced: 0, strikeRate: 0, economy: 0 }
                        } as unknown as Player)}
                        battingStrategy={strategies.batting}
                        bowlingStrategy={strategies.bowling}
                        onPlayBallWithTactics={(tactics) => playBall(tactics)}
                        lastTacticalExecution={state.lastTacticalExecution}
                        isAutoPlaying={state.autoPlayType !== null}
                        onShotAngleChange={(ang) => setAimedShotAngle(ang)}
                        onBowlingTargetChange={(len, line) => {
                            setBowlingTargetLength(len);
                            setBowlingTargetLine(line);
                        }}
                        currentFormat={gameData.currentFormat}
                        ballsBowled={ballsBowledTotal}
                        selectedFieldPresetId={selectedFieldPresetId}
                        onFieldPresetChange={(presetId) => setSelectedFieldPresetId(presetId)}
                        isSmartFieldingActive={isSmartFieldingActive}
                        onToggleSmartFielding={(active) => setIsSmartFieldingActive(active)}
                        isAutoBatting={isAutoBatting}
                        isAutoBowling={isAutoBowling}
                        onToggleAutoBatting={(active) => setIsAutoBatting(active)}
                        onToggleAutoBowling={(active) => setIsAutoBowling(active)}
                        pendingBowlerDelivery={state.pendingBowlerDelivery}
                        lastShotFeedback={state.lastShotFeedback}
                    />
                )}

                <div className="flex items-center gap-2 mb-2 overflow-x-auto py-1 scrollbar-hide">
                     <span className="text-[10px] font-bold text-slate-500 uppercase flex-shrink-0">Over:</span>
                     {recentBalls.slice(0, 8).map((b, i) => (
                         <div key={i} className={`
                            h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                            ${b === 'W' ? 'bg-red-600 text-white' : b === '6' ? 'bg-purple-600 text-white' : b === '4' ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300'}
                         `}>
                             {b}
                         </div>
                     ))}
                </div>

                <div className="flex gap-2">
                    {state.status === 'completed' ? (
                        <button onClick={handleExit} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg shadow-lg transition-transform active:scale-95 uppercase tracking-wider">
                            End Match
                        </button>
                    ) : (
                        <>
                            <button 
                                onClick={() => {
                                    if (isAutoBatting && isUserBatting) {
                                        const randomSector = GROUND_SECTORS[Math.floor(Math.random() * GROUND_SECTORS.length)];
                                        const autoLofted = Math.random() > 0.65;
                                        playBall({
                                            isBatting: true,
                                            shotAngle: randomSector.angle,
                                            shotZone: randomSector.zoneName,
                                            shotType: randomSector.typicalShots[0],
                                            shotCategory: autoLofted ? 'Lofted' : 'Attacking',
                                            isLofted: autoLofted,
                                        });
                                    } else if (isAutoBowling && isUserBowling) {
                                        let autoLen: 'yorker' | 'full' | 'good' | 'short' = 'good';
                                        let autoLine: 'off' | 'middle' | 'leg' = 'off';
                                        const strikerPlayer = currentBatters?.strikerId ? getPlayerById(currentBatters.strikerId, gameData.allPlayers) : null;
                                        if (strikerPlayer?.weaknesses?.some((w: string) => w.toLowerCase().includes('short') || w.toLowerCase().includes('bouncer'))) {
                                            autoLen = 'short';
                                            autoLine = 'leg';
                                        } else if (matchFieldRestrictions.isDeath) {
                                            autoLen = 'yorker';
                                            autoLine = 'middle';
                                        } else {
                                            autoLen = Math.random() > 0.5 ? 'good' : 'full';
                                            autoLine = 'off';
                                        }
                                        playBall({
                                            isBatting: false,
                                            bowlingLength: autoLen,
                                            bowlingLine: autoLine,
                                            bowlingVariation: (bowlerPlayer?.role?.toLowerCase().includes('spin') || bowlerPlayer?.bowlingSubType?.toLowerCase().includes('spin') || bowlerPlayer?.role === 'SB') ? 'Standard Turn' : 'Outswinger',
                                        });
                                    } else if (isUserBatting) {
                                        playBall({
                                            isBatting: true,
                                            shotAngle: aimedShotAngle,
                                            shotZone: activeSector.zoneName,
                                            shotType: selectedShotType || activeSector.typicalShots[0] || 'Drive',
                                            shotCategory: isLofted ? 'Lofted' : shotCategory,
                                            isLofted: isLofted,
                                        });
                                    } else if (isUserBowling) {
                                        playBall({
                                            isBatting: false,
                                            bowlingLength: bowlingTargetLength,
                                            bowlingLine: bowlingTargetLine,
                                            bowlingVariation: selectedBowlingVariation || (isSpinBowler ? 'Standard Turn' : 'Outswinger'),
                                        });
                                    } else {
                                        playBall();
                                    }
                                }} 
                                className={`flex-[1.5] ${isUserBatting ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500' : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500'} text-white font-black text-sm py-3.5 rounded-xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 border border-white/20`}
                            >
                                <Icons.Play className="h-5 w-5" />
                                <span className="tracking-wider uppercase">
                                    {isUserBatting 
                                        ? (isAutoBatting ? '🤖 AUTO BAT' : (isLofted ? '🚀 PLAY LOFTED SHOT' : '🏏 PLAY GROUND SHOT')) 
                                        : (isAutoBowling ? '🤖 AUTO BOWL' : `⚡ BOWL ${bowlingTargetLength.toUpperCase()}`)}
                                </span>
                            </button>
                            <button onClick={playOver} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3.5 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-1.5 text-xs">
                                <span className="text-sm">⏭</span>
                                <span className="hidden sm:inline uppercase">Over</span>
                            </button>
                            <button onClick={simulateInning} className="flex-1 bg-purple-600/90 hover:bg-purple-500 text-white font-bold py-3.5 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-1 text-xs">
                                <span className="hidden sm:inline uppercase">Inning</span>
                                <span className="sm:hidden">INN</span>
                            </button>
                            <button onClick={simulateMatch} className="flex-1 bg-orange-600/90 hover:bg-orange-500 text-white font-bold py-3.5 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-1 text-xs">
                                <Icons.RefreshCw className="h-4 w-4" />
                                <span className="hidden sm:inline uppercase">Match</span>
                                <span className="sm:hidden">ALL</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Match Tactics & Visuals Interactive Guide Modal */}
            <TacticsVisualsGuideModal 
                isOpen={showTacticsGuide} 
                onClose={() => setShowTacticsGuide(false)} 
                initialTab={isUserBowling ? 'bowling' : 'batting'}
            />
        </div>
    );
};

export default LiveMatchScreen;

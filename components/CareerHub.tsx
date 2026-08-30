
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Trophy, Calendar, BarChart3, Settings as SettingsIcon, Newspaper, Users, Database, LayoutGrid, ArrowRightLeft, Scale, Wallet, Gavel, RadioTower, Award, Globe2 } from 'lucide-react';
import { GameData, CareerScreen, MatchResult, Player, Format, PromotionRecord, Team, LiveMatchState, NewsArticle, PlayerRole } from '../types';
import { TEAMS, INITIAL_SPONSORSHIPS, INITIAL_NEWS } from '../data';
import { Icons } from './Icons';
import { getPlayerById, generateLeagueSchedule, negotiateSponsorships, generateMatchNews, generatePreMatchNews, getPlayerBasePrice, getPlayerMarketPrice, resolveMatch, generateAutoXI } from '../utils';
import { generateFullYearSchedule } from '../utils/fourYearCalendar';
import { calculateSeasonAwards } from '../utils/awardUtils';
import { evaluateAllPlayersForSeason } from '../utils/seasonEvaluation';
import { populateStatsForInactivePlayers, autoAssignTeamCaptainsAndViceCaptains } from '../utils/domesticStatsGenerator';
import { useSimulation } from '../hooks/useSimulation';
import { processMatchSikeShareUpdate, initSikeShareData } from '../utils/sikeShareUtils';
import { playSFX } from '../utils/soundManager';

// Components
import Dashboard from './Dashboard';
import Schedule from './Schedule';
import News from './News';
import Lineups from './Lineups';
import Editor from './Editor';
import Standings from './Standings';
import Stats from './Stats';
import Settings from './Settings';
import PlayerProfile from './PlayerProfile';
import MatchResultScreen from './MatchResultScreen';
import ForwardResultsScreen from './ForwardResultsScreen';
import AwardsAndRecordsScreen from './AwardsRecordsScreen';
import EndOfFormatScreen from './EndOfFormatScreen';
import Transfers from './Transfers';
import ComparisonScreen from './ComparisonScreen';
import LiveMatchScreen from './LiveMatchScreen';
import SponsorRoom from './SponsorRoom';
import AuctionRoom from './AuctionRoom';
import PlayerDatabase from './PlayerDatabase';
import SikeShare from './SikeShare';
import { WorldLeagueScreen } from './WorldLeagueScreen';
import ChampionsLeagueScreen from './ChampionsLeagueScreen';
import SeasonTransitionHub from './SeasonTransitionHub';
import ShotSelectionWagonWheel from './ShotSelectionWagonWheel';
import { CalendarView } from './CalendarView';
import { SeriesManager } from './SeriesManager';
import { RankingsScreen } from './RankingsScreen';
import { MatchSquadModal } from './MatchSquadModal';

import { useFirebase } from './FirebaseProvider';
import { signIn, signOutUser } from '../services/firebase';

interface CareerHubProps {
    gameData: GameData;
    setGameData: React.Dispatch<React.SetStateAction<GameData | null>>;
    onResetGame: () => void;
    theme: 'light' | 'dark';
    setTheme: (theme: 'light' | 'dark') => void;
    saveGame: () => void;
    loadGame: () => void;
    showFeedback: (message: string, type?: 'success' | 'error') => void;
}

const BottomNavBar = ({ 
    activeScreen, 
    setScreen,
}: { 
    activeScreen: CareerScreen; 
    setScreen: (screen: CareerScreen) => void;
    setAwardsTab?: (tab: 'AWARDS' | 'RECORDS' | 'HALL_OF_FAME') => void;
    awardsInitialTab?: string;
}) => {
    const navItems = [
        { name: 'HOME', screen: 'DASHBOARD' as CareerScreen, icon: Home },
        { name: 'TABLE', screen: 'LEAGUES' as CareerScreen, icon: Trophy },
        { name: 'FIXTURES', screen: 'SCHEDULE' as CareerScreen, icon: Calendar },
        { name: 'LINEUPS', screen: 'LINEUPS' as CareerScreen, icon: Users },
        { name: 'STATS', screen: 'STATS' as CareerScreen, icon: LayoutGrid },
        { name: 'SETTINGS', screen: 'SETTINGS' as CareerScreen, icon: SettingsIcon },
    ];
    return (
        <nav className="bg-white/90 dark:bg-[#0A0F0F]/95 border-t border-slate-200 dark:border-slate-800/80 flex justify-around items-center h-[72px] pb-3 backdrop-blur-xl sticky bottom-0 z-50 px-2">
            {navItems.map(item => {
                const isActive = activeScreen === item.screen;
                return (
                    <button
                        key={item.name}
                        onClick={() => setScreen(item.screen)}
                        className={`relative flex flex-col items-center justify-center space-y-1 flex-1 min-w-0 pt-2 transition-all duration-300 cursor-pointer ${isActive ? 'text-teal-500 font-bold' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                    >
                        {isActive && (
                            <motion.div 
                                layoutId="nav-active"
                                className="absolute -top-2 w-8 sm:w-10 h-1 bg-teal-500 rounded-full"
                                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                            />
                        )}
                        <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                        <span className="text-[7.5px] sm:text-[9px] font-extrabold tracking-[0.05em] uppercase truncate max-w-full px-0.5">{item.name}</span>
                    </button>
                );
            })}
        </nav>
    );
};

const CareerHub: React.FC<CareerHubProps> = ({ gameData, setGameData, onResetGame, theme, setTheme, saveGame, loadGame, showFeedback }) => {
    const [screen, setScreen] = useState<CareerScreen>('DASHBOARD');
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const [playerProfileFormat, setPlayerProfileFormat] = useState<Format>(gameData.currentFormat);
    const [selectedMatchResult, setSelectedMatchResult] = useState<MatchResult | null>(null);
    const [forwardSimResults, setForwardSimResults] = useState<MatchResult[]>([]);
    const [profileOrigin, setProfileOrigin] = useState<CareerScreen>('STATS');
    const [matchResultOrigin, setMatchResultOrigin] = useState<CareerScreen>('DASHBOARD');
    const [showModeSelector, setShowModeSelector] = useState(false);
    const [awardsInitialTab, setAwardsInitialTab] = useState<'AWARDS' | 'RECORDS' | 'HALL_OF_FAME'>('HALL_OF_FAME');
    const [calendarAddDate, setCalendarAddDate] = useState<any>(null);
    const [showSquadModal, setShowSquadModal] = useState(false);

    const userTeam = useMemo(() => {
        return gameData.teams.find(t => t.id === gameData.userTeamId) || gameData.teams[0];
    }, [gameData]);

    // Identify the upcoming match for user team to pass into MatchSquadModal
    const upcomingMatchForSquad = useMemo(() => {
        if (!userTeam) return null;
        const currentSchedule = gameData.schedule[gameData.currentFormat] || [];
        const currentIdx = gameData.currentMatchIndex[gameData.currentFormat] || 0;
        for (let i = currentIdx; i < Math.min(currentIdx + 6, currentSchedule.length); i++) {
            const m = currentSchedule[i];
            if (m && (m.teamA === userTeam.name || m.teamB === userTeam.name)) {
                return {
                    teamA: m.teamA,
                    teamB: m.teamB,
                    matchNumber: String(m.matchNumber),
                    format: gameData.currentFormat,
                    ground: (m as any).ground || 'International Stadium'
                };
            }
        }
        return null;
    }, [gameData.schedule, gameData.currentFormat, gameData.currentMatchIndex, userTeam]);

    const { runSimulationForCurrentFormat, updateStatsFromMatch } = useSimulation(gameData, setGameData);

    const optimizeAllSquads = () => {
        if (!gameData) return;
        setGameData(prev => {
            if (!prev) return null;
            const format = prev.currentFormat;
            const finalPlayingXIs = { ...prev.playingXIs };
            
            const updatedTeams = prev.teams.map(t => {
                const autoXI = generateAutoXI(t.squad, format);
                const newXIIds = autoXI.map(p => p.id);
                finalPlayingXIs[t.id] = { ...finalPlayingXIs[t.id], [format]: newXIIds };

                let cid = t.captainId;
                if (!cid || !newXIIds.includes(cid)) {
                    cid = [...autoXI].sort((a,b) => (b.battingSkill + b.secondarySkill) - (a.battingSkill + a.secondarySkill))[0]?.id || null;
                }

                return { ...t, captainId: cid };
            });

            return { ...prev, teams: updatedTeams, playingXIs: finalPlayingXIs };
        });
        showFeedback("Squads Optimized: Balanced Playing XI enforced.", "success");
    };

    useEffect(() => {
        if (gameData && (!gameData.sponsorships || !gameData.popularity || !gameData.news)) {
             setGameData(prev => {
                 if (!prev) return null;
                 return {
                     ...prev,
                     popularity: prev.popularity ?? 50,
                     sponsorships: prev.sponsorships ?? INITIAL_SPONSORSHIPS,
                     news: prev.news ?? INITIAL_NEWS
                 };
             });
        }
    }, [gameData, setGameData]);

    useEffect(() => {
        const schedule = gameData.schedule?.[gameData.currentFormat] || [];
        const currentMatchIndex = gameData.currentMatchIndex?.[gameData.currentFormat] || 0;

        if (schedule.length > 0 && currentMatchIndex >= schedule.length) {
            const awardExists = (gameData.awardsHistory || []).some(a => a.season === gameData.currentSeason && a.format === gameData.currentFormat);
            
            if (!awardExists) {
                const newAward = calculateSeasonAwards(gameData, gameData.currentFormat);
                setGameData(prev => prev ? { ...prev, awardsHistory: [...(prev.awardsHistory || []), newAward] } : null);
                setScreen('END_OF_FORMAT');
            }
        }
    }, [gameData.currentMatchIndex, gameData.currentFormat, gameData.currentSeason, gameData.awardsHistory, gameData.teams, gameData.allPlayers, gameData.matchResults, gameData.schedule, setGameData]);

    const handleUpdatePlayer = (updatedPlayer: Player) => {
        setGameData(prevData => {
            if (!prevData) return null;
            const newAllPlayers = prevData.allPlayers.map(p => p.id === updatedPlayer.id ? updatedPlayer : p);
            const newTeams = prevData.teams.map(team => ({
                ...team,
                squad: team.squad.map(squadPlayer => newAllPlayers.find(p => p.id === squadPlayer.id) || squadPlayer)
            }));
            return { ...prevData, allPlayers: newAllPlayers, teams: newTeams };
        });
    };

    const handleCreatePlayer = (newPlayer: Player) => {
        setGameData(prevData => {
            if (!prevData) return null;
            return { ...prevData, allPlayers: [...prevData.allPlayers, newPlayer] };
        });
    };

    const handleUpdateGround = (code: string, newPitch: string) => setGameData(prev => prev ? { ...prev, grounds: prev.grounds.map(g => g.code === code ? { ...g, pitch: newPitch } : g) } : null);
    
    const handleUpdateScoreLimits = (groundCode: string, format: Format, field: any, value: any, inning: number) => {
        setGameData(prev => {
            if (!prev) return null;
            const numValue = parseInt(value, 10);
            const newLimits: any = JSON.parse(JSON.stringify(prev.scoreLimits || {}));
            if (!newLimits[groundCode]) newLimits[groundCode] = {};
            if (!newLimits[groundCode][format]) newLimits[groundCode][format] = {};
            if (!newLimits[groundCode][format][inning]) newLimits[groundCode][format][inning] = {};
            
            if (value === '' || isNaN(numValue) || numValue <= 0) {
                delete newLimits[groundCode][format][inning][field];
            } else {
                newLimits[groundCode][format][inning][field] = numValue;
            }
            
            return { ...prev, scoreLimits: newLimits };
        });
    };

    const handleUpdateCaptain = useCallback((teamId: string, format: Format, playerId: string) => {
        setGameData(prevData => {
            if (!prevData) return null;
            const targetTeam = prevData.teams.find(t => t.id === teamId);
            if (targetTeam && targetTeam.captains[format] === playerId) {
                return prevData;
            }
            return {
                ...prevData,
                teams: prevData.teams.map(t => {
                    if (t.id === teamId) {
                        return { ...t, captains: { ...t.captains, [format]: playerId } };
                    }
                    return t;
                })
            };
        });
        showFeedback("Captain updated!");
    }, [showFeedback, setGameData]);

    const handleUpdatePlayingXI = useCallback((teamId: string, format: Format, newXI: string[]) => {
        setGameData(prevData => {
            if (!prevData) return null;
            const teamXIs = prevData.playingXIs[teamId] || {};
            const currentXI = teamXIs[format] || [];
            
            // Check if the squads are identical in length and content
            if (currentXI.length === newXI.length && currentXI.every((val, i) => val === newXI[i])) {
                return prevData;
            }
            
            return {
                ...prevData,
                playingXIs: {
                    ...prevData.playingXIs,
                    [teamId]: {
                        ...teamXIs,
                        [format]: newXI
                    }
                }
            };
        });
    }, [setGameData]);

    const simulateBackgroundMatches = (currentData: GameData): GameData => {
        let updatedData = JSON.parse(JSON.stringify(currentData)) as GameData;
        Object.values(Format).forEach(f => {
            if (f === updatedData.currentFormat) return; 

            const schedule = updatedData.schedule?.[f] || [];
            let mIdx = updatedData.currentMatchIndex?.[f] || 0;
            
            for (let i = 0; i < 8; i++) {
                if (mIdx < schedule.length) {
                    let match = JSON.parse(JSON.stringify(schedule[mIdx]));
                    
                    if (match.group !== 'Round-Robin') {
                        const standings = updatedData.standings?.[f] || [];
                        const getTeamName = (pos: number) => standings[pos - 1]?.teamName;
                        const resolvePlaceholder = (placeholder: string) => {
                            if (['1st', '2nd', '3rd', '4th'].includes(placeholder)) return getTeamName(parseInt(placeholder[0]));
                            if (placeholder.startsWith('SF')) {
                                const sfRes = (updatedData.matchResults?.[f] || []).find(r => r.matchNumber === placeholder.split(' ')[0]);
                                return updatedData.teams.find(t => t.id === sfRes?.winnerId)?.name || 'TBD';
                            }
                            return placeholder;
                        };
                        match.teamA = resolvePlaceholder(match.teamA) || 'TBD';
                        match.teamB = resolvePlaceholder(match.teamB) || 'TBD';
                        if (match.teamA === 'TBD' || match.teamB === 'TBD') break;
                    }

                    const result = runSimulationForCurrentFormat(match, updatedData);
                    updatedData = updateStatsFromMatch(result, f, updatedData);
                    if (!updatedData.currentMatchIndex) updatedData.currentMatchIndex = {} as any;
                    updatedData.currentMatchIndex[f] = (updatedData.currentMatchIndex[f] || 0) + 1;
                    mIdx++;
                }
            }
        });
        return updatedData;
    };

    const handleTakeMeToMyMatch = () => {
        if (!userTeam) return;
        let currentData = { ...gameData };
        const currentFormat = currentData.currentFormat;
        let matchIndex = currentData.currentMatchIndex?.[currentFormat] || 0;
        let schedule = currentData.schedule?.[currentFormat] || [];
        const results: MatchResult[] = [];
        const newNewsItems: NewsArticle[] = [];

        if (!schedule || matchIndex >= schedule.length) {
            showFeedback("Tournament matches already completed for this format.", "success");
            return;
        }

        // Check if current match is ALREADY user's match
        let firstMatchToSim = JSON.parse(JSON.stringify(schedule[matchIndex]));
        firstMatchToSim = resolveMatch(firstMatchToSim, currentData, currentFormat);
        if (firstMatchToSim.teamA === userTeam.name || firstMatchToSim.teamB === userTeam.name) {
            showFeedback(`You are already at your next fixture: ${firstMatchToSim.teamA} vs ${firstMatchToSim.teamB}!`, "success");
            return;
        }

        currentData = simulateBackgroundMatches(currentData);

        while (matchIndex < schedule.length) {
            let matchToSim = JSON.parse(JSON.stringify(schedule[matchIndex]));
            matchToSim = resolveMatch(matchToSim, currentData, currentFormat);
            
            if (matchToSim.teamA === 'TBD' || matchToSim.teamB === 'TBD' || 
                matchToSim.teamA.includes('Winner') || matchToSim.teamB.includes('Winner') || 
                matchToSim.teamA.includes('1st') || matchToSim.teamB.includes('1st') ||
                matchToSim.teamA.includes('2nd') || matchToSim.teamB.includes('2nd')) {
                break; 
            }

            const isUserTeamMatch = matchToSim.teamA === userTeam.name || matchToSim.teamB === userTeam.name;
            if (isUserTeamMatch) {
                const preNews = generatePreMatchNews(matchToSim, currentData);
                newNewsItems.push(preNews);
                break;
            }

            const result = runSimulationForCurrentFormat(matchToSim, currentData);
            currentData = updateStatsFromMatch(result, currentFormat, currentData);
            if (!currentData.currentMatchIndex) currentData.currentMatchIndex = {} as any;
            currentData.currentMatchIndex[currentFormat] = (currentData.currentMatchIndex[currentFormat] || 0) + 1; 
            results.push(result);
            
            if (matchToSim.group !== 'Round-Robin' || Math.random() < 0.3) {
                const sponsorship = currentData.sponsorships?.[currentFormat] || INITIAL_SPONSORSHIPS[currentFormat];
                newNewsItems.push(generateMatchNews(result, currentFormat, sponsorship));
            }
            
            matchIndex++;
        }

        if (newNewsItems.length > 0) currentData.news = [...newNewsItems, ...(currentData.news || [])].slice(0, 50);

        if (results.length > 0) {
            setForwardSimResults(results);
            setGameData(currentData); 
            setScreen('FORWARD_RESULTS');
            playSFX('success');
        } else {
            if (matchIndex < schedule.length) {
                if (newNewsItems.length > 0) {
                    setGameData(prev => prev ? { ...prev, news: [...newNewsItems, ...(prev.news || [])] } : null);
                }
                showFeedback("Ready at your next upcoming match.", "success");
            } else {
                showFeedback("Tournament matches completed.", "success");
            }
        }
    };

    const handleForwardDay = handleTakeMeToMyMatch;

    const handlePlayMatch = () => {
        if (!userTeam) return;
        
        const schedule = gameData.schedule?.[gameData.currentFormat] || [];
        const currentMatchIndex = gameData.currentMatchIndex?.[gameData.currentFormat] || 0;
        if (currentMatchIndex >= schedule.length) return;

        let matchToSim = JSON.parse(JSON.stringify(schedule[currentMatchIndex]));

        if (matchToSim.group !== 'Round-Robin') {
             const standings = gameData.standings?.[gameData.currentFormat] || [];
             const getTeamName = (pos: number) => standings[pos - 1]?.teamName;
             const resolvePlaceholder = (placeholder: string) => {
                if (['1st', '2nd', '3rd', '4th'].includes(placeholder)) return getTeamName(parseInt(placeholder[0]));
                if (placeholder.startsWith('SF')) {
                    const sfMatchNumber = placeholder.split(' ')[0];
                    const sfResult = (gameData.matchResults?.[gameData.currentFormat] || []).find(r => r.matchNumber === sfMatchNumber);
                    return gameData.teams.find(t => t.id === sfResult?.winnerId)?.name || null;
                }
                return placeholder;
            };
            matchToSim.teamA = resolvePlaceholder(matchToSim.teamA) || 'TBD';
            matchToSim.teamB = resolvePlaceholder(matchToSim.teamB) || 'TBD';
        }

        if (matchToSim.teamA === 'TBD' || matchToSim.teamB === 'TBD') {
            showFeedback("Waiting for league stage to conclude.", "error");
            return;
        }

        const isUserTeamMatch = matchToSim.teamA === userTeam.name || matchToSim.teamB === userTeam.name;
        
        if (isUserTeamMatch) {
            // Validate lineup for injuries
            const playingXIIds = gameData.playingXIs[userTeam.id]?.[gameData.currentFormat] || [];
            const injuredPlayers = playingXIIds
                .map(id => userTeam.squad.find(p => p.id === id))
                .filter(p => p && p.injury);

            if (injuredPlayers.length > 0) {
                showFeedback(`Cannot start match! ${injuredPlayers[0]?.name} is injured. Replace them in Lineups.`, "error");
                setScreen('LINEUPS');
                return;
            }

            setScreen('LIVE_MATCH');
        } else {
             const result = runSimulationForCurrentFormat(matchToSim, gameData);
             const updatedData = updateStatsFromMatch(result, gameData.currentFormat, gameData);
             updatedData.currentMatchIndex[gameData.currentFormat]++;
             const sponsorship = updatedData.sponsorships?.[updatedData.currentFormat] || INITIAL_SPONSORSHIPS[updatedData.currentFormat];
             const newsItem = generateMatchNews(result, updatedData.currentFormat, sponsorship);
             updatedData.news = [newsItem, ...updatedData.news].slice(0, 50);

             processMatchSikeShareUpdate(result, updatedData).then(sikeDiff => {
                 setGameData(prev => {
                     if (!prev) return null;
                     const currSike = prev.sikeShareData || initSikeShareData(prev);
                     return {
                         ...prev,
                         sikeShareData: {
                             ...currSike,
                             ...sikeDiff,
                             posts: sikeDiff.posts ? [...sikeDiff.posts] : currSike.posts
                         }
                     };
                 });
             });

             setGameData(updatedData);
             setSelectedMatchResult(result);
             setMatchResultOrigin('DASHBOARD');
             setScreen('MATCH_RESULT');
        }
    };

    const handleSimulateMatch = () => {
        const schedule = gameData.schedule[gameData.currentFormat];
        const currentMatchIndex = gameData.currentMatchIndex[gameData.currentFormat];
        if (!schedule || currentMatchIndex >= schedule.length) return;

        let matchToSim = JSON.parse(JSON.stringify(schedule[currentMatchIndex]));
        matchToSim = resolveMatch(matchToSim, gameData, gameData.currentFormat);

        if (matchToSim.teamA === 'TBD' || matchToSim.teamB === 'TBD') {
            showFeedback("Waiting for league stage or preceding knockout to conclude.", "error");
            return;
        }

        const result = runSimulationForCurrentFormat(matchToSim, gameData);
        const updatedData = updateStatsFromMatch(result, gameData.currentFormat, gameData);
        updatedData.currentMatchIndex[gameData.currentFormat]++;
        const sponsorship = updatedData.sponsorships?.[updatedData.currentFormat] || INITIAL_SPONSORSHIPS[updatedData.currentFormat];
        const newsItem = generateMatchNews(result, updatedData.currentFormat, sponsorship);
        updatedData.news = [newsItem, ...updatedData.news].slice(0, 50);

        processMatchSikeShareUpdate(result, updatedData).then(sikeDiff => {
            setGameData(prev => {
                if (!prev) return null;
                const currSike = prev.sikeShareData || initSikeShareData(prev);
                return {
                    ...prev,
                    sikeShareData: {
                        ...currSike,
                        ...sikeDiff,
                        posts: sikeDiff.posts ? [...sikeDiff.posts] : currSike.posts
                    }
                };
            });
        });

        setGameData(updatedData);
        setSelectedMatchResult(result);
        setMatchResultOrigin('DASHBOARD');
        setScreen('MATCH_RESULT');
        showFeedback(`Match ${result.matchNumber} simulated!`, "success");
    };

    const handleSimulateFormat = (targetFormat?: Format) => {
        const formatToSim = targetFormat || gameData.currentFormat;
        let workingData = JSON.parse(JSON.stringify(gameData)) as GameData;
        const schedule = workingData.schedule[formatToSim] || [];
        let currentIndex = workingData.currentMatchIndex[formatToSim] || 0;

        const resultsAdded: MatchResult[] = [];

        while (currentIndex < schedule.length) {
            let matchToSim = JSON.parse(JSON.stringify(schedule[currentIndex]));
            matchToSim = resolveMatch(matchToSim, workingData, formatToSim);

            if (matchToSim.teamA === 'TBD' || matchToSim.teamB === 'TBD') break;

            const result = runSimulationForCurrentFormat(matchToSim, workingData);
            workingData = updateStatsFromMatch(result, formatToSim, workingData);
            workingData.currentMatchIndex[formatToSim]++;
            currentIndex++;
            resultsAdded.push(result);
        }

        if (resultsAdded.length > 0) {
            const lastResult = resultsAdded[resultsAdded.length - 1];
            processMatchSikeShareUpdate(lastResult, workingData).then(sikeDiff => {
                setGameData(prev => {
                    if (!prev) return null;
                    const currSike = prev.sikeShareData || initSikeShareData(prev);
                    return {
                        ...prev,
                        sikeShareData: {
                            ...currSike,
                            ...sikeDiff,
                            posts: sikeDiff.posts ? [...sikeDiff.posts] : currSike.posts
                        }
                    };
                });
            });

            setGameData(workingData);
            setSelectedMatchResult(lastResult);
            setMatchResultOrigin('DASHBOARD');
            setScreen('MATCH_RESULT');
            showFeedback(`Simulated all remaining matches in ${formatToSim}! 🏆`, 'success');
        } else {
            showFeedback(`No playable matches left in ${formatToSim}.`, 'error');
        }
    };

    const handleSimulateSeason = () => {
        const formats: Format[] = [Format.T20, Format.ODI, Format.SHIELD];
        let workingData = JSON.parse(JSON.stringify(gameData)) as GameData;
        let totalSimulated = 0;
        let lastResult: MatchResult | null = null;

        formats.forEach(f => {
            const schedule = workingData.schedule[f] || [];
            let currentIndex = workingData.currentMatchIndex[f] || 0;

            while (currentIndex < schedule.length) {
                let matchToSim = JSON.parse(JSON.stringify(schedule[currentIndex]));
                matchToSim = resolveMatch(matchToSim, workingData, f);

                if (matchToSim.teamA === 'TBD' || matchToSim.teamB === 'TBD') break;

                const result = runSimulationForCurrentFormat(matchToSim, workingData);
                workingData = updateStatsFromMatch(result, f, workingData);
                workingData.currentMatchIndex[f]++;
                currentIndex++;
                totalSimulated++;
                lastResult = result;
            }
        });

        if (totalSimulated > 0 && lastResult) {
            processMatchSikeShareUpdate(lastResult, workingData).then(sikeDiff => {
                setGameData(prev => {
                    if (!prev) return null;
                    const currSike = prev.sikeShareData || initSikeShareData(prev);
                    return {
                        ...prev,
                        sikeShareData: {
                            ...currSike,
                            ...sikeDiff,
                            posts: sikeDiff.posts ? [...sikeDiff.posts] : currSike.posts
                        }
                    };
                });
            });

            setGameData(workingData);
            setSelectedMatchResult(lastResult);
            setMatchResultOrigin('DASHBOARD');
            setScreen('MATCH_RESULT');
            showFeedback(`Simulated entire Season ${gameData.currentSeason}! All formats completed! 🏆`, 'success');
        } else {
            showFeedback('Season is already complete or no matches left to simulate.', 'error');
        }
    };

    const handleLiveMatchComplete = (result: MatchResult) => {
        const updatedData = updateStatsFromMatch(result, gameData.currentFormat, gameData);
        updatedData.currentMatchIndex[gameData.currentFormat]++;
        updatedData.activeMatch = null; 
        const sponsorship = updatedData.sponsorships?.[updatedData.currentFormat] || INITIAL_SPONSORSHIPS[updatedData.currentFormat];
        const newsItem = generateMatchNews(result, updatedData.currentFormat, sponsorship);
        updatedData.news = [newsItem, ...updatedData.news].slice(0, 50);

        processMatchSikeShareUpdate(result, updatedData).then(sikeDiff => {
            setGameData(prev => {
                if (!prev) return null;
                const currSike = prev.sikeShareData || initSikeShareData(prev);
                return {
                    ...prev,
                    sikeShareData: {
                        ...currSike,
                        ...sikeDiff,
                        posts: sikeDiff.posts ? [...sikeDiff.posts] : currSike.posts
                    }
                };
            });
        });

        setGameData(updatedData);
        setSelectedMatchResult(result);
        setScreen('MATCH_RESULT');
    };

    const handleLiveMatchExit = (stateToSave?: LiveMatchState) => {
        if (stateToSave) {
            setGameData(prev => prev ? { ...prev, activeMatch: stateToSave } : null);
            showFeedback("Match progress saved.", "success");
        } else setGameData(prev => prev ? { ...prev, activeMatch: null } : null);
        setScreen('DASHBOARD');
    }

    const handleFormatChange = useCallback((newFormat: Format) => {
        setGameData(prev => prev ? ({ ...prev, currentFormat: newFormat }) : null);
        setScreen('DASHBOARD');
    }, [setGameData]);

    const handleEndOfSeason = useCallback((retainedPlayers: Player[]) => {
        setGameData((prevData: GameData | null) => {
            if (!prevData) return null;

            const isStruggling = (p: Player) => {
                const stats = p.stats[Format.T20];
                if (!stats || stats.matches < 3) return false;
                if (p.role === PlayerRole.BATSMAN || p.role === PlayerRole.WICKET_KEEPER) {
                    return stats.average < 18;
                }
                return stats.economy > 10.5;
            };

            const leagueBatters = [...prevData.allPlayers].sort((a,b) => (b.stats[Format.T20]?.runs || 0) - (a.stats[Format.T20]?.runs || 0));
            const top50Batters = new Set(leagueBatters.slice(0, 50).map(p => p.id));
            const leagueBowlers = [...prevData.allPlayers].sort((a,b) => (b.stats[Format.T20]?.wickets || 0) - (a.stats[Format.T20]?.wickets || 0));
            const top50Bowlers = new Set(leagueBowlers.slice(0, 50).map(p => p.id));

            const newTeams = prevData.teams.map(t => {
                const updatedSquad = (t.squad || []).map(p => {
                    if (p.injury && p.injury.durationType === 'seasons') {
                        const nextDuration = p.injury.durationValue - 1;
                        if (nextDuration <= 0) {
                            return { ...p, injury: null };
                        } else {
                            return { ...p, injury: { ...p.injury, durationValue: nextDuration } };
                        }
                    }
                    return p;
                });

                return {
                    ...t,
                    squad: updatedSquad,
                    firstAidKits: (t.firstAidKits || 0) + 1
                };
            });

            // Perform comprehensive Season Performance Evaluation across all formats
            const evaluatedAllPlayers = evaluateAllPlayersForSeason(prevData.allPlayers, prevData.currentSeason);
            const evaluatedMap = new Map(evaluatedAllPlayers.map(p => [p.id, p]));

            // Update all players with evaluation and injury countdown
            const updatedAllPlayers = evaluatedAllPlayers.map(p => {
                let pUpdated = { ...p };
                if (p.injury && p.injury.durationType === 'seasons') {
                    const nextDuration = p.injury.durationValue - 1;
                    if (nextDuration <= 0) {
                        pUpdated.injury = null;
                    } else {
                        pUpdated.injury = { ...p.injury, durationValue: nextDuration };
                    }
                }
                return pUpdated;
            });

            // Populate baseline stats for inactive players
            const allPlayersWithStats = populateStatsForInactivePlayers(updatedAllPlayers);

            // Map squads with evaluated players and assign captains/vice-captains
            const newTeamsEvaluated = autoAssignTeamCaptainsAndViceCaptains(newTeams.map(t => ({
                ...t,
                squad: t.squad.map(p => evaluatedMap.get(p.id) || p)
            })));

            const initialStandings = (teams: Team[]) => teams.map(team => ({ teamId: team.id, teamName: team.name, played: 0, won: 0, lost: 0, drawn: 0, points: 0, netRunRate: 0, runsFor: 0, runsAgainst: 0 }));

            const seasonNews: NewsArticle = { 
                id: `s${prevData.currentSeason}-end`, 
                headline: `International Season ${prevData.currentSeason+1} Tournaments Begin!`, 
                date: new Date().toLocaleDateString(), 
                excerpt: "National teams announce confirmed squads for the upcoming international calendar.", 
                content: "All 16 national teams have recalibrated their international rosters. Pre-tournament selection windows are now active.", 
                type: 'league' as const
            };

            const nextSeason = prevData.currentSeason + 1;
            const fullYearNext = generateFullYearSchedule(nextSeason);

            return {
                ...prevData,
                currentSeason: nextSeason,
                currentFormat: Format.T20,
                transfersMadeThisSeason: 0,
                currentMatchIndex: { 
                    [Format.T20]: 0, 
                    [Format.ODI]: 0, 
                    [Format.SHIELD]: 0,
                    [Format.WLT20]: 0
                } as Record<Format, number>,
                matchResults: { 
                    [Format.T20]: [], 
                    [Format.ODI]: [], 
                    [Format.SHIELD]: [],
                    [Format.WLT20]: []
                } as Record<Format, MatchResult[]>,
                standings: { 
                    [Format.T20]: initialStandings(newTeamsEvaluated), 
                    [Format.ODI]: initialStandings(newTeamsEvaluated), 
                    [Format.SHIELD]: initialStandings(newTeamsEvaluated),
                    [Format.WLT20]: []
                },
                schedule: { 
                    [Format.T20]: fullYearNext.scheduleByFormat[Format.T20] || [], 
                    [Format.ODI]: fullYearNext.scheduleByFormat[Format.ODI] || [], 
                    [Format.SHIELD]: fullYearNext.scheduleByFormat[Format.SHIELD] || [],
                    [Format.WLT20]: []
                },
                seriesList: fullYearNext.seriesList,
                scheduledEvents: fullYearNext.scheduledEvents,
                gameDate: { year: nextSeason, month: 1, day: 1 },
                worldLeague: undefined,
                championsLeague: undefined,
                teams: newTeamsEvaluated,
                allPlayers: allPlayersWithStats,
                news: [seasonNews, ...prevData.news].slice(0, 50)
            };
        });
        setScreen('DASHBOARD');
    }, [setGameData]);

    const { user } = useFirebase();

    const renderScreen = () => {
        const commonProps = { gameData, userTeam, setGameData, setScreen, showFeedback, optimizeAllSquads };
        switch(screen) {
            case 'DASHBOARD': return (
                <Dashboard 
                    {...commonProps} 
                    handlePlayMatch={handlePlayMatch} 
                    handleForwardDay={handleTakeMeToMyMatch} 
                    handleTakeMeToMyMatch={handleTakeMeToMyMatch}
                    handleSimulateMatch={handleSimulateMatch} 
                    handleSimulateFormat={handleSimulateFormat} 
                    handleSimulateSeason={handleSimulateSeason} 
                    handleFormatChange={handleFormatChange} 
                    onOpenSquadModal={() => setShowSquadModal(true)} 
                />
            );
            case 'LEAGUES': return <Standings gameData={gameData} setGameData={setGameData} showFeedback={showFeedback} onViewResult={result => { setMatchResultOrigin('LEAGUES'); setSelectedMatchResult(result); setScreen('MATCH_RESULT'); }} />; 
            case 'SCHEDULE': return (
                <Schedule 
                    gameData={gameData} 
                    setGameData={setGameData} 
                    showFeedback={showFeedback} 
                    userTeam={userTeam} 
                    viewMatchResult={result => { setMatchResultOrigin('SCHEDULE'); setSelectedMatchResult(result); setScreen('MATCH_RESULT'); }} 
                    handleSimulateMatch={handleSimulateMatch} 
                    handleSimulateFormat={handleSimulateFormat} 
                    handleSimulateSeason={handleSimulateSeason} 
                    handleTakeMeToMyMatch={handleTakeMeToMyMatch}
                    handlePlayMatch={handlePlayMatch} 
                    onNavigateToCalendar={() => setScreen('CALENDAR')} 
                    onNavigateToSeriesManager={() => setScreen('SERIES_MANAGER')} 
                />
            );
            case 'LINEUPS': return <Lineups {...commonProps} handleUpdatePlayingXI={handleUpdatePlayingXI} handleUpdateCaptain={handleUpdateCaptain} setSelectedPlayer={(p) => { setSelectedPlayer(p); setPlayerProfileFormat(gameData.currentFormat); }} setScreen={(scr) => { setProfileOrigin('LINEUPS'); setScreen(scr); }} />;
            case 'EDITOR': return <Editor {...commonProps} handleUpdatePlayer={handleUpdatePlayer} handleCreatePlayer={handleCreatePlayer} handleUpdateGround={handleUpdateGround} handleUpdateScoreLimits={handleUpdateScoreLimits} initialPlayerId={selectedPlayer?.id} onBack={() => setScreen('DASHBOARD')} />;
            case 'PLAYER_DATABASE': return <PlayerDatabase gameData={gameData} onAddPlayer={() => setScreen('EDITOR')} onViewPlayer={(p) => { setSelectedPlayer(p); setPlayerProfileFormat(gameData.currentFormat); setProfileOrigin('PLAYER_DATABASE'); setScreen('PLAYER_PROFILE'); }} />;
            case 'NEWS': return <News news={gameData.news} />;
            case 'STATS': return <Stats gameData={gameData} viewPlayerProfile={(p, f) => { setSelectedPlayer(p); setPlayerProfileFormat(f); setProfileOrigin('STATS'); setScreen('PLAYER_PROFILE'); }} />;
            case 'SETTINGS': return <Settings gameData={gameData} setGameData={setGameData} setScreen={setScreen} showFeedback={showFeedback} onResetGame={onResetGame} theme={theme} setTheme={setTheme} saveGame={saveGame} loadGame={loadGame} user={user} onSignIn={signIn} onSignOut={signOutUser} />;
            case 'PLAYER_PROFILE': return <PlayerProfile player={selectedPlayer} gameData={gameData} onBack={() => setScreen(profileOrigin)} initialFormat={playerProfileFormat} />;
            case 'MATCH_RESULT': return <MatchResultScreen result={selectedMatchResult} onBack={() => setScreen(matchResultOrigin)} userTeamId={gameData.userTeamId} />;
            case 'FORWARD_RESULTS': {
                const currentSched = gameData.schedule[gameData.currentFormat] || [];
                const nextIdx = gameData.currentMatchIndex[gameData.currentFormat] || 0;
                const nextMatch = currentSched[nextIdx] ? resolveMatch(currentSched[nextIdx], gameData, gameData.currentFormat) : null;
                return (
                    <ForwardResultsScreen 
                        results={forwardSimResults} 
                        onBack={() => setScreen('DASHBOARD')} 
                        userTeamId={gameData.userTeamId}
                        userTeamName={userTeam?.name}
                        upcomingMatch={nextMatch}
                        onPlayNextMatch={handlePlayMatch}
                        onViewResult={(res) => {
                            setMatchResultOrigin('FORWARD_RESULTS');
                            setSelectedMatchResult(res);
                            setScreen('MATCH_RESULT');
                        }}
                    />
                );
            }
            case 'AWARDS_RECORDS': return <AwardsAndRecordsScreen gameData={gameData} setGameData={setGameData} initialTab={awardsInitialTab as any} />;
            case 'END_OF_FORMAT': return <EndOfFormatScreen gameData={gameData} handleFormatChange={handleFormatChange} handleEndSeason={handleEndOfSeason} onNavigateToScreen={setScreen} />;
            case 'CHAMPIONS_LEAGUE': case 'SEASON_TRANSITION': return <SeasonTransitionHub gameData={gameData} setGameData={setGameData} setScreen={setScreen} showFeedback={showFeedback} />;
            case 'TRANSFERS': return <Transfers {...commonProps} />;
            case 'COMPARISON': return <ComparisonScreen gameData={gameData} />;
            case 'SPONSOR_ROOM': return <SponsorRoom gameData={gameData} setGameData={setGameData} />;
            case 'SIKE_SHARE': return <SikeShare gameData={gameData} setGameData={setGameData} showFeedback={showFeedback} onViewPlayerProfile={(p) => { setSelectedPlayer(p); setPlayerProfileFormat(gameData.currentFormat); setProfileOrigin('SIKE_SHARE'); setScreen('PLAYER_PROFILE'); }} />;
            case 'AUCTION_ROOM': return <AuctionRoom gameData={gameData} onAuctionComplete={(teams) => { 
                const teamsWithCaptains = autoAssignTeamCaptainsAndViceCaptains(teams);
                setGameData(prev => prev ? { ...prev, teams: teamsWithCaptains, transfersMadeThisSeason: 0 } : null);
                setScreen('DASHBOARD');
            }} />;
            case 'SHOT_SELECTION': return <ShotSelectionWagonWheel gameData={gameData} initialBatter={selectedPlayer} onBack={() => setScreen('DASHBOARD')} />;
            case 'CALENDAR': return <CalendarView gameData={gameData} userTeam={userTeam} setGameData={setGameData} onOpenSeriesManager={() => { setCalendarAddDate(null); setScreen('SERIES_MANAGER'); }} onOpenAddSeriesAtDate={(d) => { setCalendarAddDate(d); setScreen('SERIES_MANAGER'); }} onViewMatchResult={(res) => { setMatchResultOrigin('CALENDAR'); setSelectedMatchResult(res); setScreen('MATCH_RESULT'); }} onTakeMeToMyMatch={handleTakeMeToMyMatch} />;
            case 'SERIES_MANAGER': return <SeriesManager gameData={gameData} userTeam={userTeam} setGameData={setGameData} showFeedback={showFeedback} onNavigateToSchedule={() => setScreen('CALENDAR')} initialAddDate={calendarAddDate} />;
            case 'RANKINGS': return <RankingsScreen gameData={gameData} onSelectPlayer={(pId) => { const p = gameData.allPlayers.find(pl => pl.id === pId); if (p) { setSelectedPlayer(p); setPlayerProfileFormat(gameData.currentFormat); setProfileOrigin('RANKINGS'); setScreen('PLAYER_PROFILE'); } }} />;
            case 'SEASON_STANDINGS': return <Standings gameData={gameData} setGameData={setGameData} showFeedback={showFeedback} onViewResult={result => { setMatchResultOrigin('SEASON_STANDINGS'); setSelectedMatchResult(result); setScreen('MATCH_RESULT'); }} />;
            case 'LIVE_MATCH': {
                const schedule = gameData.schedule[gameData.currentFormat];
                const currentMatchIndex = gameData.currentMatchIndex[gameData.currentFormat];
                const match = schedule[currentMatchIndex];
                let resolvedMatch = match ? JSON.parse(JSON.stringify(match)) : null;
                if (resolvedMatch) {
                    const resolvePlaceholder = (placeholder: string) => {
                        if (['1st', '2nd', '3rd', '4th'].includes(placeholder)) {
                            const pos = parseInt(placeholder[0]);
                            return gameData.standings[gameData.currentFormat][pos-1]?.teamName || 'TBD';
                        }
                        if (placeholder.startsWith('SF')) {
                            const sfResult = gameData.matchResults[gameData.currentFormat].find(r => r.matchNumber === placeholder.split(' ')[0]);
                            return gameData.teams.find(t => t.id === sfResult?.winnerId)?.name || 'TBD';
                        }
                        return placeholder;
                    };
                    resolvedMatch.teamA = resolvePlaceholder(resolvedMatch.teamA);
                    resolvedMatch.teamB = resolvePlaceholder(resolvedMatch.teamB);
                }
                return resolvedMatch ? (
                    <LiveMatchScreen match={resolvedMatch} gameData={gameData} onMatchComplete={handleLiveMatchComplete} onExit={handleLiveMatchExit} savedState={gameData.activeMatch} /> 
                ) : <div className="p-4 text-center"><p>Tournament finished.</p><button onClick={() => setScreen('DASHBOARD')} className="mt-4 bg-teal-500 text-white px-4 py-2 rounded">Back</button></div>;
            }
            default: return <div>Coming Soon</div>
        }
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-[#050808] text-slate-900 dark:text-slate-100">
            <main className="flex-grow overflow-y-auto relative">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={screen}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="h-full"
                    >
                         {renderScreen()}
                    </motion.div>
                </AnimatePresence>
            </main>
            <BottomNavBar 
                activeScreen={screen} 
                setScreen={setScreen} 
                setAwardsTab={setAwardsInitialTab} 
                awardsInitialTab={awardsInitialTab}
            />

            {/* 15-Man Match Squad & Captain Selection Modal */}
            {userTeam && (
                <MatchSquadModal
                    isOpen={showSquadModal}
                    onClose={() => setShowSquadModal(false)}
                    gameData={gameData}
                    userTeam={userTeam}
                    setGameData={setGameData}
                    showFeedback={showFeedback}
                    upcomingMatch={upcomingMatchForSquad}
                />
            )}
        </div>
    );
};

export default CareerHub;

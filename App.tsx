import React, { useState, useEffect } from 'react';
import { AppState, GameData, Team, Format, MatchResult, Standing, Player, Match } from './types';
import { PLAYERS, TEAMS, GROUNDS, PRE_BUILT_SQUADS, INITIAL_SPONSORSHIPS, INITIAL_NEWS } from './data';
import { LoadingSpinner, generateLeagueSchedule, generateAutoXI } from './utils';
import { generateFullYearSchedule } from './utils/fourYearCalendar';
import { initializeRankings } from './utils/rankingsEngine';
import { populateStatsForInactivePlayers, autoAssignTeamCaptainsAndViceCaptains } from './utils/domesticStatsGenerator';
import { auditAndEnforceAllSquads } from './utils/squadAuditor';
import { useFirebase } from './components/FirebaseProvider';
import { saveGameToFirebase, signIn, signOutUser, getSaves, deleteSave } from './services/firebase';
import { saveGameLocally, loadGameLocally, hasLocalSave, deleteLocalSave } from './utils/storage';

// Components
import MainMenu from './components/MainMenu';
import TeamSelection from './components/TeamSelection';
import CareerHub from './components/CareerHub';
import AuctionRoom from './components/AuctionRoom';
import { PWAInstallModal } from './components/PWAInstallModal';
import { initPWA, subscribeInstallable, subscribeOnlineStatus } from './utils/pwaManager';

export const MAX_SQUAD_SIZE = 999;
export const MIN_SQUAD_SIZE = 15;
export const MAX_FOREIGN_PLAYERS = 10;

const GAME_VERSION = "26 Beta";
const GAME_TITLE = "Cricket manager " + GAME_VERSION;

export const App = () => {
  const [appState, setAppState] = useState<AppState>('MAIN_MENU');
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [hasSaveData, setHasSaveData] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const { user, loading: firebaseLoading } = useFirebase();

  useEffect(() => {
    initPWA();
    const unsubInstall = subscribeInstallable(setIsInstallable);
    const unsubOnline = subscribeOnlineStatus(setIsOnline);

    try {
      const savedTheme = localStorage.getItem('cricketManagerTheme') || 'dark';
      setTheme(savedTheme as 'light' | 'dark');
    } catch {
      // ignore
    }
    hasLocalSave().then(hasSave => {
      setHasSaveData(hasSave);
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });

    return () => {
      unsubInstall();
      unsubOnline();
    };
  }, []);

  useEffect(() => {
    if (theme === 'light') {
        document.documentElement.classList.remove('dark');
    } else {
        document.documentElement.classList.add('dark');
    }
    try {
      localStorage.setItem('cricketManagerTheme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  useEffect(() => {
    if (gameData && !isLoading) {
      saveGameLocally(gameData).then(() => {
        setHasSaveData(true);
      }).catch(err => {
        console.warn("Local storage save error:", err);
      });
      
      // Auto-save to cloud if logged in
      if (user) {
          saveGameToFirebase(user.uid, 'autosave', 'Auto Save', gameData).catch(console.error);
      }
    }
  }, [gameData, isLoading, user]);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage(null), 2500);
  };

  const saveGame = async () => {
    if (!gameData) return;
    if (user) {
      try {
        showFeedback("Syncing with cloud...");
        await saveGameToFirebase(user.uid, 'autosave', 'Auto Save', gameData);
        showFeedback("Progress synced to cloud!");
      } catch (err) {
        console.error("Cloud save failed:", err);
        showFeedback("Cloud sync failed. Saved locally.", "error");
      }
    } else {
      showFeedback("Progress is saved locally! Sign in for cloud backup.");
    }
  };

  const sanitizeGameData = (data: any): GameData => {
    if (!data) return data;
    const existingPlayerIds = new Set((data.allPlayers || []).map((p: any) => p.id));
    const missingPlayers = PLAYERS.filter(p => !existingPlayerIds.has(p.id));

    const sanitizePlayer = (p: any): Player => {
        const defaultPlayer = PLAYERS.find(pl => pl.id === p.id);
        const stats: any = { ...p.stats };
        Object.values(Format).forEach(fmt => {
            if (!stats[fmt]) {
                stats[fmt] = {
                    matches: 0, inningsBatting: 0, inningsBowling: 0, runs: 0, highestScore: 0, average: 0, strikeRate: 0,
                    ballsFaced: 0, dismissals: 0, hundreds: 0, fifties: 0, thirties: 0, fours: 0, sixes: 0, fastestFifty: 0,
                    fastestHundred: 0, wickets: 0, economy: 0, bestBowling: '-', bestBowlingWickets: 0, bestBowlingRuns: 0,
                    bowlingAverage: 0, ballsBowled: 0, runsConceded: 0, threeWicketHauls: 0, fiveWicketHauls: 0,
                    catches: 0, runOuts: 0, manOfTheMatchAwards: 0,
                    phaseStats: {
                        batting: { pp: { runs: 0, balls: 0, dismissals: 0 }, mo: { runs: 0, balls: 0, dismissals: 0 }, do: { runs: 0, balls: 0, dismissals: 0 } },
                        bowling: { pp: { wickets: 0, runsConceded: 0, ballsBowled: 0 }, mo: { wickets: 0, runsConceded: 0, ballsBowled: 0 }, do: { wickets: 0, runsConceded: 0, ballsBowled: 0 } }
                    },
                    positionStats: {
                        1: { innings: 0, runs: 0, balls: 0, dismissals: 0, thirties: 0, fifties: 0, hundreds: 0 },
                        2: { innings: 0, runs: 0, balls: 0, dismissals: 0, thirties: 0, fifties: 0, hundreds: 0 },
                        3: { innings: 0, runs: 0, balls: 0, dismissals: 0, thirties: 0, fifties: 0, hundreds: 0 },
                        4: { innings: 0, runs: 0, balls: 0, dismissals: 0, thirties: 0, fifties: 0, hundreds: 0 },
                        5: { innings: 0, runs: 0, balls: 0, dismissals: 0, thirties: 0, fifties: 0, hundreds: 0 },
                        6: { innings: 0, runs: 0, balls: 0, dismissals: 0, thirties: 0, fifties: 0, hundreds: 0 },
                        7: { innings: 0, runs: 0, balls: 0, dismissals: 0, thirties: 0, fifties: 0, hundreds: 0 },
                        8: { innings: 0, runs: 0, balls: 0, dismissals: 0, thirties: 0, fifties: 0, hundreds: 0 },
                        9: { innings: 0, runs: 0, balls: 0, dismissals: 0, thirties: 0, fifties: 0, hundreds: 0 },
                        10: { innings: 0, runs: 0, balls: 0, dismissals: 0, thirties: 0, fifties: 0, hundreds: 0 },
                        11: { innings: 0, runs: 0, balls: 0, dismissals: 0, thirties: 0, fifties: 0, hundreds: 0 }
                    }
                };
            }
        });
        return {
            ...p,
            badges: p.badges || defaultPlayer?.badges || [],
            weaknesses: p.weaknesses || defaultPlayer?.weaknesses || [],
            isFinisher: p.isFinisher ?? defaultPlayer?.isFinisher ?? false,
            isPowerHitter: p.isPowerHitter ?? defaultPlayer?.isPowerHitter ?? false,
            isForeign: p.isForeign ?? defaultPlayer?.isForeign ?? false,
            stats
        };
    };

    const rawSanitizedAllPlayers = [...(data.allPlayers || []).map(sanitizePlayer), ...missingPlayers];
    const rawSanitizedTeams = (data.teams || []).map((t: any) => ({
        ...t,
        squad: (t.squad || []).map(sanitizePlayer),
        purse: t.purse ?? 100.0,
        firstAidKits: t.firstAidKits ?? 1
    }));

    const { auditedTeams: sanitizedTeams, auditedAllPlayers: sanitizedAllPlayers } = auditAndEnforceAllSquads(
        rawSanitizedTeams,
        rawSanitizedAllPlayers
    );

    // Validate and sanitize playingXIs for all teams and formats
    const sanitizedPlayingXIs: Record<string, Record<string, string[]>> = { ...(data.playingXIs || {}) };
    sanitizedTeams.forEach(team => {
        if (!sanitizedPlayingXIs[team.id]) sanitizedPlayingXIs[team.id] = {};
        [Format.T20, Format.ODI, Format.SHIELD, Format.WLT20].forEach(fmt => {
            const currentXI = sanitizedPlayingXIs[team.id]?.[fmt];
            const validPlayerIds = new Set(team.squad.map(p => p.id));
            const filteredXI = (currentXI || []).filter(id => validPlayerIds.has(id));
            if (filteredXI.length !== 11) {
                const autoXI = generateAutoXI(team.squad, fmt);
                sanitizedPlayingXIs[team.id][fmt] = autoXI.map(p => p.id);
            }
        });
    });

    const fullYear = generateFullYearSchedule(data.currentSeason || 1);

    return {
      ...data,
      allPlayers: sanitizedAllPlayers,
      teams: sanitizedTeams,
      grounds: data.grounds || [...GROUNDS],
      allTeamsData: data.allTeamsData || [...TEAMS],
      schedule: {
        [Format.T20]: data.schedule?.[Format.T20] || fullYear.scheduleByFormat[Format.T20] || [],
        [Format.ODI]: data.schedule?.[Format.ODI] || fullYear.scheduleByFormat[Format.ODI] || [],
        [Format.SHIELD]: data.schedule?.[Format.SHIELD] || fullYear.scheduleByFormat[Format.SHIELD] || [],
        [Format.WLT20]: data.schedule?.[Format.WLT20] || [],
      },
      currentMatchIndex: {
        [Format.T20]: data.currentMatchIndex?.[Format.T20] ?? 0,
        [Format.ODI]: data.currentMatchIndex?.[Format.ODI] ?? 0,
        [Format.SHIELD]: data.currentMatchIndex?.[Format.SHIELD] ?? 0,
        [Format.WLT20]: data.currentMatchIndex?.[Format.WLT20] ?? 0,
      },
      standings: {
        [Format.T20]: data.standings?.[Format.T20] || sanitizedTeams.map(t => ({ teamId: t.id, teamName: t.name, played: 0, won: 0, lost: 0, drawn: 0, points: 0, netRunRate: 0, runsFor: 0, runsAgainst: 0 })),
        [Format.ODI]: data.standings?.[Format.ODI] || sanitizedTeams.map(t => ({ teamId: t.id, teamName: t.name, played: 0, won: 0, lost: 0, drawn: 0, points: 0, netRunRate: 0, runsFor: 0, runsAgainst: 0 })),
        [Format.SHIELD]: data.standings?.[Format.SHIELD] || sanitizedTeams.map(t => ({ teamId: t.id, teamName: t.name, played: 0, won: 0, lost: 0, drawn: 0, points: 0, netRunRate: 0, runsFor: 0, runsAgainst: 0 })),
        [Format.WLT20]: data.standings?.[Format.WLT20] || [],
      },
      matchResults: {
        [Format.T20]: data.matchResults?.[Format.T20] || [],
        [Format.ODI]: data.matchResults?.[Format.ODI] || [],
        [Format.SHIELD]: data.matchResults?.[Format.SHIELD] || [],
        [Format.WLT20]: data.matchResults?.[Format.WLT20] || [],
      },
      playingXIs: sanitizedPlayingXIs,
      currentSeason: data.currentSeason || 1,
      currentFormat: data.currentFormat && (data.currentFormat as any) !== 'T10' ? data.currentFormat : Format.T20,
      gameDate: data.gameDate || { year: data.currentSeason || 1, month: 1, day: 1 },
      seriesList: (data.seriesList && data.seriesList.length > 0) ? data.seriesList : fullYear.seriesList,
      scheduledEvents: (data.scheduledEvents && data.scheduledEvents.length > 0) ? data.scheduledEvents : fullYear.scheduledEvents,
      rankings: data.rankings || initializeRankings(sanitizedTeams, sanitizedAllPlayers),
      awardsHistory: data.awardsHistory || [],
      scoreLimits: data.scoreLimits || {},
      records: data.records || {
        batterVsBowler: [],
        teamVsTeam: [],
        playerVsTeam: [],
      },
      promotionHistory: data.promotionHistory || [],
      popularity: data.popularity ?? 50,
      sponsorships: data.sponsorships || INITIAL_SPONSORSHIPS,
      news: data.news || INITIAL_NEWS,
      activeMatch: data.activeMatch || null,
      settings: data.settings || { isDoubleRoundRobin: true }
    };
  };

  const loadGame = async () => {
    if (user) {
        showFeedback("Fetching cloud saves...");
        const cloudSaves = await getSaves(user.uid);
        if (cloudSaves.length > 0) {
            // Find latest autosave
            const latest = cloudSaves.find((s: any) => s.id === 'autosave') || cloudSaves[0];
            const sanitized = sanitizeGameData(latest.data);
            setGameData(sanitized);
            saveGameLocally(sanitized).catch(console.error);
            showFeedback("Cloud Save Loaded!", "success");
            setAppState('CAREER_HUB');
            return;
        }
    }
    
    try {
        const savedGame = await loadGameLocally();
        if (savedGame) {
            setGameData(sanitizeGameData(savedGame));
            showFeedback("Game Loaded!", "success");
            setAppState('CAREER_HUB');
        } else {
            showFeedback("No saved game found.", "error");
        }
    } catch (e) {
        console.error("Failed to parse saved game data during load:", e);
        await deleteLocalSave();
        setHasSaveData(false);
        showFeedback("Failed to load saved game. It may be corrupt.", "error");
    }
  };

  const resumeGame = async () => {
    try {
        const savedGame = await loadGameLocally();
        if (savedGame) {
            setGameData(sanitizeGameData(savedGame));
            setAppState('CAREER_HUB');
            showFeedback("Game Resumed!", "success");
        } else {
            setHasSaveData(false);
            showFeedback("No saved game found.", "error");
        }
    } catch(e) {
        console.error("Failed to parse saved game data:", e);
        await deleteLocalSave();
        setHasSaveData(false);
        showFeedback("Failed to load saved game. It may be corrupt.", "error");
    }
  };

  const handleStartNewGame = () => {
    setAppState('TEAM_SELECTION');
  };

  const initializeNewGame = (userTeamId: string) => {
    setIsLoading(true);
    // Clear previous save
    deleteLocalSave().catch(console.error);
    
    const initialTeamsData = [...TEAMS];
    const usedPlayerIds = new Set<string>();

    const rawInitialTeams: Team[] = autoAssignTeamCaptainsAndViceCaptains(initialTeamsData.map(teamData => {
        let squad: Player[] = [];
        const preBuiltIds = PRE_BUILT_SQUADS[teamData.id] || [];
        preBuiltIds.forEach(pid => {
            const p = PLAYERS.find(pl => pl.id === pid);
            if (p && !usedPlayerIds.has(pid)) {
                squad.push(JSON.parse(JSON.stringify(p)));
                usedPlayerIds.add(pid);
            }
        });

        return { id: teamData.id, name: teamData.name, squad, captains: {}, purse: 100.0, firstAidKits: 1 };
    }));

    const rawInitialPlayersWithStats = populateStatsForInactivePlayers(PLAYERS);

    // Enforce 18-25 squad size & mandatory role depth (2 WK, 6-7 BT, 5-6 BL, 3-4 SB, 4-5 AR) across all teams
    const { auditedTeams: initialTeams, auditedAllPlayers: initialPlayersWithStats } = auditAndEnforceAllSquads(
        rawInitialTeams,
        rawInitialPlayersWithStats
    );

    const initialStandings = (teams: Team[]) => teams.map(team => ({ 
        teamId: team.id, teamName: team.name, played: 0, won: 0, lost: 0, drawn: 0, points: 0, netRunRate: 0, runsFor: 0, runsAgainst: 0 
    }));

    const fullYearInit = generateFullYearSchedule(1);

    const schedules: Record<string, Match[]> = {
        [Format.T20]: fullYearInit.scheduleByFormat[Format.T20] || [],
        [Format.ODI]: fullYearInit.scheduleByFormat[Format.ODI] || [],
        [Format.SHIELD]: fullYearInit.scheduleByFormat[Format.SHIELD] || [],
        [Format.WLT20]: [],
    };

    const initialPlayingXIs: Record<string, Record<string, string[]>> = {};
    initialTeams.forEach(team => {
        initialPlayingXIs[team.id] = {};
        [Format.T20, Format.ODI, Format.SHIELD, Format.WLT20].forEach(fmt => {
            const xi = generateAutoXI(team.squad, fmt);
            initialPlayingXIs[team.id][fmt] = xi.map(p => p.id);
        });
    });

    const newGameData: GameData = {
      userTeamId,
      teams: initialTeams,
      grounds: [...GROUNDS],
      allTeamsData: initialTeamsData,
      allPlayers: initialPlayersWithStats,
      schedule: schedules,
      currentMatchIndex: {
        [Format.T20]: 0,
        [Format.ODI]: 0,
        [Format.SHIELD]: 0,
        [Format.WLT20]: 0,
      },
      standings: {
        [Format.T20]: initialStandings(initialTeams),
        [Format.ODI]: initialStandings(initialTeams),
        [Format.SHIELD]: initialStandings(initialTeams),
        [Format.WLT20]: [],
      },
      matchResults: Object.values(Format).reduce((acc, format) => {
        acc[format] = [];
        return acc;
      }, {} as Record<string, MatchResult[]>),
      playingXIs: initialPlayingXIs,
      currentSeason: 1,
      currentFormat: Format.T20, 
      gameDate: { year: 1, month: 1, day: 1 },
      seriesList: fullYearInit.seriesList,
      scheduledEvents: fullYearInit.scheduledEvents,
      rankings: initializeRankings(initialTeams, initialPlayersWithStats),
      awardsHistory: [],
      scoreLimits: {},
      records: {
        batterVsBowler: [],
        teamVsTeam: [],
        playerVsTeam: [],
      },
      promotionHistory: [],
      popularity: 50,
      sponsorships: INITIAL_SPONSORSHIPS,
      news: INITIAL_NEWS,
      activeMatch: null,
      settings: {
          isDoubleRoundRobin: true
      }
    };
    setGameData(newGameData);
    setAppState('CAREER_HUB');
    setIsLoading(false);
  };

  const handleAuctionComplete = (finalTeams: Team[]) => {
      const teamsWithCaptains = autoAssignTeamCaptainsAndViceCaptains(finalTeams);
      setGameData(prev => {
          if (!prev) return null;
          return { ...prev, teams: teamsWithCaptains };
      });
      setAppState('CAREER_HUB');
      showFeedback("Draft Room Closed! Ready for Match 1.", "success");
  };

  const resetGame = async () => {
      setIsLoading(true);
      
      // Clear All Local and IndexedDB Storage
      await deleteLocalSave();
      try {
        localStorage.clear();
      } catch {
        // ignore
      }
      
      // Clear Cloud Save if logged in
      if (user) {
          try {
              showFeedback("Wiping cloud data...");
              const cloudSaves = await getSaves(user.uid);
              for (const save of cloudSaves) {
                  await deleteSave(user.uid, (save as any).id);
              }
              showFeedback("Cloud data wiped!");
          } catch (e) {
              console.error("Failed to wipe cloud data:", e);
              showFeedback("Local data cleared, but cloud wipe failed.", "error");
          }
      }

      setGameData(null);
      setHasSaveData(false);
      setAppState('MAIN_MENU');
      window.location.reload(); 
  };

  const renderContent = () => {
    if (isLoading) {
        return <div className="bg-white dark:bg-gray-900 h-full flex items-center justify-center"><LoadingSpinner /></div>;
    }
    switch(appState) {
        case 'MAIN_MENU': return (
          <MainMenu 
            onStartNewGame={handleStartNewGame} 
            onResumeGame={resumeGame} 
            onResetGame={resetGame} 
            hasSaveData={hasSaveData} 
            user={user} 
            onSignIn={signIn} 
            onSignOut={signOutUser} 
            onOpenPWAInstall={() => setIsInstallModalOpen(true)}
            isOnline={isOnline}
            isInstallable={isInstallable}
          />
        );
        case 'TEAM_SELECTION': return <TeamSelection onTeamSelected={initializeNewGame} theme={theme} />;
        case 'AUCTION': return gameData ? <AuctionRoom gameData={gameData} onAuctionComplete={handleAuctionComplete} /> : null;
        case 'CAREER_HUB': return gameData ? <CareerHub gameData={gameData} setGameData={setGameData} onResetGame={resetGame} theme={theme} setTheme={setTheme} saveGame={saveGame} loadGame={loadGame} showFeedback={showFeedback} /> : null;
        default: return <div>Error</div>;
    }
  }

  return (
    <div className="bg-gray-100 dark:bg-gray-900 min-h-screen flex items-center justify-center font-sans">
      <div className="w-full max-w-md h-screen max-h-[932px] bg-gray-50 dark:bg-[#2C3531] border-4 border-gray-300 dark:border-gray-700 rounded-[60px] shadow-2xl shadow-black/50 overflow-hidden relative text-gray-900 dark:text-gray-200 flex flex-col">
        {renderContent()}
        {feedbackMessage && (
            <div className={`absolute bottom-28 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg z-50 shadow-lg text-white font-semibold ${feedbackMessage.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                {feedbackMessage.text}
            </div>
        )}
        <PWAInstallModal
          isOpen={isInstallModalOpen}
          onClose={() => setIsInstallModalOpen(false)}
          isInstallable={isInstallable}
          isOnline={isOnline}
          showFeedback={showFeedback}
        />
      </div>
    </div>
  );
};
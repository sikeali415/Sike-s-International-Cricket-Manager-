import React, { useState, useMemo } from 'react';
import { GameData, Team, Series, Match, Format, GameDate, ScheduledEvent } from '../types';
import { 
  MONTH_NAMES, 
  DAYS_IN_MONTH, 
  MAJOR_TOURNAMENT_MONTH,
  formatGameDate, 
  formatShortDate, 
  getMatchDurationDays,
  validateSeriesCreation,
  generateSeriesMatches,
  totalDaysFromDate,
  dateFromTotalDays,
  isDateBefore,
  isSameDate
} from '../utils/gameCalendar';
import { 
  FOUR_YEAR_TOURNAMENTS, 
  calculateSeriesProgress, 
  getYearTournamentConfig, 
  getCycleYear, 
  getCycleNumber 
} from '../utils/fourYearCalendar';
import { 
  Trophy, 
  Plus, 
  Calendar, 
  Edit3, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  PlayCircle, 
  ChevronRight, 
  X, 
  Filter, 
  ArrowRightLeft,
  CalendarDays,
  Shield,
  Layers,
  Sparkles,
  Info,
  Globe2,
  TrendingUp,
  Award
} from 'lucide-react';

interface SeriesManagerProps {
  gameData: GameData;
  userTeam: Team | null;
  setGameData: React.Dispatch<React.SetStateAction<GameData | null>>;
  showFeedback?: (message: string, type?: 'success' | 'error') => void;
  onNavigateToSchedule?: () => void;
  initialAddDate?: GameDate | null;
}

export const SeriesManager: React.FC<SeriesManagerProps> = ({
  gameData,
  userTeam,
  setGameData,
  showFeedback,
  onNavigateToSchedule,
  initialAddDate
}) => {
  const currentDate = gameData.gameDate || { year: gameData.currentSeason || 1, month: 1, day: 1 };

  // Helper to extract or initialize all series
  const seriesList: Series[] = useMemo(() => {
    if (gameData.seriesList && gameData.seriesList.length > 0) {
      return gameData.seriesList;
    }
    
    // If not in seriesList yet, collect any series events from scheduledEvents or existing schedule
    const foundEvents = (gameData.scheduledEvents || []).filter(e => e.type === 'series');
    if (foundEvents.length > 0) {
      return foundEvents.map(e => ({
        id: e.id,
        name: e.name,
        teamA: e.teamA || 'Team 1',
        teamB: e.teamB || 'Team 2',
        format: e.format,
        startDate: e.startDate,
        endDate: e.endDate,
        numberOfMatches: e.matchCount || 3,
        status: isDateBefore(e.endDate, currentDate) 
          ? 'completed' 
          : (isDateBefore(e.startDate, currentDate) ? 'live' : 'upcoming'),
        restDays: e.restDays || 2
      }));
    }

    // Default sample bilateral series if completely empty
    return [
      {
        id: 'series-init-1',
        name: 'Trans-Tasman T20 Challenge',
        teamA: gameData.teams[0]?.name || 'Australia',
        teamB: gameData.teams[1]?.name || 'New Zealand',
        format: 'T20',
        startDate: { year: currentDate.year, month: 2, day: 5 },
        endDate: { year: currentDate.year, month: 2, day: 15 },
        numberOfMatches: 3,
        status: 'upcoming',
        restDays: 2
      }
    ];
  }, [gameData.seriesList, gameData.scheduledEvents, currentDate, gameData.teams]);

  // Filtering & Search
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'upcoming' | 'live' | 'completed'>('ALL');
  const [formatFilter, setFormatFilter] = useState<'ALL' | 'T20' | 'ODI' | 'Test'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(Boolean(initialAddDate));
  const [editingSeries, setEditingSeries] = useState<Series | null>(null);
  const [reschedulingSeries, setReschedulingSeries] = useState<Series | null>(null);
  const [deletingSeries, setDeletingSeries] = useState<Series | null>(null);
  const [selectedSeriesForDetails, setSelectedSeriesForDetails] = useState<Series | null>(null);

  // Form State for Add / Edit
  const [formTeamA, setFormTeamA] = useState<string>(userTeam?.name || gameData.teams[0]?.name || '');
  const [formTeamB, setFormTeamB] = useState<string>(gameData.teams[1]?.name || '');
  const [formFormat, setFormFormat] = useState<'T20' | 'ODI' | 'Test'>('T20');
  const [formMatchCount, setFormMatchCount] = useState<number>(3);
  const [formRestDays, setFormRestDays] = useState<number>(2);
  const [formStartMonth, setFormStartMonth] = useState<number>(initialAddDate ? initialAddDate.month : Math.min(11, currentDate.month));
  const [formStartDay, setFormStartDay] = useState<number>(initialAddDate ? initialAddDate.day : Math.min(28, currentDate.day + 2));
  const [formName, setFormName] = useState<string>('');

  // Reschedule Form State
  const [rescheduleMonth, setRescheduleMonth] = useState<number>(1);
  const [rescheduleDay, setRescheduleDay] = useState<number>(1);

  // Derive matches linked to series
  const getMatchesForSeries = (seriesId: string): Match[] => {
    const list: Match[] = [];
    Object.values(gameData.schedule || {}).forEach((matches) => {
      (matches || []).forEach((m) => {
        if (m.seriesId === seriesId) {
          list.push(m);
        }
      });
    });
    return list;
  };

  // Determine series actual status based on schedule
  const getDynamicSeriesStatus = (series: Series): 'upcoming' | 'live' | 'completed' => {
    const matches = getMatchesForSeries(series.id);
    if (matches.length === 0) {
      if (isDateBefore(series.endDate, currentDate)) return 'completed';
      if (isDateBefore(series.startDate, currentDate)) return 'live';
      return 'upcoming';
    }

    // Check match dates against current date
    const allPast = matches.every(m => m.scheduledDate && isDateBefore(m.scheduledDate, currentDate));
    const allFuture = matches.every(m => m.scheduledDate && isDateBefore(currentDate, m.scheduledDate));
    if (allPast) return 'completed';
    if (allFuture) return 'upcoming';
    return 'live';
  };

  // Calculate live validation for Add Series
  const addStartDate: GameDate = {
    year: currentDate.year,
    month: formStartMonth,
    day: formStartDay
  };

  const addValidation = useMemo(() => {
    return validateSeriesCreation(
      addStartDate,
      formMatchCount,
      formFormat,
      formRestDays,
      currentDate,
      seriesList,
      formTeamA,
      formTeamB
    );
  }, [addStartDate, formMatchCount, formFormat, formRestDays, currentDate, seriesList, formTeamA, formTeamB]);

  // Calculate live validation for Reschedule Series
  const rescheduleStartDate: GameDate = {
    year: currentDate.year,
    month: rescheduleMonth,
    day: rescheduleDay
  };

  const rescheduleValidation = useMemo(() => {
    if (!reschedulingSeries) return { valid: false, error: 'No series selected', matchDates: [] };
    return validateSeriesCreation(
      rescheduleStartDate,
      reschedulingSeries.numberOfMatches,
      reschedulingSeries.format,
      reschedulingSeries.restDays || 2,
      currentDate,
      seriesList,
      reschedulingSeries.teamA,
      reschedulingSeries.teamB,
      reschedulingSeries.id
    );
  }, [rescheduleStartDate, reschedulingSeries, currentDate, seriesList]);

  // Handler to open Add Modal
  const openAddModal = () => {
    setFormTeamA(userTeam?.name || gameData.teams[0]?.name || '');
    const opponent = gameData.teams.find(t => t.name !== (userTeam?.name || gameData.teams[0]?.name));
    setFormTeamB(opponent?.name || gameData.teams[1]?.name || '');
    setFormFormat('T20');
    setFormMatchCount(3);
    setFormRestDays(2);
    setFormStartMonth(Math.min(11, currentDate.month));
    setFormStartDay(Math.min(26, currentDate.day + 2));
    setFormName('');
    setIsAddOpen(true);
  };

  // Handler to submit Add Series
  const handleAddSeries = () => {
    if (!addValidation.valid || !formTeamA || !formTeamB || formTeamA === formTeamB) {
      showFeedback?.('Please select two distinct teams and a valid date.', 'error');
      return;
    }

    const seriesId = `series-${Date.now()}`;
    const seriesTitle = formName.trim() || `${formTeamA} vs ${formTeamB} ${formFormat} Series`;
    
    const newSeries: Series = {
      id: seriesId,
      name: seriesTitle,
      teamA: formTeamA,
      teamB: formTeamB,
      format: formFormat,
      startDate: addStartDate,
      endDate: addValidation.endDate || addStartDate,
      numberOfMatches: formMatchCount,
      status: 'upcoming',
      restDays: formRestDays
    };

    const teamAObj = gameData.teams.find(t => t.name === formTeamA);
    const teamBObj = gameData.teams.find(t => t.name === formTeamB);

    const newMatches = generateSeriesMatches(
      newSeries,
      addValidation.matchDates,
      teamAObj?.id,
      teamBObj?.id
    );

    // Map format to target schedule bucket
    let formatKey = Format.T20;
    if (formFormat === 'ODI') formatKey = Format.ODI;
    if (formFormat === 'Test') formatKey = Format.FIRST_CLASS;

    const newEvent: ScheduledEvent = {
      id: seriesId,
      name: seriesTitle,
      type: 'series',
      format: formFormat,
      startDate: addStartDate,
      endDate: addValidation.endDate || addStartDate,
      teamA: formTeamA,
      teamB: formTeamB,
      matchCount: formMatchCount,
      restDays: formRestDays,
      description: `${formMatchCount}-Match bilateral series with ${formRestDays} rest days.`
    };

    setGameData(prev => {
      if (!prev) return prev;
      const currentList = prev.seriesList || seriesList;
      const updatedList = [...currentList, newSeries];
      const existingMatches = prev.schedule[formatKey] || [];
      const updatedSchedule = {
        ...prev.schedule,
        [formatKey]: [...existingMatches, ...newMatches]
      };
      const updatedEvents = [...(prev.scheduledEvents || []), newEvent];

      return {
        ...prev,
        seriesList: updatedList,
        schedule: updatedSchedule,
        scheduledEvents: updatedEvents
      };
    });

    setIsAddOpen(false);
    showFeedback?.(`Series "${seriesTitle}" successfully scheduled!`, 'success');
  };

  // Handler to open Reschedule Modal
  const openRescheduleModal = (s: Series) => {
    setReschedulingSeries(s);
    setRescheduleMonth(s.startDate.month < 12 ? s.startDate.month : 1);
    setRescheduleDay(s.startDate.day);
  };

  // Handler to submit Reschedule
  const handleRescheduleSeries = () => {
    if (!reschedulingSeries || !rescheduleValidation.valid) {
      showFeedback?.('Invalid reschedule date selection.', 'error');
      return;
    }

    const updatedSeries: Series = {
      ...reschedulingSeries,
      startDate: rescheduleStartDate,
      endDate: rescheduleValidation.endDate || rescheduleStartDate
    };

    const teamAObj = gameData.teams.find(t => t.name === reschedulingSeries.teamA);
    const teamBObj = gameData.teams.find(t => t.name === reschedulingSeries.teamB);

    const updatedMatches = generateSeriesMatches(
      updatedSeries,
      rescheduleValidation.matchDates,
      teamAObj?.id,
      teamBObj?.id
    );

    let formatKey = Format.T20;
    if (reschedulingSeries.format === 'ODI' || String(reschedulingSeries.format).toLowerCase().includes('odi')) formatKey = Format.ODI;
    if (reschedulingSeries.format === 'Test' || String(reschedulingSeries.format).toLowerCase().includes('first')) formatKey = Format.FIRST_CLASS;

    setGameData(prev => {
      if (!prev) return prev;
      const currentList = prev.seriesList || seriesList;
      const updatedList = currentList.map(s => s.id === reschedulingSeries.id ? updatedSeries : s);

      // Replace matches of this series in schedule
      const cleanSchedule = { ...prev.schedule };
      Object.keys(cleanSchedule).forEach((k) => {
        const f = k as Format;
        cleanSchedule[f] = (cleanSchedule[f] || []).filter(m => m.seriesId !== reschedulingSeries.id);
      });
      cleanSchedule[formatKey] = [...(cleanSchedule[formatKey] || []), ...updatedMatches];

      // Update scheduledEvents
      const updatedEvents = (prev.scheduledEvents || []).map(e => {
        if (e.id === reschedulingSeries.id) {
          return {
            ...e,
            startDate: rescheduleStartDate,
            endDate: rescheduleValidation.endDate || rescheduleStartDate
          };
        }
        return e;
      });

      return {
        ...prev,
        seriesList: updatedList,
        schedule: cleanSchedule,
        scheduledEvents: updatedEvents
      };
    });

    setReschedulingSeries(null);
    showFeedback?.(`Series "${reschedulingSeries.name}" rescheduled to ${formatShortDate(rescheduleStartDate)}!`, 'success');
  };

  // Handler to open Edit Modal
  const openEditModal = (s: Series) => {
    setEditingSeries(s);
    setFormName(s.name);
    setFormFormat((s.format === 'ODI' ? 'ODI' : (s.format === 'Test' || String(s.format).includes('First') ? 'Test' : 'T20')));
    setFormMatchCount(s.numberOfMatches);
    setFormRestDays(s.restDays || 2);
    setFormStartMonth(s.startDate.month < 12 ? s.startDate.month : 1);
    setFormStartDay(s.startDate.day);
  };

  // Handler to submit Edit Series
  const handleEditSeries = () => {
    if (!editingSeries) return;

    const editStartDate: GameDate = {
      year: currentDate.year,
      month: formStartMonth,
      day: formStartDay
    };

    const val = validateSeriesCreation(
      editStartDate,
      formMatchCount,
      formFormat,
      formRestDays,
      currentDate,
      seriesList,
      editingSeries.teamA,
      editingSeries.teamB,
      editingSeries.id
    );

    if (!val.valid) {
      showFeedback?.(val.error || 'Invalid series configuration.', 'error');
      return;
    }

    const updatedSeries: Series = {
      ...editingSeries,
      name: formName.trim() || editingSeries.name,
      format: formFormat,
      numberOfMatches: formMatchCount,
      restDays: formRestDays,
      startDate: editStartDate,
      endDate: val.endDate || editStartDate
    };

    const teamAObj = gameData.teams.find(t => t.name === editingSeries.teamA);
    const teamBObj = gameData.teams.find(t => t.name === editingSeries.teamB);

    const updatedMatches = generateSeriesMatches(
      updatedSeries,
      val.matchDates,
      teamAObj?.id,
      teamBObj?.id
    );

    let formatKey = Format.T20;
    if (formFormat === 'ODI') formatKey = Format.ODI;
    if (formFormat === 'Test') formatKey = Format.FIRST_CLASS;

    setGameData(prev => {
      if (!prev) return prev;
      const currentList = prev.seriesList || seriesList;
      const updatedList = currentList.map(s => s.id === editingSeries.id ? updatedSeries : s);

      const cleanSchedule = { ...prev.schedule };
      Object.keys(cleanSchedule).forEach((k) => {
        const f = k as Format;
        cleanSchedule[f] = (cleanSchedule[f] || []).filter(m => m.seriesId !== editingSeries.id);
      });
      cleanSchedule[formatKey] = [...(cleanSchedule[formatKey] || []), ...updatedMatches];

      const updatedEvents = (prev.scheduledEvents || []).map(e => {
        if (e.id === editingSeries.id) {
          return {
            ...e,
            name: updatedSeries.name,
            format: formFormat,
            startDate: editStartDate,
            endDate: val.endDate || editStartDate,
            matchCount: formMatchCount,
            restDays: formRestDays
          };
        }
        return e;
      });

      return {
        ...prev,
        seriesList: updatedList,
        schedule: cleanSchedule,
        scheduledEvents: updatedEvents
      };
    });

    setEditingSeries(null);
    showFeedback?.(`Series "${updatedSeries.name}" successfully updated!`, 'success');
  };

  // Handler to delete Series
  const handleDeleteSeries = () => {
    if (!deletingSeries) return;

    setGameData(prev => {
      if (!prev) return prev;
      const currentList = prev.seriesList || seriesList;
      const updatedList = currentList.filter(s => s.id !== deletingSeries.id);

      // Remove matches belonging to this series
      const cleanSchedule = { ...prev.schedule };
      Object.keys(cleanSchedule).forEach((k) => {
        const f = k as Format;
        cleanSchedule[f] = (cleanSchedule[f] || []).filter(m => m.seriesId !== deletingSeries.id);
      });

      const updatedEvents = (prev.scheduledEvents || []).filter(e => e.id !== deletingSeries.id);

      return {
        ...prev,
        seriesList: updatedList,
        schedule: cleanSchedule,
        scheduledEvents: updatedEvents
      };
    });

    showFeedback?.(`Series "${deletingSeries.name}" and all associated matches removed.`, 'success');
    setDeletingSeries(null);
    if (selectedSeriesForDetails?.id === deletingSeries.id) {
      setSelectedSeriesForDetails(null);
    }
  };

  // Filtered Series List
  const filteredSeries = useMemo(() => {
    return seriesList.filter(s => {
      const dynamicStatus = getDynamicSeriesStatus(s);
      if (statusFilter !== 'ALL' && dynamicStatus !== statusFilter) return false;
      
      const sFmt = String(s.format).toUpperCase();
      if (formatFilter === 'T20' && !sFmt.includes('T20')) return false;
      if (formatFilter === 'ODI' && !sFmt.includes('ODI') && !sFmt.includes('ONE-DAY')) return false;
      if (formatFilter === 'Test' && !sFmt.includes('TEST') && !sFmt.includes('FIRST')) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.teamA.toLowerCase().includes(q) || s.teamB.toLowerCase().includes(q);
      }

      return true;
    });
  }, [seriesList, statusFilter, formatFilter, searchQuery]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#152323] p-5 rounded-2xl border border-gray-200 dark:border-teal-900/60 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-teal-500/10 text-teal-500 rounded-xl">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                Series & Bilateral Tour Manager
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Create, customize, reschedule and manage international bilateral series across seasons
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {onNavigateToSchedule && (
            <button
              id="view-calendar-schedule-btn"
              onClick={onNavigateToSchedule}
              className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold transition flex items-center gap-2 border border-gray-300 dark:border-gray-700"
            >
              <Calendar className="w-4 h-4 text-teal-500" />
              <span>Full Calendar View</span>
            </button>
          )}

          <button
            id="add-new-series-btn"
            onClick={openAddModal}
            className="px-5 py-2.5 bg-teal-500 hover:bg-teal-600 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-500/20 transition flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Series</span>
          </button>
        </div>
      </div>

      {/* 4-Year International Cycle Spotlight Banner */}
      {(() => {
        const cycleYear = getCycleYear(currentDate.year);
        const cycleNum = getCycleNumber(currentDate.year);
        const activeTourney = getYearTournamentConfig(currentDate.year);

        return (
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-black rounded-full uppercase tracking-wider">
                    Cycle {cycleNum} • Year {cycleYear} of 4
                  </span>
                  <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black rounded-full uppercase tracking-wider flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5" />
                    Major Event: {activeTourney.name}
                  </span>
                </div>
                <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                  {activeTourney.badge}
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {activeTourney.description} Hosted in <strong>{activeTourney.hostCountry}</strong> during Month 12. Only this pinnacle tournament is contested this season.
                </p>
              </div>

              {/* 4-Year Cycle Step Progression */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950/60 p-2 rounded-xl border border-indigo-500/20">
                {[1, 2, 3, 4].map((yr) => {
                  const t = FOUR_YEAR_TOURNAMENTS[yr];
                  const isCurrent = yr === cycleYear;
                  return (
                    <div 
                      key={yr}
                      className={`p-2.5 rounded-lg text-center transition-all ${
                        isCurrent 
                          ? 'bg-gradient-to-b from-indigo-600 to-indigo-800 text-white shadow-lg border border-indigo-400 font-bold' 
                          : 'bg-slate-900/50 text-slate-400 border border-slate-800'
                      }`}
                    >
                      <div className="text-[10px] uppercase font-black tracking-wider opacity-80">
                        Year {yr}
                      </div>
                      <div className="text-xs font-extrabold truncate mt-0.5">
                        {t.shortName}
                      </div>
                      <div className="text-[9px] text-slate-300 truncate">
                        {t.hostCountry}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Month 12 Lock Regulation Banner */}
      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3">
        <Lock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
          <span className="font-bold">Tournament Regulation & Month 12 Lockout:</span> Month 12 is strictly reserved for the annual Major International Tournament (ICC/Global World Trophy). All custom bilateral series must be scheduled between <strong>Month 1 and Month 11</strong>. The Series Manager automatically blocks fixtures that overlap Month 12 or cause scheduling collisions.
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-4 flex items-center gap-1.5 p-1 bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700/80">
          {(['ALL', 'upcoming', 'live', 'completed'] as const).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold capitalize transition ${
                statusFilter === st
                  ? 'bg-teal-500 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:white'
              }`}
            >
              {st === 'ALL' ? 'All' : st}
            </button>
          ))}
        </div>

        <div className="md:col-span-4 flex items-center gap-1.5 p-1 bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700/80">
          {(['ALL', 'T20', 'ODI', 'Test'] as const).map(fmt => (
            <button
              key={fmt}
              onClick={() => setFormatFilter(fmt)}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition ${
                formatFilter === fmt
                  ? 'bg-teal-500 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:white'
              }`}
            >
              {fmt}
            </button>
          ))}
        </div>

        <div className="md:col-span-4">
          <input
            type="text"
            placeholder="Search series or team..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/80 rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-500 outline-hidden"
          />
        </div>
      </div>

      {/* Series Cards Grid */}
      {filteredSeries.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#152323] rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-teal-500/10 text-teal-500 flex items-center justify-center">
            <Trophy className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">No Series Found</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            There are no series matching your selected filters. Create a new bilateral tour or adjust your filter options.
          </p>
          <button
            onClick={openAddModal}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold rounded-xl transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Series</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSeries.map((series) => {
            const dynamicStatus = getDynamicSeriesStatus(series);
            const matches = getMatchesForSeries(series.id);
            const progress = calculateSeriesProgress(series, gameData.matchResults, gameData.schedule, currentDate);
            const playedCount = progress.playedMatches;

            const formatLabel = String(series.format).includes('T20') 
              ? 'T20' 
              : (String(series.format).includes('ODI') ? 'ODI' : 'Test');

            const isUserInvolved = userTeam && (series.teamA === userTeam.name || series.teamB === userTeam.name);

            return (
              <div
                key={series.id}
                className={`bg-white dark:bg-[#152323] rounded-2xl border transition-all duration-200 hover:shadow-md flex flex-col justify-between overflow-hidden ${
                  isUserInvolved 
                    ? 'border-teal-500/50 dark:border-teal-500/40 shadow-xs ring-1 ring-teal-500/20' 
                    : 'border-gray-200 dark:border-gray-800'
                }`}
              >
                {/* Card Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-gray-800/30">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        formatLabel === 'T20'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : formatLabel === 'ODI'
                          ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      }`}>
                        {formatLabel}
                      </span>
                      {isUserInvolved && (
                        <span className="px-2 py-0.5 bg-teal-500/10 text-teal-600 dark:text-teal-400 text-[10px] font-bold rounded-full border border-teal-500/20">
                          My Club
                        </span>
                      )}
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 capitalize ${
                      dynamicStatus === 'completed'
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        : dynamicStatus === 'live'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse'
                        : 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/30'
                    }`}>
                      {dynamicStatus === 'live' && <PlayCircle className="w-3 h-3" />}
                      {dynamicStatus === 'completed' && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                      {dynamicStatus === 'upcoming' && <Clock className="w-3 h-3" />}
                      <span>{dynamicStatus}</span>
                    </span>
                  </div>

                  <h3 className="mt-2.5 text-sm font-black text-gray-900 dark:text-white line-clamp-1">
                    {series.name}
                  </h3>
                </div>

                {/* Teams Clashes Visual & Live Scoreline */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700/50">
                    <div className="flex-1 text-left">
                      <div className="text-xs font-black text-gray-900 dark:text-white truncate">
                        {series.teamA}
                      </div>
                      <div className="text-[10px] text-gray-500 font-semibold">
                        Wins: <span className="text-teal-600 dark:text-teal-400 font-bold">{progress.winsTeamA}</span>
                      </div>
                    </div>

                    <div className="px-2.5 py-1 bg-white dark:bg-gray-700 rounded-lg text-xs font-black text-teal-600 dark:text-teal-400 border border-gray-200 dark:border-gray-600 flex items-center gap-1.5 shadow-xs">
                      <span>{progress.winsTeamA}</span>
                      <span className="text-gray-400 text-[10px]">-</span>
                      <span>{progress.winsTeamB}</span>
                    </div>

                    <div className="flex-1 text-right">
                      <div className="text-xs font-black text-gray-900 dark:text-white truncate">
                        {series.teamB}
                      </div>
                      <div className="text-[10px] text-gray-500 font-semibold">
                        Wins: <span className="text-teal-600 dark:text-teal-400 font-bold">{progress.winsTeamB}</span>
                      </div>
                    </div>
                  </div>

                  {/* Series Status & Progress Bar */}
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-teal-500" />
                        {progress.currentScoreline}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        {playedCount}/{series.numberOfMatches} Matches
                      </span>
                    </div>

                    <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          progress.isCompleted ? 'bg-emerald-500' : 'bg-teal-500'
                        }`}
                        style={{ width: `${progress.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Date & Matches Summary */}
                  <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1 text-gray-500">
                        <CalendarDays className="w-3.5 h-3.5 text-teal-500" />
                        <span>Date Range:</span>
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatShortDate(series.startDate)} → {formatShortDate(series.endDate)}, Y{series.startDate.year}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1 text-gray-500">
                        <Clock className="w-3.5 h-3.5 text-teal-500" />
                        <span>Rest Days:</span>
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {series.restDays || 2} Days between matches
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Controls */}
                <div className="p-3 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* Reschedule Button */}
                    <button
                      onClick={() => openRescheduleModal(series)}
                      title="Reschedule / Shift Series Dates"
                      className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-lg transition text-xs font-bold flex items-center gap-1 shadow-sm"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>Reschedule</span>
                    </button>

                    {/* Edit Button */}
                    <button
                      onClick={() => openEditModal(series)}
                      title="Edit Series Details"
                      className="px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 rounded-lg transition text-xs font-bold flex items-center gap-1 shadow-sm"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Details / View Matches */}
                    <button
                      onClick={() => setSelectedSeriesForDetails(series)}
                      className="px-2.5 py-1.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/30 rounded-lg text-xs font-bold transition flex items-center gap-1"
                    >
                      <span>Matches</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Series */}
                    <button
                      onClick={() => setDeletingSeries(series)}
                      title="Remove Series"
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 border border-transparent hover:border-red-500/30 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD SERIES MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#152323] border border-gray-200 dark:border-teal-900/60 rounded-2xl max-w-xl w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-500/10 text-teal-500 rounded-lg">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create New Series</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Bilateral tour generator with automated match scheduling
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Month 12 Lock Regulation */}
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                <strong>Schedule Law:</strong> Month 12 is exclusively reserved for the Year's Major International Tournament. All matches must conclude inside Month 1 to 11.
              </p>
            </div>

            <div className="mt-4 space-y-4">
              {/* Series Title (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Series Name / Trophy (Optional)
                </label>
                <input
                  type="text"
                  placeholder={`e.g. ${formTeamA} vs ${formTeamB} Trophy`}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700 text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-hidden"
                />
              </div>

              {/* Team A & Team B Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Team A (Host)
                  </label>
                  <select
                    value={formTeamA}
                    onChange={(e) => setFormTeamA(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700 text-xs font-medium focus:ring-2 focus:ring-teal-500 outline-hidden"
                  >
                    {gameData.teams.map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Team B (Visitor)
                  </label>
                  <select
                    value={formTeamB}
                    onChange={(e) => setFormTeamB(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700 text-xs font-medium focus:ring-2 focus:ring-teal-500 outline-hidden"
                  >
                    {gameData.teams.map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Format Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Format
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['T20', 'ODI', 'Test'] as const).map(fmt => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setFormFormat(fmt)}
                      className={`p-3 rounded-xl border text-left transition ${
                        formFormat === fmt
                          ? 'bg-teal-500/10 border-teal-500 shadow-xs'
                          : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <div className="font-bold text-xs text-gray-900 dark:text-white">{fmt}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        {fmt === 'Test' ? 'Up to 5 Days' : '1 Day Match'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Match Count & Rest Days */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Number of Matches
                  </label>
                  <select
                    value={formMatchCount}
                    onChange={(e) => setFormMatchCount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700 text-xs font-medium"
                  >
                    {[1, 2, 3, 4, 5].map(n => (
                      <option key={n} value={n}>{n} {n === 1 ? 'Match' : 'Matches'}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Rest Days Between Matches
                  </label>
                  <select
                    value={formRestDays}
                    onChange={(e) => setFormRestDays(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700 text-xs font-medium"
                  >
                    {[1, 2, 3, 4].map(d => (
                      <option key={d} value={d}>{d} {d === 1 ? 'Rest Day' : 'Rest Days'}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Start Date Selection */}
              <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700/60">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Start Date (Year {currentDate.year})
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-gray-500 block mb-1">Month</span>
                    <select
                      value={formStartMonth}
                      onChange={(e) => setFormStartMonth(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-xs font-medium"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <option key={m} value={m} disabled={m === MAJOR_TOURNAMENT_MONTH}>
                          Month {m} ({MONTH_NAMES[m - 1]}) {m === MAJOR_TOURNAMENT_MONTH ? '🔒 Locked' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="text-[10px] text-gray-500 block mb-1">Day</span>
                    <select
                      value={formStartDay}
                      onChange={(e) => setFormStartDay(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-xs font-medium"
                    >
                      {Array.from({ length: DAYS_IN_MONTH }, (_, i) => i + 1).map(d => (
                        <option key={d} value={d}>Day {d}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Validation Status */}
              {addValidation.valid ? (
                <div className="p-3 bg-teal-500/10 border border-teal-500/30 rounded-xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Valid Series Schedule</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-[11px]">
                    Tour runs from {formatGameDate(addStartDate)} to {addValidation.endDate ? formatGameDate(addValidation.endDate) : ''}.
                  </p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {addValidation.matchDates.map((md, idx) => (
                      <span key={idx} className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded border border-teal-500/30 font-mono text-[10px] text-teal-700 dark:text-teal-300">
                        M{idx + 1}: {formatShortDate(md)}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2 text-red-600 dark:text-red-400 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Scheduling Conflict:</span>
                    <span>{addValidation.error}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-gray-200 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!addValidation.valid || formTeamA === formTeamB}
                onClick={handleAddSeries}
                className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-md flex items-center gap-1.5 transition ${
                  addValidation.valid && formTeamA !== formTeamB
                    ? 'bg-teal-500 hover:bg-teal-600 active:scale-95 cursor-pointer'
                    : 'bg-gray-400 dark:bg-gray-700 opacity-50 cursor-not-allowed'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Confirm & Add Series</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESCHEDULE MODAL */}
      {reschedulingSeries && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#152323] border border-gray-200 dark:border-teal-900/60 rounded-2xl max-w-lg w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-500/10 text-teal-500 rounded-lg">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Reschedule Series</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Shift series dates forward or backward in season
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReschedulingSeries(null)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
                <div className="text-xs font-bold text-gray-900 dark:text-white">{reschedulingSeries.name}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">
                  Current Schedule: {formatShortDate(reschedulingSeries.startDate)} → {formatShortDate(reschedulingSeries.endDate)} ({reschedulingSeries.numberOfMatches} Matches)
                </div>
              </div>

              {/* New Start Date Pickers */}
              <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700/60">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  New Start Date (Year {currentDate.year})
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-gray-500 block mb-1">Month</span>
                    <select
                      value={rescheduleMonth}
                      onChange={(e) => setRescheduleMonth(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-xs font-medium"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <option key={m} value={m} disabled={m === MAJOR_TOURNAMENT_MONTH}>
                          Month {m} ({MONTH_NAMES[m - 1]}) {m === MAJOR_TOURNAMENT_MONTH ? '🔒 Locked' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="text-[10px] text-gray-500 block mb-1">Day</span>
                    <select
                      value={rescheduleDay}
                      onChange={(e) => setRescheduleDay(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-xs font-medium"
                    >
                      {Array.from({ length: DAYS_IN_MONTH }, (_, i) => i + 1).map(d => (
                        <option key={d} value={d}>Day {d}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Validation Status */}
              {rescheduleValidation.valid ? (
                <div className="p-3 bg-teal-500/10 border border-teal-500/30 rounded-xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Reschedule Approved</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-[11px]">
                    New Dates: {formatGameDate(rescheduleStartDate)} → {rescheduleValidation.endDate ? formatGameDate(rescheduleValidation.endDate) : ''}
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2 text-red-600 dark:text-red-400 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Reschedule Error:</span>
                    <span>{rescheduleValidation.error}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-gray-200 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setReschedulingSeries(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rescheduleValidation.valid}
                onClick={handleRescheduleSeries}
                className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-md flex items-center gap-1.5 transition ${
                  rescheduleValidation.valid
                    ? 'bg-teal-500 hover:bg-teal-600 active:scale-95 cursor-pointer'
                    : 'bg-gray-400 dark:bg-gray-700 opacity-50 cursor-not-allowed'
                }`}
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>Apply Reschedule</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT SERIES MODAL */}
      {editingSeries && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#152323] border border-gray-200 dark:border-teal-900/60 rounded-2xl max-w-lg w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-500/10 text-teal-500 rounded-lg">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Series Details</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Modify title, format, or match allocation
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingSeries(null)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Series Title
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700 text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-hidden"
                />
              </div>

              {/* Format Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Format
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['T20', 'ODI', 'Test'] as const).map(fmt => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setFormFormat(fmt)}
                      className={`p-2.5 rounded-xl border text-center transition ${
                        formFormat === fmt
                          ? 'bg-teal-500/10 border-teal-500 shadow-xs'
                          : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <div className="font-bold text-xs text-gray-900 dark:text-white">{fmt}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Number of Matches
                  </label>
                  <select
                    value={formMatchCount}
                    onChange={(e) => setFormMatchCount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700 text-xs font-medium"
                  >
                    {[1, 2, 3, 4, 5].map(n => (
                      <option key={n} value={n}>{n} Matches</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Rest Days
                  </label>
                  <select
                    value={formRestDays}
                    onChange={(e) => setFormRestDays(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-300 dark:border-gray-700 text-xs font-medium"
                  >
                    {[1, 2, 3, 4].map(d => (
                      <option key={d} value={d}>{d} Days</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-gray-200 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setEditingSeries(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEditSeries}
                className="px-5 py-2.5 text-xs font-bold text-white bg-teal-500 hover:bg-teal-600 active:scale-95 rounded-xl shadow-md transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingSeries && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#152323] border border-red-200 dark:border-red-900/60 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="p-3 bg-red-500/10 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Series</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Permanent fixture removal</p>
              </div>
            </div>

            <p className="mt-4 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              Are you sure you want to remove <strong>"{deletingSeries.name}"</strong>? This will remove the series and all linked matches from the season schedule.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setDeletingSeries(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSeries}
                className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 rounded-xl shadow-md transition"
              >
                Delete Series
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FIXTURES MODAL FOR SELECTED SERIES */}
      {selectedSeriesForDetails && (() => {
        const seriesProgress = calculateSeriesProgress(selectedSeriesForDetails, gameData.matchResults, gameData.schedule, currentDate);
        const matches = getMatchesForSeries(selectedSeriesForDetails.id);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#152323] border border-gray-200 dark:border-teal-900/60 rounded-2xl max-w-2xl w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-800">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {selectedSeriesForDetails.name}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedSeriesForDetails.format || 'Series'} • {selectedSeriesForDetails.teamA} vs {selectedSeriesForDetails.teamB}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedSeriesForDetails(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Live Series Scorecard Summary Header */}
              <div className="mt-4 p-4 bg-gradient-to-r from-teal-900/40 via-slate-900 to-teal-900/40 rounded-xl border border-teal-500/30 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-teal-400 tracking-wider">Series Progress</div>
                  <div className="text-sm font-extrabold text-white mt-0.5">{seriesProgress.currentScoreline}</div>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <div>
                    <div className="text-[10px] text-gray-400">Scoreline</div>
                    <div className="text-base font-black text-white font-mono">
                      {selectedSeriesForDetails.teamA.split(' ')[0]} {seriesProgress.winsTeamA} - {seriesProgress.winsTeamB} {selectedSeriesForDetails.teamB.split(' ')[0]}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {matches.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-500">
                    No individual matches loaded in the current schedule table.
                  </div>
                ) : (
                  matches.map((m, idx) => {
                    const isPlayed = m.scheduledDate && isDateBefore(m.scheduledDate, currentDate);
                    const allResults = Array.isArray(gameData.matchResults) ? gameData.matchResults : Object.values(gameData.matchResults || {}).flat();
                    const matchResult = allResults.find(r => String(r.matchNumber) === String(m.matchNumber));

                    return (
                      <div
                        key={idx}
                        className="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700/60 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold text-xs flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <div>
                            <div className="text-xs font-bold text-gray-900 dark:text-white">
                              {m.teamA} vs {m.teamB}
                            </div>
                            <div className="text-[10px] text-gray-500">
                              {m.scheduledDate ? formatGameDate(m.scheduledDate) : m.date} • {m.venue || 'International Ground'}
                            </div>
                            {matchResult?.summary && (
                              <div className="text-[10px] text-teal-600 dark:text-teal-400 font-bold mt-0.5">
                                Result: {matchResult.summary}
                              </div>
                            )}
                          </div>
                        </div>

                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          isPlayed
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/30'
                        }`}>
                          {isPlayed ? 'Completed' : 'Scheduled'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedSeriesForDetails(null)}
                  className="px-5 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold rounded-xl text-gray-800 dark:text-gray-200 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

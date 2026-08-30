import React, { useState, useMemo } from 'react';
import { GameData, Team, Series, Match, Format, GameDate, ScheduledEvent } from '../types';
import { 
  MONTH_NAMES, 
  MONTH_SHORT_NAMES,
  MONTH_THEMES,
  DAYS_IN_MONTH, 
  MAJOR_TOURNAMENT_MONTH,
  formatGameDate, 
  formatShortDate, 
  getMatchDurationDays,
  totalDaysFromDate,
  dateFromTotalDays,
  isDateBefore,
  isSameDate,
  isDateInRange,
  generateDefaultScheduledEvents
} from '../utils/gameCalendar';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Lock, 
  Plus, 
  Trophy, 
  Clock, 
  Sparkles, 
  Shield, 
  Layers, 
  CalendarDays, 
  AlertCircle, 
  X, 
  Swords,
  Zap
} from 'lucide-react';
import { playSFX } from '../utils/soundManager';

interface CalendarViewProps {
  gameData: GameData;
  userTeam: Team | null;
  setGameData: React.Dispatch<React.SetStateAction<GameData | null>>;
  onOpenSeriesManager: () => void;
  onOpenAddSeriesAtDate?: (date: GameDate) => void;
  onViewMatchResult?: (result: any) => void;
  onTakeMeToMyMatch?: () => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  gameData,
  userTeam,
  setGameData,
  onOpenSeriesManager,
  onOpenAddSeriesAtDate,
  onViewMatchResult,
  onTakeMeToMyMatch
}) => {
  const currentDate = gameData.gameDate || { year: gameData.currentSeason || 1, month: 1, day: 1 };
  const [viewMonth, setViewMonth] = useState<number>(currentDate.month);
  const [selectedDay, setSelectedDay] = useState<number | null>(currentDate.day);
  const [selectedEventModal, setSelectedEventModal] = useState<{
    event?: ScheduledEvent;
    series?: Series;
    matches?: Match[];
    day: number;
  } | null>(null);

  const monthTheme = MONTH_THEMES[viewMonth] || {
    title: `Month ${viewMonth}`,
    subtitle: 'Scheduled Matches & Events',
    primaryFormat: Format.T20,
    icon: '🏏'
  };

  const isMonth12 = viewMonth === MAJOR_TOURNAMENT_MONTH;

  // Aggregate all events & series
  const allEvents: ScheduledEvent[] = useMemo(() => {
    const defaultEvts = generateDefaultScheduledEvents(currentDate.year);
    const customEvts = gameData.scheduledEvents || [];
    const seriesList = gameData.seriesList || [];

    const seriesAsEvents: ScheduledEvent[] = seriesList.map(s => ({
      id: s.id,
      name: s.name,
      type: 'series',
      format: s.format,
      startDate: s.startDate,
      endDate: s.endDate,
      teamA: s.teamA,
      teamB: s.teamB,
      matchCount: s.numberOfMatches,
      restDays: s.restDays,
      description: `${s.numberOfMatches}-Match bilateral series.`
    }));

    return [...defaultEvts, ...customEvts.filter(e => !seriesList.some(s => s.id === e.id)), ...seriesAsEvents];
  }, [currentDate.year, gameData.scheduledEvents, gameData.seriesList]);

  // Aggregate all scheduled matches across all formats
  const allMatches: Match[] = useMemo(() => {
    const list: Match[] = [];
    Object.values(gameData.schedule || {}).forEach(formatMatches => {
      (formatMatches || []).forEach(m => {
        if (m.scheduledDate && m.scheduledDate.year === currentDate.year && m.scheduledDate.month === viewMonth) {
          list.push(m);
        }
      });
    });
    return list;
  }, [gameData.schedule, currentDate.year, viewMonth]);

  // Calculate day-by-day mapping for 1..30 of viewMonth
  const dayOccupancy = useMemo(() => {
    const map: Record<number, {
      events: ScheduledEvent[];
      matches: Match[];
      series: Series[];
      isOccupied: boolean;
      isToday: boolean;
      isMonth12Lock: boolean;
    }> = {};

    for (let d = 1; d <= DAYS_IN_MONTH; d++) {
      const thisDate: GameDate = { year: currentDate.year, month: viewMonth, day: d };
      const isToday = isSameDate(thisDate, currentDate);
      const isMonth12Lock = viewMonth === MAJOR_TOURNAMENT_MONTH;

      // Find events overlapping this date
      const eventsOnDay = allEvents.filter(e => isDateInRange(thisDate, e.startDate, e.endDate));
      
      // Find matches on this date
      const matchesOnDay = allMatches.filter(m => m.scheduledDate && m.scheduledDate.day === d);

      // Find series on this date
      const seriesOnDay = (gameData.seriesList || []).filter(s => isDateInRange(thisDate, s.startDate, s.endDate));

      map[d] = {
        events: eventsOnDay,
        matches: matchesOnDay,
        series: seriesOnDay,
        isOccupied: eventsOnDay.length > 0 || matchesOnDay.length > 0 || seriesOnDay.length > 0 || isMonth12Lock,
        isToday,
        isMonth12Lock
      };
    }

    return map;
  }, [currentDate, viewMonth, allEvents, allMatches, gameData.seriesList]);

  const handlePrevMonth = () => {
    playSFX('click');
    setViewMonth(prev => (prev > 1 ? prev - 1 : 12));
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    playSFX('click');
    setViewMonth(prev => (prev < 12 ? prev + 1 : 1));
    setSelectedDay(null);
  };

  const handleDayClick = (day: number) => {
    playSFX('click');
    setSelectedDay(day);
    const dayData = dayOccupancy[day];
    if (dayData && dayData.isOccupied) {
      setSelectedEventModal({
        day,
        event: dayData.events[0],
        series: dayData.series[0],
        matches: dayData.matches
      });
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto pb-24 text-slate-100">
      {/* Top Banner / Calendar Clock Header */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950/80 to-slate-900 border border-teal-500/30 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 text-2xl shadow-inner">
            📅
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full">
                In-Game Internal Clock
              </span>
              <span className="text-xs font-mono font-bold text-amber-400">
                Year {currentDate.year} • 360-Day Cycle
              </span>
            </div>
            <h2 className="text-xl font-black text-white mt-0.5">
              Today: <span className="text-teal-400">{formatGameDate(currentDate)}</span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onTakeMeToMyMatch && (
            <button
              onClick={() => {
                playSFX('click');
                onTakeMeToMyMatch();
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-cyan-600 via-teal-600 to-cyan-600 hover:from-cyan-500 hover:to-teal-500 text-white font-black rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all text-xs uppercase tracking-wider border border-cyan-400/30"
              title="Simulate directly to your next fixture and view summary results"
            >
              <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
              <span>Take Me to My Match</span>
            </button>
          )}
          <button
            onClick={onOpenSeriesManager}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all text-xs uppercase tracking-wider"
          >
            <Swords className="w-4 h-4" />
            <span>Manage Bilateral Series</span>
          </button>
        </div>
      </div>

      {/* Month Navigator Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1 text-xs font-bold"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Prev Month</span>
          </button>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg">{monthTheme.icon}</span>
              <h3 className="text-xl font-black text-white tracking-wide">
                {MONTH_NAMES[viewMonth - 1]} (Month {viewMonth} of 12)
              </h3>
              {isMonth12 && (
                <span className="flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  <Lock className="w-3 h-3" /> Locked
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              {monthTheme.title} — {monthTheme.subtitle}
            </p>
          </div>

          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1 text-xs font-bold"
          >
            <span className="hidden sm:inline">Next Month</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* 12-Month Quick Selector Bar */}
        <div className="grid grid-cols-6 sm:grid-cols-12 gap-1 pt-2 border-t border-slate-800/80">
          {MONTH_SHORT_NAMES.map((name, idx) => {
            const mNum = idx + 1;
            const isCurrent = currentDate.month === mNum;
            const isSelected = viewMonth === mNum;
            const isM12 = mNum === 12;

            return (
              <button
                key={name}
                onClick={() => {
                  playSFX('click');
                  setViewMonth(mNum);
                  setSelectedDay(null);
                }}
                className={`py-1.5 px-1 rounded-lg text-center transition-all text-xs font-bold flex flex-col items-center justify-center ${
                  isSelected
                    ? 'bg-teal-500 text-slate-950 shadow-md font-black ring-2 ring-teal-400'
                    : isCurrent
                    ? 'bg-teal-950/60 border border-teal-500/50 text-teal-300'
                    : 'bg-slate-800/60 hover:bg-slate-700/80 text-slate-400'
                }`}
              >
                <span>{name}</span>
                <span className="text-[9px] opacity-80">{isM12 ? '🔒' : `M${mNum}`}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Month 12 Locked Alert if viewing month 12 */}
      {isMonth12 && (
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3.5 flex items-center gap-3 text-amber-200 text-xs">
          <Lock className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div>
            <p className="font-extrabold text-white">Month 12 is Locked for the Year-End Major Tournament</p>
            <p className="text-amber-300/80 mt-0.5">
              Manual series scheduling is restricted during Month 12. This window is reserved exclusively for the pinnacle global championship cycle.
            </p>
          </div>
        </div>
      )}

      {/* 30-Day Calendar Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
          <span className="font-bold text-slate-400 uppercase tracking-wider">
            Month {viewMonth} Schedule Grid (30 Days)
          </span>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1 text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Free Day
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block" /> Occupied / Series
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Major Tournament
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-6 gap-2">
          {Array.from({ length: DAYS_IN_MONTH }, (_, i) => i + 1).map(day => {
            const data = dayOccupancy[day];
            const isToday = data?.isToday;
            const isOccupied = data?.isOccupied;
            const isSelected = selectedDay === day;
            const hasMatches = (data?.matches?.length || 0) > 0;
            const hasSeries = (data?.series?.length || 0) > 0;

            return (
              <div
                key={day}
                onClick={() => handleDayClick(day)}
                className={`relative min-h-[90px] p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group ${
                  isSelected
                    ? 'ring-2 ring-teal-400 border-teal-400 bg-slate-800/90'
                    : isToday
                    ? 'border-teal-500/80 bg-teal-950/30'
                    : isOccupied
                    ? isMonth12
                      ? 'border-amber-500/30 bg-amber-950/20 hover:bg-amber-950/40'
                      : 'border-slate-700/80 bg-slate-800/50 hover:bg-slate-800'
                    : 'border-slate-800 bg-slate-900/40 hover:bg-slate-800/60 hover:border-slate-700'
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-black ${isToday ? 'text-teal-400' : 'text-slate-200'}`}>
                    Day {day}
                  </span>
                  {isToday && (
                    <span className="text-[9px] font-extrabold bg-teal-500 text-slate-950 px-1.5 py-0.2 rounded-full uppercase">
                      Today
                    </span>
                  )}
                  {isMonth12 && (
                    <Lock className="w-3 h-3 text-amber-400" />
                  )}
                </div>

                {/* Day Content Badges */}
                <div className="space-y-1 my-1 flex-1">
                  {isMonth12 ? (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded p-1 text-[9px] font-bold text-amber-300 truncate">
                      🏆 Major Tourn.
                    </div>
                  ) : hasSeries ? (
                    <div className="bg-teal-500/10 border border-teal-500/30 rounded p-1 text-[9px] font-bold text-teal-300 truncate">
                      ⚔️ {data.series[0]?.name || 'Series Tour'}
                    </div>
                  ) : hasMatches ? (
                    <div className="bg-cyan-500/10 border border-cyan-500/30 rounded p-1 text-[9px] font-bold text-cyan-300 truncate">
                      🏏 {data.matches[0]?.teamA} vs {data.matches[0]?.teamB}
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-500 font-medium italic pt-2">
                      Free Window
                    </div>
                  )}
                </div>

                {/* Footer status */}
                <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-800/60">
                  <span>{isOccupied ? 'Occupied' : 'Open'}</span>
                  {!isOccupied && !isMonth12 && (
                    <span className="text-teal-400 opacity-0 group-hover:opacity-100 font-bold">
                      + Tour
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day / Event Details Modal */}
      {selectedEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-teal-500/30 rounded-2xl shadow-2xl p-5 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-teal-400" />
                <h4 className="font-extrabold text-base text-white">
                  {MONTH_NAMES[viewMonth - 1]} Day {selectedEventModal.day}, Year {currentDate.year}
                </h4>
              </div>
              <button
                onClick={() => setSelectedEventModal(null)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {isMonth12 ? (
                <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 font-bold">
                    <Lock className="w-4 h-4" />
                    <span>Month 12 Major Tournament Window</span>
                  </div>
                  <p className="text-slate-300">
                    This day is part of the locked Month 12 cycle for the ICC / Global Major Tournament. All international teams participate in this season-ending championship.
                  </p>
                </div>
              ) : selectedEventModal.series ? (
                <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm text-teal-400">{selectedEventModal.series.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-teal-500/20 text-teal-300 rounded">
                      {selectedEventModal.series.format}
                    </span>
                  </div>
                  <p className="text-slate-300 font-medium">
                    {selectedEventModal.series.teamA} vs {selectedEventModal.series.teamB}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span>Duration: {formatShortDate(selectedEventModal.series.startDate)} – {formatShortDate(selectedEventModal.series.endDate)}</span>
                    <span>Matches: {selectedEventModal.series.numberOfMatches}</span>
                  </div>
                </div>
              ) : selectedEventModal.matches && selectedEventModal.matches.length > 0 ? (
                <div className="space-y-2">
                  {selectedEventModal.matches.map((m, idx) => (
                    <div key={idx} className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm text-white">{m.teamA} vs {m.teamB}</p>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">{m.group || 'League Match'} • {m.date}</p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30">
                        Match Day
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4 text-center space-y-2">
                  <p className="text-slate-300 font-bold">This day is completely free.</p>
                  <p className="text-slate-400 text-[11px]">
                    You can schedule a bilateral tour or series starting from this date.
                  </p>
                  {onOpenAddSeriesAtDate && (
                    <button
                      onClick={() => {
                        const targetDate: GameDate = { year: currentDate.year, month: viewMonth, day: selectedEventModal.day };
                        setSelectedEventModal(null);
                        onOpenAddSeriesAtDate(targetDate);
                      }}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-2 bg-teal-500 text-slate-950 font-black rounded-lg text-xs hover:bg-teal-400 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Schedule Series on this Date</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedEventModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

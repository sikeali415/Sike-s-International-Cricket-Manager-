import React, { useState, useMemo } from 'react';
import { GameData, Format, UniversalFilterState } from '../types';
import { Icons } from './Icons';
import { Trophy, Crown, Users, TrendingUp, BarChart3, Award, Sparkles, ShieldCheck, Swords, Flame, Target, Building2, Star } from 'lucide-react';
import HallOfFameDisplay from './HallOfFameDisplay';
import TeamOfTheSeasonSelector from './TeamOfTheSeasonSelector';
import SkillProgressionView from './SkillProgressionView';
import { UniversalFilterBar } from './UniversalFilterBar';
import { 
    calculateAllTimeRecords, 
    calculateTeamHeadToHead, 
    calculateTeamRecords, 
    calculateBestPlayersAgainstTeam 
} from '../utils/advancedStatsUtils';
import { generateAutoTeamOfTheTournament } from '../utils/awardUtils';

interface AwardsRecordsScreenProps {
    gameData: GameData;
    setGameData?: React.Dispatch<React.SetStateAction<GameData | null>>;
    initialTab?: 'HALL_OF_FAME' | 'TEAM_OF_SEASON' | 'SKILL_PROGRESSION' | 'AWARDS' | 'RECORDS' | 'HEAD_TO_HEAD' | 'TEAM_RECORDS';
}

export const AwardsAndRecordsScreen: React.FC<AwardsRecordsScreenProps> = ({ 
    gameData,
    setGameData,
    initialTab = 'HALL_OF_FAME'
}) => {
    const [activeTab, setActiveTab] = useState<'HALL_OF_FAME' | 'TEAM_OF_SEASON' | 'SKILL_PROGRESSION' | 'AWARDS' | 'RECORDS' | 'HEAD_TO_HEAD' | 'TEAM_RECORDS'>(initialTab);

    React.useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);
    const [selectedSeason, setSelectedSeason] = useState<number>(gameData.currentSeason);
    const [filterState, setFilterState] = useState<UniversalFilterState>({
        format: 'ALL',
        season: 'ALL',
        teamId: 'ALL',
        opponentTeamId: 'ALL',
        tournament: 'ALL',
        role: 'ALL'
    });

    const [selectedTeamAId, setSelectedTeamAId] = useState<string>(gameData.teams[0]?.id || '');
    const [selectedTeamBId, setSelectedTeamBId] = useState<string>(gameData.teams[1]?.id || '');

    const awardsHistory = gameData.awardsHistory || [];
    const promotionHistory = gameData.promotionHistory || [];
    const records = gameData.records;

    // Advanced calculated records
    const allTimeRecords = useMemo(() => {
        return calculateAllTimeRecords(gameData, filterState);
    }, [gameData, filterState]);

    const headToHeadData = useMemo(() => {
        if (!selectedTeamAId || !selectedTeamBId || selectedTeamAId === selectedTeamBId) return null;
        return calculateTeamHeadToHead(selectedTeamAId, selectedTeamBId, gameData, filterState);
    }, [selectedTeamAId, selectedTeamBId, gameData, filterState]);

    const teamSpecificRecords = useMemo(() => {
        return calculateTeamRecords(selectedTeamAId || gameData.teams[0]?.id || '', gameData, filterState);
    }, [selectedTeamAId, gameData, filterState]);

    const bestPerformersAgainstSelectedTeam = useMemo(() => {
        return calculateBestPlayersAgainstTeam(selectedTeamAId || gameData.teams[0]?.id || '', gameData, filterState);
    }, [selectedTeamAId, gameData, filterState]);
    
    const sortedBvb = useMemo(() => records?.batterVsBowler ? [...records.batterVsBowler].sort((a,b) => b.dismissals - a.dismissals || b.runs - a.runs) : [], [records]);
    const sortedTvt = useMemo(() => records?.teamVsTeam ? [...records.teamVsTeam].sort((a,b) => b.matches - a.matches) : [], [records]);
    const sortedPvt = useMemo(() => records?.playerVsTeam ? [...records.playerVsTeam].sort((a,b) => (b.runs + b.wickets * 20) - (a.runs + a.wickets * 20)) : [], [records]);

    const groupedBySeason = useMemo(() => {
        return awardsHistory.reduce((acc: any, award) => {
            (acc[award.season] = acc[award.season] || []).push(award);
            return acc;
        }, {});
    }, [awardsHistory]);

    const handleSaveUserTeam = (userXI: any) => {
        if (!setGameData) return;
        setGameData(prev => {
            if (!prev) return prev;
            const currentHistory = prev.teamOfTheSeasonHistory || {};
            const existingSeasonEntry = currentHistory[selectedSeason] || {
                season: selectedSeason,
                format: prev.currentFormat || Format.T20,
                autoTeamOfTheTournament: generateAutoTeamOfTheTournament(prev, selectedSeason, prev.currentFormat || Format.T20)
            };
            return {
                ...prev,
                teamOfTheSeasonHistory: {
                    ...currentHistory,
                    [selectedSeason]: {
                        ...existingSeasonEntry,
                        userTeamOfTheSeason: userXI
                    }
                }
            };
        });
    };

    return (
        <div className="p-4 md:p-6 bg-slate-950 text-slate-100 min-h-screen space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-amber-950 p-6 rounded-3xl border border-teal-500/30 shadow-2xl space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-black uppercase text-amber-400 tracking-widest">
                            <Crown size={16} />
                            <span>Legacy &amp; Accolades • Career Archive</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mt-1">
                            🏆 Hall of Fame, Awards &amp; Historical Records
                        </h1>
                        <p className="text-xs text-slate-300">
                            Hall of Fame inductees, Team of the Tournament, skill evolutions, season trophies, and career records.
                        </p>
                    </div>

                    {/* Season Switcher if multiple seasons exist */}
                    {gameData.currentSeason > 1 && (
                        <div className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 self-start md:self-auto">
                            <span className="text-[10px] text-slate-400 font-bold px-2 uppercase">Season:</span>
                            {Array.from({ length: gameData.currentSeason }, (_, i) => i + 1).map(s => (
                                <button
                                    key={s}
                                    onClick={() => setSelectedSeason(s)}
                                    className={`px-3 py-1 rounded-xl text-xs font-black transition-all ${
                                        selectedSeason === s
                                            ? 'bg-teal-500 text-slate-950 shadow-md'
                                            : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    S{s}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sub-Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-2 border-t border-slate-800">
                    {[
                        { id: 'HALL_OF_FAME', label: 'Hall of Fame', icon: Crown },
                        { id: 'TEAM_OF_SEASON', label: 'Teams of Tournament', icon: Users },
                        { id: 'SKILL_PROGRESSION', label: 'Skill Upgrades', icon: TrendingUp },
                        { id: 'AWARDS', label: 'Season Awards', icon: Trophy },
                        { id: 'RECORDS', label: 'All-Time Records', icon: BarChart3 },
                        { id: 'HEAD_TO_HEAD', label: 'Franchise Rivalries', icon: Swords },
                        { id: 'TEAM_RECORDS', label: 'Team Archive', icon: Building2 },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                                activeTab === tab.id
                                    ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/20'
                                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                            }`}
                        >
                            <tab.icon size={14} />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* TAB 1: Hall of Fame */}
            {activeTab === 'HALL_OF_FAME' && (
                <HallOfFameDisplay gameData={gameData} currentSeasonOverride={selectedSeason} />
            )}

            {/* TAB 2: Team of the Season Selector & Auto XI */}
            {activeTab === 'TEAM_OF_SEASON' && (
                <TeamOfTheSeasonSelector 
                    gameData={gameData}
                    season={selectedSeason}
                    format={Format.T20}
                    savedUserTeam={gameData.teamOfTheSeasonHistory?.[selectedSeason]?.userTeamOfTheSeason}
                    onSaveUserTeam={handleSaveUserTeam}
                />
            )}

            {/* TAB 3: Skill Progression View */}
            {activeTab === 'SKILL_PROGRESSION' && (
                <SkillProgressionView 
                    gameData={gameData} 
                    summary={gameData.skillProgressionHistory?.[selectedSeason]} 
                />
            )}

            {/* TAB 4: Season Awards & Titles */}
            {activeTab === 'AWARDS' && (
                <div className="space-y-6">
                    {promotionHistory.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-base font-black uppercase tracking-wider text-teal-400 flex items-center gap-2">
                                <TrendingUp size={18} />
                                <span>Promotions &amp; Relegations History</span>
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {promotionHistory.map((ph, idx) => (
                                    <div key={idx} className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-2">
                                        <div className="text-xs font-mono font-bold text-slate-400">Season {ph.season}</div>
                                        <div className="text-xs space-y-1">
                                            <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                                                <span>▲ Promoted:</span>
                                                <span className="text-white">{ph.promotedTeamName}</span>
                                            </div>
                                            <div className="text-rose-400 font-bold flex items-center gap-1.5">
                                                <span>▼ Relegated:</span>
                                                <span className="text-white">{ph.relegatedTeamName}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <h3 className="text-base font-black uppercase tracking-wider text-teal-400 flex items-center gap-2">
                            <Trophy size={18} />
                            <span>Season Trophies &amp; Accolades</span>
                        </h3>
                        {Object.keys(groupedBySeason).length === 0 ? (
                            <div className="text-center py-12 text-slate-500 text-xs">
                                Complete your first tournament season to archive championship trophies and individual awards!
                            </div>
                        ) : (
                            Object.entries(groupedBySeason).reverse().map(([s, awards]: [string, any]) => (
                                <div key={s} className="bg-slate-900/80 border border-slate-800 p-5 rounded-3xl space-y-3">
                                    <h4 className="text-sm font-black uppercase text-amber-400 flex items-center gap-2">
                                        <Crown size={15} /> Season {s} Accolades
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {awards.map((award: any, i: number) => (
                                            <div key={i} className="bg-slate-950/80 border border-slate-800/80 p-4 rounded-2xl space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-black text-teal-400 uppercase">{award.format}</span>
                                                    <span className="text-xs font-mono font-bold text-amber-400">🏆 {award.winnerTeamName}</span>
                                                </div>
                                                <div className="text-[11px] text-slate-300 space-y-0.5 pt-1 border-t border-slate-800">
                                                    <div>Best Batter: <span className="font-bold text-white">{award.bestBatter?.playerName || 'N/A'}</span> ({award.bestBatter?.runs ?? 0} runs)</div>
                                                    <div>Best Bowler: <span className="font-bold text-white">{award.bestBowler?.playerName || 'N/A'}</span> ({award.bestBowler?.wickets ?? 0} wkts)</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* TAB 5: All-Time Career Records */}
            {activeTab === 'RECORDS' && (
                <div className="space-y-6">
                    <UniversalFilterBar
                        filterState={filterState}
                        onChange={setFilterState}
                        teams={gameData?.teams || []}
                        availableSeasons={Array.from({ length: gameData?.currentSeason || 1 }, (_, i) => i + 1)}
                    />

                    {/* All-Time Leaderboards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Highest Individual Score */}
                        <div className="bg-slate-900/90 border border-teal-500/30 p-4 rounded-2xl shadow-lg">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5 mb-2">
                                <Flame className="w-4 h-4 text-amber-400" />
                                Highest Individual Inning
                            </div>
                            <div className="text-2xl font-black text-white">
                                {allTimeRecords.batting.highestScore[0]?.score ? `${allTimeRecords.batting.highestScore[0].score}*` : 'None'}
                            </div>
                            <div className="text-xs font-bold text-slate-300 mt-1">
                                {allTimeRecords.batting.highestScore[0]?.playerName || 'No record'}
                            </div>
                            <div className="text-[10px] text-slate-400">
                                {allTimeRecords.batting.highestScore[0]?.teamName} vs {allTimeRecords.batting.highestScore[0]?.vsTeam || 'Opponent'}
                            </div>
                        </div>

                        {/* Best Bowling in Match */}
                        <div className="bg-slate-900/90 border border-rose-500/30 p-4 rounded-2xl shadow-lg">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5 mb-2">
                                <Target className="w-4 h-4 text-rose-400" />
                                Best Bowling Figures
                            </div>
                            <div className="text-2xl font-black text-white font-mono">
                                {allTimeRecords.bowling.bestBowlingFigures[0]?.figures || 'None'}
                            </div>
                            <div className="text-xs font-bold text-slate-300 mt-1">
                                {allTimeRecords.bowling.bestBowlingFigures[0]?.playerName || 'No record'}
                            </div>
                            <div className="text-[10px] text-slate-400">
                                {allTimeRecords.bowling.bestBowlingFigures[0]?.teamName} vs {allTimeRecords.bowling.bestBowlingFigures[0]?.vsTeam || 'Opponent'}
                            </div>
                        </div>

                        {/* Most Titles */}
                        <div className="bg-slate-900/90 border border-emerald-500/30 p-4 rounded-2xl shadow-lg">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-2">
                                <Building2 className="w-4 h-4 text-emerald-400" />
                                Most Franchise Wins
                            </div>
                            <div className="text-2xl font-black text-white">
                                {allTimeRecords.team.mostWins[0]?.wins ? `${allTimeRecords.team.mostWins[0].wins} Wins` : '0 Wins'}
                            </div>
                            <div className="text-xs font-bold text-slate-300 mt-1">
                                {allTimeRecords.team.mostWins[0]?.teamName || 'No record'}
                            </div>
                            <div className="text-[10px] text-slate-400">
                                {allTimeRecords.team.mostTitles[0]?.titles || 0} Titles won
                            </div>
                        </div>

                        {/* Most Wins As Captain */}
                        <div className="bg-slate-900/90 border border-indigo-500/30 p-4 rounded-2xl shadow-lg">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5 mb-2">
                                <Trophy className="w-4 h-4 text-indigo-400" />
                                Most Successful Captain
                            </div>
                            <div className="text-2xl font-black text-white">
                                {allTimeRecords.captaincy.mostWinsAsCaptain[0]?.wins ? `${allTimeRecords.captaincy.mostWinsAsCaptain[0].wins} Wins` : '0 Wins'}
                            </div>
                            <div className="text-xs font-bold text-slate-300 mt-1">
                                {allTimeRecords.captaincy.mostWinsAsCaptain[0]?.playerName || 'No record'}
                            </div>
                            <div className="text-[10px] text-slate-400">
                                {allTimeRecords.captaincy.mostWinsAsCaptain[0]?.teamName || 'Captain'}
                            </div>
                        </div>
                    </div>

                    {/* All-Time Batting & Bowling Top Scorers */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Most Career / Season Runs */}
                        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-3xl space-y-3">
                            <h4 className="font-black text-xs uppercase tracking-wider text-teal-400 flex items-center justify-between">
                                <span className="flex items-center gap-2"><BarChart3 size={14} /> Top Run Scorers</span>
                                <span className="text-[10px] text-slate-400">All-Time</span>
                            </h4>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                                            <th className="text-left py-2">Player</th>
                                            <th className="text-right text-teal-400 py-2">Runs</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60">
                                        {allTimeRecords.batting.mostCareerRuns.slice(0, 10).map((r, idx) => (
                                            <tr key={r.playerId} className="hover:bg-slate-800/30">
                                                <td className="py-2 font-bold text-white flex items-center gap-2">
                                                    <span className="font-mono text-[10px] text-slate-500">#{idx + 1}</span>
                                                    <div>
                                                        <div>{r.playerName}</div>
                                                        <div className="text-[9px] text-slate-400 font-normal">{r.teamName}</div>
                                                    </div>
                                                </td>
                                                <td className="text-right font-mono font-black text-teal-400 py-2">{r.runs}</td>
                                            </tr>
                                        ))}
                                        {allTimeRecords.batting.mostCareerRuns.length === 0 && (
                                            <tr>
                                                <td colSpan={2} className="py-4 text-center text-slate-500 italic">No records available.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Most Career / Season Wickets */}
                        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-3xl space-y-3">
                            <h4 className="font-black text-xs uppercase tracking-wider text-rose-400 flex items-center justify-between">
                                <span className="flex items-center gap-2"><Target size={14} /> Top Wicket Takers</span>
                                <span className="text-[10px] text-slate-400">All-Time</span>
                            </h4>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                                            <th className="text-left py-2">Player</th>
                                            <th className="text-right text-rose-400 py-2">Wickets</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60">
                                        {allTimeRecords.bowling.mostCareerWickets.slice(0, 10).map((r, idx) => (
                                            <tr key={r.playerId} className="hover:bg-slate-800/30">
                                                <td className="py-2 font-bold text-white flex items-center gap-2">
                                                    <span className="font-mono text-[10px] text-slate-500">#{idx + 1}</span>
                                                    <div>
                                                        <div>{r.playerName}</div>
                                                        <div className="text-[9px] text-slate-400 font-normal">{r.teamName}</div>
                                                    </div>
                                                </td>
                                                <td className="text-right font-mono font-black text-rose-400 py-2">{r.wickets}</td>
                                            </tr>
                                        ))}
                                        {allTimeRecords.bowling.mostCareerWickets.length === 0 && (
                                            <tr>
                                                <td colSpan={2} className="py-4 text-center text-slate-500 italic">No records available.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 6: FRANCHISE RIVALRIES & HEAD TO HEAD */}
            {activeTab === 'HEAD_TO_HEAD' && (
                <div className="space-y-6">
                    <div className="bg-slate-900/90 border border-cyan-500/40 p-5 rounded-3xl shadow-xl space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
                            <div>
                                <h3 className="text-xl font-black text-white flex items-center gap-2">
                                    <Swords className="w-5 h-5 text-cyan-400" />
                                    Franchise Head-to-Head Matrix
                                </h3>
                                <p className="text-xs text-slate-400">Select two franchises to compare all-time rivalry stats, match history, and key milestones</p>
                            </div>

                            {/* Dual Team Pickers */}
                            <div className="flex items-center gap-2">
                                <select
                                    value={selectedTeamAId}
                                    onChange={(e) => setSelectedTeamAId(e.target.value)}
                                    className="bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 font-bold focus:outline-none focus:border-cyan-400"
                                >
                                    {gameData.teams.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                                <span className="text-xs font-black text-slate-500">VS</span>
                                <select
                                    value={selectedTeamBId}
                                    onChange={(e) => setSelectedTeamBId(e.target.value)}
                                    className="bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 font-bold focus:outline-none focus:border-cyan-400"
                                >
                                    {gameData.teams.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {headToHeadData ? (
                            <div className="space-y-4">
                                {/* Rivalry Summary Scoreboard */}
                                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                                    <div className="text-center md:text-left">
                                        <div className="text-lg font-black text-white">{headToHeadData.teamA.name}</div>
                                        <div className="text-3xl font-black text-teal-400 mt-1">{headToHeadData.winsA} Wins</div>
                                        <div className="text-[10px] text-slate-400">Win Rate: {headToHeadData.winPctA}%</div>
                                    </div>

                                    <div className="text-center bg-slate-900/80 px-6 py-3 rounded-2xl border border-slate-800">
                                        <div className="text-xs text-slate-400 uppercase font-bold">Total Matches</div>
                                        <div className="text-2xl font-black text-white">{headToHeadData.totalMatches}</div>
                                        <div className="text-[10px] text-slate-500">Tied/NR: {headToHeadData.ties + headToHeadData.noResults}</div>
                                    </div>

                                    <div className="text-center md:text-right">
                                        <div className="text-lg font-black text-white">{headToHeadData.teamB.name}</div>
                                        <div className="text-3xl font-black text-rose-400 mt-1">{headToHeadData.winsB} Wins</div>
                                        <div className="text-[10px] text-slate-400">Win Rate: {headToHeadData.winPctB}%</div>
                                    </div>
                                </div>

                                {/* Extremes & Highest/Lowest totals */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                                        <div className="text-teal-400 font-bold uppercase text-[10px] flex items-center gap-1">
                                            <Building2 className="w-3.5 h-3.5" /> Highest Totals in Rivalry
                                        </div>
                                        <div className="flex justify-between text-slate-300">
                                            <span>{headToHeadData.teamA.name} High:</span>
                                            <span className="font-bold text-white">{headToHeadData.battingRecordsA.highestScore.score ? `${headToHeadData.battingRecordsA.highestScore.score}/${headToHeadData.battingRecordsA.highestScore.wickets}` : 'None'}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-300">
                                            <span>{headToHeadData.teamB.name} High:</span>
                                            <span className="font-bold text-white">{headToHeadData.battingRecordsB.highestScore.score ? `${headToHeadData.battingRecordsB.highestScore.score}/${headToHeadData.battingRecordsB.highestScore.wickets}` : 'None'}</span>
                                        </div>
                                    </div>

                                    <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                                        <div className="text-amber-400 font-bold uppercase text-[10px] flex items-center gap-1">
                                            <Trophy className="w-3.5 h-3.5" /> Margin Extremes
                                        </div>
                                        <div className="flex justify-between text-slate-300">
                                            <span>Biggest Win By Runs:</span>
                                            <span className="font-bold text-white">{headToHeadData.extremes.biggestWinByRuns.summary || 'None'}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-300">
                                            <span>Closest Win:</span>
                                            <span className="font-bold text-white">{headToHeadData.extremes.closestWin.summary || 'None'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-500 italic">
                                Please select two distinct teams to display their head-to-head records.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 7: TEAM ARCHIVE & BEST PERFORMERS AGAINST TEAM */}
            {activeTab === 'TEAM_RECORDS' && (
                <div className="space-y-6">
                    <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-xl space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
                            <div>
                                <h3 className="text-xl font-black text-white flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-amber-400" />
                                    Franchise Team Archive
                                </h3>
                                <p className="text-xs text-slate-400">View team milestones, totals, and players who historically dominated against this team</p>
                            </div>

                            <div className="w-full sm:w-64">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Select Franchise:</label>
                                <select
                                    value={selectedTeamAId}
                                    onChange={(e) => setSelectedTeamAId(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 font-bold focus:outline-none focus:border-amber-400"
                                >
                                    {gameData.teams.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Team Records Summary */}
                        {teamSpecificRecords && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 text-center">
                                    <div className="text-[10px] uppercase font-bold text-slate-400">Longest Win Streak</div>
                                    <div className="text-2xl font-black text-emerald-400 mt-1">{teamSpecificRecords.match.longestWinningStreak} Matches</div>
                                    <div className="text-xs text-slate-400 font-bold mt-0.5">Franchise Streak</div>
                                </div>
                                <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 text-center">
                                    <div className="text-[10px] uppercase font-bold text-slate-400">Highest Team Total</div>
                                    <div className="text-2xl font-black text-teal-400 mt-1">
                                        {teamSpecificRecords.batting.highestScore.score ? `${teamSpecificRecords.batting.highestScore.score}/${teamSpecificRecords.batting.highestScore.wickets}` : 'None'}
                                    </div>
                                    <div className="text-xs text-slate-400 mt-0.5">vs {teamSpecificRecords.batting.highestScore.vsTeam}</div>
                                </div>
                                <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 text-center">
                                    <div className="text-[10px] uppercase font-bold text-slate-400">Highest Successful Chase</div>
                                    <div className="text-2xl font-black text-amber-400 mt-1">
                                        {teamSpecificRecords.batting.highestSuccessfulChase.target ? `Target ${teamSpecificRecords.batting.highestSuccessfulChase.target}` : 'None'}
                                    </div>
                                    <div className="text-xs text-slate-400 mt-0.5">vs {teamSpecificRecords.batting.highestSuccessfulChase.vsTeam}</div>
                                </div>
                            </div>
                        )}

                        {/* Top Performers against this team */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            {/* Best Batters against this team */}
                            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                                    <Flame className="w-4 h-4 text-amber-400" />
                                    Top Batters Against {gameData.teams.find(t => t.id === selectedTeamAId)?.name || 'Team'}
                                </h4>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                                                <th className="text-left py-1.5">Player</th>
                                                <th className="text-center">Mat</th>
                                                <th className="text-center text-teal-400">Runs</th>
                                                <th className="text-center">Avg</th>
                                                <th className="text-center">HS</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/50">
                                            {bestPerformersAgainstSelectedTeam.batters.slice(0, 6).map((b, idx) => (
                                                <tr key={b.playerId} className="hover:bg-slate-800/30">
                                                    <td className="py-1.5 font-bold text-white">
                                                        {b.playerName} <span className="text-[9px] text-slate-400 font-normal">({b.teamName})</span>
                                                    </td>
                                                    <td className="text-center font-mono text-slate-400">{b.matches}</td>
                                                    <td className="text-center font-mono font-bold text-teal-400">{b.runs}</td>
                                                    <td className="text-center font-mono text-white">{b.average}</td>
                                                    <td className="text-center font-mono text-amber-400">{b.highestScore}</td>
                                                </tr>
                                            ))}
                                            {bestPerformersAgainstSelectedTeam.batters.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="py-4 text-center text-slate-500 italic">No matches recorded against this team.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Best Bowlers against this team */}
                            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                                    <Target className="w-4 h-4 text-rose-400" />
                                    Top Bowlers Against {gameData.teams.find(t => t.id === selectedTeamAId)?.name || 'Team'}
                                </h4>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                                                <th className="text-left py-1.5">Player</th>
                                                <th className="text-center">Mat</th>
                                                <th className="text-center text-rose-400">Wkts</th>
                                                <th className="text-center">Econ</th>
                                                <th className="text-center">Best</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/50">
                                            {bestPerformersAgainstSelectedTeam.bowlers.slice(0, 6).map((bw, idx) => (
                                                <tr key={bw.playerId} className="hover:bg-slate-800/30">
                                                    <td className="py-1.5 font-bold text-white">
                                                        {bw.playerName} <span className="text-[9px] text-slate-400 font-normal">({bw.teamName})</span>
                                                    </td>
                                                    <td className="text-center font-mono text-slate-400">{bw.matches}</td>
                                                    <td className="text-center font-mono font-bold text-rose-400">{bw.wickets}</td>
                                                    <td className="text-center font-mono text-white">{bw.economy}</td>
                                                    <td className="text-center font-mono text-indigo-300">{bw.bestBowling}</td>
                                                </tr>
                                            ))}
                                            {bestPerformersAgainstSelectedTeam.bowlers.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="py-4 text-center text-slate-500 italic">No matches recorded against this team.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AwardsAndRecordsScreen;

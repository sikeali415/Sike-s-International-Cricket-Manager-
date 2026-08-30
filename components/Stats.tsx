
import React, { useState, useMemo, useEffect } from 'react';
import { GameData, Format, Player, PlayerStats } from '../types';
import { aggregateStats } from '../utils';

interface StatsProps {
    gameData: GameData;
    viewPlayerProfile: (player: Player, format: Format) => void;
}

type StatCategory = 'International' | 'Domestic' | 'All';
type StatFormatOption = 'Overall' | 'All_International' | 'All_Domestic' | 'Test' | 'ODI' | 'T20i' | 'T20' | 'List A' | 'FC' | 'Sixty' | Format;

const Stats: React.FC<StatsProps> = ({ gameData, viewPlayerProfile }) => {
    const [statType, setStatType] = useState<'batting' | 'bowling' | 'rankings' | 'milestones' | 'phase'>('batting');
    const [rankingSubTab, setRankingSubTab] = useState<'batting' | 'bowling' | 'allrounder'>('batting');
    const [category, setCategory] = useState<StatCategory>('International');
    const [selectedFormatOption, setSelectedFormatOption] = useState<StatFormatOption>('All_International');
    const [sortConfig, setSortConfig] = useState({ key: 'runs', direction: 'descending' });

    useEffect(() => {
        if (category === 'International') {
            setSelectedFormatOption('All_International');
        } else if (category === 'Domestic') {
            setSelectedFormatOption('All_Domestic');
        } else {
            setSelectedFormatOption('Overall');
        }
    }, [category]);

    const allPlayersWithStats = useMemo(() => {
        return gameData.allPlayers.map(p => {
            const team = gameData.teams.find(t => t.squad.some(sp => sp.id === p.id));
            let stats: PlayerStats;

            if (selectedFormatOption === 'Overall') {
                stats = aggregateStats(p, ['T20', 'List A', 'FC', 'Test', 'ODI', 'T20i', ...Object.values(Format)]);
            } else if (selectedFormatOption === 'All_International') {
                stats = aggregateStats(p, ['Test', 'ODI', 'T20i', 'T20I', Format.SHIELD, Format.ODI, Format.T20, Format.WLT20]);
            } else if (selectedFormatOption === 'All_Domestic') {
                stats = aggregateStats(p, ['T20', 'List A', 'FC']);
            } else if (selectedFormatOption === 'Test') {
                stats = aggregateStats(p, ['Test', Format.SHIELD]);
            } else if (selectedFormatOption === 'ODI') {
                stats = aggregateStats(p, ['ODI', Format.ODI]);
            } else if (selectedFormatOption === 'T20i') {
                stats = aggregateStats(p, ['T20i', 'T20I', Format.T20, Format.WLT20]);
            } else if (selectedFormatOption === 'T20') {
                stats = p.domesticStats?.['T20'] || aggregateStats(p, ['T20']);
            } else if (selectedFormatOption === 'List A') {
                stats = p.domesticStats?.['List A'] || aggregateStats(p, ['List A']);
            } else if (selectedFormatOption === 'FC') {
                stats = p.domesticStats?.['FC'] || aggregateStats(p, ['FC']);
            } else {
                stats = aggregateStats(p, [selectedFormatOption]);
            }

            return { ...p, teamName: team?.name || 'Free Agent', displayStats: stats };
        }).filter(p => p.displayStats.matches > 0);
    }, [gameData, selectedFormatOption]);

    const requestSort = (key: string) => {
        let direction = 'descending';
        if (sortConfig.key === key && sortConfig.direction === 'descending') {
            direction = 'ascending';
        } else if (sortConfig.key !== key && ['average', 'bowlingAverage', 'economy'].includes(key)) {
            direction = 'ascending';
        }
        setSortConfig({ key, direction });
    };

    const handleStatTypeChange = (type: 'batting' | 'bowling' | 'rankings' | 'milestones' | 'phase') => {
        setStatType(type);
        if (type === 'batting' || type === 'phase') {
            setSortConfig({ key: 'runs', direction: 'descending' });
        } else if (type === 'bowling') {
            setSortConfig({ key: 'wickets', direction: 'descending' });
        }
    };
    
    const getSortIndicator = (key: string) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    };

    const sortedPlayers = useMemo(() => {
        if (statType === 'milestones') return [];

        let sortablePlayers = [...allPlayersWithStats];

        sortablePlayers.sort((a, b) => {
            if (sortConfig.key === 'name') {
                 if (a.name < b.name) return sortConfig.direction === 'ascending' ? -1 : 1;
                 if (a.name > b.name) return sortConfig.direction === 'ascending' ? 1 : -1;
                 return 0;
            }

            const aStat = a.displayStats;
            const bStat = b.displayStats;
            
            if (sortConfig.key === 'bestBowling') {
                if (aStat.bestBowling === '-') return 1;
                if (bStat.bestBowling === '-') return -1;
                const [aWickets, aRuns] = aStat.bestBowling.split('/').map(Number);
                const [bWickets, bRuns] = bStat.bestBowling.split('/').map(Number);

                if (aWickets !== bWickets) {
                    return sortConfig.direction === 'ascending' ? aWickets - bWickets : bWickets - aWickets;
                }
                return sortConfig.direction === 'ascending' ? bRuns - aRuns : aRuns - bRuns;
            }

            // @ts-ignore
            const valA = aStat[sortConfig.key];
            // @ts-ignore
            const valB = bStat[sortConfig.key];

            if (valA < valB) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (valA > valB) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });

        return sortablePlayers;
    }, [allPlayersWithStats, sortConfig, statType]);

    const sortedFastestFifties = useMemo(() => {
        return allPlayersWithStats
            .filter(p => p.displayStats.fastestFifty > 0)
            .sort((a,b) => a.displayStats.fastestFifty - b.displayStats.fastestFifty);
    }, [allPlayersWithStats]);

    const sortedFastestHundreds = useMemo(() => {
        return allPlayersWithStats
            .filter(p => p.displayStats.fastestHundred > 0)
            .sort((a,b) => a.displayStats.fastestHundred - b.displayStats.fastestHundred);
    }, [allPlayersWithStats]);

    const playerRankings = useMemo(() => {
        const allResults = Object.values(gameData.matchResults || {}).flat();
        const playerMotmCounts: Record<string, number> = {};
        const playerWonMatchContribs: Record<string, number> = {};

        allResults.forEach((r: any) => {
            if (r.manOfTheMatch?.playerId) {
                playerMotmCounts[r.manOfTheMatch.playerId] = (playerMotmCounts[r.manOfTheMatch.playerId] || 0) + 1;
            }
            const winnerTeamName = r.summary?.split(' won ')[0]?.trim();
            const winnerTeam = gameData.teams.find(t => t.name === winnerTeamName);
            if (winnerTeam) {
                winnerTeam.squad.forEach(p => {
                    playerWonMatchContribs[p.id] = (playerWonMatchContribs[p.id] || 0) + 1;
                });
            }
        });

        const rankedPlayers = gameData.allPlayers.map(p => {
            const team = gameData.teams.find(t => t.squad.some(sp => sp.id === p.id));
            let stats: PlayerStats;

            if (selectedFormatOption === 'Overall') {
                stats = aggregateStats(p, ['T20', 'List A', 'FC', 'Test', 'ODI', 'T20i', ...Object.values(Format)]);
            } else if (selectedFormatOption === 'All_International') {
                stats = aggregateStats(p, ['Test', 'ODI', 'T20i', 'T20I']);
            } else if (selectedFormatOption === 'All_Domestic') {
                stats = aggregateStats(p, ['T20', 'List A', 'FC', Format.T20, Format.ODI, Format.SHIELD]);
            } else if (p.internationalStats && p.internationalStats[selectedFormatOption]) {
                stats = p.internationalStats[selectedFormatOption];
            } else if (p.domesticStats && p.domesticStats[selectedFormatOption]) {
                stats = p.domesticStats[selectedFormatOption];
            } else if (p.stats && (p.stats as any)[selectedFormatOption]) {
                stats = (p.stats as any)[selectedFormatOption];
            } else {
                stats = aggregateStats(p, [selectedFormatOption]);
            }

            const motms = playerMotmCounts[p.id] || 0;
            const wins = playerWonMatchContribs[p.id] || 0;

            const batPts = stats.matches > 0 
                ? Math.round((stats.runs * 1.2) + (stats.average * 4.5) + (Math.max(0, (stats.strikeRate || 100) - 75) * 1.2) + (stats.fifties * 35) + (stats.hundreds * 80) + (motms * 90) + (wins * 20))
                : 0;

            let bestBwlBonus = 0;
            if (stats.bestBowling && stats.bestBowling.includes('/')) {
                const [w] = stats.bestBowling.split('/').map(Number);
                if (w >= 5) bestBwlBonus = 65;
                else if (w >= 3) bestBwlBonus = 30;
            }

            const bowlPts = stats.matches > 0 
                ? Math.round((stats.wickets * 34) + (Math.max(0, 10 - (stats.economy || 8)) * 22) + bestBwlBonus + (motms * 90) + (wins * 20))
                : 0;

            const arPts = (stats.runs > 15 || stats.wickets > 0) 
                ? Math.round((batPts * 0.55) + (bowlPts * 0.55) + (motms * 45))
                : 0;

            return {
                ...p,
                teamName: team?.name || 'Free Agent',
                displayStats: stats,
                motms,
                wins,
                batPts,
                bowlPts,
                arPts
            };
        });

        const batters = [...rankedPlayers].filter(p => p.displayStats.matches > 0).sort((a,b) => b.batPts - a.batPts);
        const bowlers = [...rankedPlayers].filter(p => p.displayStats.matches > 0).sort((a,b) => b.bowlPts - a.bowlPts);
        const allRounders = [...rankedPlayers].filter(p => p.displayStats.matches > 0 && (p.displayStats.runs > 20 || p.displayStats.wickets > 0)).sort((a,b) => b.arPts - a.arPts);

        return { batters, bowlers, allRounders };
    }, [gameData, selectedFormatOption]);

    const ThSortable = ({ label, sortKey }: { label: string, sortKey: string }) => (
        <th className="p-1 text-center cursor-pointer" onClick={() => requestSort(sortKey)}>
            {label}{getSortIndicator(sortKey)}
        </th>
    );

    return (
        <div className="p-2 h-[calc(100vh-90px)] flex flex-col">
            <h2 className="text-xl font-bold text-center mb-2">Player Stats & Records</h2>
            
            {/* Category Tabs: International vs Domestic vs Overall */}
             <div className="flex justify-center border-b border-gray-300 dark:border-gray-700 mb-2 overflow-x-auto gap-1">
                {[
                    { id: 'International', label: '🌍 International Stats' },
                    { id: 'Domestic', label: '🏏 Domestic Stats (Auto)' },
                    { id: 'All', label: '⭐ Grand Overall' }
                ].map(({ id, label }) => (
                    <button 
                        key={id} 
                        onClick={() => setCategory(id as StatCategory)} 
                        className={`px-4 py-2 text-xs font-bold whitespace-nowrap rounded-t-lg transition ${
                            category === id 
                                ? 'bg-teal-500 text-slate-950 shadow' 
                                : 'text-gray-400 hover:text-gray-200'
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>
            
             {/* Format/Aggregation Dropdown */}
            <div className="mb-2">
                <select
                    value={selectedFormatOption}
                    onChange={(e) => setSelectedFormatOption(e.target.value as StatFormatOption)}
                    className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-sm font-bold text-teal-400"
                >
                    {category === 'International' && (
                        <>
                            <option value="All_International">🌍 All International Formats (Combined)</option>
                            <option value="Test">Test Matches</option>
                            <option value="ODI">One Day Internationals (ODI)</option>
                            <option value="T20i">T20 Internationals (T20i)</option>
                        </>
                    )}
                    {category === 'Domestic' && (
                        <>
                            <option value="All_Domestic">🏏 All Domestic Formats (Combined)</option>
                            <option value="T20">Domestic T20</option>
                            <option value="List A">List A (50 Overs)</option>
                            <option value="FC">First Class (FC)</option>
                            <option value="Sixty">The Sixty (T10)</option>
                        </>
                    )}
                    {category === 'All' && (
                        <>
                            <option value="Overall">⭐ Grand Overall Career (All International + Domestic)</option>
                            <option value="All_International">🌍 All International</option>
                            <option value="All_Domestic">🏏 All Domestic</option>
                        </>
                    )}
                </select>
            </div>

            <div className="flex justify-center border-b border-gray-300 dark:border-gray-700 mb-2 overflow-x-auto">
                <button onClick={() => handleStatTypeChange('batting')} className={`px-4 py-2 font-semibold text-xs whitespace-nowrap ${statType === 'batting' ? 'border-b-2 border-teal-500 text-teal-500' : ''}`}>Batting</button>
                <button onClick={() => handleStatTypeChange('bowling')} className={`px-4 py-2 font-semibold text-xs whitespace-nowrap ${statType === 'bowling' ? 'border-b-2 border-teal-500 text-teal-500' : ''}`}>Bowling</button>
                <button onClick={() => handleStatTypeChange('rankings')} className={`px-4 py-2 font-semibold text-xs whitespace-nowrap ${statType === 'rankings' ? 'border-b-2 border-amber-500 text-amber-500 font-bold' : ''}`}>⭐ Impact Rankings</button>
                <button onClick={() => handleStatTypeChange('phase')} className={`px-4 py-2 font-semibold text-xs whitespace-nowrap ${statType === 'phase' ? 'border-b-2 border-teal-500 text-teal-500' : ''}`}>Phases</button>
                <button onClick={() => handleStatTypeChange('milestones')} className={`px-4 py-2 font-semibold text-xs whitespace-nowrap ${statType === 'milestones' ? 'border-b-2 border-teal-500 text-teal-500' : ''}`}>Milestones</button>
            </div>
            <div className="flex-grow overflow-y-auto">
                {statType === 'rankings' ? (
                    <div className="space-y-4 p-1">
                        <div className="flex justify-center gap-2 mb-2">
                            <button onClick={() => setRankingSubTab('batting')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${rankingSubTab === 'batting' ? 'bg-amber-500 text-white shadow' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>🏏 Batters</button>
                            <button onClick={() => setRankingSubTab('bowling')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${rankingSubTab === 'bowling' ? 'bg-amber-500 text-white shadow' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>🎯 Bowlers</button>
                            <button onClick={() => setRankingSubTab('allrounder')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${rankingSubTab === 'allrounder' ? 'bg-amber-500 text-white shadow' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>⚡ All-Rounders</button>
                        </div>

                        <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-2.5 text-[11px] text-amber-200/80 mb-2 text-center">
                            ⭐ <strong>Impact Rating System</strong>: Evaluates performance based on runs, wickets, strike rate, economy rate, plus heavy bonuses for <strong>Match Wins</strong> and <strong>Man of the Match (MOTM)</strong> performances!
                        </div>

                        <div className="space-y-2">
                            {(rankingSubTab === 'batting' ? playerRankings.batters : rankingSubTab === 'bowling' ? playerRankings.bowlers : playerRankings.allRounders).slice(0, 30).map((p, idx) => {
                                const pts = rankingSubTab === 'batting' ? p.batPts : rankingSubTab === 'bowling' ? p.bowlPts : p.arPts;
                                const rankBadge = idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${idx + 1}`;
                                return (
                                    <div key={p.id} onClick={() => viewPlayerProfile(p, gameData.currentFormat)} className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3 flex justify-between items-center cursor-pointer hover:border-amber-500/50 transition shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <span className={`font-mono font-extrabold text-xs px-2 py-1 rounded-md ${idx === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : idx === 1 ? 'bg-slate-400/20 text-slate-300 border border-slate-400/40' : idx === 2 ? 'bg-amber-800/20 text-amber-600 border border-amber-800/40' : 'bg-slate-700/20 text-slate-400'}`}>
                                                {rankBadge}
                                            </span>
                                            <div>
                                                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                                                    {p.name}
                                                </h4>
                                                <div className="text-[10px] text-slate-400 flex items-center gap-2">
                                                    <span>{p.teamName}</span>
                                                    <span>•</span>
                                                    <span>{p.role}</span>
                                                    {p.motms > 0 && <span className="text-amber-400 font-bold">🎖️ {p.motms} MOTM</span>}
                                                    {p.wins > 0 && <span className="text-emerald-400 font-bold">🏆 {p.wins} Wins</span>}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <div className="text-sm font-extrabold font-mono text-amber-400">{pts} <span className="text-[9px] text-slate-400 font-normal">pts</span></div>
                                            <div className="text-[10px] text-slate-400 font-mono">
                                                {rankingSubTab === 'batting' ? `${p.displayStats.runs} runs @ ${p.displayStats.average.toFixed(1)}` : rankingSubTab === 'bowling' ? `${p.displayStats.wickets} wkts @ ${p.displayStats.economy.toFixed(2)}` : `${p.displayStats.runs}r / ${p.displayStats.wickets}w`}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : statType === 'batting' || statType === 'bowling' ? (
                <div className="overflow-x-auto w-full">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="text-left sticky top-0 bg-gray-50 dark:bg-[#2C3531]">
                            <th className="p-1 cursor-pointer" onClick={() => requestSort('name')}>Player{getSortIndicator('name')}</th>
                            {statType === 'batting' ? <>
                                <ThSortable label="M" sortKey="matches" />
                                <ThSortable label="Runs" sortKey="runs" />
                                <ThSortable label="Avg" sortKey="average" />
                                <ThSortable label="SR" sortKey="strikeRate" />
                                <ThSortable label="HS" sortKey="highestScore" />
                            </> : <>
                                <ThSortable label="M" sortKey="matches" />
                                <ThSortable label="Wkts" sortKey="wickets" />
                                <ThSortable label="Avg" sortKey="bowlingAverage" />
                                <ThSortable label="Econ" sortKey="economy" />
                                <ThSortable label="Best" sortKey="bestBowling" />
                            </>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {sortedPlayers.slice(0, 50).map(p => (
                        <tr key={p.id} onClick={() => viewPlayerProfile(p, gameData.currentFormat)} className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
                            <td className="p-1 font-semibold whitespace-nowrap">
                                {p.name}
                                <br />
                                <span className="text-[10px] font-normal text-gray-500">{p.teamName}</span>
                            </td>
                            {statType === 'batting' ? <>
                                <td className="p-1 text-center whitespace-nowrap">{p.displayStats.matches}</td>
                                <td className="p-1 text-center font-bold whitespace-nowrap">{p.displayStats.runs}</td>
                                <td className="p-1 text-center whitespace-nowrap">{p.displayStats.average.toFixed(2)}</td>
                                <td className="p-1 text-center whitespace-nowrap">{p.displayStats.strikeRate.toFixed(2)}</td>
                                <td className="p-1 text-center whitespace-nowrap">{p.displayStats.highestScore}</td>
                            </> : <>
                                <td className="p-1 text-center whitespace-nowrap">{p.displayStats.matches}</td>
                                <td className="p-1 text-center font-bold whitespace-nowrap">{p.displayStats.wickets}</td>
                                <td className="p-1 text-center whitespace-nowrap">{p.displayStats.bowlingAverage.toFixed(2)}</td>
                                <td className="p-1 text-center whitespace-nowrap">{p.displayStats.economy.toFixed(2)}</td>
                                <td className="p-1 text-center whitespace-nowrap">{p.displayStats.bestBowling}</td>
                            </>}
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
                ) : statType === 'phase' ? (
                    <div className="space-y-4 p-2">
                        {sortedPlayers.slice(0, 50).map(p => {
                            const ps = p.displayStats.phaseStats;
                            if (!ps) return null;
                            const b = ps.batting;
                            const bl = ps.bowling;
                            return (
                                <div key={p.id} className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-white">{p.name}</h4>
                                            <p className="text-[10px] text-slate-500 uppercase">{p.teamName}</p>
                                        </div>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-black text-white ${p.role === 'BT' ? 'bg-blue-600' : p.role === 'BL' ? 'bg-red-600' : 'bg-amber-600'}`}>{p.role}</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded">
                                            <p className="text-[9px] text-slate-400 uppercase font-bold mb-1">Powerplay</p>
                                            <p className="text-xs font-mono">B: <span className="font-bold">{b.pp.runs}</span>/{b.pp.dismissals}</p>
                                            <p className="text-xs font-mono">Bo: <span className="font-bold">{bl.pp.wickets}</span>/{bl.pp.runsConceded}</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded">
                                            <p className="text-[9px] text-slate-400 uppercase font-bold mb-1">Middle</p>
                                            <p className="text-xs font-mono">B: <span className="font-bold">{b.mo.runs}</span>/{b.mo.dismissals}</p>
                                            <p className="text-xs font-mono">Bo: <span className="font-bold">{bl.mo.wickets}</span>/{bl.mo.runsConceded}</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded">
                                            <p className="text-[9px] text-slate-400 uppercase font-bold mb-1">Death</p>
                                            <p className="text-xs font-mono">B: <span className="font-bold">{b.do.runs}</span>/{b.do.dismissals}</p>
                                            <p className="text-xs font-mono">Bo: <span className="font-bold">{bl.do.wickets}</span>/{bl.do.runsConceded}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div>
                            <h3 className="font-bold text-lg mb-2 text-center">Fastest Fifties</h3>
                             <table className="w-full text-sm">
                                <thead><tr className="text-left sticky top-0 bg-gray-50 dark:bg-[#2C3531]"><th className="p-1">Player</th><th className="p-1 text-center">Record</th></tr></thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {sortedFastestFifties.slice(0, 25).map(p => (
                                    <tr key={p.id} onClick={() => viewPlayerProfile(p, gameData.currentFormat)} className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
                                        <td className="p-1 font-semibold">{p.name}<br /><span className="text-xs font-normal text-gray-500">{p.teamName}</span></td>
                                        <td className="p-1 text-center font-bold">{p.displayStats.fastestFifty} balls</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                         <div>
                            <h3 className="font-bold text-lg mb-2 text-center">Fastest Hundreds</h3>
                             <table className="w-full text-sm">
                                <thead><tr className="text-left sticky top-0 bg-gray-50 dark:bg-[#2C3531]"><th className="p-1">Player</th><th className="p-1 text-center">Record</th></tr></thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {sortedFastestHundreds.slice(0, 25).map(p => (
                                    <tr key={p.id} onClick={() => viewPlayerProfile(p, gameData.currentFormat)} className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
                                        <td className="p-1 font-semibold">{p.name}<br /><span className="text-xs font-normal text-gray-500">{p.teamName}</span></td>
                                        <td className="p-1 text-center font-bold">{p.displayStats.fastestHundred} balls</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
};

export default Stats;

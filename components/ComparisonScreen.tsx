
import React, { useState, useMemo } from 'react';
import { GameData, Format, Player } from '../types';
import { aggregateStats } from '../utils';

interface ComparisonScreenProps {
    gameData: GameData;
}

const ComparisonScreen: React.FC<ComparisonScreenProps> = ({ gameData }) => {
    const [comparisonType, setComparisonType] = useState<'player-vs-player' | 'team-vs-team' | 'player-vs-team'>('player-vs-player');
    const [selection1, setSelection1] = useState('');
    const [selection2, setSelection2] = useState('');
    const [pvpFormat, setPvpFormat] = useState<Format>(gameData.currentFormat);

    const sortedPlayers = useMemo(() => [...gameData.allPlayers].sort((a, b) => a.name.localeCompare(b.name)), [gameData.allPlayers]);
    const sortedTeams = useMemo(() => [...gameData.teams].sort((a, b) => a.name.localeCompare(b.name)), [gameData.teams]);

    const handleTypeChange = (type: 'player-vs-player' | 'team-vs-team' | 'player-vs-team') => {
        setComparisonType(type);
        setSelection1('');
        setSelection2('');
    };

    const renderSelectionDropdowns = () => {
        let options1: any[] = [];
        let options2: any[] = [];
        let label1 = '', label2 = '';

        switch (comparisonType) {
            case 'player-vs-player':
                options1 = sortedPlayers;
                options2 = sortedPlayers;
                label1 = 'Player 1';
                label2 = 'Player 2';
                break;
            case 'team-vs-team':
                options1 = sortedTeams;
                options2 = sortedTeams;
                label1 = 'Team 1';
                label2 = 'Team 2';
                break;
            case 'player-vs-team':
                options1 = sortedPlayers;
                options2 = sortedTeams;
                label1 = 'Player';
                label2 = 'Team';
                break;
        }

        return (
            <div className="flex items-center space-x-2 my-4">
                <div className="flex-1">
                    <label className="text-xs text-gray-500">{label1}</label>
                    <select value={selection1} onChange={e => setSelection1(e.target.value)} className="w-full p-2 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600">
                        <option value="">Select...</option>
                        {options1.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                </div>
                <span className="font-bold text-gray-500 pt-4">VS</span>
                <div className="flex-1">
                    <label className="text-xs text-gray-500">{label2}</label>
                    <select value={selection2} onChange={e => setSelection2(e.target.value)} className="w-full p-2 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600">
                        <option value="">Select...</option>
                        {options2.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                </div>
            </div>
        );
    };

    const StatRow = ({ label, value1, value2 }: { label: string, value1: any, value2: any }) => {
        const val1 = typeof value1 === 'number' ? parseFloat(value1.toFixed(2)) : value1;
        const val2 = typeof value2 === 'number' ? parseFloat(value2.toFixed(2)) : value2;
        const isBetter1 = val1 > val2;
        const isBetter2 = val2 > val1;
        const isLowerBetter = ['Avg', 'Econ'].includes(label);
        const isBowlingBetter1 = isLowerBetter && val1 < val2;
        const isBowlingBetter2 = isLowerBetter && val2 < val1;

        return (
            <div className="flex justify-between items-center py-1 border-b border-gray-200 dark:border-gray-700/50 text-sm">
                <span className={`w-1/3 text-left font-bold ${(isBetter1 && !isLowerBetter) || isBowlingBetter1 ? 'text-teal-500' : ''}`}>{val1}</span>
                <span className="w-1/3 text-center text-xs text-gray-500 dark:text-gray-400">{label}</span>
                <span className={`w-1/3 text-right font-bold ${(isBetter2 && !isLowerBetter) || isBowlingBetter2 ? 'text-teal-500' : ''}`}>{val2}</span>
            </div>
        );
    };

    const renderComparisonResult = () => {
        if (!selection1 || !selection2 || selection1 === selection2) return <div className="text-center text-gray-500 mt-8">Please make two different selections to compare.</div>;

        switch (comparisonType) {
            case 'player-vs-player': {
                const p1 = gameData.allPlayers.find(p => p.id === selection1);
                const p2 = gameData.allPlayers.find(p => p.id === selection2);
                if (!p1 || !p2) return null;

                const s1 = p1.internationalStats?.[pvpFormat] || p1.domesticStats?.[pvpFormat] || p1.stats?.[pvpFormat] || aggregateStats(p1, [pvpFormat]);
                const s2 = p2.internationalStats?.[pvpFormat] || p2.domesticStats?.[pvpFormat] || p2.stats?.[pvpFormat] || aggregateStats(p2, [pvpFormat]);

                const headToHead = gameData.records?.batterVsBowler.find(r => (r.batterId === p1.id && r.bowlerId === p2.id) || (r.batterId === p2.id && r.bowlerId === p1.id));

                return (
                    <div>
                        <div className="flex justify-between items-center font-bold text-lg mb-2">
                           <span className="w-2/5 text-left truncate">{p1.name}</span>
                           <span className="w-1/5 text-center text-base text-gray-400">vs</span>
                           <span className="w-2/5 text-right truncate">{p2.name}</span>
                        </div>
                        <h4 className="font-semibold text-center my-2">Batting Career</h4>
                        <StatRow label="Matches" value1={s1.matches} value2={s2.matches} />
                        <StatRow label="Runs" value1={s1.runs} value2={s2.runs} />
                        <StatRow label="Avg" value1={s1.average} value2={s2.average} />
                        <StatRow label="SR" value1={s1.strikeRate} value2={s2.strikeRate} />
                        <StatRow label="HS" value1={s1.highestScore} value2={s2.highestScore} />
                        <StatRow label="100s" value1={s1.hundreds} value2={s2.hundreds} />
                        <StatRow label="50s" value1={s1.fifties} value2={s2.fifties} />

                        <h4 className="font-semibold text-center my-2 pt-2">Bowling Career</h4>
                        <StatRow label="Wickets" value1={s1.wickets} value2={s2.wickets} />
                        <StatRow label="Avg" value1={s1.bowlingAverage} value2={s2.bowlingAverage} />
                        <StatRow label="Econ" value1={s1.economy} value2={s2.economy} />
                        <StatRow label="Best" value1={s1.bestBowling} value2={s2.bestBowling} />
                        
                        {headToHead && (
                             <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-900/50 rounded-lg">
                                <h4 className="font-semibold text-center mb-2">Head-to-Head</h4>
                                <p className="text-center text-sm">
                                    <span className="font-bold">{headToHead.batterName}</span> vs <span className="font-bold">{headToHead.bowlerName}</span>:
                                </p>
                                <p className="text-center">
                                    <span className="font-bold text-lg">{headToHead.runs}</span> runs, <span className="font-bold text-lg">{headToHead.balls}</span> balls, <span className="font-bold text-lg text-red-500">{headToHead.dismissals}</span> dismissals
                                </p>
                             </div>
                        )}
                    </div>
                );
            }
            case 'team-vs-team': {
                const t1 = gameData.teams.find(t => t.id === selection1);
                const t2 = gameData.teams.find(t => t.id === selection2);
                if (!t1 || !t2) return null;

                const record = gameData.records?.teamVsTeam.find(r => (r.teamAId === t1.id && r.teamBId === t2.id) || (r.teamAId === t2.id && r.teamBId === t1.id));
                const t1Wins = record ? (record.teamAId === t1.id ? record.teamAWins : record.matches - record.teamAWins) : 0;
                const t2Wins = record ? record.matches - t1Wins : 0;

                return (
                    <div className="text-center">
                        <h3 className="font-bold text-2xl">{t1.name} vs {t2.name}</h3>
                        <p className="text-gray-500 mb-4">Head-to-Head Record</p>
                        <div className="text-5xl font-extrabold">
                            <span className={t1Wins > t2Wins ? 'text-teal-500' : ''}>{t1Wins}</span>
                            <span className="mx-4">-</span>
                             <span className={t2Wins > t1Wins ? 'text-teal-500' : ''}>{t2Wins}</span>
                        </div>
                        <p className="text-sm mt-2">Total Matches: {record?.matches || 0}</p>
                    </div>
                )
            }
            case 'player-vs-team': {
                const player = gameData.allPlayers.find(p => p.id === selection1);
                const team = gameData.teams.find(t => t.id === selection2);
                if (!player || !team) return null;

                const record = gameData.records?.playerVsTeam.find(r => r.playerId === player.id && r.vsTeamId === team.id);

                if (!record) return <div className="text-center text-gray-500 mt-8">{player.name} has no record against {team.name}.</div>;

                return (
                    <div className="space-y-4">
                        <h3 className="font-bold text-xl text-center">{player.name} vs {team.name}</h3>
                        {record.runs > 0 || record.balls > 0 ? (
                            <div>
                                <h4 className="font-semibold text-center mb-1">Batting</h4>
                                <div className="grid grid-cols-3 gap-2 text-center bg-gray-100 dark:bg-gray-900/50 p-3 rounded-lg">
                                    <div><p className="font-bold text-xl">{record.runs}</p><p className="text-xs text-gray-500">Runs</p></div>
                                    <div><p className="font-bold text-xl">{record.balls}</p><p className="text-xs text-gray-500">Balls</p></div>
                                    <div><p className="font-bold text-xl">{record.dismissals}</p><p className="text-xs text-gray-500">Outs</p></div>
                                </div>
                            </div>
                        ) : null}
                        {record.wickets > 0 || record.ballsBowled > 0 ? (
                            <div>
                                <h4 className="font-semibold text-center mb-1">Bowling</h4>
                                <div className="grid grid-cols-3 gap-2 text-center bg-gray-100 dark:bg-gray-900/50 p-3 rounded-lg">
                                    <div><p className="font-bold text-xl">{record.wickets}</p><p className="text-xs text-gray-500">Wickets</p></div>
                                    <div><p className="font-bold text-xl">{record.runsConceded}</p><p className="text-xs text-gray-500">Runs</p></div>
                                    <div><p className="font-bold text-xl">{record.ballsBowled > 0 ? ((record.runsConceded / record.ballsBowled) * 6).toFixed(2) : '0.00'}</p><p className="text-xs text-gray-500">Econ</p></div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                )
            }
            default: return null;
        }
    }

    return (
        <div className="p-2 h-[calc(100vh-90px)] flex flex-col">
            <h2 className="text-xl font-bold text-center mb-2">Comparison Center</h2>
            <div className="flex justify-center border-b border-gray-300 dark:border-gray-700 mb-2">
                <button onClick={() => handleTypeChange('player-vs-player')} className={`px-4 py-2 text-sm font-semibold ${comparisonType === 'player-vs-player' ? 'border-b-2 border-teal-500 text-teal-500' : ''}`}>Player/Player</button>
                <button onClick={() => handleTypeChange('team-vs-team')} className={`px-4 py-2 text-sm font-semibold ${comparisonType === 'team-vs-team' ? 'border-b-2 border-teal-500 text-teal-500' : ''}`}>Team/Team</button>
                <button onClick={() => handleTypeChange('player-vs-team')} className={`px-4 py-2 text-sm font-semibold ${comparisonType === 'player-vs-team' ? 'border-b-2 border-teal-500 text-teal-500' : ''}`}>Player/Team</button>
            </div>
            {renderSelectionDropdowns()}
            {comparisonType === 'player-vs-player' && selection1 && selection2 && (
                 <div className="flex justify-center items-center gap-3 overflow-x-auto border-b border-gray-300 dark:border-gray-700 mb-2 pb-2">
                    {Object.values(Format).map(f => (
                        <button key={f} onClick={() => setPvpFormat(f)} className={`px-3 py-1 text-xs font-semibold whitespace-nowrap ${pvpFormat === f ? 'border-b-2 border-teal-500 text-teal-500' : 'text-gray-500'}`}>{f}</button>
                    ))}
                </div>
            )}
            <div className="flex-grow overflow-y-auto pr-1">
                {renderComparisonResult()}
            </div>
        </div>
    );
};

export default ComparisonScreen;

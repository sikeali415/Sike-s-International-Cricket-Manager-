
import React, { useState, useMemo } from 'react';
import { Player, PlayerStats, Format, PlayerRole, GameData, UniversalFilterState, DomesticFormat, InternationalFormat } from '../types';
import { getRoleColor, getRoleFullName, aggregateStats, getPlayerBadges, generateScoutReport } from '../utils';
import { generateSingleFormatInitialStats } from '../data';
import { playSFX } from '../utils/soundManager';
import { ShotSelectionWagonWheel } from './ShotSelectionWagonWheel';
import { UniversalFilterBar } from './UniversalFilterBar';
import { 
    calculatePlayerCaptaincyRecords, 
    calculatePlayerVsTeamRecords, 
    calculatePlayerTeamHistory, 
    calculatePlayerVsPlayerMatchup 
} from '../utils/advancedStatsUtils';
import { 
    Crown, 
    Swords, 
    Building2, 
    Target, 
    BarChart3, 
    TrendingUp, 
    ShieldAlert, 
    Trophy, 
    Flame, 
    Calendar, 
    Filter,
    Award,
    Sparkles
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, Cell, Legend, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PlayerProfileProps {
    player: Player | null;
    gameData?: GameData;
    onBack: () => void;
    initialFormat: Format;
}

const PlayerProfile: React.FC<PlayerProfileProps> = ({ player, gameData, onBack, initialFormat }) => {
    const [selectedFormat, setSelectedFormat] = useState<Format | DomesticFormat | InternationalFormat | 'Summary' | string>(initialFormat);

    const [trendMetric, setTrendMetric] = useState<'batting' | 'bowling'>(
        player && (player.role === PlayerRole.BATSMAN || player.role === PlayerRole.WICKET_KEEPER || player.role === PlayerRole.ALL_ROUNDER)
            ? 'batting'
            : 'bowling'
    );
    const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
    const [groundCompareMetric, setGroundCompareMetric] = useState<'runs' | 'wickets'>('runs');
    const [showShotSelectionLab, setShowShotSelectionLab] = useState<boolean>(false);
    const [activeProfileTab, setActiveProfileTab] = useState<'overview' | 'captaincy' | 'vsTeams' | 'franchise' | 'matchups' | 'awards_records'>('overview');
    const [filterState, setFilterState] = useState<UniversalFilterState>({
        format: 'ALL',
        season: 'ALL',
        teamId: 'ALL',
        opponentTeamId: 'ALL',
        tournament: 'ALL',
        role: 'ALL'
    });
    const [selectedOpponentBowlerId, setSelectedOpponentBowlerId] = useState<string>('');

    // Calculated records
    const captaincyRecords = useMemo(() => {
        if (!player || !gameData) return null;
        return calculatePlayerCaptaincyRecords(player.id, gameData, filterState);
    }, [player, gameData, filterState]);

    const playerVsTeamsRecords = useMemo(() => {
        if (!player || !gameData) return [];
        return calculatePlayerVsTeamRecords(player.id, gameData, filterState);
    }, [player, gameData, filterState]);

    const franchiseHistory = useMemo(() => {
        if (!player || !gameData) return [];
        return calculatePlayerTeamHistory(player.id, gameData, filterState);
    }, [player, gameData, filterState]);

    const availableBowlers = useMemo(() => {
        if (!gameData) return [];
        return gameData.allPlayers.filter(p => p.id !== player?.id && (p.role === PlayerRole.FAST_BOWLER || p.role === PlayerRole.SPIN_BOWLER || p.role === PlayerRole.ALL_ROUNDER));
    }, [gameData, player]);

    const activeBowlerId = selectedOpponentBowlerId || availableBowlers[0]?.id || '';
    const bowlerMatchup = useMemo(() => {
        if (!player || !gameData || !activeBowlerId) return null;
        return calculatePlayerVsPlayerMatchup(player.id, activeBowlerId, gameData);
    }, [player, gameData, activeBowlerId]);
    
    const groundAndZoneStats = useMemo(() => {
        if (!player) return null;
        
        const formatKey = selectedFormat === 'Summary' ? Format.T20 : selectedFormat;
        const stats = player.stats[formatKey] || { runs: 0, wickets: 0, matches: 0, economy: 7.5, runsConceded: 0, ballsBowled: 0, strikeRate: 120 };
        
        const runs = stats.runs;
        const matches = stats.matches || 1;
        const wickets = stats.wickets;
        
        // Seeded random generator
        const getSeededValue = (str: string, index: number) => {
            const seedStr = player.id + str + index;
            let hash = 0;
            for (let i = 0; i < seedStr.length; i++) {
                hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
            }
            const val = Math.sin(hash) * 10000;
            return Math.abs(val - Math.floor(val));
        };

        const groundsList = [
            { name: "Keenjhur Cricket Ground", code: "KCG", pitch: "Balanced Sporting Pitch", bias: 1.0 },
            { name: "School Ground", code: "SG", pitch: "Dusty Spinner’s Haven", bias: 0.8 },
            { name: "Transformer Ground", code: "TG", pitch: "Green Top", bias: 0.9 },
            { name: "Lake Way Ground", code: "LWG", pitch: "Batting Paradise", bias: 1.4 },
            { name: "Home Gate Ground", code: "HGG", pitch: "Dead Slow Track", bias: 0.75 },
            { name: "Mosque Cricket Ground", code: "MCG", pitch: "Cracked Worn Surface", bias: 0.95 }
        ];

        let leftMatches = Math.max(1, matches);
        const groundMatches = groundsList.map((g, idx) => {
            if (idx === groundsList.length - 1) {
                return { ...g, matches: leftMatches };
            }
            const proportion = Math.max(0.05, Math.min(0.3, 0.12 + getSeededValue(g.code, 1) * 0.1));
            const m = Math.max(0, Math.min(leftMatches, Math.round(matches * proportion)));
            leftMatches -= m;
            return { ...g, matches: m };
        });

        // Distribute runs
        let leftRuns = runs;
        const groundStats = groundMatches.map((g, idx) => {
            if (g.matches === 0) {
                return { ...g, runs: 0, wickets: 0, avg: 0, econ: 0 };
            }
            
            let runWeight = g.bias * (0.85 + getSeededValue(g.code, 2) * 0.3);
            if (player.role === PlayerRole.FAST_BOWLER && g.pitch === 'Green Top') runWeight *= 0.6;
            if (player.role === PlayerRole.SPIN_BOWLER && g.pitch === "Dusty Spinner’s Haven") runWeight *= 0.6;
            
            const proportion = Math.max(0.05, Math.min(0.4, 0.16 * runWeight));
            let r = Math.round(runs * proportion);
            if (idx === groundsList.length - 1 || r > leftRuns) {
                r = leftRuns;
            }
            leftRuns -= r;

            let w = 0;
            if (wickets > 0) {
                let wWeight = (1 / g.bias) * (0.8 + getSeededValue(g.code, 3) * 0.4);
                if (player.role === PlayerRole.FAST_BOWLER && g.pitch === 'Green Top') wWeight *= 1.5;
                if (player.role === PlayerRole.SPIN_BOWLER && g.pitch === "Dusty Spinner’s Haven") wWeight *= 1.6;
                w = Math.max(0, Math.min(wickets, Math.round(wickets * (wWeight / 3.5))));
            }

            const avg = g.matches > 0 ? (r / Math.max(1, g.matches * 0.8)) : 0;
            const econ = stats.economy ? (stats.economy * (0.9 + getSeededValue(g.code, 4) * 0.18)) : 7.2;

            return {
                ...g,
                runs: r,
                wickets: w,
                avg: Number(avg.toFixed(1)),
                econ: Number(econ.toFixed(2))
            };
        });

        if (leftRuns > 0 && groundStats.length > 0) {
            groundStats[groundStats.length - 1].runs += leftRuns;
        }

        const isBatsman = [PlayerRole.BATSMAN, PlayerRole.WICKET_KEEPER, PlayerRole.ALL_ROUNDER].includes(player.role);
        
        const battingZones = [
            { id: 'cover', name: 'Cover Drive', angleStart: 210, angleEnd: 260, colorCode: '#0d9488' },
            { id: 'point', name: 'Square Cut & Point', angleStart: 260, angleEnd: 310, colorCode: '#0284c7' },
            { id: 'third_man', name: 'Third Man Slider', angleStart: 310, angleEnd: 360, colorCode: '#f59e0b' },
            { id: 'fine_leg', name: 'Fine Leg Glance', angleStart: 0, angleEnd: 50, colorCode: '#ec4899' },
            { id: 'square_leg', name: 'Square Leg Pull', angleStart: 50, angleEnd: 100, colorCode: '#8b5cf6' },
            { id: 'mid_wicket', name: 'Mid-Wicket Smash', angleStart: 100, angleEnd: 140, colorCode: '#f43f5e' },
            { id: 'mid_on', name: 'Mid-On Flick', angleStart: 140, angleEnd: 180, colorCode: '#10b981' },
            { id: 'mid_off', name: 'Mid-Off Drive', angleStart: 180, angleEnd: 210, colorCode: '#14b8a6' },
        ];

        const bowlingZones = [
            { id: 'full_toss', name: 'Full Toss / Slower Ball', percent: 12, description: 'Surprise delivery variation to trap batsmen', colorCode: '#ef4444' },
            { id: 'full_length', name: 'Full Length (Driveable)', percent: 24, description: 'Inviting drive, high risk but high wicket probability', colorCode: '#6366f1' },
            { id: 'good_length', name: 'Good Length (Ideal)', percent: 46, description: 'Consistently hitting the corridor of uncertainty', colorCode: '#10b981' },
            { id: 'short_length', name: 'Short Pitch / Bouncer', percent: 18, description: 'Aggressive testing, forcing pull/hook errors', colorCode: '#f59e0b' },
        ];

        let zoneData: any[] = [];
        if (isBatsman) {
            zoneData = battingZones.map((z) => {
                let weight = 1.0;
                if (player.style === 'A' && ['mid_wicket', 'cover', 'square_leg'].includes(z.id)) weight = 1.4;
                if (player.style === 'D' && ['mid_off', 'mid_on', 'cover'].includes(z.id)) weight = 1.5;
                if (player.isOpener && ['cover', 'point', 'third_man'].includes(z.id)) weight = 1.35;
                
                const randSeed = getSeededValue(z.id, 5);
                const rawPct = (10 + randSeed * 15) * weight;
                return { ...z, rawPct };
            });
            const sumRaw = zoneData.reduce((acc, z) => acc + z.rawPct, 0);
            zoneData = zoneData.map((z) => {
                const finalPct = Math.round((z.rawPct / sumRaw) * 100);
                return {
                    ...z,
                    percentage: finalPct,
                    runs: Math.round(runs * (finalPct / 100))
                };
            });
        } else {
            zoneData = bowlingZones.map((z) => {
                let weight = 1.0;
                if (player.role === PlayerRole.SPIN_BOWLER && z.id === 'good_length') weight = 1.3;
                if (player.role === PlayerRole.SPIN_BOWLER && z.id === 'full_toss') weight = 0.5;
                if (player.role === PlayerRole.FAST_BOWLER && z.id === 'short_length') weight = 1.4;
                
                const randSeed = getSeededValue(z.id, 6);
                const finalPct = Math.round(z.percent * weight * (0.85 + randSeed * 0.3));
                return { ...z, rawPct: finalPct };
            });
            const sumPct = zoneData.reduce((acc, z) => acc + z.rawPct, 0);
            zoneData = zoneData.map((z) => {
                const finalPct = Math.round((z.rawPct / sumPct) * 100);
                return {
                    ...z,
                    percentage: finalPct,
                    wickets: Math.round(wickets * (finalPct / 100))
                };
            });
        }

        // Manhattan Innings
        const manInnings = (() => {
            const inningsCount = Math.max(5, Math.min(10, matches || 6));
            const list = [];
            let rSum = 0;
            let wSum = 0;
            
            for (let i = 1; i <= inningsCount; i++) {
                const rand = getSeededValue(`match-${i}`, 7);
                let rVal = 0;
                if (runs > 0) {
                    rVal = Math.round((runs / inningsCount) * (0.3 + rand * 1.6));
                } else {
                    rVal = Math.round((player.battingSkill * 0.45) * (0.2 + rand * 1.5));
                }
                rSum += rVal;

                let wVal = 0;
                if (wickets > 0) {
                    wVal = rand > 0.82 ? 3 : rand > 0.55 ? 2 : rand > 0.25 ? 1 : 0;
                } else {
                    wVal = rand > 0.94 ? 1 : 0;
                }
                wSum += wVal;

                const baseSR = stats.strikeRate || (player.style === 'A' ? 140 : 115);
                const mSR = Math.round(baseSR * (0.75 + rand * 0.5));
                
                const baseEcon = stats.economy || 7.4;
                const mEcon = Number((baseEcon * (0.65 + rand * 0.6)).toFixed(2));

                list.push({
                    innLabel: `Inn-${i}`,
                    runs: rVal,
                    strikeRate: mSR,
                    wickets: wVal,
                    economy: mEcon
                });
            }

            if (runs > 0 && rSum > 0) {
                const ratio = runs / rSum;
                list.forEach(item => { item.runs = Math.round(item.runs * ratio); });
            }
            if (wickets > 0 && wSum > 0) {
                let remWickets = wickets;
                list.sort((a,b) => b.wickets - a.wickets);
                list.forEach((item, index) => {
                    if (index === list.length - 1) {
                        item.wickets = Math.max(0, remWickets);
                    } else {
                        const takeVal = Math.min(remWickets, item.wickets);
                        item.wickets = takeVal;
                        remWickets -= takeVal;
                    }
                });
                list.sort((a,b) => a.innLabel.localeCompare(b.innLabel));
            }

            return list;
        })();

        const favoriteGround = [...groundStats].sort((a,b) => b.runs - a.runs)[0];

        return { groundStats, zoneData, manInnings, favoriteGround, isBatsman };
    }, [player, selectedFormat, initialFormat]);

    const activeZone = useMemo(() => {
        if (!groundAndZoneStats || !groundAndZoneStats.zoneData) return null;
        return groundAndZoneStats.zoneData.find(z => z.id === activeZoneId) || groundAndZoneStats.zoneData[0];
    }, [groundAndZoneStats, activeZoneId]);

    const summaryStats = useMemo(() => {
        if (!player) return null;
        
        // Domestic Stats (Yearly domestic career stats)
        const domesticT20 = player.domesticStats?.['T20'] || generateSingleFormatInitialStats();
        const domesticListA = player.domesticStats?.['List A'] || generateSingleFormatInitialStats();
        const domesticFC = player.domesticStats?.['FC'] || generateSingleFormatInitialStats();
        const domesticTotal = aggregateStats(player, ['T20', 'List A', 'FC']);

        // International Stats (Official match records & tournament progression)
        const intlTest = aggregateStats(player, ['Test', Format.SHIELD]);
        const intlODI = aggregateStats(player, ['ODI', Format.ODI]);
        const intlT20i = aggregateStats(player, ['T20i', 'T20I', Format.T20, Format.WLT20]);
        const intlTotal = aggregateStats(player, ['Test', 'ODI', 'T20i', 'T20I', Format.SHIELD, Format.ODI, Format.T20, Format.WLT20]);

        // Overall Career Total
        const overall = aggregateStats(player, ['T20', 'List A', 'FC', 'Test', 'ODI', 'T20i', ...Object.values(Format)]);

        return { 
            domestic: { t20: domesticT20, listA: domesticListA, fc: domesticFC, total: domesticTotal },
            international: { test: intlTest, odi: intlODI, t20i: intlT20i, total: intlTotal },
            overall 
        };
    }, [player]);

    const trendData = useMemo(() => {
        if (!player) return [];
        
        const formatKey = selectedFormat === 'Summary' ? initialFormat : selectedFormat;
        
        // If the player has real performance history, use it. Keep only the last 5 entries.
        if (player.performanceHistory && (player.performanceHistory as any)[formatKey] && (player.performanceHistory as any)[formatKey].length > 0) {
            return (player.performanceHistory as any)[formatKey].slice(-5);
        }
        
        // Otherwise, generate a realistic seeded baseline history of 5 match data points
        const fmtStats = player.domesticStats?.[formatKey] || player.internationalStats?.[formatKey] || (player.stats as any)?.[formatKey];
        const baseAvg = fmtStats?.average || (player.battingSkill > 0 ? player.battingSkill * 0.45 : 25);
        const baseEcon = fmtStats?.economy || (player.role === PlayerRole.FAST_BOWLER || player.role === PlayerRole.SPIN_BOWLER ? 7.2 : 8.5);
        
        // Seeded random using player.id and format to ensure it remains stable
        const seedStr = player.id + formatKey;
        let hash = 0;
        for (let i = 0; i < seedStr.length; i++) {
            hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        const getSeededRandom = (idx: number) => {
            const x = Math.sin(hash + idx) * 10000;
            return x - Math.floor(x);
        };

        const list = [];
        for (let i = 4; i >= 0; i--) {
            const avgVariance = 0.85 + getSeededRandom(i) * 0.3;
            const econVariance = 0.9 + getSeededRandom(i + 5) * 0.18;

            list.push({
                matchNumber: `M-${5 - i}`,
                battingAverage: Number((baseAvg * avgVariance).toFixed(2)),
                bowlingEconomy: Number((baseEcon * econVariance).toFixed(2))
            });
        }
        return list;
    }, [player, selectedFormat, initialFormat]);

    if (!player || !summaryStats) return <div>Player not found. <button onClick={onBack}>Back</button></div>;
    
    const stats: PlayerStats = (() => {
        if (selectedFormat === 'Summary') return summaryStats.overall;
        if (player.domesticStats && player.domesticStats[selectedFormat]) return player.domesticStats[selectedFormat];
        if (player.internationalStats && player.internationalStats[selectedFormat]) return player.internationalStats[selectedFormat];
        if (player.stats && (player.stats as any)[selectedFormat]) return (player.stats as any)[selectedFormat];
        return aggregateStats(player, [selectedFormat]);
    })();
    
    return (
        <div className="p-4 h-[calc(100vh-90px)] overflow-y-auto">
            <button onClick={() => { playSFX('click'); onBack(); }} className="mb-2 text-sm text-teal-500 font-bold">&larr; Back to Stats</button>
            <div className="text-center mb-4">
                <h2 className="text-3xl font-bold">{player.name}</h2>
                <p className={`${getRoleColor(player.role)} font-semibold`}>{getRoleFullName(player.role)}</p>
                {player.teamName && <p className="text-sm text-gray-500">{player.teamName}</p>}
                
                {/* Badges Display */}
                <div className="flex flex-wrap gap-1.5 justify-center mt-3 max-w-md mx-auto">
                    {getPlayerBadges(player).map((badge, idx) => (
                        <span key={idx} className="px-2.5 py-1 text-[10px] font-bold rounded-full uppercase bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-900 border border-amber-400 shadow-sm">
                            🏆 {badge}
                        </span>
                    ))}
                </div>

                {/* Sike Share Social Metrics Card */}
                {(() => {
                    const soc = gameData?.sikeShareData?.playerSocials?.[player.id] || {
                        followers: 0,
                        popularity: 0,
                        reputation: 0,
                        fanHappiness: 0,
                        formRating: 0,
                        handle: `@${player.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
                        isVerified: false
                    };

                    const formattedFollowers = soc.followers >= 1_000_000
                        ? (soc.followers / 1_000_000).toFixed(1) + 'M'
                        : soc.followers >= 1_000
                        ? (soc.followers / 1_000).toFixed(1) + 'K'
                        : soc.followers.toString();

                    return (
                        <div className="mt-4 max-w-md mx-auto bg-slate-900/90 border border-cyan-500/40 rounded-xl p-3 shadow-md text-left">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center font-bold text-xs">
                                        @{player.name.split(' ')[0][0]}{player.name.split(' ').pop()?.[0]}
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-white flex items-center gap-1">
                                            <span>{soc.handle || `@${player.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`}</span>
                                            {soc.isVerified && <span className="text-cyan-400 text-[10px]">✓</span>}
                                        </div>
                                        <div className="text-[10px] text-cyan-400 font-semibold">Sike Share ID: {player.id}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-extrabold text-cyan-400">
                                        {formattedFollowers}
                                    </div>
                                    <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Followers</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
                                <div className="bg-slate-800/80 p-1.5 rounded-lg border border-slate-700/50">
                                    <div className="text-amber-400 font-bold">{soc.popularity}%</div>
                                    <div className="text-[8px] text-slate-400 uppercase">Popularity</div>
                                </div>
                                <div className="bg-slate-800/80 p-1.5 rounded-lg border border-slate-700/50">
                                    <div className="text-emerald-400 font-bold">{soc.fanHappiness}%</div>
                                    <div className="text-[8px] text-slate-400 uppercase">Fan Joy</div>
                                </div>
                                <div className="bg-slate-800/80 p-1.5 rounded-lg border border-slate-700/50">
                                    <div className="text-purple-400 font-bold">{soc.reputation}</div>
                                    <div className="text-[8px] text-slate-400 uppercase">Reputation</div>
                                </div>
                                <div className="bg-slate-800/80 p-1.5 rounded-lg border border-slate-700/50">
                                    <div className="text-cyan-400 font-bold">{soc.formRating}/10</div>
                                    <div className="text-[8px] text-slate-400 uppercase">Form Rating</div>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>

            {/* Top-Level Profile Navigation Tabs */}
            <div className="flex justify-center flex-wrap gap-1.5 border-b border-slate-700/60 pb-3 mb-5">
                <button
                    onClick={() => { playSFX('click'); setActiveProfileTab('overview'); }}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeProfileTab === 'overview'
                            ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                            : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                    }`}
                >
                    <BarChart3 className="w-3.5 h-3.5" />
                    Overview & Form
                </button>
                <button
                    onClick={() => { playSFX('click'); setActiveProfileTab('captaincy'); }}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeProfileTab === 'captaincy'
                            ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                            : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                    }`}
                >
                    <Crown className="w-3.5 h-3.5" />
                    Captaincy Records
                </button>
                <button
                    onClick={() => { playSFX('click'); setActiveProfileTab('vsTeams'); }}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeProfileTab === 'vsTeams'
                            ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                            : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                    }`}
                >
                    <Swords className="w-3.5 h-3.5" />
                    Player vs Teams
                </button>
                <button
                    onClick={() => { playSFX('click'); setActiveProfileTab('franchise'); }}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeProfileTab === 'franchise'
                            ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                            : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                    }`}
                >
                    <Building2 className="w-3.5 h-3.5" />
                    Teams Played For
                </button>
                <button
                    onClick={() => { playSFX('click'); setActiveProfileTab('matchups'); }}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeProfileTab === 'matchups'
                            ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                            : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                    }`}
                >
                    <Target className="w-3.5 h-3.5" />
                    Bowler Matchups
                </button>
                <button
                    onClick={() => { playSFX('click'); setActiveProfileTab('awards_records'); }}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeProfileTab === 'awards_records'
                            ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                            : 'bg-slate-800/80 text-amber-300 hover:bg-slate-700'
                    }`}
                >
                    <Award className="w-3.5 h-3.5" />
                    Awards & Honors
                </button>
            </div>

            {/* TAB 1: OVERVIEW */}
            {activeProfileTab === 'overview' && (
                <>
            {/* Career Summary Table */}
            <div className="mb-6 overflow-x-auto bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800 shadow-md">
                <div className="flex items-center justify-between mb-2.5">
                    <h3 className="font-black text-sm tracking-wider uppercase text-teal-400 flex items-center gap-1.5">
                        <Trophy className="w-4 h-4 text-amber-400" />
                        Comprehensive Career Record
                    </h3>
                    <div className="flex gap-2 text-[10px]">
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">Domestic Stats (Auto-Generated)</span>
                        <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full font-bold">International Stats (Official)</span>
                    </div>
                </div>
                <table className="w-full text-xs text-center">
                    <thead>
                        <tr className="bg-slate-800 text-slate-300 border-b border-slate-700">
                            <th className="p-2 text-left font-bold">Format / Level</th>
                            <th className="p-2">Mat</th>
                            <th className="p-2">Runs</th>
                            <th className="p-2">HS</th>
                            <th className="p-2">Avg</th>
                            <th className="p-2">SR</th>
                            <th className="p-2">100s/50s</th>
                            <th className="p-2">Wkts</th>
                            <th className="p-2">BBI</th>
                            <th className="p-2">Avg</th>
                            <th className="p-2">Econ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* DOMESTIC STATS SECTION */}
                        <tr className="bg-emerald-950/30 text-emerald-400 text-[10px] font-black tracking-widest uppercase text-left border-y border-emerald-800/40">
                            <td colSpan={11} className="py-1 px-2">🏏 Domestic Career (Auto-Generated Baseline)</td>
                        </tr>
                        <tr className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors">
                            <td className="p-1.5 text-left font-semibold text-white flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span> T20 (Domestic)
                            </td>
                            <td className="p-1.5">{summaryStats.domestic.t20.matches}</td>
                            <td className="p-1.5 font-bold text-emerald-300">{summaryStats.domestic.t20.runs}</td>
                            <td className="p-1.5">{summaryStats.domestic.t20.highestScore}</td>
                            <td className="p-1.5">{summaryStats.domestic.t20.average.toFixed(2)}</td>
                            <td className="p-1.5">{summaryStats.domestic.t20.strikeRate.toFixed(1)}</td>
                            <td className="p-1.5">{summaryStats.domestic.t20.hundreds}/{summaryStats.domestic.t20.fifties}</td>
                            <td className="p-1.5 font-bold text-emerald-300">{summaryStats.domestic.t20.wickets}</td>
                            <td className="p-1.5 font-mono">{summaryStats.domestic.t20.bestBowling}</td>
                            <td className="p-1.5">{summaryStats.domestic.t20.bowlingAverage.toFixed(2)}</td>
                            <td className="p-1.5">{summaryStats.domestic.t20.economy.toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors">
                            <td className="p-1.5 text-left font-semibold text-white flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span> List A (50 Overs)
                            </td>
                            <td className="p-1.5">{summaryStats.domestic.listA.matches}</td>
                            <td className="p-1.5 font-bold text-emerald-300">{summaryStats.domestic.listA.runs}</td>
                            <td className="p-1.5">{summaryStats.domestic.listA.highestScore}</td>
                            <td className="p-1.5">{summaryStats.domestic.listA.average.toFixed(2)}</td>
                            <td className="p-1.5">{summaryStats.domestic.listA.strikeRate.toFixed(1)}</td>
                            <td className="p-1.5">{summaryStats.domestic.listA.hundreds}/{summaryStats.domestic.listA.fifties}</td>
                            <td className="p-1.5 font-bold text-emerald-300">{summaryStats.domestic.listA.wickets}</td>
                            <td className="p-1.5 font-mono">{summaryStats.domestic.listA.bestBowling}</td>
                            <td className="p-1.5">{summaryStats.domestic.listA.bowlingAverage.toFixed(2)}</td>
                            <td className="p-1.5">{summaryStats.domestic.listA.economy.toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors">
                            <td className="p-1.5 text-left font-semibold text-white flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span> First Class (FC)
                            </td>
                            <td className="p-1.5">{summaryStats.domestic.fc.matches}</td>
                            <td className="p-1.5 font-bold text-emerald-300">{summaryStats.domestic.fc.runs}</td>
                            <td className="p-1.5">{summaryStats.domestic.fc.highestScore}</td>
                            <td className="p-1.5">{summaryStats.domestic.fc.average.toFixed(2)}</td>
                            <td className="p-1.5">{summaryStats.domestic.fc.strikeRate.toFixed(1)}</td>
                            <td className="p-1.5">{summaryStats.domestic.fc.hundreds}/{summaryStats.domestic.fc.fifties}</td>
                            <td className="p-1.5 font-bold text-emerald-300">{summaryStats.domestic.fc.wickets}</td>
                            <td className="p-1.5 font-mono">{summaryStats.domestic.fc.bestBowling}</td>
                            <td className="p-1.5">{summaryStats.domestic.fc.bowlingAverage.toFixed(2)}</td>
                            <td className="p-1.5">{summaryStats.domestic.fc.economy.toFixed(2)}</td>
                        </tr>
                        <tr className="bg-emerald-900/20 font-bold border-b border-slate-700">
                            <td className="p-1.5 text-left text-emerald-400">Total Domestic Record</td>
                            <td className="p-1.5">{summaryStats.domestic.total.matches}</td>
                            <td className="p-1.5 font-bold text-emerald-400">{summaryStats.domestic.total.runs}</td>
                            <td className="p-1.5">{summaryStats.domestic.total.highestScore}</td>
                            <td className="p-1.5">{summaryStats.domestic.total.average.toFixed(2)}</td>
                            <td className="p-1.5">{summaryStats.domestic.total.strikeRate.toFixed(1)}</td>
                            <td className="p-1.5">{summaryStats.domestic.total.hundreds}/{summaryStats.domestic.total.fifties}</td>
                            <td className="p-1.5 font-bold text-emerald-400">{summaryStats.domestic.total.wickets}</td>
                            <td className="p-1.5 font-mono">{summaryStats.domestic.total.bestBowling}</td>
                            <td className="p-1.5">{summaryStats.domestic.total.bowlingAverage.toFixed(2)}</td>
                            <td className="p-1.5">{summaryStats.domestic.total.economy.toFixed(2)}</td>
                        </tr>

                        {/* INTERNATIONAL STATS SECTION */}
                        <tr className="bg-cyan-950/30 text-cyan-400 text-[10px] font-black tracking-widest uppercase text-left border-y border-cyan-800/40">
                            <td colSpan={11} className="py-1 px-2">🌍 International Career (Official Matches)</td>
                        </tr>
                        <tr className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors">
                            <td className="p-1.5 text-left font-semibold text-white flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span> Test Cricket
                            </td>
                            <td className="p-1.5">{summaryStats.international.test.matches}</td>
                            <td className="p-1.5 font-bold text-cyan-300">{summaryStats.international.test.runs}</td>
                            <td className="p-1.5">{summaryStats.international.test.highestScore}</td>
                            <td className="p-1.5">{summaryStats.international.test.average.toFixed(2)}</td>
                            <td className="p-1.5">{summaryStats.international.test.strikeRate.toFixed(1)}</td>
                            <td className="p-1.5">{summaryStats.international.test.hundreds}/{summaryStats.international.test.fifties}</td>
                            <td className="p-1.5 font-bold text-cyan-300">{summaryStats.international.test.wickets}</td>
                            <td className="p-1.5 font-mono">{summaryStats.international.test.bestBowling}</td>
                            <td className="p-1.5">{summaryStats.international.test.bowlingAverage.toFixed(2)}</td>
                            <td className="p-1.5">{summaryStats.international.test.economy.toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors">
                            <td className="p-1.5 text-left font-semibold text-white flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span> One Day Int. (ODI)
                            </td>
                            <td className="p-1.5">{summaryStats.international.odi.matches}</td>
                            <td className="p-1.5 font-bold text-cyan-300">{summaryStats.international.odi.runs}</td>
                            <td className="p-1.5">{summaryStats.international.odi.highestScore}</td>
                            <td className="p-1.5">{summaryStats.international.odi.average.toFixed(2)}</td>
                            <td className="p-1.5">{summaryStats.international.odi.strikeRate.toFixed(1)}</td>
                            <td className="p-1.5">{summaryStats.international.odi.hundreds}/{summaryStats.international.odi.fifties}</td>
                            <td className="p-1.5 font-bold text-cyan-300">{summaryStats.international.odi.wickets}</td>
                            <td className="p-1.5 font-mono">{summaryStats.international.odi.bestBowling}</td>
                            <td className="p-1.5">{summaryStats.international.odi.bowlingAverage.toFixed(2)}</td>
                            <td className="p-1.5">{summaryStats.international.odi.economy.toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors">
                            <td className="p-1.5 text-left font-semibold text-white flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span> T20 Int. (T20i)
                            </td>
                            <td className="p-1.5">{summaryStats.international.t20i.matches}</td>
                            <td className="p-1.5 font-bold text-cyan-300">{summaryStats.international.t20i.runs}</td>
                            <td className="p-1.5">{summaryStats.international.t20i.highestScore}</td>
                            <td className="p-1.5">{summaryStats.international.t20i.average.toFixed(2)}</td>
                            <td className="p-1.5">{summaryStats.international.t20i.strikeRate.toFixed(1)}</td>
                            <td className="p-1.5">{summaryStats.international.t20i.hundreds}/{summaryStats.international.t20i.fifties}</td>
                            <td className="p-1.5 font-bold text-cyan-300">{summaryStats.international.t20i.wickets}</td>
                            <td className="p-1.5 font-mono">{summaryStats.international.t20i.bestBowling}</td>
                            <td className="p-1.5">{summaryStats.international.t20i.bowlingAverage.toFixed(2)}</td>
                            <td className="p-1.5">{summaryStats.international.t20i.economy.toFixed(2)}</td>
                        </tr>
                        <tr className="bg-cyan-900/20 font-bold border-b border-slate-700">
                            <td className="p-1.5 text-left text-cyan-400">Total International Record</td>
                            <td className="p-1.5">{summaryStats.international.total.matches}</td>
                            <td className="p-1.5 font-bold text-cyan-400">{summaryStats.international.total.runs}</td>
                            <td className="p-1.5">{summaryStats.international.total.highestScore}</td>
                            <td className="p-1.5">{summaryStats.international.total.average.toFixed(2)}</td>
                            <td className="p-1.5">{summaryStats.international.total.strikeRate.toFixed(1)}</td>
                            <td className="p-1.5">{summaryStats.international.total.hundreds}/{summaryStats.international.total.fifties}</td>
                            <td className="p-1.5 font-bold text-cyan-400">{summaryStats.international.total.wickets}</td>
                            <td className="p-1.5 font-mono">{summaryStats.international.total.bestBowling}</td>
                            <td className="p-1.5">{summaryStats.international.total.bowlingAverage.toFixed(2)}</td>
                            <td className="p-1.5">{summaryStats.international.total.economy.toFixed(2)}</td>
                        </tr>

                        {/* OVERALL CAREER RECORD */}
                        <tr className="bg-amber-950/40 text-amber-300 font-extrabold text-sm border-t-2 border-amber-500/50">
                            <td className="p-2 text-left">⭐ Grand Overall Career</td>
                            <td className="p-2">{summaryStats.overall.matches}</td>
                            <td className="p-2 text-amber-400">{summaryStats.overall.runs}</td>
                            <td className="p-2">{summaryStats.overall.highestScore}</td>
                            <td className="p-2">{summaryStats.overall.average.toFixed(2)}</td>
                            <td className="p-2">{summaryStats.overall.strikeRate.toFixed(1)}</td>
                            <td className="p-2">{summaryStats.overall.hundreds}/{summaryStats.overall.fifties}</td>
                            <td className="p-2 text-amber-400">{summaryStats.overall.wickets}</td>
                            <td className="p-2 font-mono">{summaryStats.overall.bestBowling}</td>
                            <td className="p-2">{summaryStats.overall.bowlingAverage.toFixed(2)}</td>
                            <td className="p-2">{summaryStats.overall.economy.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* 📋 Tactical Scouting & Strategy Card */}
            {player && (
                <div className="mb-6 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md text-white">
                    <div className="flex items-center space-x-2 mb-2 pb-2 border-b border-slate-800">
                        <span className="text-xl">📋</span>
                        <div>
                            <h3 className="font-bold text-sm tracking-wide text-teal-400">Scouting & Tactical Overview</h3>
                            <p className="text-[10px] text-slate-400">Performance characteristics, tactical strengths and role profile</p>
                        </div>
                    </div>
                    <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed">
                        {(() => {
                            const activeFmt = selectedFormat === 'Summary' ? Format.T20 : (selectedFormat as Format);
                            const fmtStats = player.stats[activeFmt] || { runs: 0, wickets: 0, matches: 0, average: 0, strikeRate: 0, economy: 0 };
                            return generateScoutReport(player, fmtStats as any);
                        })()}
                    </div>
                </div>
            )}

            {/* Player Performance Trend Card */}
            <div className="mb-6 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/5 rounded-2xl p-4 shadow-sm">
                <div className="flex justify-between items-center mb-1">
                    <h3 className="font-bold text-sm tracking-wide uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        📈 Player Performance Trend
                    </h3>
                    
                    {/* Metric Toggle Buttons */}
                    <div className="flex bg-slate-200 dark:bg-slate-900/60 p-1 rounded-lg text-[9px] font-black uppercase tracking-wider gap-1">
                        <button 
                            onClick={() => { playSFX('click'); setTrendMetric('batting'); }} 
                            className={`px-2 py-1 rounded transition-all ${trendMetric === 'batting' ? 'bg-teal-500 text-slate-950 font-bold shadow' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Batting Avg
                        </button>
                        <button 
                            onClick={() => { playSFX('click'); setTrendMetric('bowling'); }} 
                            className={`px-2 py-1 rounded transition-all ${trendMetric === 'bowling' ? 'bg-teal-500 text-slate-950 font-bold shadow' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Economy
                        </button>
                    </div>
                </div>

                <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-4 font-mono">
                    Visualizing 5-match form history for <span className="font-semibold text-teal-400">{selectedFormat === 'Summary' ? 'Active Format' : 'This View'}</span>
                </p>

                <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData} margin={{ top: 10, right: 15, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:hidden" />
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" className="hidden dark:block" />
                            <XAxis dataKey="matchNumber" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                            <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} domain={['auto', 'auto']} />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: 'rgba(30, 41, 59, 0.95)', 
                                    border: '1px solid rgba(255,255,255,0.1)', 
                                    borderRadius: '8px', 
                                    fontSize: '11px',
                                    color: '#fff' 
                                }} 
                            />
                            {trendMetric === 'batting' ? (
                                <Line 
                                    type="monotone" 
                                    dataKey="battingAverage" 
                                    name="Bat Average" 
                                    stroke="#0d9488" 
                                    strokeWidth={3} 
                                    dot={{ r: 4, strokeWidth: 1 }} 
                                    activeDot={{ r: 6 }} 
                                />
                            ) : (
                                <Line 
                                    type="monotone" 
                                    dataKey="bowlingEconomy" 
                                    name="Economy Rate" 
                                    stroke="#f43f5e" 
                                    strokeWidth={3} 
                                    dot={{ r: 4, strokeWidth: 1 }} 
                                    activeDot={{ r: 6 }} 
                                />
                            )}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
            
            {/* Scout Report Section */}
            <div className="mb-6 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/5 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-teal-500">🔍</span>
                    <h3 className="font-bold text-sm tracking-widest uppercase text-slate-500 dark:text-slate-400">Scout Report</h3>
                </div>
                <div className="bg-white dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 italic font-medium">
                        "{generateScoutReport(player, initialFormat)}"
                    </p>
                </div>
                <div className="mt-4 flex gap-4">
                    <div className="flex-1 text-center font-mono py-2 bg-slate-100 dark:bg-slate-900 rounded-lg">
                        <p className="text-[9px] text-slate-500 uppercase font-black">Primary Style</p>
                        <p className="text-xs font-bold text-teal-400">{player.style}</p>
                    </div>
                    <div className="flex-1 text-center font-mono py-2 bg-slate-100 dark:bg-slate-900 rounded-lg">
                        <p className="text-[9px] text-slate-500 uppercase font-black">Weakness</p>
                        <p className="text-xs font-bold text-red-400">{player.weaknesses?.[0] || 'NONE'}</p>
                    </div>
                </div>
            </div>

            {/* 1. 🛰️ Satellite Ground Analysis & Wagon Wheel */}
            <div className="mb-6 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/5 rounded-2xl p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div>
                        <h3 className="font-bold text-sm tracking-wide uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            🛰️ Satellite Ground Analysis & Wagon Wheel
                        </h3>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono mt-0.5">
                            {groundAndZoneStats?.isBatsman 
                                ? 'Interactive visual mapping of where this batsman secures most of their runs across the field.'
                                : 'Interactive coordinate mapping of bowling delivery lengths on the pitch.'
                            }
                        </p>
                    </div>

                    <button
                        onClick={() => { playSFX('click'); setShowShotSelectionLab(!showShotSelectionLab); }}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-all flex items-center gap-1.5 self-start sm:self-auto ${
                            showShotSelectionLab 
                                ? 'bg-teal-500 border-teal-400 text-slate-950 shadow-md shadow-teal-500/20' 
                                : 'bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border-teal-500/30 text-teal-400 hover:border-teal-400'
                        }`}
                    >
                        <span>🎯 {showShotSelectionLab ? 'Close Shot Lab' : 'Shot Selection & Wagon Wheel Lab'}</span>
                    </button>
                </div>

                {showShotSelectionLab ? (
                    <div className="pt-2">
                        <ShotSelectionWagonWheel gameData={gameData} initialBatter={player} onBack={() => setShowShotSelectionLab(false)} />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    {/* Visual Ground Graphic Pane */}
                    <div className="md:col-span-7 flex justify-center bg-slate-100/50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-inner">
                        {groundAndZoneStats?.isBatsman ? (
                            <div className="relative">
                                <svg viewBox="0 0 300 300" className="w-[240px] h-[240px] mx-auto select-none">
                                    {/* Turf Outer Ring */}
                                    <circle cx="150" cy="150" r="135" fill="#15803d" stroke="#16a34a" strokeWidth="3" />
                                    
                                    {/* Boundary Line */}
                                    <circle cx="150" cy="150" r="122" fill="none" stroke="#fef08a" strokeWidth="2" strokeDasharray="4 4" />
                                    
                                    {/* Inner 30 Yard Circle */}
                                    <circle cx="150" cy="150" r="75" fill="none" stroke="#86efac" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />

                                    {/* Pitch in the Center */}
                                    <rect x="142" y="115" width="16" height="70" fill="#eab308" stroke="#ca8a04" strokeWidth="1" rx="2" />
                                    <line x1="142" y1="125" x2="158" y2="125" stroke="white" strokeWidth="1" />
                                    <line x1="142" y1="175" x2="158" y2="175" stroke="white" strokeWidth="1" />

                                    {/* Off Side vs On Side demarcation line */}
                                    <line x1="150" y1="15" x2="150" y2="285" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeDasharray="4 4" />

                                    {/* Slices of Field & Laser pointer indicators */}
                                    {groundAndZoneStats?.zoneData.map((zone) => {
                                        const midAngle = (zone.angleStart + zone.angleEnd) / 2;
                                        const rad = (midAngle * Math.PI) / 180;
                                        const arrowX = 150 + Math.cos(rad) * 110;
                                        const arrowY = 150 + Math.sin(rad) * 110;
                                        
                                        const isActive = activeZoneId === zone.id || (!activeZoneId && zone.id === 'cover');
                                        return (
                                            <g key={zone.id}>
                                                {/* Connecting beam laser */}
                                                <line 
                                                    x1="150" 
                                                    y1="150" 
                                                    x2={arrowX} 
                                                    y2={arrowY} 
                                                    stroke={isActive ? '#06b6d4' : 'rgba(255,255,255,0.15)'} 
                                                    strokeWidth={isActive ? 3 : 1}
                                                    className="transition-all duration-300"
                                                />
                                                {/* Target node bubble */}
                                                <circle 
                                                    cx={arrowX} 
                                                    cy={arrowY} 
                                                    r={isActive ? 13 : 9} 
                                                    fill={isActive ? '#06b6d4' : 'rgba(15,23,42,0.75)'} 
                                                    stroke={isActive ? '#fff' : 'rgba(255,255,255,0.45)'} 
                                                    strokeWidth={1.5}
                                                    className="cursor-pointer transition-all duration-300 hover:scale-125"
                                                    onClick={() => { playSFX('click'); setActiveZoneId(zone.id); }}
                                                />
                                                <text 
                                                    x={arrowX} 
                                                    y={arrowY + 3} 
                                                    fill="#fff" 
                                                    fontSize="7px" 
                                                    fontWeight="black" 
                                                    textAnchor="middle"
                                                    className="pointer-events-none"
                                                >
                                                    {zone.percentage}%
                                                </text>
                                            </g>
                                        );
                                    })}
                                </svg>
                                <span className="absolute left-1 top-1 text-[9px] font-black uppercase text-white/40 tracking-wider">Off-Side</span>
                                <span className="absolute right-1 top-1 text-[9px] font-black uppercase text-white/40 tracking-wider">On-Side</span>
                            </div>
                        ) : (
                            <svg viewBox="0 0 200 250" className="w-[180px] h-[225px] mx-auto select-none">
                                {/* Stumps boundary background */}
                                <g transform="translate(70, 15)">
                                    <line x1="20" y1="10" x2="20" y2="45" stroke="#94a3b8" strokeWidth="3" />
                                    <line x1="30" y1="10" x2="30" y2="45" stroke="#94a3b8" strokeWidth="3" />
                                    <line x1="40" y1="10" x2="40" y2="45" stroke="#94a3b8" strokeWidth="3" />
                                    <line x1="17" y1="10" x2="43" y2="10" stroke="#f43f5e" strokeWidth="2" />
                                </g>

                                {/* Delivery Channels */}
                                {[
                                    { id: 'short_length', label: 'SHORT PITCH BOUNCER', y: 180, h: 45, fill: '#eab308' },
                                    { id: 'good_length', label: 'GOOD LENGTH (CORRIDOR)', y: 130, h: 45, fill: '#10b981' },
                                    { id: 'full_length', label: 'FULL LENGTH (DRIVE)', y: 80, h: 45, fill: '#6366f1' },
                                    { id: 'full_toss', label: 'YORKER / FULL TOSS', y: 55, h: 22, fill: '#ef4444' }
                                ].map((chan) => {
                                    const isActive = activeZoneId === chan.id || (!activeZoneId && chan.id === 'good_length');
                                    return (
                                        <g key={chan.id} className="cursor-pointer" onClick={() => { playSFX('click'); setActiveZoneId(chan.id); }}>
                                            <rect 
                                                x="20" y={chan.y} width="160" height={chan.h} 
                                                fill={isActive ? chan.fill : chan.fill + '22'} 
                                                stroke={chan.fill} strokeWidth={isActive ? 2 : 0.5}
                                                className="transition-all duration-200"
                                                rx="4"
                                            />
                                            <text 
                                                x="100" y={chan.y + chan.h/2 + 3} 
                                                fill={isActive ? (chan.id === 'full_toss' || chan.id === 'full_length' ? '#ffffff' : '#0f172a') : '#94a3b8'} 
                                                fontSize="8px" 
                                                fontWeight="black" 
                                                textAnchor="middle" 
                                                className="pointer-events-none uppercase tracking-wider"
                                            >
                                                {chan.label}
                                            </text>
                                        </g>
                                    );
                                })}
                            </svg>
                        )}
                    </div>

                    {/* Zone Dynamic Descriptive Pane */}
                    <div className="md:col-span-5 flex flex-col justify-between h-full space-y-4">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm h-full flex flex-col justify-center">
                            <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest font-mono">Selected Zone Detail</span>
                            <h4 className="font-extrabold text-lg text-slate-800 dark:text-white mt-1">
                                {activeZone?.name}
                            </h4>
                            <div className="mt-3 space-y-2">
                                <div className="flex justify-between border-b border-slate-100 dark:border-white/5 pb-1">
                                    <span className="text-xs text-slate-500">Run Allocation Ratio</span>
                                    <span className="font-bold font-mono text-cyan-400">{activeZone?.percentage}%</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-100 dark:border-white/5 pb-1">
                                    <span className="text-xs text-slate-500">
                                        {groundAndZoneStats?.isBatsman ? 'Est. Runs Scored' : 'Est. Wickets Captured'}
                                    </span>
                                    <span className="font-bold font-mono text-teal-500">
                                        {groundAndZoneStats?.isBatsman ? activeZone?.runs : activeZone?.wickets}
                                    </span>
                                </div>
                                {activeZone?.description && (
                                    <p className="text-[11px] text-slate-400 italic mt-2.5 leading-relaxed font-mono">
                                        "{activeZone?.description}"
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Interactive Zone Buttons Mini-Dashboard */}
                        <div className="flex flex-wrap gap-1.5 justify-center">
                            {groundAndZoneStats?.zoneData.map((z) => (
                                <button
                                    key={z.id}
                                    onClick={() => { playSFX('click'); setActiveZoneId(z.id); }}
                                    className={`px-2.5 py-1 text-[10px] uppercase font-black tracking-wider rounded-lg border transition-all ${
                                        (activeZoneId === z.id || (!activeZoneId && z.id === 'cover') || (!activeZoneId && z.id === 'good_length'))
                                            ? 'bg-teal-500 border-teal-500 text-slate-950 font-bold'
                                            : 'bg-white hover:bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                                    }`}
                                >
                                    {z.name.replace('Drive', '').replace('Slider', '').replace('Smash', '').replace('Ball', '').trim()}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                )}
            </div>

            {/* 2. 🏟️ Career Ground Records Table & Venue Multiplier */}
            <div className="mb-6 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/5 rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-sm tracking-wide uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
                    🏟️ Career Ground Records & Stadium Stats
                </h3>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-4 font-mono">
                    Match distributions and productivity metrics compiled across all main league host stadiums.
                </p>

                {/* Favorite Ground Crown Section */}
                {groundAndZoneStats?.favoriteGround && (
                    <div className="mb-5 flex items-center gap-3 bg-teal-500/10 border border-teal-500/20 p-3.5 rounded-xl">
                        <div className="text-2xl animate-pulse">👑</div>
                        <div>
                            <p className="text-[9px] uppercase font-bold tracking-wider text-teal-400 font-mono">Favorite Ground (Most Productive)</p>
                            <h4 className="font-extrabold text-sm text-slate-800 dark:text-teal-400">{groundAndZoneStats.favoriteGround.name} ({groundAndZoneStats.favoriteGround.code})</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                                Secured <span className="font-bold text-teal-400">{groundAndZoneStats.favoriteGround.runs}</span> runs in <span className="font-semibold text-teal-400">{groundAndZoneStats.favoriteGround.matches}</span> matches at an overall venue record of <span className="font-bold text-amber-500">{groundAndZoneStats.favoriteGround.avg} Avg</span> indices!
                            </p>
                        </div>
                    </div>
                )}

                {/* Ground Comparison Recharts BarChart */}
                <div className="h-44 w-full mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                            data={groundAndZoneStats?.groundStats} 
                            layout="vertical" 
                            margin={{ top: 5, right: 15, left: -20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:hidden" />
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" className="hidden dark:block" />
                            <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                            <YAxis dataKey="code" type="category" tick={{ fill: '#94a3b8', fontSize: 10 }} width={35} />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: 'rgba(30, 41, 59, 0.95)', 
                                    border: '1px solid rgba(255,255,255,0.1)', 
                                    borderRadius: '8px', 
                                    fontSize: '11px',
                                    color: '#fff' 
                                }} 
                            />
                            <Bar dataKey={groundCompareMetric} name={groundCompareMetric === 'runs' ? 'Runs Scored' : 'Wickets Taken'} radius={[0, 4, 4, 0]}>
                                {groundAndZoneStats?.groundStats.map((entry, idx) => (
                                    <Cell 
                                        key={`cell-${idx}`} 
                                        fill={entry.code === groundAndZoneStats?.favoriteGround?.code ? '#0d9488' : '#475569'} 
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Segment Toggles & Stadium Breakdown table */}
                <div className="flex justify-between items-center mb-3">
                    <span className="text-[11px] font-bold text-slate-500 tracking-wider uppercase font-mono">Stadium Breakdown Details</span>
                    <div className="flex bg-slate-200 dark:bg-slate-900/60 p-1 rounded-lg text-[9px] font-black uppercase tracking-wider gap-1">
                        <button 
                            onClick={() => { playSFX('click'); setGroundCompareMetric('runs'); }} 
                            className={`px-2 py-0.5 rounded transition-all ${groundCompareMetric === 'runs' ? 'bg-teal-500 text-slate-950 font-bold shadow' : 'text-slate-500'}`}
                        >
                            Runs Ratio
                        </button>
                        <button 
                            onClick={() => { playSFX('click'); setGroundCompareMetric('wickets'); }} 
                            className={`px-2 py-0.5 rounded transition-all ${groundCompareMetric === 'wickets' ? 'bg-teal-500 text-slate-950 font-bold shadow' : 'text-slate-500'}`}
                        >
                            Wickets
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-center border-t border-slate-200 dark:border-white/10 pt-2">
                        <thead>
                            <tr className="bg-slate-100 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 font-bold font-mono">
                                <th className="p-2 text-left">Stadium Node</th>
                                <th className="p-2">Mat</th>
                                <th className="p-2">Runs</th>
                                <th className="p-2">Avg</th>
                                <th className="p-2">Wkt</th>
                                <th className="p-2">Econ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-mono">
                            {groundAndZoneStats?.groundStats.map((st, idx) => (
                                <tr key={st.code} className={`hover:bg-slate-100/50 dark:hover:bg-white/5 ${st.code === groundAndZoneStats?.favoriteGround?.code ? 'bg-teal-500/5 font-semibold text-teal-400' : ''}`}>
                                    <td className="p-2 text-left text-slate-700 dark:text-slate-300 font-bold flex flex-col sm:flex-row sm:items-center sm:gap-1.5">
                                        <span className="text-teal-500">{st.code}</span>
                                        <span className="text-[9px] text-slate-400 font-normal">({st.pitch.replace(' Sporting', '').replace(' Spinner’s', '').replace(' Surface', '')})</span>
                                    </td>
                                    <td className="p-2 text-slate-500 dark:text-slate-400">{st.matches}</td>
                                    <td className="p-2 text-teal-500 font-bold">{st.runs}</td>
                                    <td className="p-2 text-slate-400">{st.avg}</td>
                                    <td className="p-2 text-rose-500 font-bold">{st.wickets}</td>
                                    <td className="p-2 text-indigo-400">{st.econ}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 3. 📊 Strike Draft Manhattan (Combo Chart) */}
            <div className="mb-6 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/5 rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-sm tracking-wide uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
                    📊 Strike Draft Manhattan (Innings-by-Innings History)
                </h3>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-4 font-mono">
                    Overview Manhattan graph mapping runs scored/wickets against strike/economy speed draft overlays.
                </p>

                <div className="h-52 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart 
                            data={groundAndZoneStats?.manInnings} 
                            margin={{ top: 10, right: -10, left: -25, bottom: 0 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:hidden" />
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" className="hidden dark:block" />
                            <XAxis dataKey="innLabel" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                            <YAxis 
                                yAxisId="left" 
                                tick={{ fill: '#94a3b8', fontSize: 10 }} 
                                label={{ value: groundAndZoneStats?.isBatsman ? 'Runs Scored' : 'Wkts Taken', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: 8, fontWeight: 'bold' } }} 
                            />
                            <YAxis 
                                yAxisId="right" 
                                orientation="right" 
                                scale="linear"
                                domain={groundAndZoneStats?.isBatsman ? [0, 200] : [0, 15]}
                                tick={{ fill: '#94a3b8', fontSize: 10 }} 
                                label={{ value: groundAndZoneStats?.isBatsman ? 'Strike Rate' : 'Economy Rate', angle: 90, position: 'insideRight', style: { fill: '#94a3b8', fontSize: 8, fontWeight: 'bold' } }} 
                            />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: 'rgba(30, 41, 59, 0.95)', 
                                    border: '1px solid rgba(255,255,255,0.1)', 
                                    borderRadius: '8px', 
                                    fontSize: '11px',
                                    color: '#fff' 
                                }} 
                            />
                            {groundAndZoneStats?.isBatsman ? (
                                <>
                                    <Bar yAxisId="left" dataKey="runs" name="Runs" fill="#0d9488" radius={[4, 4, 0, 0]}>
                                        {groundAndZoneStats?.manInnings.map((entry, idx) => (
                                            <Cell key={`cell-${idx}`} fill={entry.runs >= 50 ? '#10b981' : entry.runs >= 30 ? '#0d9488' : '#475569'} />
                                        ))}
                                    </Bar>
                                    <Line yAxisId="right" type="monotone" dataKey="strikeRate" name="Strike Rate" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, strokeWidth: 1 }} activeDot={{ r: 6 }} />
                                </>
                            ) : (
                                <>
                                    <Bar yAxisId="left" dataKey="wickets" name="Wickets" fill="#f43f5e" radius={[4, 4, 0, 0]}>
                                        {groundAndZoneStats?.manInnings.map((entry, idx) => (
                                            <Cell key={`cell-${idx}`} fill={entry.wickets >= 3 ? '#ef4444' : entry.wickets >= 1 ? '#f43f5e' : '#64748b'} />
                                        ))}
                                    </Bar>
                                    <Line yAxisId="right" type="monotone" dataKey="economy" name="Economy Rate" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, strokeWidth: 1 }} activeDot={{ r: 6 }} />
                                </>
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                <div className="mt-3 bg-slate-100 dark:bg-slate-900/40 p-3 rounded-xl text-[10.5px] leading-relaxed border border-slate-200/50 dark:border-white/5">
                    {groundAndZoneStats?.isBatsman ? (
                        <p className="text-slate-500 dark:text-slate-400 font-mono">
                            📊 <span className="text-emerald-400 font-bold">Green bars</span> represent milestone 50+ matches. <span className="text-teal-400 font-bold">Teal bars</span> show 30+ contributions. Overlaid <span className="text-yellow-500 font-bold">Orange Line</span> measures relative batting strike rate acceleration.
                        </p>
                    ) : (
                        <p className="text-slate-500 dark:text-slate-400 font-mono">
                            📊 <span className="text-red-500 font-bold">Red bars</span> show key 3+ wicket hauls. Overlaid <span className="text-indigo-400 font-bold">Indigo Line</span> evaluates tight economy control (lower curve is more superior).
                        </p>
                    )}
                </div>
            </div>

            <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 mb-4 shadow-sm">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                    {/* Domestic formats */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider mr-1">Domestic:</span>
                        {['T20', 'List A', 'FC', 'Sixty'].map(fmt => (
                            <button
                                key={fmt}
                                onClick={() => { playSFX('click'); setSelectedFormat(fmt); }}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                    selectedFormat === fmt
                                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                            >
                                {fmt}
                            </button>
                        ))}
                    </div>

                    {/* International formats */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black text-cyan-400 uppercase tracking-wider mr-1">International:</span>
                        {['Test', 'ODI', 'T20i'].map(fmt => (
                            <button
                                key={fmt}
                                onClick={() => { playSFX('click'); setSelectedFormat(fmt); }}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                    selectedFormat === fmt
                                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                            >
                                {fmt}
                            </button>
                        ))}
                        <button
                            onClick={() => { playSFX('click'); setSelectedFormat('Summary'); }}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                selectedFormat === 'Summary'
                                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                        >
                            ⭐ Grand Total
                        </button>
                    </div>
                </div>
            </div>
            
            {selectedFormat !== 'Summary' && (
            <div className="bg-gray-100 dark:bg-gray-800/50 p-4 rounded-lg">
                <h3 className="font-bold text-lg mb-2 text-center">{selectedFormat} Details</h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div><p className="font-bold text-xl">{stats.matches}</p><p className="text-xs text-gray-500">Matches</p></div>
                    <div><p className="font-bold text-xl">{stats.runs}</p><p className="text-xs text-gray-500">Runs</p></div>
                    <div><p className="font-bold text-xl">{stats.highestScore}</p><p className="text-xs text-gray-500">Highest</p></div>
                    <div><p className="font-bold text-xl">{stats.average.toFixed(2)}</p><p className="text-xs text-gray-500">Average</p></div>
                    <div><p className="font-bold text-xl">{stats.strikeRate.toFixed(2)}</p><p className="text-xs text-gray-500">Strike Rate</p></div>
                    <div><p className="font-bold text-xl">{stats.fifties}</p><p className="text-xs text-gray-500">50s</p></div>
                    <div><p className="font-bold text-xl">{stats.hundreds}</p><p className="text-xs text-gray-500">100s</p></div>
                    <div><p className="font-bold text-xl">{stats.fours}</p><p className="text-xs text-gray-500">Fours</p></div>
                    <div><p className="font-bold text-xl">{stats.sixes}</p><p className="text-xs text-gray-500">Sixes</p></div>
                </div>
                 <h3 className="font-bold text-lg mt-4 mb-2 text-center">Bowling Stats</h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div><p className="font-bold text-xl">{stats.wickets}</p><p className="text-xs text-gray-500">Wickets</p></div>
                    <div><p className="font-bold text-xl">{stats.bowlingAverage.toFixed(2)}</p><p className="text-xs text-gray-500">Average</p></div>
                    <div><p className="font-bold text-xl">{stats.economy.toFixed(2)}</p><p className="text-xs text-gray-500">Economy</p></div>
                    <div><p className="font-bold text-xl">{stats.bestBowling}</p><p className="text-xs text-gray-500">Best</p></div>
                    <div><p className="font-bold text-xl">{stats.threeWicketHauls}</p><p className="text-xs text-gray-500">3-fers</p></div>
                    <div><p className="font-bold text-xl">{stats.fiveWicketHauls}</p><p className="text-xs text-gray-500">5-fers</p></div>
                </div>
                 <h3 className="font-bold text-lg mt-4 mb-2 text-center">Milestones</h3>
                <div className="grid grid-cols-2 gap-2 text-center">
                    <div><p className="font-bold text-xl">{stats.fastestFifty > 0 ? `${stats.fastestFifty}` : '-'}</p><p className="text-xs text-gray-500">Fastest 50 (balls)</p></div>
                    <div><p className="font-bold text-xl">{stats.fastestHundred > 0 ? `${stats.fastestHundred}` : '-'}</p><p className="text-xs text-gray-500">Fastest 100 (balls)</p></div>
                </div>

                {/* Phase Stats (T20 and One-Day) */}
                {(selectedFormat.includes('T20') || selectedFormat.includes('One-Day') || selectedFormat.includes('Cup')) && stats.phaseStats && (
                    <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                        <h3 className="font-bold text-lg mb-3 text-center text-teal-600 dark:text-teal-400">Phase-wise Performance</h3>
                        
                        <div className="space-y-4">
                            {/* Batting Phases */}
                            <div className="bg-white dark:bg-gray-900/40 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                                <h4 className="font-bold text-xs uppercase tracking-wider text-left text-gray-500 mb-2">Batting Phase Records</h4>
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                            <th className="p-1.5 text-left">Phase</th>
                                            <th className="p-1.5 text-center">Runs</th>
                                            <th className="p-1.5 text-center">Balls</th>
                                            <th className="p-1.5 text-center">SR</th>
                                            <th className="p-1.5 text-center">Outs</th>
                                            <th className="p-1.5 text-center">Avg</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {[
                                            { code: 'pp', name: 'Powerplay (PP)' },
                                            { code: 'mo', name: 'Middle Overs (MO)' },
                                            { code: 'do', name: 'Death Overs (DO)' }
                                        ].map(ph => {
                                            // @ts-ignore
                                            const st = stats.phaseStats.batting?.[ph.code] || { runs: 0, balls: 0, dismissals: 0 };
                                            const sr = st.balls > 0 ? ((st.runs / st.balls) * 100).toFixed(1) : '0.0';
                                            const avg = st.dismissals > 0 ? (st.runs / st.dismissals).toFixed(1) : st.runs > 0 ? st.runs.toFixed(1) : '-';
                                            return (
                                                <tr key={ph.code}>
                                                    <td className="p-1.5 font-semibold text-left">{ph.name}</td>
                                                    <td className="p-1.5 text-center font-bold">{st.runs}</td>
                                                    <td className="p-1.5 text-center text-gray-500">{st.balls}</td>
                                                    <td className="p-1.5 text-center text-amber-600 dark:text-amber-400 font-medium">{sr}</td>
                                                    <td className="p-1.5 text-center text-gray-500">{st.dismissals}</td>
                                                    <td className="p-1.5 text-center font-semibold">{avg}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Bowling Phases */}
                            <div className="bg-white dark:bg-gray-900/40 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                                <h4 className="font-bold text-xs uppercase tracking-wider text-left text-gray-500 mb-2">Bowling Phase Records</h4>
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                            <th className="p-1.5 text-left">Phase</th>
                                            <th className="p-1.5 text-center">Wkts</th>
                                            <th className="p-1.5 text-center">Runs</th>
                                            <th className="p-1.5 text-center">Balls</th>
                                            <th className="p-1.5 text-center">Econ</th>
                                            <th className="p-1.5 text-center">SR</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {[
                                            { code: 'pp', name: 'Powerplay (PP)' },
                                            { code: 'mo', name: 'Middle Overs (MO)' },
                                            { code: 'do', name: 'Death Overs (DO)' }
                                        ].map(ph => {
                                            // @ts-ignore
                                            const st = stats.phaseStats.bowling?.[ph.code] || { wickets: 0, runsConceded: 0, ballsBowled: 0 };
                                            const econ = st.ballsBowled > 0 ? ((st.runsConceded / st.ballsBowled) * 6).toFixed(2) : '0.00';
                                            const sr = st.wickets > 0 ? (st.ballsBowled / st.wickets).toFixed(1) : '-';
                                            return (
                                                <tr key={ph.code}>
                                                    <td className="p-1.5 font-semibold text-left">{ph.name}</td>
                                                    <td className="p-1.5 text-center font-bold text-teal-600 dark:text-teal-400">{st.wickets}</td>
                                                    <td className="p-1.5 text-center text-gray-500">{st.runsConceded}</td>
                                                    <td className="p-1.5 text-center text-gray-500">{st.ballsBowled}</td>
                                                    <td className="p-1.5 text-center font-medium">{econ}</td>
                                                    <td className="p-1.5 text-center text-gray-500">{sr}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Batting Position Stats */}
                {stats.positionStats && Object.keys(stats.positionStats).length > 0 && (
                    <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                        <h3 className="font-bold text-lg mb-3 text-center text-teal-600 dark:text-teal-400">Batting by Position (All Formats)</h3>
                        <div className="bg-white dark:bg-gray-900/40 p-3 rounded-lg border border-gray-100 dark:border-gray-800 overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                        <th className="p-1.5 text-left">Position</th>
                                        <th className="p-1.5 text-center">Innings</th>
                                        <th className="p-1.5 text-center">Runs</th>
                                        <th className="p-1.5 text-center">Average</th>
                                        <th className="p-1.5 text-center">SR</th>
                                        <th className="p-1.5 text-center">30s / 50s / 100s</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {Object.entries(stats.positionStats)
                                        .map(([posStr, st]) => ({ pos: Number(posStr), ...(st as any) }))
                                        .filter(p => p.innings > 0)
                                        .sort((a, b) => a.pos - b.pos)
                                        .map(p => {
                                            const avg = p.dismissals > 0 ? (p.runs / p.dismissals).toFixed(1) : p.runs > 0 ? p.runs.toFixed(1) : '-';
                                            const sr = p.balls > 0 ? ((p.runs / p.balls) * 100).toFixed(1) : '0.0';
                                            const label = p.pos === 1 || p.pos === 2 ? `#${p.pos} Opener` : p.pos === 3 ? `#3 One Down` : `#${p.pos}`;
                                            return (
                                                <tr key={p.pos}>
                                                    <td className="p-1.5 font-semibold text-left text-gray-700 dark:text-gray-300">{label}</td>
                                                    <td className="p-1.5 text-center">{p.innings}</td>
                                                    <td className="p-1.5 text-center font-bold text-teal-600 dark:text-teal-400">{p.runs}</td>
                                                    <td className="p-1.5 text-center font-semibold">{avg}</td>
                                                    <td className="p-1.5 text-center text-gray-500">{sr}</td>
                                                    <td className="p-1.5 text-center text-gray-500 font-medium">
                                                        {p.thirties || 0} / {p.fifties || 0} / {p.hundreds || 0}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    {Object.values(stats.positionStats).filter((st: any) => st.innings > 0).length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-4 text-center text-gray-500 italic">No innings recorded at any position yet.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
            )}
            </>
            )}

            {/* TAB 2: CAPTAINCY RECORDS */}
            {activeProfileTab === 'captaincy' && (
                <div className="space-y-6">
                    {/* Universal Filter Bar */}
                    <UniversalFilterBar
                        filterState={filterState}
                        onChange={setFilterState}
                        teams={gameData?.teams || []}
                        availableSeasons={Array.from({ length: gameData?.currentSeason || 1 }, (_, i) => i + 1)}
                        hideRole={true}
                    />

                    {/* Captaincy Header Overview */}
                    <div className="bg-slate-900/90 border border-amber-500/40 rounded-2xl p-5 shadow-xl text-white">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-xl">
                                    <Crown className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                                        Captaincy Career Record
                                        <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                            {captaincyRecords?.totalMatches || 0} Matches
                                        </span>
                                    </h3>
                                    <p className="text-xs text-slate-400 font-medium">Leadership metrics across all domestic and international fixtures</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-center">
                                    <div className="text-xs text-slate-400 font-bold uppercase">Win Ratio</div>
                                    <div className="text-xl font-black text-emerald-400">{captaincyRecords?.winPct || 0}%</div>
                                </div>
                                <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-center">
                                    <div className="text-xs text-slate-400 font-bold uppercase">Loss Ratio</div>
                                    <div className="text-xl font-black text-rose-400">{captaincyRecords?.lossPct || 0}%</div>
                                </div>
                            </div>
                        </div>

                        {/* Top Key Captaincy Stats Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-center">
                                <div className="text-slate-400 text-[10px] font-bold uppercase">Matches as Captain</div>
                                <div className="text-2xl font-black text-white mt-1">{captaincyRecords?.totalMatches || 0}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5">W: {captaincyRecords?.wins || 0} | L: {captaincyRecords?.losses || 0}</div>
                            </div>
                            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-center">
                                <div className="text-slate-400 text-[10px] font-bold uppercase">Ties & No Results</div>
                                <div className="text-2xl font-black text-indigo-400 mt-1">{(captaincyRecords?.ties || 0) + (captaincyRecords?.noResults || 0)}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5">Tied: {captaincyRecords?.ties || 0} | NR: {captaincyRecords?.noResults || 0}</div>
                            </div>
                            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-center">
                                <div className="text-slate-400 text-[10px] font-bold uppercase">Winning Streak</div>
                                <div className="text-2xl font-black text-emerald-400 mt-1 flex items-center justify-center gap-1">
                                    <Flame className="w-5 h-5 text-amber-400" />
                                    {captaincyRecords?.winningStreak || 0}
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5">Consecutive wins</div>
                            </div>
                            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-center">
                                <div className="text-slate-400 text-[10px] font-bold uppercase">Losing Streak</div>
                                <div className="text-2xl font-black text-rose-400 mt-1">{captaincyRecords?.losingStreak || 0}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5">Consecutive losses</div>
                            </div>
                        </div>

                        {/* Captaincy Milestones & Extremes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
                                <div className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <TrendingUp className="w-4 h-4" />
                                    Team Highs & Lows as Captain
                                </div>
                                <div className="flex justify-between items-center text-xs py-1 border-b border-slate-900">
                                    <span className="text-slate-400">Highest Team Total:</span>
                                    <span className="font-bold text-emerald-400">
                                        {captaincyRecords?.highestTeamScore.score ? `${captaincyRecords.highestTeamScore.score}/${captaincyRecords.highestTeamScore.wickets} vs ${captaincyRecords.highestTeamScore.vsTeamName}` : 'None'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs py-1 border-b border-slate-900">
                                    <span className="text-slate-400">Lowest Team Total:</span>
                                    <span className="font-bold text-rose-400">
                                        {captaincyRecords?.lowestTeamScore.score ? `${captaincyRecords.lowestTeamScore.score}/${captaincyRecords.lowestTeamScore.wickets} vs ${captaincyRecords.lowestTeamScore.vsTeamName}` : 'None'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs py-1">
                                    <span className="text-slate-400">Highest Successful Chase:</span>
                                    <span className="font-bold text-amber-400">
                                        {captaincyRecords?.highestSuccessfulChase.target ? `Target ${captaincyRecords.highestSuccessfulChase.target} (${captaincyRecords.highestSuccessfulChase.score}/${captaincyRecords.highestSuccessfulChase.wickets} vs ${captaincyRecords.highestSuccessfulChase.vsTeamName})` : 'None'}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
                                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Trophy className="w-4 h-4" />
                                    Notable Match Results
                                </div>
                                <div className="flex justify-between items-center text-xs py-1 border-b border-slate-900">
                                    <span className="text-slate-400">Biggest Victory:</span>
                                    <span className="font-bold text-emerald-400 truncate max-w-[200px]">
                                        {captaincyRecords?.biggestWin.marginText !== 'None' ? `${captaincyRecords?.biggestWin.marginText} (vs ${captaincyRecords?.biggestWin.vsTeamName})` : 'None'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs py-1">
                                    <span className="text-slate-400">Biggest Defeat:</span>
                                    <span className="font-bold text-rose-400 truncate max-w-[200px]">
                                        {captaincyRecords?.biggestDefeat.marginText !== 'None' ? `${captaincyRecords?.biggestDefeat.marginText} (vs ${captaincyRecords?.biggestDefeat.vsTeamName})` : 'None'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Format by Format Captaincy Breakdown Table */}
                    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg overflow-x-auto">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
                            <Crown className="w-4 h-4 text-amber-400" />
                            Format-by-Format Captaincy Breakdown & Personal Impact
                        </h4>
                        <table className="w-full text-xs text-center border-collapse">
                            <thead>
                                <tr className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                    <th className="p-2.5 text-left">Format</th>
                                    <th className="p-2.5">Mat</th>
                                    <th className="p-2.5">Won</th>
                                    <th className="p-2.5">Lost</th>
                                    <th className="p-2.5">Win %</th>
                                    <th className="p-2.5 text-emerald-400">Runs (C)</th>
                                    <th className="p-2.5">Bat Avg</th>
                                    <th className="p-2.5">SR</th>
                                    <th className="p-2.5 text-rose-400">Wkts (C)</th>
                                    <th className="p-2.5">Bowl Avg</th>
                                    <th className="p-2.5">Econ</th>
                                    <th className="p-2.5">Best Bowl</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800 text-slate-300">
                                {Object.values(captaincyRecords?.byFormat || {}).map((fStat) => (
                                    <tr key={fStat.formatName} className="hover:bg-slate-800/50">
                                        <td className="p-2.5 text-left font-bold text-white">{fStat.formatName}</td>
                                        <td className="p-2.5 font-semibold">{fStat.matches}</td>
                                        <td className="p-2.5 text-emerald-400 font-bold">{fStat.wins}</td>
                                        <td className="p-2.5 text-rose-400">{fStat.losses}</td>
                                        <td className="p-2.5 font-bold text-amber-400">{fStat.winPct}%</td>
                                        <td className="p-2.5 font-bold text-emerald-400">{fStat.runs}</td>
                                        <td className="p-2.5 font-semibold">{fStat.battingAverage}</td>
                                        <td className="p-2.5 text-slate-400">{fStat.strikeRate}</td>
                                        <td className="p-2.5 font-bold text-rose-400">{fStat.wickets}</td>
                                        <td className="p-2.5 font-semibold">{fStat.bowlingAverage}</td>
                                        <td className="p-2.5 text-slate-400">{fStat.economy}</td>
                                        <td className="p-2.5 text-indigo-300 font-mono">{fStat.bestBowling}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 3: PLAYER VS TEAMS DETAILED RECORDS */}
            {activeProfileTab === 'vsTeams' && (
                <div className="space-y-6">
                    {/* Universal Filter Bar */}
                    <UniversalFilterBar
                        filterState={filterState}
                        onChange={setFilterState}
                        teams={gameData?.teams || []}
                        availableSeasons={Array.from({ length: gameData?.currentSeason || 1 }, (_, i) => i + 1)}
                        hideOpponent={true}
                    />

                    <div className="bg-slate-900/90 border border-indigo-500/40 rounded-2xl p-5 shadow-xl text-white">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 rounded-xl">
                                    <Swords className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">Head-to-Head vs Opponent Teams</h3>
                                    <p className="text-xs text-slate-400">Detailed batting, bowling, and captaincy records against opposition franchises</p>
                                </div>
                            </div>
                            <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                                {playerVsTeamsRecords.length} Opponents Faced
                            </span>
                        </div>

                        {playerVsTeamsRecords.length === 0 ? (
                            <div className="text-center py-10 text-slate-500 italic">
                                No match records found for the selected filter criteria.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {playerVsTeamsRecords.map((vsRecord) => (
                                    <div key={vsRecord.vsTeamId} className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 hover:border-indigo-500/50 transition-all">
                                        <div className="flex justify-between items-center border-b border-slate-800/80 pb-2 mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-indigo-400"></div>
                                                <h4 className="text-base font-extrabold text-white">vs {vsRecord.vsTeamName}</h4>
                                            </div>
                                            <div className="text-xs text-slate-400 font-bold">
                                                {vsRecord.batting.matches} Matches Played
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                            {/* Batting vs Team */}
                                            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/60">
                                                <div className="text-teal-400 font-bold uppercase text-[10px] mb-2 flex items-center gap-1">
                                                    <BarChart3 className="w-3.5 h-3.5" /> Batting vs {vsRecord.vsTeamName}
                                                </div>
                                                <div className="grid grid-cols-3 gap-1.5 text-center">
                                                    <div><span className="text-slate-400 block text-[9px]">Innings</span><span className="font-bold text-white">{vsRecord.batting.innings}</span></div>
                                                    <div><span className="text-slate-400 block text-[9px]">Runs</span><span className="font-bold text-teal-400">{vsRecord.batting.runs}</span></div>
                                                    <div><span className="text-slate-400 block text-[9px]">Average</span><span className="font-bold text-white">{vsRecord.batting.average}</span></div>
                                                    <div><span className="text-slate-400 block text-[9px]">SR</span><span className="font-bold text-slate-300">{vsRecord.batting.strikeRate}</span></div>
                                                    <div><span className="text-slate-400 block text-[9px]">HS</span><span className="font-bold text-amber-400">{vsRecord.batting.highestScore}</span></div>
                                                    <div><span className="text-slate-400 block text-[9px]">50s / 100s</span><span className="font-bold text-white">{vsRecord.batting.fifties}/{vsRecord.batting.hundreds}</span></div>
                                                </div>
                                            </div>

                                            {/* Bowling vs Team */}
                                            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/60">
                                                <div className="text-rose-400 font-bold uppercase text-[10px] mb-2 flex items-center gap-1">
                                                    <Target className="w-3.5 h-3.5" /> Bowling vs {vsRecord.vsTeamName}
                                                </div>
                                                <div className="grid grid-cols-3 gap-1.5 text-center">
                                                    <div><span className="text-slate-400 block text-[9px]">Overs</span><span className="font-bold text-white">{vsRecord.bowling.overs}</span></div>
                                                    <div><span className="text-slate-400 block text-[9px]">Wickets</span><span className="font-bold text-rose-400">{vsRecord.bowling.wickets}</span></div>
                                                    <div><span className="text-slate-400 block text-[9px]">Average</span><span className="font-bold text-white">{vsRecord.bowling.bowlingAverage}</span></div>
                                                    <div><span className="text-slate-400 block text-[9px]">Economy</span><span className="font-bold text-slate-300">{vsRecord.bowling.economy}</span></div>
                                                    <div><span className="text-slate-400 block text-[9px]">Best</span><span className="font-bold text-indigo-300 font-mono">{vsRecord.bowling.bestBowling}</span></div>
                                                    <div><span className="text-slate-400 block text-[9px]">3W / 5W</span><span className="font-bold text-white">{vsRecord.bowling.threeWickets}/{vsRecord.bowling.fiveWickets}</span></div>
                                                </div>
                                            </div>

                                            {/* Captaincy vs Team */}
                                            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/60">
                                                <div className="text-amber-400 font-bold uppercase text-[10px] mb-2 flex items-center gap-1">
                                                    <Crown className="w-3.5 h-3.5" /> Captaincy vs {vsRecord.vsTeamName}
                                                </div>
                                                <div className="grid grid-cols-3 gap-1.5 text-center">
                                                    <div><span className="text-slate-400 block text-[9px]">As Captain</span><span className="font-bold text-white">{vsRecord.captaincy.matches}</span></div>
                                                    <div><span className="text-slate-400 block text-[9px]">Wins</span><span className="font-bold text-emerald-400">{vsRecord.captaincy.wins}</span></div>
                                                    <div><span className="text-slate-400 block text-[9px]">Losses</span><span className="font-bold text-rose-400">{vsRecord.captaincy.losses}</span></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 4: TEAMS PLAYED FOR (FRANCHISE HISTORY) */}
            {activeProfileTab === 'franchise' && (
                <div className="space-y-6">
                    <div className="bg-slate-900/90 border border-cyan-500/40 rounded-2xl p-5 shadow-xl text-white">
                        <div className="flex items-center gap-3 border-b border-slate-800 pb-3 mb-4">
                            <div className="p-2.5 bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 rounded-xl">
                                <Building2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Franchise & Career Representation History</h3>
                                <p className="text-xs text-slate-400">Historical performance records grouped by franchise team</p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-center border-collapse">
                                <thead>
                                    <tr className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                        <th className="p-2.5 text-left">Franchise Team</th>
                                        <th className="p-2.5">Seasons</th>
                                        <th className="p-2.5">Matches</th>
                                        <th className="p-2.5 text-teal-400">Runs</th>
                                        <th className="p-2.5">Bat Avg</th>
                                        <th className="p-2.5 text-rose-400">Wickets</th>
                                        <th className="p-2.5">Bowl Avg</th>
                                        <th className="p-2.5 text-amber-400">Captaincy (W-L)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800 text-slate-300">
                                    {franchiseHistory.map((hist) => (
                                        <tr key={hist.teamId} className="hover:bg-slate-800/50">
                                            <td className="p-2.5 text-left font-bold text-white flex items-center gap-2">
                                                <Building2 className="w-4 h-4 text-cyan-400" />
                                                {hist.teamName}
                                            </td>
                                            <td className="p-2.5 font-mono text-cyan-300">
                                                {hist.seasons.map(s => `S${s}`).join(', ')}
                                            </td>
                                            <td className="p-2.5 font-semibold">{hist.matches}</td>
                                            <td className="p-2.5 font-bold text-teal-400">{hist.runs}</td>
                                            <td className="p-2.5 font-semibold">{hist.battingAverage}</td>
                                            <td className="p-2.5 font-bold text-rose-400">{hist.wickets}</td>
                                            <td className="p-2.5 font-semibold">{hist.bowlingAverage}</td>
                                            <td className="p-2.5 font-bold text-amber-300">
                                                {hist.captaincyMatches > 0 ? `${hist.captaincyWins}W - ${hist.captaincyLosses}L (${hist.captaincyMatches}M)` : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 5: BOWLER MATCHUPS */}
            {activeProfileTab === 'matchups' && (
                <div className="space-y-6">
                    <div className="bg-slate-900/90 border border-rose-500/40 rounded-2xl p-5 shadow-xl text-white">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-rose-500/20 text-rose-400 border border-rose-500/40 rounded-xl">
                                    <Target className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">Batter vs Bowler Head-to-Head</h3>
                                    <p className="text-xs text-slate-400">Evaluate head-to-head performance against specific opposition bowlers</p>
                                </div>
                            </div>

                            {/* Bowler Selector */}
                            <div className="w-full sm:w-64">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    Select Opposition Bowler:
                                </label>
                                <select
                                    value={activeBowlerId}
                                    onChange={(e) => setSelectedOpponentBowlerId(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-rose-400 font-medium"
                                >
                                    {availableBowlers.map(b => (
                                        <option key={b.id} value={b.id}>{b.name} ({b.teamName || 'Free Agent'})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {bowlerMatchup ? (
                            <div className="space-y-4">
                                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-800">
                                        <div className="font-extrabold text-sm text-white">
                                            {player.name} vs {bowlerMatchup.bowlerName}
                                        </div>
                                        <div className="text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                                            Dismissed: {bowlerMatchup.dismissals} Times
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
                                        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                                            <span className="text-slate-400 block text-[9px] uppercase font-bold">Balls Faced</span>
                                            <span className="text-lg font-black text-white">{bowlerMatchup.ballsFaced}</span>
                                        </div>
                                        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                                            <span className="text-slate-400 block text-[9px] uppercase font-bold">Runs Scored</span>
                                            <span className="text-lg font-black text-teal-400">{bowlerMatchup.runs}</span>
                                        </div>
                                        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                                            <span className="text-slate-400 block text-[9px] uppercase font-bold">Boundaries (4s)</span>
                                            <span className="text-lg font-black text-amber-400">{bowlerMatchup.boundaries}</span>
                                        </div>
                                        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                                            <span className="text-slate-400 block text-[9px] uppercase font-bold">Sixes (6s)</span>
                                            <span className="text-lg font-black text-rose-400">{bowlerMatchup.sixes}</span>
                                        </div>
                                        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                                            <span className="text-slate-400 block text-[9px] uppercase font-bold">Dot Balls</span>
                                            <span className="text-lg font-black text-slate-300">{bowlerMatchup.dotBalls}</span>
                                        </div>
                                        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                                            <span className="text-slate-400 block text-[9px] uppercase font-bold">Strike Rate</span>
                                            <span className="text-lg font-black text-cyan-400">{bowlerMatchup.strikeRate}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-500 italic">
                                No direct match encounters recorded between {player.name} and the selected bowler yet.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 6: AWARDS & HONORS / RECORDS */}
            {activeProfileTab === 'awards_records' && (
                <div className="space-y-4">
                    {/* Trophy Cabinet & Major Honors */}
                    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-md">
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
                            <Trophy className="w-4 h-4 text-amber-400" />
                            <h3 className="font-black text-sm tracking-wider uppercase text-amber-400">
                                International Trophy Cabinet
                            </h3>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl text-center">
                                <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">ODI World Cups</span>
                                <span className="text-2xl font-black text-amber-400">{player.trophies?.worldCupsWon || 0}</span>
                                <span className="text-[10px] text-slate-500 block">50-Over Titles</span>
                            </div>
                            <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl text-center">
                                <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">T20 World Cups</span>
                                <span className="text-2xl font-black text-cyan-400">{player.trophies?.t20WorldCupsWon || 0}</span>
                                <span className="text-[10px] text-slate-500 block">20-Over Titles</span>
                            </div>
                            <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl text-center">
                                <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Champions Trophy</span>
                                <span className="text-2xl font-black text-emerald-400">{player.trophies?.championsTrophiesWon || 0}</span>
                                <span className="text-[10px] text-slate-500 block">Elite 8 Titles</span>
                            </div>
                            <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl text-center">
                                <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">WTC Titles</span>
                                <span className="text-2xl font-black text-indigo-400">{player.trophies?.wtcTitlesWon || 0}</span>
                                <span className="text-[10px] text-slate-500 block">Test Mace Titles</span>
                            </div>
                        </div>
                    </div>

                    {/* Season Awards & Individual Honors */}
                    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-md">
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
                            <Award className="w-4 h-4 text-teal-400" />
                            <h3 className="font-black text-sm tracking-wider uppercase text-teal-400">
                                Individual Accolades & Season Awards
                            </h3>
                        </div>
                        {gameData?.awardsHistory && gameData.awardsHistory.some(a => 
                            a.playerOfSeason?.playerId === player.id || 
                            a.bestBatter?.playerId === player.id || 
                            a.bestBowler?.playerId === player.id ||
                            a.powerHitter?.playerId === player.id
                        ) ? (
                            <div className="space-y-2">
                                {gameData.awardsHistory.map((award, idx) => {
                                    const honors: string[] = [];
                                    if (award.playerOfSeason?.playerId === player.id) honors.push('Player of the Season');
                                    if (award.bestBatter?.playerId === player.id) honors.push('Best Batter of the Season');
                                    if (award.bestBowler?.playerId === player.id) honors.push('Best Bowler of the Season');
                                    if (award.powerHitter?.playerId === player.id) honors.push('Power Hitter of the Season');

                                    if (honors.length === 0) return null;

                                    return (
                                        <div key={idx} className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-xl flex items-center justify-between">
                                            <div>
                                                <span className="text-xs font-bold text-amber-300">Season {award.season} • {award.format}</span>
                                                <div className="flex flex-wrap gap-1.5 mt-1">
                                                    {honors.map((h, hIdx) => (
                                                        <span key={hIdx} className="text-[10px] bg-teal-500/15 border border-teal-500/30 text-teal-300 font-bold px-2 py-0.5 rounded-md">
                                                            🎖️ {h}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-6 text-slate-500 text-xs italic bg-slate-950/40 rounded-xl">
                                No individual season awards on record yet. Complete tournament seasons and championship campaigns to earn accolades.
                            </div>
                        )}
                    </div>

                    {/* All-Time Milestones & Career Records */}
                    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-md">
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
                            <Sparkles className="w-4 h-4 text-purple-400" />
                            <h3 className="font-black text-sm tracking-wider uppercase text-purple-400">
                                Career Milestones & Key Highlights
                            </h3>
                        </div>
                        {(() => {
                            const allStats = [
                                ...Object.values(player.stats || {}),
                                ...Object.values(player.domesticStats || {}),
                                ...Object.values(player.internationalStats || {})
                            ];
                            const total100s = allStats.reduce((sum, s) => sum + (s.hundreds || 0), 0);
                            const total50s = allStats.reduce((sum, s) => sum + (s.fifties || 0), 0);
                            const total5W = allStats.reduce((sum, s) => sum + (s.fiveWicketHauls || 0), 0);
                            const totalMOTM = allStats.reduce((sum, s) => sum + (s.manOfTheMatchAwards || 0), 0);
                            const totalMatches = allStats.reduce((sum, s) => sum + (s.matches || 0), 0);

                            return (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                                    <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl">
                                        <span className="text-slate-400 text-[10px] block font-semibold uppercase">Centuries (100s)</span>
                                        <span className="text-base font-black text-amber-400">{total100s}</span>
                                    </div>
                                    <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl">
                                        <span className="text-slate-400 text-[10px] block font-semibold uppercase">Half-Centuries (50s)</span>
                                        <span className="text-base font-black text-teal-400">{total50s}</span>
                                    </div>
                                    <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl">
                                        <span className="text-slate-400 text-[10px] block font-semibold uppercase">5-Wicket Hauls</span>
                                        <span className="text-base font-black text-rose-400">{total5W}</span>
                                    </div>
                                    <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl">
                                        <span className="text-slate-400 text-[10px] block font-semibold uppercase">Player of Match (POTM)</span>
                                        <span className="text-base font-black text-cyan-400">{totalMOTM}</span>
                                    </div>
                                    <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl">
                                        <span className="text-slate-400 text-[10px] block font-semibold uppercase">Career Matches</span>
                                        <span className="text-base font-black text-yellow-400">{totalMatches}</span>
                                    </div>
                                    <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl">
                                        <span className="text-slate-400 text-[10px] block font-semibold uppercase">Player Badges</span>
                                        <span className="text-base font-black text-white">{player.badges?.length || 0} Badges</span>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    )
}

export default PlayerProfile;

import React, { useState, useEffect, useMemo } from 'react';
import { Player, LiveTacticalInput, LiveTacticalExecution, Strategy, Format, PlayerRole, PendingBowlerDelivery, LastShotFeedback } from '../types';
import { Icons } from './Icons';
import { playSFX } from '../utils/soundManager';
import { FIELD_PRESETS, FieldPreset, getMatchFieldRestrictions, isPresetValidForSituation } from '../data/fieldingPresets';

interface LiveMatchTacticalControlsProps {
    isUserBatting: boolean;
    isUserBowling: boolean;
    striker: Player;
    nonStriker?: Player;
    bowler: Player;
    battingStrategy: Strategy;
    bowlingStrategy: Strategy;
    onPlayBallWithTactics: (tactics: LiveTacticalInput) => void;
    lastTacticalExecution?: LiveTacticalExecution | null;
    isAutoPlaying: boolean;
    onShotAngleChange?: (angle: number) => void;
    onBowlingTargetChange?: (length: 'yorker' | 'full' | 'good' | 'short', line: 'off' | 'middle' | 'leg') => void;
    currentFormat?: Format;
    ballsBowled?: number;
    selectedFieldPresetId?: string;
    onFieldPresetChange?: (presetId: string) => void;
    isSmartFieldingActive?: boolean;
    onToggleSmartFielding?: (active: boolean) => void;
    isAutoBatting?: boolean;
    isAutoBowling?: boolean;
    onToggleAutoBatting?: (active: boolean) => void;
    onToggleAutoBowling?: (active: boolean) => void;
    pendingBowlerDelivery?: PendingBowlerDelivery | null;
    lastShotFeedback?: LastShotFeedback | null;
}

export interface GroundSector {
    id: string;
    name: string;
    label: string;
    angle: number; // degrees 0-360
    zoneName: string;
    color: string;
    recommendedLengths: string[];
    typicalShots: string[];
}

export const GROUND_SECTORS: GroundSector[] = [
    { id: 'cover', name: 'Cover / Extra Cover', label: 'Cover', angle: 315, zoneName: 'Covers', color: 'from-emerald-600 to-teal-700', recommendedLengths: ['full', 'good'], typicalShots: ['Cover Drive', 'Inside-Out Loft', 'Punch through Cover'] },
    { id: 'point', name: 'Point / Backward Point', label: 'Point', angle: 350, zoneName: 'Point', color: 'from-blue-600 to-indigo-700', recommendedLengths: ['good', 'short'], typicalShots: ['Square Cut', 'Late Cut', 'Backfoot Punch'] },
    { id: 'third_man', name: 'Third Man / Gully', label: '3rd Man', angle: 45, zoneName: 'Third Man', color: 'from-cyan-600 to-sky-700', recommendedLengths: ['short', 'good'], typicalShots: ['Upper Cut', 'Late Dab', 'Guide to 3rd Man'] },
    { id: 'fine_leg', name: 'Fine Leg / Short Fine', label: 'Fine Leg', angle: 135, zoneName: 'Fine Leg', color: 'from-amber-600 to-yellow-700', recommendedLengths: ['full', 'short'], typicalShots: ['Leg Glance', 'Paddle Sweep', 'Hook Shot'] },
    { id: 'square_leg', name: 'Square Leg / Deep Square', label: 'Sq. Leg', angle: 175, zoneName: 'Square Leg', color: 'from-orange-600 to-red-700', recommendedLengths: ['short', 'good'], typicalShots: ['Pull Shot', 'Deep Sweep', 'Flick off Pads'] },
    { id: 'mid_wicket', name: 'Mid-Wicket / Cow Corner', label: 'Mid-Wkt', angle: 220, zoneName: 'Mid-Wicket', color: 'from-rose-600 to-pink-700', recommendedLengths: ['good', 'full'], typicalShots: ['Heave over Midwicket', 'Slog Sweep', 'On-Drive'] },
    { id: 'mid_on', name: 'Long-On / Mid-On', label: 'Long-On', angle: 250, zoneName: 'Mid-On', color: 'from-purple-600 to-violet-700', recommendedLengths: ['full', 'good'], typicalShots: ['Straight Loft', 'On-Drive', 'Drill to Long-On'] },
    { id: 'straight', name: 'Straight / Long-Off', label: 'Long-Off', angle: 290, zoneName: 'Long-Off', color: 'from-green-600 to-emerald-700', recommendedLengths: ['full'], typicalShots: ['Straight Drive', 'Lofted Long-Off', 'Bowler Backdrive'] },
];

export const BOWLING_LENGTHS = [
    { id: 'yorker' as const, name: 'Yorker / Full Toss', description: '0-2m from crease. Lethal for bowled/LBW, stops boundaries.', color: 'border-red-500 bg-red-500/10 text-red-400', badge: '🔴 Yorker' },
    { id: 'full' as const, name: 'Full Length', description: '2-4m from crease. Prompts driving, swing & slip catches.', color: 'border-amber-500 bg-amber-500/10 text-amber-400', badge: '🟡 Full' },
    { id: 'good' as const, name: 'Good Length', description: '4-7m from crease. The Corridor of Uncertainty.', color: 'border-emerald-500 bg-emerald-500/10 text-emerald-400', badge: '🟢 Good Length' },
    { id: 'short' as const, name: 'Short Pitch / Bouncer', description: '7-10m from crease. Heavy bounce, induces top edge miscues.', color: 'border-purple-500 bg-purple-500/10 text-purple-400', badge: '🟣 Bouncer' },
];

export const BOWLING_LINES = [
    { id: 'off' as const, name: 'Outside Off', subtext: '4th Stump Line (Edge Trap)' },
    { id: 'middle' as const, name: 'Middle / Off', subtext: 'Attacking Stumps (LBW/Bowled)' },
    { id: 'leg' as const, name: 'Leg Stump', subtext: 'Cramping Line (Bodyline)' },
];

export const FAST_VARIATIONS = ['Standard Seam', 'Outswinger', 'Inswinger', 'Reverse Swing', 'Slower Knuckleball', 'Off-Cutter', 'Heavy Bouncer', 'Toe-Crusher Yorker'];
export const SPIN_VARIATIONS = ['Standard Turn', 'Arm Ball (Straight)', 'Googly / Wrong-Un', 'Doosra', 'Top Spinner', 'Flighted Slower Ball', 'Quicker Flipper'];

export const LiveMatchTacticalControls: React.FC<LiveMatchTacticalControlsProps> = ({
    isUserBatting,
    isUserBowling,
    striker,
    bowler,
    onPlayBallWithTactics,
    lastTacticalExecution,
    isAutoPlaying,
    onShotAngleChange,
    onBowlingTargetChange,
    currentFormat = Format.T20,
    ballsBowled = 0,
    selectedFieldPresetId = 'normal_balanced',
    onFieldPresetChange,
    isSmartFieldingActive = true,
    onToggleSmartFielding,
    isAutoBatting = false,
    isAutoBowling = false,
    onToggleAutoBatting,
    onToggleAutoBowling,
    pendingBowlerDelivery,
    lastShotFeedback,
}) => {
    // Batting State
    const [selectedSectorId, setSelectedSectorId] = useState<string>('cover');
    const [shotAngle, setShotAngle] = useState<number>(315);
    const [isLofted, setIsLofted] = useState<boolean>(false);
    const [shotCategory, setShotCategory] = useState<'Placement' | 'Attacking' | 'Lofted' | 'Defensive'>('Attacking');
    const [selectedShotType, setSelectedShotType] = useState<string>('Cover Drive');

    // Bowling State
    const [selectedLength, setSelectedLength] = useState<'yorker' | 'full' | 'good' | 'short'>('good');
    const [selectedLine, setSelectedLine] = useState<'off' | 'middle' | 'leg'>('off');
    const isSpinBowler = bowler.role?.toLowerCase().includes('spin') || bowler.bowlingSubType?.toLowerCase().includes('spin') || bowler.role === PlayerRole.SPIN_BOWLER || false;
    const [selectedVariation, setSelectedVariation] = useState<string>(isSpinBowler ? 'Standard Turn' : 'Outswinger');

    // UI View Tab
    const [activeTab, setActiveTab] = useState<'batting' | 'bowling' | 'fielding'>(
        isUserBatting ? 'batting' : (isUserBowling ? 'bowling' : 'fielding')
    );

    useEffect(() => {
        if (isUserBatting && activeTab !== 'fielding') setActiveTab('batting');
        else if (isUserBowling && activeTab !== 'fielding') setActiveTab('bowling');
    }, [isUserBatting, isUserBowling]);

    // Match Restrictions
    const restrictions = useMemo(() => {
        return getMatchFieldRestrictions(currentFormat, ballsBowled);
    }, [currentFormat, ballsBowled]);

    // Active Field Preset Details
    const activePreset = useMemo(() => {
        return FIELD_PRESETS.find(p => p.id === selectedFieldPresetId) || FIELD_PRESETS[0];
    }, [selectedFieldPresetId]);

    // Auto-align shot with pending delivery if present
    const handleAutoAlignCounterShot = () => {
        if (!pendingBowlerDelivery) return;
        const recShot = pendingBowlerDelivery.recommendedShots?.[0];
        if (recShot) {
            const sector = GROUND_SECTORS.find(s => s.typicalShots.includes(recShot)) || GROUND_SECTORS[0];
            setSelectedSectorId(sector.id);
            setShotAngle(sector.angle);
            setSelectedShotType(recShot);
            onShotAngleChange?.(sector.angle);
            playSFX('click');
        }
    };

    const deliveryMatchInfo = useMemo(() => {
        if (!pendingBowlerDelivery) return null;
        const isRecommended = pendingBowlerDelivery.recommendedShots?.some(s => s.toLowerCase() === selectedShotType.toLowerCase());
        const isRisk = pendingBowlerDelivery.riskShots?.some(s => s.toLowerCase() === selectedShotType.toLowerCase());
        return {
            isRecommended,
            isRisk,
            statusText: isRecommended 
                ? '🔥 PERFECT COUNTER-ATTACK (+40% Gap & Boundary Chance)' 
                : isRisk 
                ? '⚠️ HIGH RISK: Slogging across line increases Edge / Miss probability!' 
                : '⚖️ Neutral Shot Option (Standard gap evaluation)'
        };
    }, [pendingBowlerDelivery, selectedShotType]);

    // Bowling Zone Detailed Metadata
    const currentBowlingZoneMeta = useMemo(() => {
        switch (selectedLength) {
            case 'short':
                return {
                    id: 'short_length',
                    name: 'Short Pitch / Bouncer',
                    runRatio: 21,
                    estWickets: 1,
                    quote: 'Aggressive testing, forcing pull/hook errors and mistimed top edges',
                    color: '#eab308',
                    activeFill: '#e5a912',
                    inactiveBg: '#ca8a0422',
                    textColor: '#0f172a',
                    badge: '🟣 Short Pitch Bouncer'
                };
            case 'good':
                return {
                    id: 'good_length',
                    name: 'Good Length (Corridor)',
                    runRatio: 46,
                    estWickets: 3,
                    quote: 'Consistently hitting the corridor of uncertainty, inducing edge catches',
                    color: '#10b981',
                    activeFill: '#10b981',
                    inactiveBg: '#05966922',
                    textColor: '#0f172a',
                    badge: '🟢 Good Length (Corridor)'
                };
            case 'full':
                return {
                    id: 'full_length',
                    name: 'Full Length (Drive)',
                    runRatio: 24,
                    estWickets: 2,
                    quote: 'Inviting drive, high risk but high edge and slip catching probability',
                    color: '#6366f1',
                    activeFill: '#6366f1',
                    inactiveBg: '#4f46e522',
                    textColor: '#ffffff',
                    badge: '🟡 Full Length (Drive)'
                };
            case 'yorker':
            default:
                return {
                    id: 'full_toss',
                    name: 'Yorker / Full Toss',
                    runRatio: 12,
                    estWickets: 3,
                    quote: 'Surprise delivery variation to trap batsmen & shatter stumps at the death',
                    color: '#ef4444',
                    activeFill: '#ef4444',
                    inactiveBg: '#dc262622',
                    textColor: '#ffffff',
                    badge: '🔴 Yorker / Full Toss'
                };
        }
    }, [selectedLength]);

    // Current Sector Details
    const currentSector = useMemo(() => {
        return GROUND_SECTORS.find(s => s.id === selectedSectorId) || GROUND_SECTORS[0];
    }, [selectedSectorId]);

    // Update angle when sector changes
    const handleSelectSector = (sector: GroundSector) => {
        setSelectedSectorId(sector.id);
        setShotAngle(sector.angle);
        setSelectedShotType(sector.typicalShots[0] || 'Drive');
        onShotAngleChange?.(sector.angle);
        playSFX('click');
    };

    const handleAngleChange = (newAngle: number) => {
        setShotAngle(newAngle);
        onShotAngleChange?.(newAngle);
        // Find closest sector
        let closest = GROUND_SECTORS[0];
        let minDiff = 360;
        GROUND_SECTORS.forEach(s => {
            let diff = Math.abs(s.angle - newAngle);
            if (diff > 180) diff = 360 - diff;
            if (diff < minDiff) {
                minDiff = diff;
                closest = s;
            }
        });
        setSelectedSectorId(closest.id);
        if (!closest.typicalShots.includes(selectedShotType)) {
            setSelectedShotType(closest.typicalShots[0]);
        }
    };

    const handleBowlingLengthChange = (length: 'yorker' | 'full' | 'good' | 'short') => {
        setSelectedLength(length);
        onBowlingTargetChange?.(length, selectedLine);
        playSFX('click');
    };

    const handleBowlingLineChange = (line: 'off' | 'middle' | 'leg') => {
        setSelectedLine(line);
        onBowlingTargetChange?.(selectedLength, line);
        playSFX('click');
    };

    // Check if bowling delivery exploits batter's weakness
    const isExploitingWeakness = useMemo(() => {
        if (!striker.weaknesses || striker.weaknesses.length === 0) return false;
        const subType = bowler.bowlingSubType?.toLowerCase() || '';
        const weak = striker.weaknesses.some(w => subType.includes(w.toLowerCase()) || (selectedLength === 'short' && w.toLowerCase().includes('short')));
        return weak;
    }, [striker, bowler, selectedLength]);

    // Execute with tactical input
    const handleExecute = () => {
        if (isUserBatting) {
            onPlayBallWithTactics({
                isBatting: true,
                shotAngle,
                shotZone: currentSector.zoneName,
                shotType: selectedShotType,
                shotCategory,
                isLofted,
                fieldPresetId: selectedFieldPresetId,
            });
        } else {
            onPlayBallWithTactics({
                isBatting: false,
                bowlingLength: selectedLength,
                bowlingLine: selectedLine,
                bowlingVariation: selectedVariation,
                fieldPresetId: selectedFieldPresetId,
            });
        }
    };

    // Auto-calculate smart tactics and execute immediately
    const handleAutoExecute = () => {
        playSFX('click');
        if (isUserBatting) {
            // Auto Batting: Pick best counter or sector according to incoming delivery
            let targetSec = GROUND_SECTORS[0];
            let targetShot = targetSec.typicalShots[0];
            if (pendingBowlerDelivery && pendingBowlerDelivery.recommendedShots?.[0]) {
                const recShot = pendingBowlerDelivery.recommendedShots[0];
                targetSec = GROUND_SECTORS.find(s => s.typicalShots.includes(recShot)) || GROUND_SECTORS[0];
                targetShot = recShot;
            } else {
                targetSec = GROUND_SECTORS[Math.floor(Math.random() * GROUND_SECTORS.length)];
                targetShot = targetSec.typicalShots[0];
            }
            const autoLofted = Math.random() > 0.65;
            onPlayBallWithTactics({
                isBatting: true,
                shotAngle: targetSec.angle,
                shotZone: targetSec.zoneName,
                shotType: targetShot,
                shotCategory: autoLofted ? 'Lofted' : 'Attacking',
                isLofted: autoLofted,
                fieldPresetId: selectedFieldPresetId,
            });
        } else {
            // Auto Bowling: Exploit weakness or pick good length
            let autoLen: 'yorker' | 'full' | 'good' | 'short' = 'good';
            let autoLine: 'off' | 'middle' | 'leg' = 'off';
            if (striker.weaknesses?.some(w => w.toLowerCase().includes('short'))) {
                autoLen = 'short';
                autoLine = 'leg';
            } else if (restrictions.isDeath) {
                autoLen = 'yorker';
                autoLine = 'middle';
            } else {
                autoLen = Math.random() > 0.5 ? 'good' : 'full';
                autoLine = 'off';
            }
            onPlayBallWithTactics({
                isBatting: false,
                bowlingLength: autoLen,
                bowlingLine: autoLine,
                bowlingVariation: isSpinBowler ? 'Standard Turn' : 'Outswinger',
                fieldPresetId: selectedFieldPresetId,
            });
        }
    };

    // Calculated gap clearance & boundary chances
    const gapScore = useMemo(() => {
        const baseGap = ((striker.battingSkill || 75) / 100) * 80;
        const angleMod = (Math.sin(shotAngle * (Math.PI / 180)) + 1) * 10;
        return Math.min(95, Math.max(40, Math.round(baseGap + angleMod)));
    }, [shotAngle, striker.battingSkill]);

    const estBoundaryChance = useMemo(() => {
        if (shotCategory === 'Defensive') return 2;
        if (shotCategory === 'Placement') return 24;
        let base = isLofted ? 55 : 38;
        base += (striker.battingSkill - 60) * 0.4;
        return Math.min(85, Math.max(15, Math.round(base)));
    }, [isLofted, shotCategory, striker.battingSkill]);

    const estCatchRisk = useMemo(() => {
        if (shotCategory === 'Defensive') return 1;
        if (shotCategory === 'Placement') return 4;
        let base = isLofted ? 28 : 12;
        base -= (striker.battingSkill - 60) * 0.2;
        return Math.min(50, Math.max(3, Math.round(base)));
    }, [isLofted, shotCategory, striker.battingSkill]);

    return (
        <div className="bg-slate-950/95 border-2 border-cyan-500/40 rounded-2xl p-3 shadow-[0_0_35px_rgba(6,182,212,0.25)] flex flex-col gap-3 backdrop-blur-xl relative overflow-hidden transition-all duration-300">
            {/* Header / Mode Indicator */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-lg text-slate-950 shadow-md">
                        <Icons.Target className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black tracking-wider text-cyan-400 uppercase">
                                TACTICAL GAMEPLAY LAB
                            </span>
                            <span className="text-[9px] bg-cyan-500/20 text-cyan-300 font-bold px-1.5 py-0.5 rounded border border-cyan-500/30">
                                {restrictions.isTest ? 'TEST MATCH (UNRESTRICTED)' : restrictions.phaseName}
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                            {isUserBatting ? `Aim shot direction with arrow for ${striker.name}` : `Dial in delivery length, line & smart field for ${bowler.name}`}
                        </p>
                    </div>
                </div>

                {/* Switcher tabs */}
                <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                    <button
                        onClick={() => { setActiveTab('batting'); playSFX('click'); }}
                        className={`px-2 py-1 text-[10px] font-bold rounded transition-all cursor-pointer ${activeTab === 'batting' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                        🏏 BATTING
                    </button>
                    <button
                        onClick={() => { setActiveTab('bowling'); playSFX('click'); }}
                        className={`px-2 py-1 text-[10px] font-bold rounded transition-all cursor-pointer ${activeTab === 'bowling' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                        🥎 BOWLING
                    </button>
                    <button
                        onClick={() => { setActiveTab('fielding'); playSFX('click'); }}
                        className={`px-2 py-1 text-[10px] font-bold rounded transition-all cursor-pointer flex items-center gap-1 ${activeTab === 'fielding' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                        <span>🛡️ FIELD (10)</span>
                    </button>
                </div>
            </div>

            {/* BATTING CONTROLS TAB */}
            {activeTab === 'batting' && (
                <div className="flex flex-col gap-3">
                    {/* Auto-Batting Quick Bar */}
                    <div className="flex items-center justify-between bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-300 uppercase">🤖 Auto-Batting Engine:</span>
                            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded ${isAutoBatting ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                                {isAutoBatting ? 'AUTO ACTIVE' : 'MANUAL AIMING'}
                            </span>
                        </div>
                        {onToggleAutoBatting && (
                            <button
                                onClick={() => onToggleAutoBatting(!isAutoBatting)}
                                className={`text-[10px] font-black px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                                    isAutoBatting 
                                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-sm' 
                                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                                }`}
                            >
                                {isAutoBatting ? 'SWITCH TO MANUAL' : 'ENABLE AUTO-SHOTS'}
                            </button>
                        )}
                    </div>

                    {/* INCOMING BOWLER RADAR & REAL-TIME INTERACTIVE TARGET */}
                    {pendingBowlerDelivery && (
                        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-2.5 rounded-xl border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)] flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
                                    </span>
                                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-wider">
                                        INCOMING BALL: {pendingBowlerDelivery.bowlerName} ({pendingBowlerDelivery.speedKmh} km/h)
                                    </span>
                                </div>
                                <button
                                    onClick={handleAutoAlignCounterShot}
                                    className="text-[9px] font-black bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-2 py-0.5 rounded shadow transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                                    title="Automatically select recommended counter-shot"
                                >
                                    <span>⚡</span> AUTO-COUNTER
                                </button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                                <div className="bg-slate-900/90 border border-slate-800 p-1.5 rounded-lg flex flex-col">
                                    <span className="text-[9px] text-slate-500 uppercase font-bold">Length</span>
                                    <span className="font-mono font-extrabold text-cyan-300 capitalize">{pendingBowlerDelivery.length} Length</span>
                                </div>
                                <div className="bg-slate-900/90 border border-slate-800 p-1.5 rounded-lg flex flex-col">
                                    <span className="text-[9px] text-slate-500 uppercase font-bold">Line</span>
                                    <span className="font-mono font-extrabold text-amber-300 capitalize">{pendingBowlerDelivery.line} Stump</span>
                                </div>
                                <div className="bg-slate-900/90 border border-slate-800 p-1.5 rounded-lg flex flex-col col-span-2">
                                    <span className="text-[9px] text-slate-500 uppercase font-bold">Delivery Style / Spin</span>
                                    <span className="font-mono font-extrabold text-emerald-300 truncate">{pendingBowlerDelivery.variation}</span>
                                </div>
                            </div>

                            {/* Counter Attack Tips & Danger Warnings */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 bg-slate-950/80 px-2 py-1.5 rounded-lg border border-slate-800/80 text-[10px]">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-emerald-400 font-black">🎯 RECOM:</span>
                                    <span className="text-slate-200 font-bold">
                                        {pendingBowlerDelivery.recommendedShots?.join(', ')}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-rose-400">
                                    <span className="font-black">⚠️ AVOID:</span>
                                    <span className="text-rose-300 font-medium">
                                        {pendingBowlerDelivery.riskShots?.join(', ')}
                                    </span>
                                </div>
                            </div>

                            {/* Live Shot Match Verdict */}
                            {deliveryMatchInfo && (
                                <div className={`px-2 py-1 rounded text-[10px] font-extrabold flex items-center justify-between border ${
                                    deliveryMatchInfo.isRecommended 
                                        ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' 
                                        : deliveryMatchInfo.isRisk 
                                        ? 'bg-rose-950/60 border-rose-500/40 text-rose-300 animate-pulse' 
                                        : 'bg-slate-900 border-slate-800 text-slate-300'
                                }`}>
                                    <span>{deliveryMatchInfo.statusText}</span>
                                    <span className="font-mono">{selectedShotType}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Top Row: Sector Quick Selection & Radar Angle Wheel */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                        {/* 8-Direction Wagon Wheel Sectors */}
                        <div className="md:col-span-8 flex flex-col gap-1.5">
                            <div className="text-[10px] font-bold text-slate-400 flex items-center justify-between">
                                <span className="uppercase tracking-wider">🎯 Ground Direction & Sector:</span>
                                <span className="text-cyan-400 font-mono font-extrabold">{currentSector.name} ({shotAngle}°)</span>
                            </div>
                            
                            <div className="grid grid-cols-4 gap-1.5">
                                {GROUND_SECTORS.map(sec => {
                                    const isSelected = selectedSectorId === sec.id;
                                    return (
                                        <button
                                            key={sec.id}
                                            onClick={() => handleSelectSector(sec)}
                                            className={`p-1.5 rounded-xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                                                isSelected 
                                                    ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] scale-[1.02]' 
                                                    : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
                                            }`}
                                        >
                                            <div className="text-[11px] font-black truncate">{sec.label}</div>
                                            <div className="text-[9px] text-slate-400 font-mono">{sec.angle}°</div>
                                            {isSelected && (
                                                <span className="absolute top-1 right-1.5 text-cyan-400 text-[10px]">●</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Angle Fine-Tuning Slider */}
                            <div className="flex items-center gap-2 mt-1 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800/80">
                                <span className="text-[9px] text-slate-400 font-bold uppercase whitespace-nowrap">Rotate Arrow:</span>
                                <input
                                    type="range"
                                    min="0"
                                    max="360"
                                    value={shotAngle}
                                    onChange={(e) => handleAngleChange(parseInt(e.target.value))}
                                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                                />
                                <span className="text-xs font-mono font-black text-cyan-400 min-w-[36px] text-right">{shotAngle}°</span>
                            </div>
                        </div>

                        {/* Live Aiming Gauge & Gap Meter */}
                        <div className="md:col-span-4 bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between h-full gap-2">
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-800 pb-1">
                                <span>FIELD RADAR GAUGE</span>
                                <span className="text-emerald-400 font-bold">GAP {gapScore}%</span>
                            </div>

                            <div className="grid grid-cols-2 gap-1.5 text-center">
                                <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                                    <div className="text-[9px] text-slate-400">Boundary 4/6</div>
                                    <div className="text-sm font-black text-cyan-400">{estBoundaryChance}%</div>
                                </div>
                                <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                                    <div className="text-[9px] text-slate-400">Catch Risk</div>
                                    <div className="text-sm font-black text-rose-400">{estCatchRisk}%</div>
                                </div>
                            </div>

                            {/* Loft vs Ground Toggle */}
                            <button
                                onClick={() => { setIsLofted(!isLofted); playSFX('click'); }}
                                className={`w-full py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                                    isLofted
                                        ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30 animate-pulse'
                                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                                }`}
                            >
                                {isLofted ? '🚀 Lofted Over Infield (High Risk/Six)' : '🏏 Along the Ground (Safe Placement)'}
                            </button>
                        </div>
                    </div>

                    {/* Shot Intent and Shot Type Selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {/* 4 Intent Styles */}
                        <div className="flex flex-col gap-1">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Shot Intent & Power:
                            </div>
                            <div className="grid grid-cols-4 gap-1">
                                {(['Placement', 'Attacking', 'Lofted', 'Defensive'] as const).map(cat => {
                                    const isSelected = shotCategory === cat;
                                    return (
                                        <button
                                            key={cat}
                                            onClick={() => {
                                                setShotCategory(cat);
                                                if (cat === 'Lofted') setIsLofted(true);
                                                else if (cat === 'Defensive' || cat === 'Placement') setIsLofted(false);
                                                playSFX('click');
                                            }}
                                            className={`p-1.5 rounded-lg text-center text-[10px] font-bold border transition-all cursor-pointer ${
                                                isSelected 
                                                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-extrabold shadow-sm' 
                                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                                            }`}
                                        >
                                            {cat}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Shot Type Selection in Current Sector */}
                        <div className="flex flex-col gap-1">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Execution Shot:
                            </div>
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                                {currentSector.typicalShots.map(shot => {
                                    const isSelected = selectedShotType === shot;
                                    return (
                                        <button
                                            key={shot}
                                            onClick={() => { setSelectedShotType(shot); playSFX('click'); }}
                                            className={`px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all border cursor-pointer ${
                                                isSelected
                                                    ? 'bg-blue-600 text-white border-blue-400 font-extrabold shadow-sm'
                                                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                                            }`}
                                        >
                                            {shot}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* BOWLING CONTROLS TAB */}
            {activeTab === 'bowling' && (
                <div className="flex flex-col gap-3">
                    {/* Auto-Bowling Quick Bar */}
                    <div className="flex items-center justify-between bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-300 uppercase">🤖 Auto-Bowling Engine:</span>
                            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded ${isAutoBowling ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                                {isAutoBowling ? 'AUTO ACTIVE' : 'MANUAL TARGETING'}
                            </span>
                        </div>
                        {onToggleAutoBowling && (
                            <button
                                onClick={() => onToggleAutoBowling(!isAutoBowling)}
                                className={`text-[10px] font-black px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                                    isAutoBowling 
                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400 shadow-sm' 
                                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                                }`}
                            >
                                {isAutoBowling ? 'SWITCH TO MANUAL' : 'ENABLE AUTO-BOWLING'}
                            </button>
                        )}
                    </div>

                    {/* Batter Weakness Exploitation Alert */}
                    {isExploitingWeakness && (
                        <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl px-3 py-1.5 flex items-center justify-between text-amber-300 text-xs">
                            <div className="flex items-center gap-2 font-bold">
                                <span>⚡ WEAKNESS DETECTED:</span>
                                <span className="text-white">{striker.name} struggles against {selectedLength === 'short' ? 'Short Pitch' : bowler.bowlingSubType}!</span>
                            </div>
                            <span className="text-[10px] bg-amber-500/20 px-2 py-0.5 rounded text-amber-200 font-mono font-bold">+25% Wicket Chance</span>
                        </div>
                    )}

                    {/* SATELLITE GROUND ANALYSIS CARD (Visual consistency with player profile) */}
                    <div className="bg-slate-900/90 border border-slate-800/90 rounded-xl p-3 flex flex-col gap-2 shadow-inner">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-200 tracking-wider uppercase">
                                    🛰️ SATELLITE PITCH & LENGTH RADAR
                                </span>
                                <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                                    CORRIDOR ANALYSIS
                                </span>
                            </div>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase" style={{ backgroundColor: `${currentBowlingZoneMeta.color}25`, color: currentBowlingZoneMeta.color, border: `1px solid ${currentBowlingZoneMeta.color}50` }}>
                                {currentBowlingZoneMeta.badge}
                            </span>
                        </div>

                        {/* Interactive Pitch Grid & Live Zone Analysis */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center pt-1">
                            {/* Pitch Visual Grid */}
                            <div className="sm:col-span-6 bg-slate-950 p-2 rounded-xl border border-slate-800 flex flex-col gap-1.5">
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex justify-between">
                                    <span>Pitch Length:</span>
                                    <span className="text-emerald-400 font-mono">Click to Pitch</span>
                                </div>
                                <div className="grid grid-cols-1 gap-1">
                                    {BOWLING_LENGTHS.map(len => {
                                        const isSelected = selectedLength === len.id;
                                        return (
                                            <button
                                                key={len.id}
                                                onClick={() => handleBowlingLengthChange(len.id)}
                                                className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                                                    isSelected
                                                        ? 'bg-cyan-500/20 border-cyan-400 text-white font-black shadow-md'
                                                        : 'bg-slate-900 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs">{len.badge}</span>
                                                    <span className="text-[9px] text-slate-400 truncate hidden sm:inline">{len.name}</span>
                                                </div>
                                                {isSelected && <span className="text-cyan-400 text-xs">◀ AIMED</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Zone Satellite Stats Box */}
                            <div className="sm:col-span-6 bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between h-full gap-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Run Economy Ratio:</span>
                                    <span className="text-xs font-black font-mono text-white">{currentBowlingZoneMeta.runRatio}% Runs</span>
                                </div>
                                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${currentBowlingZoneMeta.runRatio * 2}%`, backgroundColor: currentBowlingZoneMeta.color }} />
                                </div>

                                <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Est. Wicket Threat:</span>
                                    <span className="text-xs font-black font-mono text-emerald-400">{'⭐'.repeat(currentBowlingZoneMeta.estWickets)}</span>
                                </div>

                                <p className="text-[11px] text-slate-300 italic font-mono leading-tight">
                                    "{currentBowlingZoneMeta.quote}"
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Line & Variation Selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* 3 Line Channels */}
                        <div className="flex flex-col gap-1.5">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Pitch Line & Channel:
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                                {BOWLING_LINES.map(line => {
                                    const isSelected = selectedLine === line.id;
                                    return (
                                        <button
                                            key={line.id}
                                            onClick={() => handleBowlingLineChange(line.id)}
                                            className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                                                isSelected 
                                                    ? 'bg-cyan-500/20 border-cyan-400 text-white font-black shadow-md' 
                                                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                                            }`}
                                        >
                                            <div className="text-xs font-bold">{line.name}</div>
                                            <div className="text-[8px] text-slate-400 mt-0.5 truncate">{line.subtext}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Bowling Variation Selector */}
                        <div className="flex flex-col gap-1.5">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                                <span>Delivery Variation:</span>
                                <span className="text-emerald-400 text-[9px] font-mono">{isSpinBowler ? 'Spin Specialist' : 'Pace Bowler'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                                {(isSpinBowler ? SPIN_VARIATIONS : FAST_VARIATIONS).map(varName => {
                                    const isSelected = selectedVariation === varName;
                                    return (
                                        <button
                                            key={varName}
                                            onClick={() => { setSelectedVariation(varName); playSFX('click'); }}
                                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all border cursor-pointer ${
                                                isSelected
                                                    ? 'bg-emerald-500 text-slate-950 border-emerald-300 font-extrabold shadow-sm'
                                                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                                            }`}
                                        >
                                            {varName}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SMART FIELDING & 10 PRESETS TAB */}
            {activeTab === 'fielding' && (
                <div className="flex flex-col gap-3">
                    {/* Header Controls: Smart Toggle & Match Phase Info */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 gap-2">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-amber-400 uppercase">
                                    🛡️ 10 TACTICAL FIELD FORMATIONS
                                </span>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${restrictions.isTest ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'}`}>
                                    {restrictions.phaseName}
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                                {restrictions.ruleDescription}
                            </p>
                        </div>

                        {onToggleSmartFielding && (
                            <button
                                onClick={() => { onToggleSmartFielding(!isSmartFieldingActive); playSFX('click'); }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all border cursor-pointer flex items-center gap-1.5 ${
                                    isSmartFieldingActive 
                                        ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/20' 
                                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                                }`}
                            >
                                <span>⚡ SMART AUTO-FIELDING:</span>
                                <span>{isSmartFieldingActive ? 'ON' : 'OFF'}</span>
                            </button>
                        )}
                    </div>

                    {/* Active Selected Preset Summary */}
                    <div className="bg-slate-900 border border-amber-500/40 rounded-xl p-3 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-white">{activePreset.name}</span>
                                <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold">
                                    {activePreset.tag}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-mono">
                                <span className="text-cyan-400 font-bold">{activePreset.ringCount} Ring</span>
                                <span className="text-slate-500">|</span>
                                <span className="text-yellow-400 font-bold">{activePreset.deepCount} Deep</span>
                            </div>
                        </div>
                        <p className="text-xs text-slate-300 italic font-mono leading-relaxed">
                            {activePreset.description}
                        </p>
                    </div>

                    {/* 10 Field Presets Grid with Restriction Status */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                        {FIELD_PRESETS.map((preset) => {
                            const isSelected = selectedFieldPresetId === preset.id;
                            const isValid = isPresetValidForSituation(preset, restrictions);
                            return (
                                <button
                                    key={preset.id}
                                    onClick={() => {
                                        onFieldPresetChange?.(preset.id);
                                        playSFX('click');
                                    }}
                                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 relative ${
                                        isSelected 
                                            ? 'bg-amber-500/20 border-amber-400 text-white shadow-lg shadow-amber-500/20' 
                                            : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-200">{preset.name}</span>
                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${
                                            restrictions.isTest 
                                                ? 'bg-emerald-500/20 text-emerald-300' 
                                                : isValid 
                                                    ? 'bg-cyan-500/20 text-cyan-300' 
                                                    : 'bg-red-500/20 text-red-300 border border-red-500/40'
                                        }`}>
                                            {restrictions.isTest ? 'UNRESTRICTED' : isValid ? 'VALID' : `LOCK (MAX ${restrictions.maxDeepFielders} DEEP)`}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
                                        <span>{preset.tag}</span>
                                        <span>{preset.deepCount} Outside Circle</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Tactical Action Buttons: Manual Execution & AI Auto-Ball */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                <button
                    onClick={handleExecute}
                    disabled={isAutoPlaying}
                    className={`flex-1 py-3 px-4 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all shadow-lg active:scale-95 cursor-pointer flex items-center justify-center gap-2 ${
                        isUserBatting
                            ? 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 shadow-cyan-500/25'
                            : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-slate-950 shadow-emerald-500/25'
                    }`}
                >
                    <Icons.Play className="w-4 h-4 fill-current" />
                    <span>
                        {isUserBatting
                            ? `🏏 PLAY SHOT: ${selectedShotType} (${currentSector.label})`
                            : `🥎 BOWL: ${selectedLength.toUpperCase()} ON ${selectedLine.toUpperCase()}`}
                    </span>
                </button>

                <button
                    onClick={handleAutoExecute}
                    disabled={isAutoPlaying}
                    className="py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40"
                    title="Auto-calculate optimal tactics and deliver/bat immediately"
                >
                    <span>🤖 AUTO NEXT</span>
                </button>
            </div>

            {/* Last Ball Tactical Feedback & Shot Physics Consequence Chip */}
            {lastShotFeedback && (
                <div className={`p-2.5 rounded-xl border flex flex-col gap-1 transition-all ${
                    lastShotFeedback.isOut
                        ? 'bg-red-950/80 border-red-500/50 text-red-200'
                        : lastShotFeedback.runs >= 4
                        ? 'bg-purple-950/80 border-purple-500/50 text-purple-200'
                        : lastShotFeedback.type.includes('edge') || lastShotFeedback.type === 'play_and_miss'
                        ? 'bg-amber-950/80 border-amber-500/50 text-amber-200'
                        : 'bg-slate-900/90 border-slate-800 text-slate-300'
                }`}>
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                            <span>{lastShotFeedback.isOut ? '❌ WICKET / OUTCOME:' : lastShotFeedback.runs >= 4 ? '🔥 BOUNDARY CONNECTION:' : '🎯 SHOT EXECUTION RESULT:'}</span>
                            <span className="text-white font-extrabold">{lastShotFeedback.title}</span>
                        </span>
                        <span className="text-xs font-mono font-black">
                            {lastShotFeedback.isOut ? 'WICKET' : `${lastShotFeedback.runs} RUNS`}
                        </span>
                    </div>
                    <p className="text-xs font-medium leading-tight">
                        {lastShotFeedback.message}
                    </p>
                </div>
            )}

            {/* Last Ball Tactical Summary Chip */}
            {lastTacticalExecution && !lastShotFeedback && (
                <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl px-3 py-1.5 text-xs flex items-center justify-between text-slate-300">
                    <div className="flex items-center gap-2 truncate">
                        <span className="text-[10px] bg-slate-800 text-cyan-400 px-1.5 py-0.5 rounded font-mono font-bold">
                            LAST EXECUTION
                        </span>
                        <span className="text-slate-200 font-bold truncate">{lastTacticalExecution.summary}</span>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                        lastTacticalExecution.runsScored >= 4 ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40' :
                        lastTacticalExecution.isWicket ? 'bg-red-600/30 text-red-300 border border-red-500/40' :
                        'bg-slate-800 text-slate-400'
                    }`}>
                        {lastTacticalExecution.quality}
                    </span>
                </div>
            )}
        </div>
    );
};

export interface TacticsVisualsGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: 'batting' | 'bowling' | 'autocounter' | 'pitch';
}

export const TacticsVisualsGuideModal: React.FC<TacticsVisualsGuideModalProps> = ({
    isOpen,
    onClose,
    initialTab = 'batting'
}) => {
    const [activeTab, setActiveTab] = useState<'batting' | 'bowling' | 'autocounter' | 'pitch'>(initialTab);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in">
            <div className="bg-slate-900 border border-cyan-500/40 rounded-3xl shadow-2xl shadow-cyan-500/10 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-slate-100">
                <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 text-lg shadow-inner">
                            📖
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                                Match Tactics & Visuals Guide
                            </h2>
                            <p className="text-[11px] text-slate-400">
                                Master interactive batting, bowling physics, pitch landing zones, and Auto-Counter mechanics
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                        title="Close Guide"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex bg-slate-950 px-4 py-2 border-b border-slate-800/80 gap-1 sm:gap-2 overflow-x-auto scrollbar-hide">
                    {[
                        { id: 'batting', label: '🏏 Batting Logic', icon: '🎯' },
                        { id: 'bowling', label: '⚡ Bowling & Pitch', icon: '📍' },
                        { id: 'autocounter', label: '🤖 Auto-Counter', icon: '⚡' },
                        { id: 'pitch', label: '🏟️ Field Gaps', icon: '📐' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                                activeTab === tab.id
                                    ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                            }`}
                        >
                            <span>{tab.icon}</span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-sm">
                    {activeTab === 'batting' && (
                        <div className="space-y-5 animate-fade-in">
                            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
                                <h3 className="text-sm font-black text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <span>🎯</span> How Batting & Aiming Works
                                </h3>
                                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                                    Before every ball, the bowler prepares a delivery (speed, length, and line). Your goal is to:
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                                    <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                                        <div className="font-bold text-teal-400 mb-1">1. Read the Delivery</div>
                                        <div className="text-slate-400 text-[11px]">Check the incoming radar pill showing speed, length (Short/Good/Full/Yorker), and line.</div>
                                    </div>
                                    <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                                        <div className="font-bold text-teal-400 mb-1">2. Aim into Gaps</div>
                                        <div className="text-slate-400 text-[11px]">Drag or tap on the field to direct your shot into open green spaces away from the 11 fielders.</div>
                                    </div>
                                    <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                                        <div className="font-bold text-teal-400 mb-1">3. Select Shot Type</div>
                                        <div className="text-slate-400 text-[11px]">Pick ground placement for risk-free 4s/2s, or toggle Lofted (🚀) for massive 6s over the ropes.</div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2.5">
                                    🏏 Delivery vs Counter Shot Matrix
                                </h4>
                                <div className="space-y-2 text-xs">
                                    <div className="bg-purple-950/40 border border-purple-500/30 p-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full bg-purple-500 flex-shrink-0"></span>
                                            <div>
                                                <span className="font-extrabold text-purple-300">SHORT / BOUNCER:</span>
                                                <span className="text-slate-300 ml-1">Rises sharply towards batsman's chest</span>
                                            </div>
                                        </div>
                                        <div className="text-[11px] text-right">
                                            <span className="text-emerald-400 font-bold">✅ Pull, Hook, Upper Cut</span>
                                            <span className="text-red-400 font-bold ml-2">❌ Don't Frontfoot Drive</span>
                                        </div>
                                    </div>

                                    <div className="bg-emerald-950/40 border border-emerald-500/30 p-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0"></span>
                                            <div>
                                                <span className="font-extrabold text-emerald-300">GOOD LENGTH:</span>
                                                <span className="text-slate-300 ml-1">In the corridor of uncertainty</span>
                                            </div>
                                        </div>
                                        <div className="text-[11px] text-right">
                                            <span className="text-emerald-400 font-bold">✅ Backfoot Punch, Square Cut, Defense</span>
                                            <span className="text-red-400 font-bold ml-2">❌ Don't Wild Slog</span>
                                        </div>
                                    </div>

                                    <div className="bg-amber-950/40 border border-amber-500/30 p-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full bg-amber-500 flex-shrink-0"></span>
                                            <div>
                                                <span className="font-extrabold text-amber-300">FULL LENGTH:</span>
                                                <span className="text-slate-300 ml-1">Pitched up invitingly outside off or on stumps</span>
                                            </div>
                                        </div>
                                        <div className="text-[11px] text-right">
                                            <span className="text-emerald-400 font-bold">✅ Cover Drive, Straight Drive, On Drive</span>
                                            <span className="text-red-400 font-bold ml-2">❌ Don't Backfoot Pull</span>
                                        </div>
                                    </div>

                                    <div className="bg-rose-950/40 border border-rose-500/30 p-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full bg-rose-500 flex-shrink-0"></span>
                                            <div>
                                                <span className="font-extrabold text-rose-300">YORKER:</span>
                                                <span className="text-slate-300 ml-1">Deadly blockhole delivery crashing at toes</span>
                                            </div>
                                        </div>
                                        <div className="text-[11px] text-right">
                                            <span className="text-emerald-400 font-bold">✅ Dig Out, Straight Push, Block</span>
                                            <span className="text-red-400 font-bold ml-2">❌ NEVER Loft / Slog (Bowled/LBW!)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                <div className="bg-blue-950/30 border border-blue-500/30 p-3.5 rounded-2xl">
                                    <div className="font-black text-blue-400 mb-1 flex items-center gap-1.5">
                                        <span>🎯</span> GROUND PLACEMENT
                                    </div>
                                    <p className="text-slate-300 text-[11px] leading-relaxed">
                                        Keeps the ball rolling on the grass. Zero risk of being caught in the deep! Pierces gaps for 4s or generates brisk 1s and 2s.
                                    </p>
                                </div>
                                <div className="bg-amber-950/30 border border-amber-500/30 p-3.5 rounded-2xl">
                                    <div className="font-black text-amber-400 mb-1 flex items-center gap-1.5">
                                        <span>🚀</span> LOFTED POWER SHOT
                                    </div>
                                    <p className="text-slate-300 text-[11px] leading-relaxed">
                                        Launches the ball high over the 30-yard circle for maximum 6s and 4s! Watch out for deep fielders along the boundary ropes.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'bowling' && (
                        <div className="space-y-5 animate-fade-in">
                            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
                                <h3 className="text-sm font-black text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <span>📍</span> Pitch Strip & Bowling Length Zones
                                </h3>
                                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                                    Tap or drag across the interactive 22-yard pitch strip to set where your bowler lands the delivery. Combine length, line, and swing/spin variations to outfox the opposition:
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                    <div className="bg-purple-950/40 border border-purple-500/40 p-2.5 rounded-xl text-center">
                                        <div className="font-black text-purple-300 text-xs">🟣 SHORT</div>
                                        <div className="text-[10px] text-slate-400 mt-1">Bouncers & rib-ticklers. Induces hurried top-edge catches.</div>
                                    </div>
                                    <div className="bg-emerald-950/40 border border-emerald-500/40 p-2.5 rounded-xl text-center">
                                        <div className="font-black text-emerald-300 text-xs">🟢 GOOD LENGTH</div>
                                        <div className="text-[10px] text-slate-400 mt-1">Corridor of uncertainty. Generates edges to slips & keeper.</div>
                                    </div>
                                    <div className="bg-amber-950/40 border border-amber-500/40 p-2.5 rounded-xl text-center">
                                        <div className="font-black text-amber-300 text-xs">🟡 FULL</div>
                                        <div className="text-[10px] text-slate-400 mt-1">Swing & dipping full tosses. Great for inswinging bowled/LBW.</div>
                                    </div>
                                    <div className="bg-rose-950/40 border border-rose-500/40 p-2.5 rounded-xl text-center">
                                        <div className="font-black text-rose-300 text-xs">🔴 YORKER</div>
                                        <div className="text-[10px] text-slate-400 mt-1">Death over specialist. Shatters stumps and pins toes.</div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2.5">
                                    ⚡ Seam & Spin Variations
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                                    <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                                        <div className="font-bold text-cyan-400 mb-1">⚡ Fast Bowler Arsenal</div>
                                        <ul className="text-slate-400 text-[11px] space-y-1 list-disc list-inside">
                                            <li><span className="text-slate-200 font-semibold">Outswinger:</span> Drifts away outside off stump to catch the edge.</li>
                                            <li><span className="text-slate-200 font-semibold">Inswinger:</span> Curves into right-hander's pads to target LBW/Bowled.</li>
                                            <li><span className="text-slate-200 font-semibold">Slower Ball Bouncer:</span> Deceives early swings at the death.</li>
                                            <li><span className="text-slate-200 font-semibold">Reverse Swing:</span> Late lethal darting movement with old ball.</li>
                                        </ul>
                                    </div>
                                    <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                                        <div className="font-bold text-teal-400 mb-1">🌀 Spinner Arsenal</div>
                                        <ul className="text-slate-400 text-[11px] space-y-1 list-disc list-inside">
                                            <li><span className="text-slate-200 font-semibold">Leg Break:</span> Sharp turn away from right-handed batsman.</li>
                                            <li><span className="text-slate-200 font-semibold">Googly / Wrong-un:</span> Spins inwards unexpectedly.</li>
                                            <li><span className="text-slate-200 font-semibold">Arm Ball:</span> Slams straight on with the arm for trapped LBW.</li>
                                            <li><span className="text-slate-200 font-semibold">Flighted Top Spinner:</span> Extra bounce to induce miscued scoops.</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'autocounter' && (
                        <div className="space-y-5 animate-fade-in">
                            <div className="bg-slate-950/70 border border-teal-500/40 rounded-2xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-black text-xs border border-teal-500/40">
                                        ⚡ AUTO-COUNTER MODE
                                    </span>
                                    <span className="text-xs text-slate-400">Automated Smart Batter AI</span>
                                </div>
                                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                                    Auto-Counter is an intelligent gameplay assistant that automatically aligns your batter against every incoming ball:
                                </p>
                                <div className="space-y-2.5 text-xs">
                                    <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 flex items-start gap-2.5">
                                        <span className="text-teal-400 text-base">🔍</span>
                                        <div>
                                            <span className="font-bold text-white">Scans Incoming Delivery:</span>
                                            <p className="text-slate-400 text-[11px] mt-0.5">
                                                Detects bowler length, line, and speed instantly as the bowler runs in.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 flex items-start gap-2.5">
                                        <span className="text-teal-400 text-base">📐</span>
                                        <div>
                                            <span className="font-bold text-white">Finds Widest Field Gap:</span>
                                            <p className="text-slate-400 text-[11px] mt-0.5">
                                                Calculates the angular distances of all 11 fielders and targets the exact open corridor with maximum clearance.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 flex items-start gap-2.5">
                                        <span className="text-teal-400 text-base">🛡️</span>
                                        <div>
                                            <span className="font-bold text-white">Picks Compatible Shot:</span>
                                            <p className="text-slate-400 text-[11px] mt-0.5">
                                                Selects high-percentage strokes (e.g. Pull vs Bouncer, Straight Push vs Yorker, Cover Drive vs Full) to prevent wickets and maximize scoring!
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 text-xs">
                                <div className="font-bold text-slate-200 mb-1 flex items-center gap-1.5">
                                    <span>💡</span> Auto-Counter Switch (ON / OFF)
                                </div>
                                <p className="text-slate-400 text-[11px] leading-relaxed">
                                    Use the <strong className="text-teal-300">⚡ Auto-Counter</strong> toggle button on the top floating bar anytime during the match. Keep it <strong className="text-white">ON</strong> for smooth, optimal AI-countered batting, or turn it <strong className="text-white">OFF</strong> to take full manual control of shot angles, loft, and placement!
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'pitch' && (
                        <div className="space-y-5 animate-fade-in">
                            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
                                <h3 className="text-sm font-black text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <span>📐</span> Reading the Field & Wagon Wheel
                                </h3>
                                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                                    The circular field displays 11 real fielder positions. Understanding fielder roles helps you pierce boundaries:
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                    <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                                        <div className="font-bold text-yellow-300 mb-1 flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block"></span>
                                            Deep Fielders (Ropes)
                                        </div>
                                        <p className="text-slate-400 text-[11px]">
                                            Stationed along the boundary ropes (Deep Mid-Wicket, Long On, Long Off, Deep Square Leg, Third Man). They catch aerial shots and cut boundaries down to 1 or 2 runs.
                                        </p>
                                    </div>
                                    <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                                        <div className="font-bold text-cyan-300 mb-1 flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block"></span>
                                            Ring Fielders (Infield)
                                        </div>
                                        <p className="text-slate-400 text-[11px]">
                                            Positioned inside the 30-yard circle (Cover, Point, Mid-Off, Mid-On, Square Leg). Hard ground shots hit straight at them become dot balls. Pierce between them for 4s!
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-emerald-950/30 border border-emerald-500/30 p-3.5 rounded-2xl text-xs">
                                <div className="font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                                    <span>🟢</span> Green Reticle & Gap Clearance
                                </div>
                                <p className="text-slate-300 text-[11px] leading-relaxed">
                                    When you aim your shot, a green dotted circle and angle clearance badge show you if your trajectory has &gt;18° clearance from the nearest fielder. Clear gaps guarantee boundaries and safe runs!
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                        Tip: You can re-open this guide anytime during the live match!
                    </span>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer"
                    >
                        Got It, Let's Play!
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LiveMatchTacticalControls;

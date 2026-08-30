import React, { useEffect, useState } from 'react';
import { DRSReviewEvent } from '../types';
import { Eye, Shield, CheckCircle2, XCircle, AlertTriangle, Radio, Activity, Play } from 'lucide-react';

interface HawkEyeVisualProps {
    event: DRSReviewEvent;
}

export const HawkEyeVisual: React.FC<HawkEyeVisualProps> = ({ event }) => {
    const [animProgress, setAnimProgress] = useState(0);

    const { pitching, impact, wickets } = event.ballTracking;

    useEffect(() => {
        setAnimProgress(0);
        const interval = setInterval(() => {
            setAnimProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                return prev + 4;
            });
        }, 30);
        return () => clearInterval(interval);
    }, [event]);

    let stumpImpactY = 100; // Middle stump height
    if (wickets === 'MISSING') {
        stumpImpactY = 45; // Over the stumps
    } else if (wickets === 'UMPIRES_CALL') {
        stumpImpactY = 70; // Clipping top of bail
    } else {
        stumpImpactY = 95; // Dead center hitting
    }

    let pitchX = 180;
    let pitchY = 190;
    if (pitching === 'OUTSIDE_OFF') pitchY = 210;
    if (pitching === 'OUTSIDE_LEG') pitchY = 170;

    let impactX = 320;
    let impactY = 140;
    if (impact === 'OUTSIDE_OFF') impactY = 160;

    const releaseX = 30;
    const releaseY = 210;
    const stumpsX = 430;

    const pathD = `M ${releaseX} ${releaseY} Q ${(releaseX + pitchX) / 2} ${pitchY + 15}, ${pitchX} ${pitchY} Q ${(pitchX + impactX) / 2} ${impactY - 10}, ${impactX} ${impactY} Q ${(impactX + stumpsX) / 2} ${(impactY + stumpImpactY) / 2 - 15}, ${stumpsX} ${stumpImpactY}`;

    const p = animProgress / 100;
    let currentX = releaseX;
    let currentY = releaseY;

    if (p <= 0.4) {
        const subP = p / 0.4;
        currentX = releaseX + (pitchX - releaseX) * subP;
        currentY = releaseY + (pitchY - releaseY) * subP;
    } else if (p <= 0.7) {
        const subP = (p - 0.4) / 0.3;
        currentX = pitchX + (impactX - pitchX) * subP;
        currentY = pitchY + (impactY - pitchY) * subP;
    } else {
        const subP = (p - 0.7) / 0.3;
        currentX = impactX + (stumpsX - impactX) * subP;
        currentY = impactY + (stumpImpactY - impactY) * subP;
    }

    return (
        <div className="bg-slate-950 border border-cyan-500/30 rounded-2xl p-4 flex flex-col gap-4 shadow-2xl relative overflow-hidden">
            {/* Header / Telemetry Tag */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></div>
                    <span className="text-xs font-black tracking-widest uppercase text-cyan-400 flex items-center gap-1.5">
                        <Eye className="w-4 h-4" />
                        HAWK-EYE 3D BALL TRACKING
                    </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    PRECISION: 99.8% ACCURACY
                </span>
            </div>

            {/* 2D Perspective Pitch & Stumps Graphic Canvas */}
            <div className="relative w-full h-[160px] sm:h-[180px] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 280" preserveAspectRatio="xMidYMid meet">
                    <defs>
                        <linearGradient id="pitchGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#0f172a" stopOpacity="0.8" />
                            <stop offset="50%" stopColor="#1e293b" stopOpacity="0.9" />
                            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.8" />
                        </linearGradient>
                        <filter id="glowRed">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                            <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                        </filter>
                        <filter id="glowCyan">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                            <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Perspective Turf Pitch Strip */}
                    <polygon points="10,240 40,160 480,160 490,240" fill="url(#pitchGrad)" stroke="#334155" strokeWidth="1" />
                    <polygon points="150,225 150,175 440,175 440,225" fill="none" stroke="#334155" strokeDasharray="3 3" strokeWidth="1" />
                    <line x1="410" y1="165" x2="410" y2="235" stroke="#94a3b8" strokeWidth="2" />
                    <line x1="40" y1="170" x2="40" y2="230" stroke="#64748b" strokeWidth="1.5" />
                    <line x1="10" y1="200" x2="490" y2="200" stroke="#0284c7" strokeWidth="0.8" strokeDasharray="4 4" opacity="0.4" />

                    {/* Stumps & Bails */}
                    <g transform="translate(430, 60)">
                        <ellipse cx="0" cy="85" rx="14" ry="4" fill="#000000" opacity="0.6" />
                        <rect x="-10" y="20" width="4" height="65" rx="1" fill={wickets === 'HITTING' ? '#f87171' : '#e2e8f0'} stroke="#1e293b" strokeWidth="0.5" />
                        <rect x="-2" y="20" width="4" height="65" rx="1" fill={wickets === 'HITTING' ? '#ef4444' : '#e2e8f0'} stroke="#1e293b" strokeWidth="0.5" />
                        <rect x="6" y="20" width="4" height="65" rx="1" fill={wickets === 'HITTING' ? '#f87171' : '#e2e8f0'} stroke="#1e293b" strokeWidth="0.5" />
                        <rect x="-11" y="17" width="10" height="3" rx="0.5" fill={wickets === 'HITTING' && animProgress > 90 ? '#ef4444' : '#cbd5e1'} className={wickets === 'HITTING' && animProgress > 90 ? 'animate-bounce' : ''} />
                        <rect x="1" y="17" width="10" height="3" rx="0.5" fill={wickets === 'HITTING' && animProgress > 90 ? '#ef4444' : '#cbd5e1'} className={wickets === 'HITTING' && animProgress > 90 ? 'animate-bounce' : ''} />
                        <rect x="-14" y="16" width="28" height="70" fill="none" 
                            stroke={wickets === 'HITTING' ? '#ef4444' : (wickets === 'UMPIRES_CALL' ? '#f59e0b' : '#10b981')} 
                            strokeWidth="1.5" strokeDasharray={wickets === 'HITTING' ? 'none' : '2 2'} opacity="0.8" />
                    </g>

                    <path d={pathD} fill="none" stroke={wickets === 'HITTING' ? '#ef4444' : '#22d3ee'} strokeWidth="3" strokeLinecap="round" filter="url(#glowCyan)" opacity="0.85" />

                    {animProgress >= 40 && (
                        <g transform={`translate(${pitchX}, ${pitchY})`}>
                            <circle r="12" fill="none" stroke={pitching === 'IN_LINE' ? '#10b981' : '#f59e0b'} strokeWidth="1.5" className="animate-ping" opacity="0.7" />
                            <circle r="5" fill={pitching === 'IN_LINE' ? '#10b981' : '#f59e0b'} />
                            <text x="0" y="22" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="bold" fontFamily="monospace">
                                PITCH: {pitching.replace('_', ' ')}
                            </text>
                        </g>
                    )}

                    {animProgress >= 70 && (
                        <g transform={`translate(${impactX}, ${impactY})`}>
                            <circle r="12" fill="none" stroke={impact === 'IN_LINE' ? '#10b981' : '#f59e0b'} strokeWidth="1.5" className="animate-ping" opacity="0.7" />
                            <circle r="5" fill={impact === 'IN_LINE' ? '#10b981' : '#f59e0b'} />
                            <text x="0" y="-14" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="bold" fontFamily="monospace">
                                IMPACT: {impact.replace('_', ' ')}
                            </text>
                        </g>
                    )}

                    <g transform={`translate(${currentX}, ${currentY})`}>
                        <circle r="7" fill="#f87171" stroke="#ffffff" strokeWidth="1.5" filter="url(#glowRed)" />
                        <circle r="2" fill="#ffffff" />
                    </g>

                    {animProgress >= 95 && (
                        <g transform={`translate(430, ${stumpImpactY - 20})`}>
                            <rect x="-45" y="-12" width="90" height="22" rx="4" 
                                fill={wickets === 'HITTING' ? '#ef4444' : (wickets === 'UMPIRES_CALL' ? '#f59e0b' : '#10b981')} />
                            <text x="0" y="3" textAnchor="middle" fill="#0f172a" fontSize="10" fontWeight="900" fontFamily="sans-serif">
                                WICKETS: {wickets.replace('_', ' ')}
                            </text>
                        </g>
                    )}
                </svg>
            </div>

            {/* Stat Cards Breakdown Row */}
            <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
                <div className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-0.5 ${
                    pitching === 'IN_LINE' 
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400' 
                        : 'bg-amber-950/40 border-amber-500/40 text-amber-400'
                }`}>
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Pitching</span>
                    <span className="font-bold text-xs">{pitching.replace('_', ' ')}</span>
                    <span className="text-[8px] text-slate-400">{pitching === 'IN_LINE' ? '✓ In Line' : 'Outside Line'}</span>
                </div>

                <div className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-0.5 ${
                    impact === 'IN_LINE' 
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400' 
                        : 'bg-amber-950/40 border-amber-500/40 text-amber-400'
                }`}>
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Impact</span>
                    <span className="font-bold text-xs">{impact.replace('_', ' ')}</span>
                    <span className="text-[8px] text-slate-400">{impact === 'IN_LINE' ? '✓ In Line' : 'Outside Line'}</span>
                </div>

                <div className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-0.5 ${
                    wickets === 'HITTING' 
                        ? 'bg-red-950/50 border-red-500/50 text-red-400' 
                        : (wickets === 'UMPIRES_CALL' ? 'bg-amber-950/50 border-amber-500/50 text-amber-400' : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400')
                }`}>
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Wickets Target</span>
                    <span className="font-bold text-xs">{wickets.replace('_', ' ')}</span>
                    <span className="text-[8px] text-slate-400">
                        {wickets === 'HITTING' ? '🎯 Hitting' : (wickets === 'UMPIRES_CALL' ? '⚠️ Umpire\'s Call' : '✕ Missing')}
                    </span>
                </div>
            </div>
        </div>
    );
};

interface DRSModalProps {
    event: DRSReviewEvent;
    onComplete: (event: DRSReviewEvent) => void;
}

export const DRSModal: React.FC<DRSModalProps> = ({ event, onComplete }) => {
    const [step, setStep] = useState<'intro' | 'ultraedge' | 'balltracking' | 'verdict'>('intro');
    const [scanProgress, setScanProgress] = useState(0);

    const isLBW = event.type === 'LBW';

    useEffect(() => {
        // Step timer sequence for TV Broadcast feel (crisp & responsive)
        const timer1 = setTimeout(() => setStep('ultraedge'), 1000);
        
        let timer2: NodeJS.Timeout;
        let timer3: NodeJS.Timeout;

        if (isLBW) {
            timer2 = setTimeout(() => setStep('balltracking'), 3500);
            timer3 = setTimeout(() => setStep('verdict'), 7000);
        } else {
            // For Caught/Edge, skip ball tracking and go straight to verdict
            timer3 = setTimeout(() => setStep('verdict'), 4000);
        }

        return () => {
            clearTimeout(timer1);
            if (timer2) clearTimeout(timer2);
            if (timer3) clearTimeout(timer3);
        };
    }, [isLBW]);

    useEffect(() => {
        if (step === 'ultraedge') {
            setScanProgress(0);
            const interval = setInterval(() => {
                setScanProgress(prev => {
                    if (prev >= 100) {
                        clearInterval(interval);
                        return 100;
                    }
                    return prev + 6;
                });
            }, 60);
            return () => clearInterval(interval);
        }
    }, [step]);

    const isOverturned = event.finalDecision === 'OVERTURNED';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-2 sm:p-4 animate-fadeIn">
            <div className="w-full max-w-2xl bg-slate-900 border-2 border-cyan-500/50 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.3)] overflow-hidden flex flex-col max-h-[92vh]">
                
                {/* TV Broadcast Top Bar */}
                <div className="bg-gradient-to-r from-slate-950 via-cyan-950 to-slate-950 border-b border-cyan-500/30 px-3 sm:px-5 py-2.5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="px-2 py-0.5 bg-cyan-500 text-slate-950 font-black tracking-widest text-[9px] sm:text-[10px] uppercase rounded flex items-center gap-1 animate-pulse">
                            <Radio className="w-3 h-3" />
                            DRS BROADCAST
                        </div>
                        <span className="text-slate-200 font-bold text-xs sm:text-sm tracking-wide truncate max-w-[140px] sm:max-w-none">
                            {event.reviewingTeamName.toUpperCase()} ({event.type})
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-mono">
                        <span className="text-slate-400 hidden sm:inline">ON-FIELD:</span>
                        <span className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                            event.onFieldDecision === 'OUT' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                            {event.onFieldDecision}
                        </span>
                    </div>
                </div>

                {/* Main TV Screen Content Area - Scrollable for Mobile */}
                <div className="p-2.5 sm:p-4 flex-1 flex flex-col gap-3 sm:gap-4 bg-slate-900/90 relative overflow-y-auto">
                    
                    {/* Players Info Bar */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-950/60 border border-slate-800 rounded-lg p-2 text-xs shrink-0">
                        <div className="flex flex-col">
                            <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Batter</span>
                            <span className="font-bold text-slate-100 truncate">{event.batterName}</span>
                        </div>
                        <div className="flex flex-col text-right">
                            <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Bowler</span>
                            <span className="font-bold text-cyan-400 truncate">{event.bowlerName} ({event.ballDetails.speed ? `${event.ballDetails.speed} kph` : ''})</span>
                        </div>
                    </div>

                    {/* Step 1: INTRO */}
                    {step === 'intro' && (
                        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center py-4">
                            <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 animate-spin">
                                <Activity className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">THIRD UMPIRE TELEMETRY CONNECTED</h3>
                                <p className="text-slate-400 text-xs mt-0.5">Analyzing Trajectory & Edge Audio...</p>
                            </div>
                        </div>
                    )}

                    {/* Step 2: ULTRAEDGE / SNICKOMETER */}
                    {(step === 'ultraedge' || step === 'balltracking' || step === 'verdict') && (
                        <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 flex flex-col gap-1.5 shrink-0">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1">
                                    <Activity className="w-3 h-3 text-cyan-400" />
                                    ULTRAEDGE
                                </span>
                                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                    event.ultraEdge.hasEdge 
                                        ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse' 
                                        : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                }`}>
                                    {event.ultraEdge.hasEdge ? '⚡ SPIKE DETECTED (EDGE)' : 'FLATLINE (NO EDGE)'}
                                </span>
                            </div>

                            {/* Soundwave Graph Canvas */}
                            <div className="h-12 sm:h-14 bg-slate-900/90 rounded border border-slate-800/80 relative overflow-hidden flex items-center justify-center">
                                {/* Grid lines */}
                                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:12px_12px] opacity-40"></div>
                                
                                {/* Center line */}
                                <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-cyan-500/30"></div>

                                {/* Laser Scan Bar */}
                                {step === 'ultraedge' && (
                                    <div 
                                        className="absolute top-0 bottom-0 w-1 bg-cyan-400 shadow-[0_0_15px_#22d3ee] transition-all duration-75"
                                        style={{ left: `${scanProgress}%` }}
                                    ></div>
                                )}

                                {/* Waveform Visual */}
                                <div className="w-full px-3 flex items-center justify-between gap-0.5 z-10">
                                    {[10, 15, 8, 20, 12, 18, 14, 22, 15, 8, 12, event.ultraEdge.hasEdge ? 85 : 15, event.ultraEdge.hasEdge ? 95 : 12, event.ultraEdge.hasEdge ? 70 : 18, 16, 10, 14, 8, 20, 12].map((height, i) => (
                                        <div 
                                            key={i}
                                            className={`w-1 sm:w-1.5 rounded-full transition-all duration-300 ${
                                                event.ultraEdge.hasEdge && i >= 11 && i <= 13
                                                    ? 'bg-red-500 shadow-[0_0_10px_#ef4444]'
                                                    : 'bg-cyan-400/80'
                                            }`}
                                            style={{ height: `${height}%` }}
                                        ></div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: BALL TRACKING / HAWK-EYE VISUAL DIAGRAM */}
                    {(step === 'balltracking' || (step === 'verdict' && isLBW)) && isLBW && (
                        <div className="shrink-0">
                            <HawkEyeVisual event={event} />
                        </div>
                    )}

                    {/* Step 4: VERDICT & DECISION OVERRULE */}
                    {step === 'verdict' && (
                        <div className="bg-slate-950 border-2 border-cyan-500/60 rounded-xl p-3 text-center flex flex-col items-center gap-2 animate-scaleUp shadow-xl shrink-0">
                            <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                                THIRD UMPIRE FINAL DECISION
                            </div>

                            <div className={`px-4 py-1.5 rounded-lg text-sm sm:text-base font-black tracking-widest uppercase shadow-2xl flex items-center gap-2 ${
                                isOverturned
                                    ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30'
                                    : 'bg-red-500 text-white shadow-red-500/30'
                            }`}>
                                {isOverturned ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                {event.finalDecision}: {isOverturned ? (event.onFieldDecision === 'OUT' ? 'NOT OUT' : 'OUT') : event.onFieldDecision}
                            </div>

                            <p className="text-xs font-medium text-slate-300">
                                {event.reviewResultText}
                            </p>
                        </div>
                    )}
                </div>

                {/* Sticky Footer for Action Button */}
                {step === 'verdict' && (
                    <div className="sticky bottom-0 bg-slate-950 border-t border-cyan-500/30 p-2.5 sm:p-3 shrink-0 z-20">
                        <button
                            onClick={() => onComplete(event)}
                            className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black tracking-wider text-xs sm:text-sm uppercase rounded-xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
                        >
                            <Play className="w-4 h-4 fill-slate-950" />
                            CONFIRM & CONTINUE MATCH
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

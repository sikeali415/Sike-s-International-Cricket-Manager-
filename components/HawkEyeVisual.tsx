import React, { useEffect, useState } from 'react';
import { DRSReviewEvent } from '../types';
import { Eye, ShieldAlert, CheckCircle2, AlertTriangle, Target } from 'lucide-react';

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

    // Positions for pitching, impact, and wickets projection in SVG space (ViewBox 0 0 500 280)
    // Pitching point (Bounce): x=180, y=190
    // Impact point (Pad): x=320, y=140
    // Stumps location: x=430, y=80..130 (Stumps height)

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

    // SVG path string for ball trajectory
    // Release (20, 210) -> Pitching (pitchX, pitchY) -> Impact (impactX, impactY) -> Stumps (430, stumpImpactY)
    const releaseX = 30;
    const releaseY = 210;
    const stumpsX = 430;

    const pathD = `M ${releaseX} ${releaseY} Q ${(releaseX + pitchX) / 2} ${pitchY + 15}, ${pitchX} ${pitchY} Q ${(pitchX + impactX) / 2} ${impactY - 10}, ${impactX} ${impactY} Q ${(impactX + stumpsX) / 2} ${(impactY + stumpImpactY) / 2 - 15}, ${stumpsX} ${stumpImpactY}`;

    // Compute ball current position along progress %
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
                
                {/* Tactical Pitch Grid Background */}
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

                    {/* Stumps Mat Area Lines */}
                    <polygon points="150,225 150,175 440,175 440,225" fill="none" stroke="#334155" strokeDasharray="3 3" strokeWidth="1" />

                    {/* Popping Crease (Batter end near stumps) */}
                    <line x1="410" y1="165" x2="410" y2="235" stroke="#94a3b8" strokeWidth="2" />
                    
                    {/* Bowling Crease (Bowler release) */}
                    <line x1="40" y1="170" x2="40" y2="230" stroke="#64748b" strokeWidth="1.5" />

                    {/* Center Pitch Line */}
                    <line x1="10" y1="200" x2="490" y2="200" stroke="#0284c7" strokeWidth="0.8" strokeDasharray="4 4" opacity="0.4" />

                    {/* --- THE THREE STUMPS & BAILS (Target Zone) --- */}
                    <g transform="translate(430, 60)">
                        {/* Stumps Shadow */}
                        <ellipse cx="0" cy="85" rx="14" ry="4" fill="#000000" opacity="0.6" />

                        {/* Off Stump */}
                        <rect x="-10" y="20" width="4" height="65" rx="1" fill={wickets === 'HITTING' ? '#f87171' : '#e2e8f0'} stroke="#1e293b" strokeWidth="0.5" />
                        {/* Middle Stump */}
                        <rect x="-2" y="20" width="4" height="65" rx="1" fill={wickets === 'HITTING' ? '#ef4444' : '#e2e8f0'} stroke="#1e293b" strokeWidth="0.5" />
                        {/* Leg Stump */}
                        <rect x="6" y="20" width="4" height="65" rx="1" fill={wickets === 'HITTING' ? '#f87171' : '#e2e8f0'} stroke="#1e293b" strokeWidth="0.5" />

                        {/* Bails on top */}
                        <rect x="-11" y="17" width="10" height="3" rx="0.5" fill={wickets === 'HITTING' && animProgress > 90 ? '#ef4444' : '#cbd5e1'} className={wickets === 'HITTING' && animProgress > 90 ? 'animate-bounce' : ''} />
                        <rect x="1" y="17" width="10" height="3" rx="0.5" fill={wickets === 'HITTING' && animProgress > 90 ? '#ef4444' : '#cbd5e1'} className={wickets === 'HITTING' && animProgress > 90 ? 'animate-bounce' : ''} />

                        {/* Stumps Target Box */}
                        <rect x="-14" y="16" width="28" height="70" fill="none" 
                            stroke={wickets === 'HITTING' ? '#ef4444' : (wickets === 'UMPIRES_CALL' ? '#f59e0b' : '#10b981')} 
                            strokeWidth="1.5" strokeDasharray={wickets === 'HITTING' ? 'none' : '2 2'} opacity="0.8" />
                    </g>

                    {/* --- TRAJECTORY PATH LINE --- */}
                    <path d={pathD} fill="none" stroke={wickets === 'HITTING' ? '#ef4444' : '#22d3ee'} strokeWidth="3" strokeLinecap="round" filter="url(#glowCyan)" opacity="0.85" />

                    {/* --- PITCHING POINT MARKER (Bounce) --- */}
                    {animProgress >= 40 && (
                        <g transform={`translate(${pitchX}, ${pitchY})`}>
                            <circle r="12" fill="none" stroke={pitching === 'IN_LINE' ? '#10b981' : '#f59e0b'} strokeWidth="1.5" className="animate-ping" opacity="0.7" />
                            <circle r="5" fill={pitching === 'IN_LINE' ? '#10b981' : '#f59e0b'} />
                            <text x="0" y="22" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="bold" fontFamily="monospace">
                                PITCH: {pitching.replace('_', ' ')}
                            </text>
                        </g>
                    )}

                    {/* --- IMPACT POINT MARKER (Pad) --- */}
                    {animProgress >= 70 && (
                        <g transform={`translate(${impactX}, ${impactY})`}>
                            <circle r="12" fill="none" stroke={impact === 'IN_LINE' ? '#10b981' : '#f59e0b'} strokeWidth="1.5" className="animate-ping" opacity="0.7" />
                            <circle r="5" fill={impact === 'IN_LINE' ? '#10b981' : '#f59e0b'} />
                            <text x="0" y="-14" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="bold" fontFamily="monospace">
                                IMPACT: {impact.replace('_', ' ')}
                            </text>
                        </g>
                    )}

                    {/* --- BALL TRAVELING ANIMATION --- */}
                    <g transform={`translate(${currentX}, ${currentY})`}>
                        <circle r="7" fill="#f87171" stroke="#ffffff" strokeWidth="1.5" filter="url(#glowRed)" />
                        <circle r="2" fill="#ffffff" />
                    </g>

                    {/* --- WICKETS RESULT ANNOTATION --- */}
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
                {/* Pitching */}
                <div className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-0.5 ${
                    pitching === 'IN_LINE' 
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400' 
                        : 'bg-amber-950/40 border-amber-500/40 text-amber-400'
                }`}>
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Pitching</span>
                    <span className="font-bold text-xs">{pitching.replace('_', ' ')}</span>
                    <span className="text-[8px] text-slate-400">{pitching === 'IN_LINE' ? '✓ In Line' : 'Outside Line'}</span>
                </div>

                {/* Impact */}
                <div className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-0.5 ${
                    impact === 'IN_LINE' 
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400' 
                        : 'bg-amber-950/40 border-amber-500/40 text-amber-400'
                }`}>
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Impact</span>
                    <span className="font-bold text-xs">{impact.replace('_', ' ')}</span>
                    <span className="text-[8px] text-slate-400">{impact === 'IN_LINE' ? '✓ In Line' : 'Outside Line'}</span>
                </div>

                {/* Wickets */}
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

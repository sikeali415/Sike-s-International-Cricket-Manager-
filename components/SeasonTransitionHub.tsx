import React, { useState, useMemo } from 'react';
import { 
    GameData, 
    Player, 
    Team, 
    CareerScreen, 
    SeasonTransitionReport,
    Format,
    SeasonTeamsOfTournament
} from '../types';
import { 
    evaluatePlayerForEndSeason, 
    completeSeasonTransition, 
    PlayerEvaluationCategory 
} from '../utils/seasonTransition';
import { 
    calculateSeasonAwards, 
    generateSeasonHallOfFame, 
    generateAutoTeamOfTheTournament, 
    calculateDynamicSkillProgression 
} from '../utils/awardUtils';
import { 
    MAX_SQUAD_SIZE,
    MIN_SQUAD_SIZE
} from '../data';
import { 
    Trophy, 
    Award, 
    Sparkles, 
    ArrowRight, 
    UserCheck, 
    TrendingUp, 
    Globe, 
    Users, 
    Calendar, 
    ShieldCheck, 
    Zap, 
    CheckCircle2, 
    Crown,
    Flame
} from 'lucide-react';
import { playSFX } from '../utils/soundManager';
import { HallOfFameDisplay } from './HallOfFameDisplay';
import { TeamOfTheSeasonSelector } from './TeamOfTheSeasonSelector';
import { SkillProgressionView } from './SkillProgressionView';

interface SeasonTransitionHubProps {
    gameData: GameData;
    setGameData: React.Dispatch<React.SetStateAction<GameData | null>>;
    setScreen: (screen: CareerScreen) => void;
    showFeedback: (msg: string, type?: 'success' | 'error') => void;
}

export const SeasonTransitionHub: React.FC<SeasonTransitionHubProps> = ({
    gameData,
    setGameData,
    setScreen,
    showFeedback
}) => {
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [userTeamOfSeason, setUserTeamOfSeason] = useState<SeasonTeamsOfTournament['userTeamOfTheSeason'] | undefined>(
        gameData.teamOfTheSeasonHistory?.[gameData.currentSeason]?.userTeamOfTheSeason
    );

    const userTeam = useMemo(() => gameData.teams.find(t => t.id === gameData.userTeamId), [gameData]);
    const awards = useMemo(() => calculateSeasonAwards(gameData), [gameData]);
    const seasonHallOfFame = useMemo(() => generateSeasonHallOfFame(gameData, gameData.currentSeason, Format.T20), [gameData]);
    const skillProgressionSummary = useMemo(() => calculateDynamicSkillProgression(gameData, gameData.currentSeason), [gameData]);

    const nextSeason = gameData.currentSeason + 1;

    // Evaluated squad list for user's team
    const evaluatedUserSquad = useMemo(() => {
        if (!userTeam) return [];
        return userTeam.squad.map(p => ({
            player: p,
            eval: evaluatePlayerForEndSeason(p, userTeam, gameData.currentSeason)
        }));
    }, [userTeam, gameData]);

    const handleFinalizeAndProceed = () => {
        const { updatedGameData } = completeSeasonTransition(gameData, undefined, userTeamOfSeason);
        setGameData(updatedGameData);
        playSFX('success');
        showFeedback(`Season ${nextSeason} initialized! Inducted Hall of Fame & applied skill progressions. Welcome to the new international tournament calendar! 🏆`, 'success');
        setScreen('DASHBOARD');
    };

    return (
        <div className="p-4 md:p-6 bg-slate-950 text-white min-h-screen space-y-6">
            {/* Header Career Loop Banner */}
            <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-amber-950 p-6 rounded-3xl border border-teal-500/40 shadow-2xl space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-black uppercase text-teal-400 tracking-widest">
                            <Sparkles size={16} />
                            <span>International Tournament Loop • Year {gameData.currentSeason} Complete</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mt-1">
                            Season {gameData.currentSeason} Wrap-up &amp; Season {nextSeason} Launch
                        </h1>
                        <p className="text-xs text-slate-300">
                            Hall of Fame inductions, Team of the Tournament, dynamic skill progressions &amp; national squad preparation.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleFinalizeAndProceed}
                            className="px-5 py-3 bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider flex items-center gap-2 shadow-xl active:scale-95 transition-all"
                        >
                            <span>1-Click Launch Season {nextSeason}</span>
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </div>

                {/* Progress Steps */}
                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-800">
                    {[
                        { stepNum: 1, label: 'Hall of Fame & Awards' },
                        { stepNum: 2, label: 'Team of Tournament' },
                        { stepNum: 3, label: 'Skill Progression' },
                        { stepNum: 4, label: 'National Squad Review' }
                    ].map(s => (
                        <button
                            key={s.stepNum}
                            onClick={() => setStep(s.stepNum as any)}
                            className={`p-2.5 rounded-xl border text-center transition-all ${
                                step === s.stepNum
                                    ? 'bg-teal-500/20 border-teal-400 text-teal-300 font-black shadow-md'
                                    : step > s.stepNum
                                        ? 'bg-slate-900 border-emerald-500/40 text-emerald-400 font-bold'
                                        : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:text-slate-300'
                            }`}
                        >
                            <div className="text-[10px] uppercase tracking-wider opacity-75">Step {s.stepNum}</div>
                            <div className="text-xs truncate font-extrabold">{s.label}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* STEP 1: Hall of Fame & Season Awards */}
            {step === 1 && (
                <div className="space-y-6">
                    {/* Hall of Fame Inductions */}
                    <HallOfFameDisplay gameData={gameData} />

                    {/* Season Awards Summary */}
                    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="font-black text-sm uppercase tracking-wider text-amber-400 flex items-center gap-2">
                                <Trophy size={18} />
                                <span>Official Season {gameData.currentSeason} Major Honors</span>
                            </h3>
                            <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-1 rounded-full border border-amber-500/30">
                                4 Major Honors
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {/* MVP */}
                            <div className="bg-gradient-to-br from-amber-500/10 to-slate-950 border border-amber-500/30 p-4 rounded-2xl space-y-2">
                                <div className="flex items-center justify-between text-xs text-amber-400 font-bold uppercase">
                                    <span>Player of Tournament</span>
                                    <Crown size={15} />
                                </div>
                                <div className="text-base font-black text-white">{awards.playerOfSeason?.playerName || 'TBD'}</div>
                                <div className="text-xs text-slate-400">{awards.playerOfSeason?.teamName || ''}</div>
                                <div className="text-[11px] font-mono text-amber-300 bg-amber-950/40 px-2 py-1 rounded">
                                    Impact: {awards.playerOfSeason?.impact ?? 0} pts
                                </div>
                            </div>

                            {/* Orange Cap (Top Batter) */}
                            <div className="bg-gradient-to-br from-orange-500/10 to-slate-950 border border-orange-500/30 p-4 rounded-2xl space-y-2">
                                <div className="flex items-center justify-between text-xs text-orange-400 font-bold uppercase">
                                    <span>Top Run Scorer</span>
                                    <Flame size={15} />
                                </div>
                                <div className="text-base font-black text-white">{awards.bestBatter?.playerName || 'TBD'}</div>
                                <div className="text-xs text-slate-400">{awards.bestBatter?.teamName || ''}</div>
                                <div className="text-[11px] font-mono text-orange-300 bg-orange-950/40 px-2 py-1 rounded">
                                    {awards.bestBatter?.runs ?? 0} Runs
                                </div>
                            </div>

                            {/* Purple Cap (Top Bowler) */}
                            <div className="bg-gradient-to-br from-purple-500/10 to-slate-950 border border-purple-500/30 p-4 rounded-2xl space-y-2">
                                <div className="flex items-center justify-between text-xs text-purple-400 font-bold uppercase">
                                    <span>Top Wicket Taker</span>
                                    <Zap size={15} />
                                </div>
                                <div className="text-base font-black text-white">{awards.bestBowler?.playerName || 'TBD'}</div>
                                <div className="text-xs text-slate-400">{awards.bestBowler?.teamName || ''}</div>
                                <div className="text-[11px] font-mono text-purple-300 bg-purple-950/40 px-2 py-1 rounded">
                                    {awards.bestBowler?.wickets ?? 0} Wickets
                                </div>
                            </div>

                            {/* Power Hitter */}
                            <div className="bg-gradient-to-br from-cyan-500/10 to-slate-950 border border-cyan-500/30 p-4 rounded-2xl space-y-2">
                                <div className="flex items-center justify-between text-xs text-cyan-400 font-bold uppercase">
                                    <span>Power Hitter</span>
                                    <Sparkles size={15} />
                                </div>
                                <div className="text-base font-black text-white">{awards.powerHitter?.playerName || 'TBD'}</div>
                                <div className="text-xs text-slate-400">{awards.powerHitter?.teamName || ''}</div>
                                <div className="text-[11px] font-mono text-cyan-300 bg-cyan-950/40 px-2 py-1 rounded">
                                    {awards.powerHitter?.sixes ?? 0} Sixes
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            onClick={() => setStep(2)}
                            className="px-5 py-2.5 bg-teal-500 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 hover:bg-teal-400 transition-all"
                        >
                            <span>Next: Team of the Tournament</span>
                            <ArrowRight size={15} />
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 2: Team of the Tournament */}
            {step === 2 && (
                <div className="space-y-4">
                    <TeamOfTheSeasonSelector 
                        gameData={gameData}
                        season={gameData.currentSeason}
                        savedUserTeam={userTeamOfSeason}
                        onSaveUserTeam={setUserTeamOfSeason}
                    />

                    <div className="flex justify-between pt-4 border-t border-slate-800">
                        <button
                            onClick={() => setStep(1)}
                            className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs uppercase"
                        >
                            Back
                        </button>
                        <button
                            onClick={() => setStep(3)}
                            className="px-5 py-2.5 bg-teal-500 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 hover:bg-teal-400 transition-all"
                        >
                            <span>Next: Skill Progression &amp; Form Recalibration</span>
                            <ArrowRight size={15} />
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 3: Skill Progression (10 Best Gainers & 10 Declines) */}
            {step === 3 && (
                <div className="space-y-4">
                    <SkillProgressionView gameData={gameData} summary={skillProgressionSummary} />

                    <div className="flex justify-between pt-4 border-t border-slate-800">
                        <button
                            onClick={() => setStep(2)}
                            className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs uppercase"
                        >
                            Back
                        </button>
                        <button
                            onClick={() => setStep(4)}
                            className="px-5 py-2.5 bg-teal-500 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 hover:bg-teal-400 transition-all"
                        >
                            <span>Next: National Squad Review</span>
                            <ArrowRight size={15} />
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 4: National Squad Review */}
            {step === 4 && (
                <div className="space-y-4">
                    <div className="bg-gradient-to-r from-slate-900 to-teal-950/60 p-4 rounded-2xl border border-teal-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                            <h3 className="font-black text-sm uppercase tracking-wider text-white flex items-center gap-2">
                                <UserCheck size={16} className="text-teal-400" />
                                <span>{userTeam?.name} National Squad • Ready for Season {nextSeason}</span>
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                                All {evaluatedUserSquad.length} {userTeam?.name} international players remain in your squad with upgraded form and ratings.
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="bg-slate-900 border border-teal-500/40 px-3 py-1.5 rounded-xl text-center">
                                <div className="text-[9px] text-slate-400 uppercase font-bold">Roster Count</div>
                                <div className="text-sm font-black text-teal-400">{evaluatedUserSquad.length} / {MAX_SQUAD_SIZE}</div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
                        {evaluatedUserSquad.map(({ player, eval: evalRes }) => {
                            return (
                                <div
                                    key={player.id}
                                    className="p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 bg-slate-900/60 border-slate-800"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 bg-teal-500 text-slate-950">
                                            {evalRes.grade}
                                        </div>

                                        <div className="truncate">
                                            <div className="font-bold text-xs text-white flex items-center gap-1.5">
                                                <span className="truncate">{player.name}</span>
                                                <span className="text-[9px] bg-teal-500/20 text-teal-300 px-1 rounded font-bold">{player.nationality}</span>
                                            </div>
                                            <div className="text-[10px] text-slate-400">
                                                <span>{player.role}</span> • <span>Bat {player.battingSkill} | Bowl {player.secondarySkill}</span>
                                            </div>
                                            <div className="text-[10px] text-slate-400 italic mt-0.5">
                                                {evalRes.reason}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                        <div className="text-xs font-bold uppercase text-teal-400">
                                            Ready
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-mono">
                                            {evalRes.score} pts
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                        <button
                            onClick={() => setStep(3)}
                            className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs uppercase"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleFinalizeAndProceed}
                            className="px-6 py-3 bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider flex items-center gap-2 shadow-2xl active:scale-95 transition-all"
                        >
                            <span>⚡ Confirm &amp; Launch Season {nextSeason} Tournaments</span>
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SeasonTransitionHub;

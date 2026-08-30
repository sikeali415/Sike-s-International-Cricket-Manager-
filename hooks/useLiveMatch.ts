
import { useState, useEffect, useCallback, useRef } from 'react';
import { GameData, Match, Player, Format, Team, Inning, MatchResult, PlayerRole, BattingPerformance, BowlingPerformance, Strategy, LiveMatchState, DRSReviewEvent, LiveTacticalInput } from '../types';
import { PITCH_MODIFIERS, formatOvers, getPlayerById, generateAutoXI, getBatterTier, BATTING_PROFILES, getBatterProfile, getCommentary, getMatchRainImpact } from '../utils';
import { EXPANDED_COMMENTARY_BANK, getRandomExpandedLine, CommentaryContext } from '../data/commentaryBank';
import { playSFX, speakCommentary } from '../utils/soundManager';
import { generatePendingBowlerDelivery, resolveTacticalShotOutcome } from '../utils/interactiveGameplayEngine';

export const useLiveMatch = (
    match: Match,
    gameData: GameData,
    onMatchComplete: (result: MatchResult) => void,
    initialState?: LiveMatchState | null
) => {
    const [state, setState] = useState<LiveMatchState | null>(initialState || null);
    const matchIdRef = useRef<string | number | null>(initialState ? initialState.match.matchNumber : null);
    const autoPlayRef = useRef<any>(null); 
    const lastAutoPlayTypeRef = useRef<'regular' | 'inning' | 'match' | null>(null);
    const [allPlayers, setAllPlayers] = useState<Player[]>([]);
    const [groundPitch, setGroundPitch] = useState("Balanced Sporting Pitch");
    const [groundCode, setGroundCode] = useState("KCG");

    // Initialization
    useEffect(() => {
        if (state) {
             // Restore players context if resuming
             const teamAData = gameData.teams.find(t => t.id === state.match.teamAId) || gameData.teams.find(t => t.name === state.match.teamA);
             const teamBData = gameData.teams.find(t => t.id === state.match.teamBId) || gameData.teams.find(t => t.name === state.match.teamB);
             
             if (teamAData && teamBData) {
                 const allP = [...teamAData.squad, ...teamBData.squad];
                 // Hydrate full player objects
                 const hydratedPlayers = allP.map(p => gameData.allPlayers.find(gp => gp.id === p.id) || p);
                 setAllPlayers(hydratedPlayers);
             }
             return;
        }

        if (matchIdRef.current === match.matchNumber) return;

        const teamAData = gameData.teams.find(t => t.name === match.teamA);
        const teamBData = gameData.teams.find(t => t.name === match.teamB);
        
        if (!teamAData || !teamBData) {
            console.error("Teams not found for live match:", match.teamA, match.teamB);
            return;
        }

        const getPlayingXI = (team: Team) => {
            const customXI = gameData.playingXIs?.[team.id]?.[gameData.currentFormat];
            if (customXI && customXI.length === 11) {
                const xiPlayers = customXI.map(id => team.squad.find(p => p.id === id)).filter(Boolean) as Player[];
                if (xiPlayers.length === 11) return xiPlayers;
            }
            return generateAutoXI(team.squad, gameData.currentFormat);
        };

        const teamAPlayers = getPlayingXI(teamAData);
        const teamBPlayers = getPlayingXI(teamBData);
        const matchPlayers = [...teamAPlayers, ...teamBPlayers];
        setAllPlayers(matchPlayers);

        const homeGround = gameData.grounds.find(g => g.code === gameData.allTeamsData.find(t => t.name === match.teamA)?.homeGround);
        setGroundPitch(homeGround?.pitch || "Balanced Sporting Pitch");
        setGroundCode(homeGround?.code || "KCG");

        const initInning = (team: Team, opponent: Team): Inning => {
            const battingLineup: BattingPerformance[] = team.squad.map(p => {
                const d = getPlayerById(p.id, matchPlayers);
                return { playerId: d.id, playerName: d.name, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, dismissalText: 'not out', dismissal: { type: 'not out', bowlerId: '' } };
            });
            
            const bowlingLineup: BowlingPerformance[] = opponent.squad
                .filter(p => getPlayerById(p.id, matchPlayers).role !== PlayerRole.WICKET_KEEPER)
                .map(p => {
                     const d = getPlayerById(p.id, matchPlayers);
                     return { playerId: d.id, playerName: d.name, overs: '0.0', maidens: 0, runsConceded: 0, wickets: 0, ballsBowled: 0 };
                });

            if (bowlingLineup.length === 0) {
                 const p = getPlayerById(opponent.squad[0].id, matchPlayers);
                 bowlingLineup.push({ playerId: p.id, playerName: p.name, overs: '0.0', maidens: 0, runsConceded: 0, wickets: 0, ballsBowled: 0 });
            }

            return {
                teamId: team.id,
                teamName: team.name,
                score: 0,
                wickets: 0,
                overs: '0.0',
                batting: battingLineup,
                bowling: bowlingLineup,
                extras: 0
            };
        };

        const teamA = { ...teamAData, squad: teamAPlayers };
        const teamB = { ...teamBData, squad: teamBPlayers };
        
        const firstInning = initInning(teamA, teamB);
        const secondInning = initInning(teamB, teamA);
        
        matchIdRef.current = match.matchNumber;
        
        setState({
            status: 'toss',
            match: { ...match, teamAId: teamA.id, teamBId: teamB.id }, // Ensure IDs are set
            currentInningIndex: 0,
            innings: [firstInning, secondInning],
            target: null,
            currentBatters: { strikerId: teamAPlayers[0].id, nonStrikerId: teamAPlayers[1].id },
            currentBowlerId: secondInning.bowling[0].playerId, 
            recentBalls: [],
            commentary: ["Welcome to the live coverage!", "The players are walking out to the middle."],
            battingTeam: teamA,
            bowlingTeam: teamB,
            requiredRunRate: 0,
            currentPartnership: { runs: 0, balls: 0 },
            fallOfWickets: [],
            waitingFor: 'openers',
            strategies: { batting: 'balanced', bowling: 'balanced' },
            autoPlayType: null,
            tossWinnerId: null,
            tossDecision: null,
            drsReviews: { [teamA.id]: 2, [teamB.id]: 2 },
            pendingDrsOpportunity: null,
            activeDrsModal: null,
        });

    }, [match.matchNumber, match.teamA, match.teamB, gameData, state]);

    const startMatch = (winnerId: string, decision: 'bat' | 'bowl') => {
        setState(prev => {
            if (!prev) return null;
            // Determine who bats first
            let battingTeam, bowlingTeam;
            const teamA = prev.battingTeam.id === prev.match.teamAId ? prev.battingTeam : prev.bowlingTeam;
            const teamB = prev.battingTeam.id === prev.match.teamBId ? prev.battingTeam : prev.bowlingTeam;

            if (winnerId === teamA.id) {
                battingTeam = decision === 'bat' ? teamA : teamB;
                bowlingTeam = decision === 'bat' ? teamB : teamA;
            } else {
                battingTeam = decision === 'bat' ? teamB : teamA;
                bowlingTeam = decision === 'bat' ? teamA : teamB;
            }

            // Re-initialize innings with correct order using Locked Playing XI
            const initInning = (team: Team, opponent: Team): Inning => {
                const getXI = (t: Team) => {
                    const savedXI = gameData.playingXIs[t.id]?.[gameData.currentFormat];
                    if (savedXI && savedXI.length === 11) {
                        const foundInSquad = savedXI.map(id => t.squad.find(p => p.id === id)).filter(Boolean) as Player[];
                        if (foundInSquad.length === 11) {
                            return foundInSquad;
                        }
                    }
                    return generateAutoXI(t.squad, gameData.currentFormat);
                };

                const squadXI = getXI(team);
                const oppXI = getXI(opponent);

                const battingLineup: BattingPerformance[] = squadXI.map((p, idx) => {
                    const d = getPlayerById(p.id, allPlayers);
                    return { 
                        playerId: d.id, 
                        playerName: d.name, 
                        runs: 0, balls: 0, fours: 0, sixes: 0, 
                        isOut: false, dismissalText: 'not out', 
                        dismissal: { type: 'not out', bowlerId: '' },
                        injury: d.injury,
                        healthStatus: d.healthStatus,
                        battingPosition: idx + 1
                    };
                });
                
                const bowlingLineup: BowlingPerformance[] = oppXI
                    .filter(p => getPlayerById(p.id, allPlayers).role !== PlayerRole.WICKET_KEEPER)
                    .map(p => {
                         const d = getPlayerById(p.id, allPlayers);
                         return { 
                            playerId: d.id, 
                            playerName: d.name, 
                            overs: '0.0', maidens: 0, runsConceded: 0, wickets: 0, ballsBowled: 0,
                            injury: d.injury,
                            healthStatus: d.healthStatus
                         };
                    });

                if (bowlingLineup.length === 0) {
                     const p = getPlayerById(oppXI[0].id, allPlayers);
                     bowlingLineup.push({ playerId: p.id, playerName: p.name, overs: '0.0', maidens: 0, runsConceded: 0, wickets: 0, ballsBowled: 0 });
                }

                return {
                    teamId: team.id,
                    teamName: team.name,
                    score: 0,
                    wickets: 0,
                    overs: '0.0',
                    batting: battingLineup,
                    bowling: bowlingLineup,
                    extras: 0
                };
            };

            const firstInning = initInning(battingTeam, bowlingTeam);
            const secondInning = initInning(bowlingTeam, battingTeam);

            // Auto-select initial batters and bowler for AI
            let openers = { strikerId: firstInning.batting[0].playerId, nonStrikerId: firstInning.batting[1].playerId };
            let bowlerId = firstInning.bowling[0].playerId;
            let waitingFor: LiveMatchState['waitingFor'] = null;
            
            const isUserBatting = battingTeam.id === gameData.userTeamId;
            if (isUserBatting) {
                waitingFor = 'openers';
            } else {
                // AI starts: Defaults already set above
                if (bowlingTeam.id === gameData.userTeamId) {
                    waitingFor = 'bowler';
                }
            }

            const rainImpact = getMatchRainImpact(match.matchNumber, gameData.currentFormat, gameData.currentSeason);
            const reducedOvers = rainImpact.willRain ? rainImpact.reducedOversA : null;

            const winnerTeamName = winnerId === teamA.id ? teamA.name : teamB.name;
            const loserTeamName = winnerId === teamA.id ? teamB.name : teamA.name;

            const tossCtx: CommentaryContext = {
                winner: winnerTeamName,
                loser: loserTeamName,
                decision: decision === 'bat' ? 'bat' : 'bowl'
            };
            const tossCommentary = getRandomExpandedLine(EXPANDED_COMMENTARY_BANK.toss, tossCtx);

            // Line reader commentary for openers
            const openerStriker = getPlayerById(firstInning.batting[0].playerId, allPlayers);
            const openerBowler = getPlayerById(firstInning.bowling[0].playerId, allPlayers);

            const openerBatCtx: CommentaryContext = {
                batsman: openerStriker.name,
                battingSkill: openerStriker.battingSkill,
                runs: (openerStriker.stats[gameData.currentFormat]?.runs || 0),
                team: battingTeam.name
            };
            const openerBatCommentary = getRandomExpandedLine(EXPANDED_COMMENTARY_BANK.line_reader.opener_batsman, openerBatCtx);

            const openerBowlCtx: CommentaryContext = {
                bowler: openerBowler.name,
                bowlingSkill: openerBowler.secondarySkill,
                team: bowlingTeam.name
            };
            const openerBowlCommentary = getRandomExpandedLine(EXPANDED_COMMENTARY_BANK.line_reader.opener_bowler, openerBowlCtx);

            const extraCommentary: string[] = [];
            if (reducedOvers) {
                extraCommentary.push(`☔ RAIN INTERRUPTION! Match reduced to ${reducedOvers} overs per side under DLS Method.`);
            }

            // Read toss and opener line reader via TTS
            speakCommentary(tossCommentary);
            setTimeout(() => speakCommentary(openerBatCommentary), 2200);
            setTimeout(() => speakCommentary(openerBowlCommentary), 4400);

            const initDelivery = generatePendingBowlerDelivery(
                openerBowler,
                openerStriker,
                gameData.currentFormat,
                { isPowerplay: true, isDeath: false }
            );

            return {
                ...prev,
                status: 'post_toss',
                tossWinnerId: winnerId,
                tossDecision: decision,
                battingTeam,
                bowlingTeam,
                innings: [firstInning, secondInning],
                currentInningIndex: 0,
                currentBatters: openers,
                currentBowlerId: bowlerId,
                waitingFor: waitingFor,
                autoPlayType: null, 
                reducedOvers,
                pendingBowlerDelivery: initDelivery,
                lastShotFeedback: null,
                milestoneEvent: reducedOvers ? {
                    title: "☔ Rain Interruption (DLS Method)",
                    message: `Rain interrupted play right after the toss! The match has been reduced to ${reducedOvers} overs per side.`,
                    type: "match_winner" as const,
                    playerId: ""
                } : null,
                drsReviews: { [battingTeam.id]: 2, [bowlingTeam.id]: 2 },
                pendingDrsOpportunity: null,
                activeDrsModal: null,
                commentary: [
                    openerBowlCommentary,
                    openerBatCommentary,
                    tossCommentary,
                    ...extraCommentary,
                    `Match Started!`,
                    ...prev.commentary
                ]
            };
        });
    };

    const proceedToMatch = () => {
        setState(prev => prev ? { ...prev, status: prev.status === 'post_toss' ? 'ready' : prev.status, milestoneEvent: null } : null);
    };

    const stopAutoPlay = (clearLastMode = false) => {
        if (autoPlayRef.current) {
            clearInterval(autoPlayRef.current);
            autoPlayRef.current = null;
        }
        if (clearLastMode) {
            lastAutoPlayTypeRef.current = null;
        }
    };

    const playBall = useCallback((tacticalInput?: LiveTacticalInput) => {
        setState(prevState => {
            if (!prevState || prevState.status === 'completed') {
                 stopAutoPlay(true);
                 return prevState;
            }
            
            const isSimulating = prevState.autoPlayType === 'match' || prevState.autoPlayType === 'inning';

            if (!isSimulating && (prevState.activeDrsModal || prevState.pendingDrsOpportunity)) {
                stopAutoPlay(false);
                return prevState;
            }

            if (prevState.waitingFor && !isSimulating) {
                stopAutoPlay(true);
                return prevState;
            }
            
            const newState = JSON.parse(JSON.stringify(prevState)) as LiveMatchState;
            const { currentInningIndex, innings, battingTeam, bowlingTeam, currentBatters, currentBowlerId, target, strategies } = newState;
            const currentInning = innings[currentInningIndex];
            
            const pitchMods = PITCH_MODIFIERS[groundPitch as keyof typeof PITCH_MODIFIERS] || PITCH_MODIFIERS["Balanced Sporting Pitch"];
            const formatMods = pitchMods[gameData.currentFormat];
            
            let striker = currentInning.batting.find(b => b.playerId === currentBatters.strikerId);
            let bowler = currentInning.bowling.find(b => b.playerId === currentBowlerId);
            
             // --- EMERGENCY AUTO-SELECT FOR MATCH/INNING SIMULATION ---
            if (isSimulating || !striker || striker.isOut || !bowler) {
                if (!striker || striker.isOut) {
                    const available = currentInning.batting.filter(b => !b.isOut && b.playerId !== currentBatters.nonStrikerId);
                    if (available.length > 0) {
                        const nextB = available[0];
                        newState.currentBatters.strikerId = nextB.playerId;
                        striker = nextB;
                        newState.waitingFor = null;
                    }
                }
                if (!bowler) {
                    const overLimit = gameData.currentFormat.includes('T20') ? 4 : 10;
                    const validBowlers = currentInning.bowling.filter(b => b.ballsBowled < overLimit * 6);
                    if (validBowlers.length > 0) {
                        const nextBowler = validBowlers[0];
                        newState.currentBowlerId = nextBowler.playerId;
                        bowler = nextBowler;
                        newState.waitingFor = null;
                    }
                }
            }

            if (!striker || !bowler) {
                 if (!isSimulating) stopAutoPlay();
                 return newState;
            }

            const strikerDetails = getPlayerById(currentBatters.strikerId, allPlayers);
            const bowlerDetails = getPlayerById(currentBowlerId, allPlayers);

            // Algorithmic Weakness Logic
            let weaknessSkillMod = 1.0;
            if (strikerDetails.weaknesses && bowlerDetails.bowlingSubType && strikerDetails.weaknesses.includes(bowlerDetails.bowlingSubType)) {
                weaknessSkillMod = 1.25;
            }

            // Bowling Speed Calculation (Real range: 130-160 for Fast, 60-100 for Spin)
            let speed = 0;
            if (bowlerDetails.role === PlayerRole.FAST_BOWLER) {
                // Base 130, scale up to +30 based on skill (160 max)
                speed = 130 + (bowlerDetails.secondarySkill / 100 * 26) + (Math.random() * 4);
            } else if (bowlerDetails.role === PlayerRole.SPIN_BOWLER) {
                // Base 65, scale up to +30 based on skill (95-100 max)
                speed = 65 + (bowlerDetails.secondarySkill / 100 * 25) + (Math.random() * 10 - 5);
            } else {
                speed = 115 + (Math.random() * 15);
            }
            const ballSpeed = Number(speed.toFixed(1));

            const isUserBatting = battingTeam.id === gameData.userTeamId;
            let requiredRR = 0;
            if (target) {
                const totalFormatBalls = gameData.currentFormat.includes('T20') ? 120 : 300;
                const ballsLeft = totalFormatBalls - (currentInning.bowling.reduce((a,b)=>a+b.ballsBowled,0));
                const runsNeeded = target - currentInning.score;
                if (ballsLeft > 0) requiredRR = (runsNeeded / ballsLeft) * 6;
            }

            if (!isUserBatting) {
                // Aggressive floor: If score is very low, AI bats more attacking to avoid < 100 totals
                if (!target && currentInning.score < 55 && (currentInning.overs.split('.')[0] === '10' || currentInning.overs.split('.')[0] === '15')) {
                    strategies.batting = 'attacking';
                }

                if (target && requiredRR > 8.5) strategies.batting = 'attacking';
                else if (target && requiredRR < 4.5) strategies.batting = 'balanced';
                else strategies.batting = Math.random() > 0.65 ? 'attacking' : 'balanced';
            }
            
            if (battingTeam.id !== gameData.userTeamId && bowlingTeam.id === gameData.userTeamId) {
                 const recentWickets = newState.fallOfWickets.filter(w => w.score > currentInning.score - 20).length;
                 if (recentWickets > 0) {
                     strategies.bowling = 'attacking';
                 } else {
                     const ballsBowledTotal = currentInning.bowling.reduce((a, b) => a + b.ballsBowled, 0);
                     if (ballsBowledTotal > 0 && (currentInning.score / (ballsBowledTotal / 6)) > 10) {
                         strategies.bowling = 'defensive';
                     } else {
                         strategies.bowling = 'balanced';
                     }
                 }
            }

            let strategyRunMod = 1.0;
            let strategyWicketMod = 1.0;

            if (strategies.batting === 'attacking') { 
                strategyRunMod *= 1.45; 
                // Skilled batters take less risk when attacking
                const riskMitigation = (strikerDetails.battingSkill - 50) / 100;
                strategyWicketMod *= Math.max(1.15, 1.55 - riskMitigation); 
            }
            else if (strategies.batting === 'defensive') { strategyRunMod *= 0.75; strategyWicketMod *= 0.65; }

            if (strategies.bowling === 'attacking') { strategyWicketMod *= 1.25; strategyRunMod *= 1.35; } 
            else if (strategies.bowling === 'defensive') { strategyWicketMod *= 0.85; strategyRunMod *= 0.85; }

            let healthMult = 1.0;
            if (strikerDetails.healthStatus === 'temporary_fit') healthMult *= 0.85;
            if (bowlerDetails.healthStatus === 'temporary_fit') healthMult *= 0.85;

            const batterProfile = getPlayerById(striker.playerId, allPlayers).customProfiles?.[gameData.currentFormat] || getBatterProfile(gameData.currentFormat, getBatterTier(strikerDetails.battingSkill), strikerDetails.style);
            
            let formatFloorBoost = gameData.currentFormat === Format.SHIELD ? 1.0 : 1.25;
            
            // Auto-Aggression for chasing - ignore chase penalty if pressure is high
            let chaseAggression = 1.0;
            let effectiveChasePenalty = target !== null ? pitchMods.chasePenalty : 1;
            if (target) {
                if (requiredRR > 11) {
                    chaseAggression = 1.4;
                    effectiveChasePenalty = 1.0; // Desperation ignores pitch caution
                }
                else if (requiredRR > 9) {
                    chaseAggression = 1.25;
                    effectiveChasePenalty = Math.max(1.0, effectiveChasePenalty);
                }
                else if (requiredRR > 7) chaseAggression = 1.05;
            }

            const expectedRunsPerBall = (batterProfile.sr / 100) * effectiveChasePenalty * strategyRunMod * healthMult * formatFloorBoost * chaseAggression * (newState.isExploitingWeakness ? 1.05 : 1.0) / (weaknessSkillMod > 1 ? 1.1 : 1.0);
            let baseWicketProb = (batterProfile.avg > 0 ? expectedRunsPerBall / (batterProfile.avg * healthMult) : 0.05) * strategyWicketMod * weaknessSkillMod * (newState.isExploitingWeakness ? 1.1 : 1.0);
            
            // Apply tactical input modifiers
            let tacticalRunBonus = 0;
            let tacticalBoundaryMultiplier = 1.0;
            let tacticalCatchRiskMultiplier = 1.0;

            if (tacticalInput) {
                if (tacticalInput.isBatting) {
                    if (tacticalInput.isLofted) {
                        tacticalBoundaryMultiplier = 1.5;
                        tacticalCatchRiskMultiplier = 1.35;
                    } else if (tacticalInput.shotCategory === 'Placement') {
                        tacticalRunBonus = 0.15;
                        tacticalCatchRiskMultiplier = 0.4;
                    } else if (tacticalInput.shotCategory === 'Defensive') {
                        tacticalCatchRiskMultiplier = 0.3;
                    }
                } else {
                    // User Bowling
                    if (tacticalInput.bowlingLength === 'yorker') {
                        baseWicketProb *= 1.2;
                        tacticalBoundaryMultiplier = 0.65;
                    } else if (tacticalInput.bowlingLength === 'short') {
                        baseWicketProb *= 1.15;
                        tacticalCatchRiskMultiplier = 1.3;
                    } else if (tacticalInput.bowlingLength === 'good') {
                        baseWicketProb *= 1.1;
                    }
                }
            }

            let wicketProbability = baseWicketProb * formatMods.wicketChance * tacticalCatchRiskMultiplier;
            
            // Pressure factor in Live match
            if (target && requiredRR > 10) {
                const skillClutchness = (strikerDetails.battingSkill - 60) / 100;
                wicketProbability *= (1 + Math.max(0, (requiredRR - 10) * 0.05 - skillClutchness));
            }
            
            // Crisis Prevention & Chase Motivation: Drastically reduce wickets if score is low
            const currentOver = parseInt(currentInning.overs.split('.')[0]);
            if (target) {
                // Block low scores for big chases (>150)
                if (target >= 145) {
                    if (currentInning.score < 45) wicketProbability *= 0.01; // Almost impossible early on in big chase
                    else if (currentInning.score < 100) wicketProbability *= 0.2; // Massive survival boost
                } else {
                    if (currentInning.score < 40) wicketProbability *= 0.05;
                    else if (currentInning.score < 100) wicketProbability *= 0.4;
                }
                
                // If required rate is high, skilled batters focus on survival + hitting
                const skillClutchness = (strikerDetails.battingSkill - 60) / 100;
                if (requiredRR > 10) {
                    wicketProbability *= (1 + Math.max(0, (requiredRR - 10) * 0.03 - skillClutchness)); 
                }
            } else if (gameData.currentFormat !== Format.SHIELD) {
                // First Inning protection
                if (currentInning.score < 40) wicketProbability *= 0.1;
                else if (currentInning.score < 80) wicketProbability *= 0.4;
                else if (currentOver < 10 && currentInning.score < 100) wicketProbability *= 0.7;
            }
            
            wicketProbability = Math.max(0.005, Math.min(0.4, wicketProbability));

            let runs = 0;
            let isOut = false;
            let ballLabel = "";
            let commentary = "";

            if (tacticalInput?.isBatting && newState.pendingBowlerDelivery) {
                // Interactive player batting resolution
                const outcome = resolveTacticalShotOutcome({
                    tacticalInput,
                    pendingDelivery: newState.pendingBowlerDelivery,
                    striker: strikerDetails,
                    bowler: bowlerDetails,
                    fieldPresetId: tacticalInput.fieldPresetId,
                    format: gameData.currentFormat
                });
                runs = outcome.runs;
                isOut = outcome.isOut;
                ballLabel = isOut ? "W" : runs.toString();
                commentary = outcome.commentary;
                newState.lastShotFeedback = outcome.feedback;
                newState.lastTacticalExecution = {
                    mode: 'batting',
                    shotName: tacticalInput.shotType,
                    shotAngle: tacticalInput.shotAngle,
                    shotZone: tacticalInput.shotZone,
                    isLofted: tacticalInput.isLofted,
                    runsScored: runs,
                    isWicket: isOut,
                    quality: outcome.quality,
                    summary: `${strikerDetails.name} • ${tacticalInput.shotType || 'Shot'} (${tacticalInput.shotZone || 'Gap'}) -> ${runs} Run${runs === 1 ? '' : 's'}${isOut ? ' [WICKET]' : ''}`
                };
            } else if (Math.random() < wicketProbability) {
                 isOut = true;
                 ballLabel = "W";
                 
                 if (tacticalInput && !tacticalInput.isBatting && tacticalInput.bowlingLength === 'yorker') {
                     commentary = `🎯 PINPOINT YORKER! ${bowlerDetails.name} nails the toe-crushing yorker on ${tacticalInput.bowlingLine || 'middle'} stump - clean bowled ${strikerDetails.name}!`;
                 } else if (tacticalInput && tacticalInput.isBatting && tacticalInput.isLofted) {
                     commentary = `💥 In the air... and TAKEN! ${strikerDetails.name} goes for the lofted ${tacticalInput.shotType || 'shot'} towards ${tacticalInput.shotZone || 'the boundary'} but finds the fielder on the fence!`;
                 } else {
                     commentary = getCommentary(0, true, strikerDetails.name, bowlerDetails.name, undefined, {
                         batsman: strikerDetails.name,
                         bowler: bowlerDetails.name,
                         team: battingTeam.name,
                         runs: striker.runs,
                         balls: striker.balls + 1,
                         wickets_down: currentInning.wickets + 1,
                         partnership_runs: newState.currentPartnership.runs,
                         partnership_balls: newState.currentPartnership.balls + 1
                     });
                 }
             } else {
                 const rand = Math.random();
                 
                 // Dynamic Probabilities based on skills & conditions
                 let p_dot=0.32, p_1=0.40, p_2=0.08, p_3=0.02, p_4=0.12, p_6=0.06;
                 
                 const skillDiff = (strikerDetails.battingSkill - bowlerDetails.secondarySkill) / 100;
                 p_dot -= skillDiff * 0.1;
                 p_4 += skillDiff * 0.05;
                 p_6 += skillDiff * 0.03;

                 p_4 *= tacticalBoundaryMultiplier;
                 p_6 *= tacticalBoundaryMultiplier;
                 if (tacticalRunBonus > 0) {
                     p_1 += tacticalRunBonus;
                     p_2 += tacticalRunBonus * 0.5;
                 }

                 if (!target && gameData.currentFormat !== Format.SHIELD && currentInning.score < 60) {
                    p_dot *= 0.7; p_4 *= 1.3; p_6 *= 1.2; // Aggressive boost for low totals
                 }

                 if (strategies.batting === 'attacking') { p_dot *= 0.8; p_4 *= 1.4; p_6 *= 1.6; }
                 if (strategies.batting === 'defensive') { p_dot *= 1.6; p_4 *= 0.5; p_6 *= 0.3; }
                 if (strategies.bowling === 'defensive') { p_dot *= 1.2; p_1 *= 1.1; p_4 *= 0.8; p_6 *= 0.7; }

                 const totalP = p_dot + p_1 + p_2 + p_3 + p_4 + p_6;
                 const normRand = rand * totalP;

                 if (normRand < p_dot) runs = 0;
                 else if (normRand < p_dot + p_1) runs = 1;
                 else if (normRand < p_dot + p_1 + p_2) runs = 2;
                 else if (normRand < p_dot + p_1 + p_2 + p_3) runs = 3;
                 else if (normRand < p_dot + p_1 + p_2 + p_3 + p_4) runs = 4;
                 else runs = 6;
                 
                 // Occasional "Chaos" Runs (Overthrows/Misfields)
                 if (runs === 0 && Math.random() < 0.02) {
                     runs = 1;
                     commentary = `Misfield! ${strikerDetails.name} steals a quick single.`;
                 } else if (runs === 1 && Math.random() < 0.01) {
                     runs = 2;
                     commentary = `Overthrows! Extra run taken.`;
                 }
                 
                 ballLabel = runs.toString();
                 if (!commentary) {
                     if (tacticalInput?.isBatting && runs >= 4) {
                         commentary = runs === 6 
                            ? `🚀 MAXIMUM! ${strikerDetails.name} connects cleanly with a powerful ${tacticalInput.shotType || 'shot'} flying way back over ${tacticalInput.shotZone || 'the boundary'} for SIX!`
                            : `⚡ CRACKING SHOT! ${strikerDetails.name} drills the ${tacticalInput.shotType || 'drive'} right into the gap at ${tacticalInput.shotZone || 'the fence'} for FOUR!`;
                     } else if (tacticalInput && !tacticalInput.isBatting && runs === 0) {
                         commentary = `🧤 BEATEN! ${bowlerDetails.name} tests the batter with a superb ${tacticalInput.bowlingLength || 'good length'} ${tacticalInput.bowlingVariation || 'delivery'} on ${tacticalInput.bowlingLine || 'off'} stump - dot ball!`;
                     } else {
                         const totalOversMax = gameData.currentFormat.includes('T20') ? 20 : 50;
                         const remainingBalls = Math.max(0, totalOversMax * 6 - (bowler.ballsBowled + 1));
                         const remainingRuns = target ? Math.max(0, target - currentInning.score - runs) : undefined;
                         
                         commentary = getCommentary(runs, false, strikerDetails.name, bowlerDetails.name, undefined, {
                             batsman: strikerDetails.name,
                             bowler: bowlerDetails.name,
                             team: battingTeam.name,
                             runs: striker.runs + runs,
                             balls: striker.balls + 1,
                             wickets_down: currentInning.wickets,
                             partnership_runs: newState.currentPartnership.runs + runs,
                             partnership_balls: newState.currentPartnership.balls + 1,
                             remaining_runs: remainingRuns,
                             remaining_balls: remainingBalls,
                         });
                     }
                 }

                 // Save tactical execution log
                 if (tacticalInput) {
                     newState.lastTacticalExecution = {
                         mode: tacticalInput.isBatting ? 'batting' : 'bowling',
                         shotName: tacticalInput.shotType,
                         shotAngle: tacticalInput.shotAngle,
                         shotZone: tacticalInput.shotZone,
                         isLofted: tacticalInput.isLofted,
                         bowlingLength: tacticalInput.bowlingLength,
                         bowlingLine: tacticalInput.bowlingLine,
                         bowlingVariation: tacticalInput.bowlingVariation,
                         runsScored: runs,
                         isWicket: isOut,
                         quality: isOut ? (tacticalInput.isLofted ? 'Edged' : 'Trapped') : (runs >= 4 ? 'Perfect Timing' : runs >= 2 ? 'Well Placed' : 'Good Connection'),
                         summary: tacticalInput.isBatting 
                            ? `${strikerDetails.name} • ${tacticalInput.shotType || 'Shot'} (${tacticalInput.shotZone || 'Gap'}) -> ${runs} Run${runs === 1 ? '' : 's'}`
                            : `${bowlerDetails.name} • ${tacticalInput.bowlingLength || 'Good'} (${tacticalInput.bowlingLine || 'Off'}, ${tacticalInput.bowlingVariation || 'Standard'}) -> ${runs} Run${runs === 1 ? '' : 's'}${isOut ? ' [WICKET]' : ''}`
                     };
                 }

                 // --- INJURY SYSTEM ---
                 const triggerInjury = () => {
                     const baseChance = 0.003; // ~0.3% ball-by-ball chance
                     const fitness = strikerDetails.fitness || 100;
                     const fitnessMod = fitness < 70 ? 0.01 : 0;
                     
                     let actionMod = 0;
                     if (runs >= 2) actionMod += 0.005;
                     
                     const finalChance = baseChance + fitnessMod + actionMod;

                     if (Math.random() < finalChance) {
                         const severityRand = Math.random();
                         let injury: any = null;

                         if (severityRand < 0.003) { // Major
                             const seasons = Math.floor(Math.random() * 3) + 1;
                             injury = { type: 'Major', text: 'Severe ligament tear', dType: 'seasons', dVal: seasons };
                         } else if (severityRand < 0.05) { // Medium
                             injury = { type: 'Medium', text: 'Fracture', dType: 'seasons', dVal: 1 };
                         } else if (severityRand < 0.3) { // Short
                             injury = { type: 'Short', text: 'Hamstring pull', dType: 'matches', dVal: Math.floor(Math.random() * 4) + 2 };
                         } else { // Minor
                             injury = { type: 'Minor', text: 'Muscle strain', dType: 'matches', dVal: 1 };
                         }

                         if (injury) {
                             striker.injury = { durationType: injury.dType, durationValue: injury.dVal, text: injury.text };
                             newState.commentary.unshift(`⚠️ INJURY ALERT: ${strikerDetails.name} suffered a ${injury.text}. Recovery: ${injury.dVal} ${injury.dType}.`);
                             
                             if (injury.type !== 'Minor') {
                                 striker.isOut = true;
                                 striker.dismissalText = 'retired hurt';
                                 currentInning.wickets++;
                                 newState.fallOfWickets.push({ score: currentInning.score, wicket: currentInning.wickets, over: formatOvers(bowler.ballsBowled + (parseInt(currentInning.overs.split('.')[0]) * 6)), player: strikerDetails.name });
                                 // Next batter logic will be handled below by the standard wicket logic
                             }
                         }
                     }
                 };
                 triggerInjury();
             }

            const isT20Live = gameData.currentFormat.includes('T20') || gameData.currentFormat.includes('Premier T20 League');
            const isODILive = gameData.currentFormat.includes('One-Day') || gameData.currentFormat.includes('Premier One-Day Cup') || gameData.currentFormat.includes('Cup');
            const totalBallsInning = currentInning.bowling.reduce((sum, b) => sum + b.ballsBowled, 0) + 1;
            let currentPhase: 'pp' | 'mo' | 'do' | null = null;
            if (isT20Live) {
                if (totalBallsInning <= 36) currentPhase = 'pp';
                else if (totalBallsInning <= 90) currentPhase = 'mo';
                else currentPhase = 'do';
            } else if (isODILive) {
                if (totalBallsInning <= 60) currentPhase = 'pp';
                else if (totalBallsInning <= 240) currentPhase = 'mo';
                else currentPhase = 'do';
            }

            if (currentPhase) {
                const prefix = currentPhase;
                if (currentInning[`${prefix}Runs`] === undefined) currentInning[`${prefix}Runs`] = 0;
                if (currentInning[`${prefix}Wickets`] === undefined) currentInning[`${prefix}Wickets`] = 0;
                if (currentInning[`${prefix}Balls`] === undefined) currentInning[`${prefix}Balls`] = 0;
                if (currentInning[`${prefix}Dots`] === undefined) currentInning[`${prefix}Dots`] = 0;
                if (currentInning[`${prefix}Fours`] === undefined) currentInning[`${prefix}Fours`] = 0;
                if (currentInning[`${prefix}Sixes`] === undefined) currentInning[`${prefix}Sixes`] = 0;

                currentInning[`${prefix}Balls`]++;
                if (isOut) {
                    currentInning[`${prefix}Wickets`]++;
                } else {
                    currentInning[`${prefix}Runs`] += runs;
                    if (runs === 0) currentInning[`${prefix}Dots`]++;
                    else if (runs === 4) currentInning[`${prefix}Fours`]++;
                    else if (runs === 6) currentInning[`${prefix}Sixes`]++;
                }

                if (currentPhase === 'pp') {
                    striker.ppBalls = (striker.ppBalls || 0) + 1;
                    bowler.ppBallsBowled = (bowler.ppBallsBowled || 0) + 1;
                    if (isOut) {
                        striker.ppDismissals = (striker.ppDismissals || 0) + 1;
                        bowler.ppWickets = (bowler.ppWickets || 0) + 1;
                    } else {
                        striker.ppRuns = (striker.ppRuns || 0) + runs;
                        bowler.ppRunsConceded = (bowler.ppRunsConceded || 0) + runs;
                    }
                } else if (currentPhase === 'mo') {
                    striker.moBalls = (striker.moBalls || 0) + 1;
                    bowler.moBallsBowled = (bowler.moBallsBowled || 0) + 1;
                    if (isOut) {
                        striker.moDismissals = (striker.moDismissals || 0) + 1;
                        bowler.moWickets = (bowler.moWickets || 0) + 1;
                    } else {
                        striker.moRuns = (striker.moRuns || 0) + runs;
                        bowler.moRunsConceded = (bowler.moRunsConceded || 0) + runs;
                    }
                } else if (currentPhase === 'do') {
                    striker.doBalls = (striker.doBalls || 0) + 1;
                    bowler.doBallsBowled = (bowler.doBallsBowled || 0) + 1;
                    if (isOut) {
                        striker.doDismissals = (striker.doDismissals || 0) + 1;
                        bowler.doWickets = (bowler.doWickets || 0) + 1;
                    } else {
                        striker.doRuns = (striker.doRuns || 0) + runs;
                        bowler.doRunsConceded = (bowler.doRunsConceded || 0) + runs;
                    }
                }
            }

            currentInning.score += runs;
            bowler.runsConceded += runs;
            bowler.ballsBowled++;
            const oldRuns = striker.runs;
            striker.runs += runs;
            striker.balls++;

            // --- MILESTONE DETECTION ---
            const triggerMilestone = (title: string, message: string, type: any, playerId: string) => {
                newState.milestoneEvent = { title, message, type, playerId };
                // Pause simulation for big milestones
                if (newState.autoPlayType === 'match' || newState.autoPlayType === 'inning') {
                     // We could pause or just let it flash. 
                     // User didn't specify pausing, but "celebration popups" imply visibility.
                }
            };

            const formats: Format[] = [Format.T20, Format.ODI, Format.SHIELD];
            const getCareerRuns = (p: Player) => {
                let total = 0;
                formats.forEach(f => total += (p.stats[f]?.runs || 0));
                return total;
            };
            const getCareerWickets = (p: Player) => {
                let total = 0;
                formats.forEach(f => total += (p.stats[f]?.wickets || 0));
                return total;
            };

            // Batting Milestones
            if (oldRuns < 50 && striker.runs >= 50) {
                triggerMilestone("FIFTY!", `${strikerDetails.name} reaches 50 runs.`, 'batting', strikerDetails.id);
                striker.ballsToFifty = striker.balls;
                playSFX('fifty');
                playSFX('cheer');
            } else if (oldRuns < 100 && striker.runs >= 100) {
                triggerMilestone("CENTURY!", `${strikerDetails.name} scores 100!`, 'batting', strikerDetails.id);
                striker.ballsToHundred = striker.balls;
                playSFX('hundred');
                playSFX('cheer');
            }

            // Career Batting Milestones
            const careerRunsBefore = getCareerRuns(strikerDetails);
            const careerRunsAfter = careerRunsBefore + runs;
            [1000, 2000, 5000].forEach(m => {
                if (careerRunsBefore < m && careerRunsAfter >= m) {
                    triggerMilestone("CAREER MILESTONE!", `${strikerDetails.name} completes ${m} career runs.`, 'career', strikerDetails.id);
                }
            });

            // Form Milestones
            const currentFormat = gameData.currentFormat;
            if (striker.runs >= 50 && oldRuns < 50) {
                const recentResults = gameData.matchResults[currentFormat]
                    .filter(r => {
                        const innings = [r.firstInning, r.secondInning, r.thirdInning, r.fourthInning].filter(Boolean);
                        return innings.some(inn => inn.batting.some(b => b.playerId === strikerDetails.id));
                    })
                    .slice(-11);
                
                const pastFifties = recentResults.filter(r => {
                    const innings = [r.firstInning, r.secondInning, r.thirdInning, r.fourthInning].filter(Boolean);
                    return innings.some(inn => {
                        const ps = inn.batting.find(b => b.playerId === strikerDetails.id);
                        return ps && ps.runs >= 50;
                    });
                }).length;
                
                if (pastFifties + 1 >= 3) {
                    triggerMilestone("HOT FORM!", `${strikerDetails.name} records his ${pastFifties + 1}th fifty in 12 games!`, 'batting', strikerDetails.id);
                }
            }

            // Tournament Leader Detection (Runs)
            const currentTourneyRuns = (strikerDetails.stats[currentFormat]?.runs || 0) + striker.runs;
            const otherPlayers = gameData.allPlayers.filter(p => p.id !== strikerDetails.id);
            const maxRunsExisting = Math.max(0, ...otherPlayers.map(p => p.stats[currentFormat]?.runs || 0));
            
            if (currentTourneyRuns > maxRunsExisting && careerRunsBefore + runs > maxRunsExisting) {
                // If they weren't the leader before this run
                const currentTourneyRunsBefore = currentTourneyRuns - runs;
                if (currentTourneyRunsBefore <= maxRunsExisting) {
                    triggerMilestone("TOURNAMENT LEADER!", `${strikerDetails.name} now has the most runs in the tournament!`, 'leader', strikerDetails.id);
                }
            }

            // Bowling Milestones (to be checked after results)
            
            newState.currentPartnership.runs += runs;
            newState.currentPartnership.balls++;

            if (runs === 4) striker.fours++;
            if (runs === 6) striker.sixes++;

            if (isOut) {
                currentInning.wickets++;
                const oldWickets = bowler.wickets;
                bowler.wickets++;
                striker.isOut = true;
                
                const randDismissal = Math.random();
                let dismissalType: 'caught' | 'caught_keeper' | 'lbw' | 'bowled' | 'stumped' | 'run_out' = 'caught';
                if (randDismissal < 0.40) dismissalType = 'caught';
                else if (randDismissal < 0.65) dismissalType = 'caught_keeper';
                else if (randDismissal < 0.82) dismissalType = 'lbw';
                else if (randDismissal < 0.92) dismissalType = 'bowled';
                else if (randDismissal < 0.96) dismissalType = 'stumped';
                else dismissalType = 'run_out';

                if (dismissalType === 'bowled') {
                    playSFX('bowled');
                } else if (dismissalType === 'caught' || dismissalType === 'caught_keeper') {
                    playSFX('catch');
                } else {
                    playSFX('wicket');
                }

                let dismissalStr = '';
                if (dismissalType === 'bowled') dismissalStr = `b ${bowlerDetails.name}`;
                else if (dismissalType === 'lbw') dismissalStr = `lbw b ${bowlerDetails.name}`;
                else if (dismissalType === 'caught_keeper') dismissalStr = `c †keeper b ${bowlerDetails.name}`;
                else if (dismissalType === 'caught') dismissalStr = `c fielder b ${bowlerDetails.name}`;
                else if (dismissalType === 'stumped') dismissalStr = `st †keeper b ${bowlerDetails.name}`;
                else dismissalStr = `run out (${bowlerDetails.name})`;

                striker.dismissalText = dismissalStr;

                const isLBW = dismissalType === 'lbw';
                const isEdge = dismissalType === 'caught_keeper'; // Edges / Caught behind

                if (isLBW || isEdge) {
                    // DRS Opportunity for Batting Team on OUT decision
                    const isFaulty = Math.random() < 0.18; // 18% chance umpire error
                    const drsEvent: DRSReviewEvent = {
                        id: Math.random().toString(),
                        type: isLBW ? 'LBW' : 'CAUGHT',
                        onFieldDecision: 'OUT',
                        reviewingTeamId: battingTeam.id,
                        reviewingTeamName: battingTeam.name,
                        batterId: strikerDetails.id,
                        batterName: strikerDetails.name,
                        bowlerId: bowlerDetails.id,
                        bowlerName: bowlerDetails.name,
                        ballDetails: { runs: 0, over: formatOvers(bowler.ballsBowled), speed: ballSpeed },
                        ultraEdge: {
                            hasEdge: isLBW ? false : !isFaulty,
                            spikeFrame: 5
                        },
                        ballTracking: {
                            pitching: isLBW ? (isFaulty ? 'OUTSIDE_LEG' : 'IN_LINE') : 'IN_LINE',
                            impact: 'IN_LINE',
                            wickets: isLBW ? (isFaulty ? 'MISSING' : 'HITTING') : 'HITTING'
                        },
                        isFaultyUmpireDecision: isFaulty,
                        finalDecision: isFaulty ? 'OVERTURNED' : 'UPHELD',
                        reviewResultText: isFaulty ? 'DECISION OVERTURNED - NOT OUT!' : 'DECISION UPHELD - OUT!',
                        wasReviewRetained: isFaulty
                    };

                    const battingTeamReviews = newState.drsReviews?.[battingTeam.id] ?? 2;
                    const isSimulatingInningOrMatch = newState.autoPlayType === 'inning' || newState.autoPlayType === 'match';
                    if (battingTeamReviews > 0 && !isSimulatingInningOrMatch) {
                        if (battingTeam.id === gameData.userTeamId) {
                            newState.pendingDrsOpportunity = drsEvent;
                            stopAutoPlay();
                        } else {
                            if (isFaulty || Math.random() < 0.22) {
                                newState.activeDrsModal = drsEvent;
                                stopAutoPlay();
                            }
                        }
                    }
                }

                // --- BOWLING MILESTONE DETECTION ---
                if (oldWickets < 3 && bowler.wickets === 3) {
                    triggerMilestone("3-WICKET HAUL!", `${bowlerDetails.name} takes 3 wickets.`, 'bowling', bowlerDetails.id);
                } else if (oldWickets < 5 && bowler.wickets === 5) {
                    triggerMilestone("FIVE-FOR!", `${bowlerDetails.name} takes 5 wickets!`, 'bowling', bowlerDetails.id);
                }

                // Career Bowling Milestones
                const careerWicketsBefore = getCareerWickets(bowlerDetails);
                const careerWicketsAfter = careerWicketsBefore + 1;
                [50, 100].forEach(m => {
                    if (careerWicketsBefore < m && careerWicketsAfter >= m) {
                        triggerMilestone("CAREER MILESTONE!", `${bowlerDetails.name} reaches ${m} career wickets.`, 'career', bowlerDetails.id);
                    }
                });

                // Tournament Leader Detection (Wickets)
                const currentTourneyWickets = (bowlerDetails.stats[currentFormat]?.wickets || 0) + bowler.wickets;
                const otherBowlers = gameData.allPlayers.filter(p => p.id !== bowlerDetails.id);
                const maxWicketsExisting = Math.max(0, ...otherBowlers.map(p => p.stats[currentFormat]?.wickets || 0));

                if (currentTourneyWickets > maxWicketsExisting) {
                    const currentTourneyWicketsBefore = currentTourneyWickets - 1;
                    if (currentTourneyWicketsBefore <= maxWicketsExisting) {
                        triggerMilestone("TOP WICKET TAKER!", `${bowlerDetails.name} leads the wicket charts!`, 'leader', bowlerDetails.id);
                    }
                }
                
                newState.fallOfWickets.push({
                    score: currentInning.score,
                    wicket: currentInning.wickets,
                    over: formatOvers(bowler.ballsBowled + (parseInt(currentInning.overs.split('.')[0]) * 6)),
                    player: strikerDetails.name
                });

                if (currentInning.wickets < 10) {
                     const isUserBattingNow = battingTeam.id === gameData.userTeamId;
                     
                     // Tactical advice check for dugout
                     const unbatters = currentInning.batting.filter(b => !b.isOut && b.playerId !== currentBatters.strikerId && b.playerId !== currentBatters.nonStrikerId);
                     if (unbatters.length > 1) {
                         const nextStandard = unbatters[0];
                         const nextStandardPlayer = getPlayerById(nextStandard.playerId, allPlayers);
                         
                         const sortedBySkill = [...unbatters].sort((a,b) => {
                             const pa = getPlayerById(a.playerId, allPlayers);
                             const pb = getPlayerById(b.playerId, allPlayers);
                             return pb.battingSkill - pa.battingSkill;
                         });
                         const bestSkillPlayer = getPlayerById(sortedBySkill[0].playerId, allPlayers);
                         
                         if (bestSkillPlayer.id !== nextStandardPlayer.id && Math.random() < 0.65) {
                             const totalOversMax = newState.reducedOvers || (gameData.currentFormat.includes('T20') ? 20 : 50);
                             const totalBallsPlayed = currentInning.bowling.reduce((acc, b) => acc + b.ballsBowled, 0);
                             const remainingBalls = Math.max(1, totalOversMax * 6 - totalBallsPlayed);
                             const remainingRuns = target ? Math.max(0, target - currentInning.score) : undefined;
                             const reqRate = remainingRuns ? Number(((remainingRuns / remainingBalls) * 6).toFixed(2)) : undefined;

                             const tacticalCtx: CommentaryContext = {
                                 team: battingTeam.name,
                                 rate: reqRate || '8.5',
                                 wickets_down: currentInning.wickets,
                                 suggestedBatter: bestSkillPlayer.name,
                                 otherBatter: nextStandardPlayer.name
                             };

                             const adviceLine = (currentInning.wickets >= 4 && (!reqRate || reqRate < 7))
                                 ? getRandomExpandedLine(EXPANDED_COMMENTARY_BANK.tactical_advice.stabilize, tacticalCtx)
                                 : getRandomExpandedLine(EXPANDED_COMMENTARY_BANK.tactical_advice.accelerate, tacticalCtx);

                             newState.commentary.unshift(adviceLine);
                             speakCommentary(adviceLine);
                         }
                     }

                     if (isUserBattingNow && newState.autoPlayType !== 'inning' && newState.autoPlayType !== 'match') {
                         newState.waitingFor = 'batter'; 
                         stopAutoPlay();
                     } else {
                         // Auto Select Batter
                         const nextBatter = currentInning.batting.find(b => !b.isOut && b.playerId !== currentBatters.strikerId && b.playerId !== currentBatters.nonStrikerId);
                         if (nextBatter) {
                             newState.currentBatters.strikerId = nextBatter.playerId;
                             newState.commentary.unshift(`${nextBatter.playerName} comes to the crease.`);
                         }
                     }
                }
            } else {
                if (runs % 2 !== 0) {
                    const temp = currentBatters.strikerId;
                    currentBatters.strikerId = currentBatters.nonStrikerId;
                    currentBatters.nonStrikerId = temp;
                }

                // DRS Opportunity for Bowling Team on NOT OUT dot ball appeal (~12% chance)
                if (runs === 0 && Math.random() < 0.12) {
                    const isLBW = Math.random() < 0.6;
                    const isFaulty = Math.random() < 0.12; // 12% chance umpire missed a real wicket
                    const drsEvent: DRSReviewEvent = {
                        id: Math.random().toString(),
                        type: isLBW ? 'LBW' : 'EDGE',
                        onFieldDecision: 'NOT_OUT',
                        reviewingTeamId: bowlingTeam.id,
                        reviewingTeamName: bowlingTeam.name,
                        batterId: strikerDetails.id,
                        batterName: strikerDetails.name,
                        bowlerId: bowlerDetails.id,
                        bowlerName: bowlerDetails.name,
                        ballDetails: { runs: 0, over: formatOvers(bowler.ballsBowled), speed: ballSpeed },
                        ultraEdge: {
                            hasEdge: isLBW ? false : isFaulty,
                            spikeFrame: 5
                        },
                        ballTracking: {
                            pitching: 'IN_LINE',
                            impact: 'IN_LINE',
                            wickets: isLBW ? (isFaulty ? 'HITTING' : 'MISSING') : 'MISSING'
                        },
                        isFaultyUmpireDecision: isFaulty,
                        finalDecision: isFaulty ? 'OVERTURNED' : 'UPHELD',
                        reviewResultText: isFaulty ? 'DECISION OVERTURNED - OUT!' : 'DECISION UPHELD - NOT OUT!',
                        wasReviewRetained: isFaulty
                    };

                    const bowlingTeamReviews = newState.drsReviews?.[bowlingTeam.id] ?? 2;
                    const isSimulatingInningOrMatch = newState.autoPlayType === 'inning' || newState.autoPlayType === 'match';
                    if (bowlingTeamReviews > 0 && !isSimulatingInningOrMatch) {
                        if (bowlingTeam.id === gameData.userTeamId) {
                            newState.pendingDrsOpportunity = drsEvent;
                            commentary = `⚡ HUGE APPEAL for ${isLBW ? 'LBW' : 'Caught Behind'}! Umpire says NOT OUT. (DRS Review Available)`;
                            stopAutoPlay();
                        } else {
                            if (isFaulty || Math.random() < 0.15) {
                                newState.activeDrsModal = drsEvent;
                                stopAutoPlay();
                            }
                        }
                    }
                }
            }

            if (!isOut) {
                if (runs === 6) {
                    playSFX('six');
                    playSFX('cheer');
                } else if (runs === 4) {
                    playSFX('four');
                } else {
                    playSFX('stroke');
                }
            }

            newState.ballByBallId = Math.random().toString();
            newState.lastBallSpeed = ballSpeed;

            newState.recentBalls = [ballLabel, ...newState.recentBalls].slice(0, 12);
            newState.commentary = [commentary, ...newState.commentary].slice(0, 50);
            speakCommentary(commentary);

            const totalBalls = innings[currentInningIndex].bowling.reduce((acc, b) => acc + b.ballsBowled, 0);
            currentInning.overs = formatOvers(totalBalls);
            bowler.overs = formatOvers(bowler.ballsBowled);

            const maxOvers = newState.reducedOvers || ((gameData.currentFormat.includes('T20')) ? 20 : (gameData.currentFormat.includes('ODI') || gameData.currentFormat.includes('List')) ? 50 : 90);
            const maxBalls = maxOvers * 6;
            const overLimit = Math.max(1, Math.floor(maxOvers / 5));

            // End of Over Logic
            if (totalBalls % 6 === 0 && totalBalls < maxBalls) { 
                if (!isOut) {
                    const temp = currentBatters.strikerId;
                    currentBatters.strikerId = currentBatters.nonStrikerId;
                    currentBatters.nonStrikerId = temp;
                }
                
                newState.commentary.unshift(`End of over ${totalBalls/6}. ${battingTeam.name} are ${currentInning.score}/${currentInning.wickets}.`);
                
                if (currentInning.wickets < 10) {
                     const isUserBowlingNow = bowlingTeam.id === gameData.userTeamId;
                     if (isUserBowlingNow && newState.autoPlayType !== 'inning' && newState.autoPlayType !== 'match') {
                         newState.waitingFor = 'bowler';
                         stopAutoPlay(); 
                     } else {
                         // Auto Select Bowler
                         const validBowlers = currentInning.bowling.filter(b => b.playerId !== currentBowlerId && b.ballsBowled < overLimit * 6);
                         
                         let nextBowler = validBowlers.sort((a,b) => {
                             const pa = getPlayerById(a.playerId, allPlayers);
                             const pb = getPlayerById(b.playerId, allPlayers);
                             return pb.secondarySkill - pa.secondarySkill;
                         })[0];

                         if (!nextBowler) {
                             nextBowler = currentInning.bowling.find(b => b.playerId !== currentBowlerId) || currentInning.bowling[0];
                         }

                         if (nextBowler) {
                            newState.currentBowlerId = nextBowler.playerId;
                            newState.commentary.unshift(`${nextBowler.playerName} will bowl the next over.`);
                         }
                     }
                }
            } else if (totalBalls % 6 === 0 && isOut && currentInning.wickets < 10) {
                // Double Event: Wicket on Last Ball
                const isUserBowlingNow = bowlingTeam.id === gameData.userTeamId;
                if (isUserBowlingNow && newState.autoPlayType !== 'inning' && newState.autoPlayType !== 'match') {
                     if (!newState.waitingFor) {
                         newState.waitingFor = 'bowler';
                         stopAutoPlay();
                     }
                } else {
                     // Auto Select Bowler
                     const overLimit = gameData.currentFormat.includes('T20') ? 4 : 10;
                     const validBowlers = currentInning.bowling.filter(b => b.playerId !== currentBowlerId && b.ballsBowled < overLimit * 6);
                     const nextBowler = validBowlers[0] || currentInning.bowling.find(b => b.playerId !== currentBowlerId);
                     if (nextBowler) newState.currentBowlerId = nextBowler.playerId;
                }
            }

            let matchEnded = false;
            let resultText = "";
            let actualWinnerId = "";
            let actualLoserId = "";

            if (currentInning.wickets >= 10 || totalBalls >= maxBalls || (target !== null && currentInning.score > target)) {
                newState.waitingFor = null;
                if (newState.autoPlayType !== 'match') stopAutoPlay();
                
                if (currentInningIndex === 0) {
                    newState.currentInningIndex = 1;
                    newState.target = currentInning.score;
                    newState.status = 'inprogress';
                    newState.battingTeam = bowlingTeam;
                    newState.bowlingTeam = battingTeam;
                    
                    const inn2Batters = innings[1].batting.slice(0, 2);
                    const inn2Bowler = innings[1].bowling[0];
                    
                    newState.currentBatters = { strikerId: inn2Batters[0]?.playerId || '', nonStrikerId: inn2Batters[1]?.playerId || '' };
                    newState.currentBowlerId = inn2Bowler?.playerId || '';
                    
                    newState.recentBalls = [];
                    newState.currentPartnership = { runs: 0, balls: 0 };
                    
                    const score = currentInning.score;
                    const targetScore = score + 1;
                    const reqRate = Number((targetScore / maxOvers).toFixed(2));

                    const midCtx: CommentaryContext = {
                        battingTeam: battingTeam.name,
                        bowlingTeam: bowlingTeam.name,
                        score: score,
                        wickets: currentInning.wickets,
                        target: targetScore,
                        overs: maxOvers,
                        rate: reqRate
                    };

                    let midLine = "";
                    const highBenchmark = gameData.currentFormat === Format.ODI ? 6.2 : 8.8;
                    const lowBenchmark = gameData.currentFormat === Format.ODI ? 4.2 : 6.2;

                    if (reqRate >= highBenchmark) {
                        midLine = getRandomExpandedLine(EXPANDED_COMMENTARY_BANK.mid_innings.high_target, midCtx);
                    } else if (reqRate <= lowBenchmark) {
                        midLine = getRandomExpandedLine(EXPANDED_COMMENTARY_BANK.mid_innings.low_target, midCtx);
                    } else {
                        midLine = getRandomExpandedLine(EXPANDED_COMMENTARY_BANK.mid_innings.moderate_target, midCtx);
                    }

                    newState.commentary.unshift(midLine);
                    
                    if (bowlingTeam.id === gameData.userTeamId && newState.autoPlayType !== 'inning' && newState.autoPlayType !== 'match') {
                        newState.waitingFor = 'openers';
                    } else {
                         newState.commentary.unshift(`Auto-selected openers.`);
                         if (battingTeam.id === gameData.userTeamId && newState.autoPlayType !== 'inning' && newState.autoPlayType !== 'match') {
                             newState.waitingFor = 'bowler';
                         }
                    }
                } else {
                    newState.status = 'completed';
                    matchEnded = true;
                    if (currentInning.score > target!) {
                        resultText = `${battingTeam.name} won by ${10 - currentInning.wickets} wickets`;
                        actualWinnerId = battingTeam.id;
                        actualLoserId = bowlingTeam.id;
                    } else if (currentInning.score === target!) {
                        // Match Tied! Run modern Super Over shootout
                        const playerForms: Record<string, number> = {};
                        allPlayers.forEach(p => playerForms[p.id] = 0.9 + (Math.random() * 0.2));
                        
                        const format = gameData.currentFormat;
                        
                        const simulateSuperOverInningLive = (
                            battingT: Team,
                            bowlingT: Team,
                            targetVal: number | null
                        ) => {
                            let sScore = 0, sWkts = 0, sBalls = 0;
                            const topBatters = (battingT.squad || []).slice(0, 3).map(p => allPlayers.find(ap => ap.id === p.id)!).filter(Boolean);
                            const bestBowler = [...(bowlingT.squad || [])]
                                .map(p => allPlayers.find(ap => ap.id === p.id)!)
                                .filter(Boolean)
                                .filter(p => p.role !== PlayerRole.WICKET_KEEPER)
                                .sort((a, b) => b.secondarySkill - a.secondarySkill)[0] || allPlayers.find(ap => ap.id === bowlingT.squad[0].id);

                            let sStrikerIdx = 0;
                            let sNonStrikerIdx = 1;

                            while (sBalls < 6 && sWkts < 2) {
                                if (targetVal && sScore >= targetVal) break;

                                const activeStriker = topBatters[sStrikerIdx] || topBatters[0];
                                if (!activeStriker) break;
                                const activeStrikerForm = playerForms[activeStriker.id] || 1.0;
                                const activeBowlerForm = bestBowler ? (playerForms[bestBowler.id] || 1.0) : 1.0;

                                const aggFactor = 1.45;
                                const bSkill = activeStriker.battingSkill || 50;
                                const bTier = getBatterTier(bSkill * activeStrikerForm);
                                const bStyle = activeStriker.style || 'N';
                                const bProfile = getBatterProfile(format, bTier, bStyle);

                                const bowlSkill = bestBowler ? (bestBowler.secondarySkill || 50) : 50;
                                let wProbability = 0.16 + (bowlSkill * activeBowlerForm - bSkill * activeStrikerForm) / 400;
                                wProbability = Math.max(0.05, Math.min(0.40, wProbability));

                                sBalls++;

                                if (Math.random() < wProbability) {
                                    sWkts++;
                                    sStrikerIdx = Math.max(sStrikerIdx, sNonStrikerIdx) + 1;
                                } else {
                                    const rRand = Math.random();
                                    let rScored = 0;
                                    if (rRand < 0.28) rScored = 0;
                                    else if (rRand < 0.52) rScored = 1;
                                    else if (rRand < 0.65) rScored = 2;
                                    else if (rRand < 0.86) rScored = 4;
                                    else rScored = 6;

                                    sScore += rScored;

                                    if (rScored % 2 !== 0) {
                                        const tmp = sStrikerIdx;
                                        sStrikerIdx = sNonStrikerIdx;
                                        sNonStrikerIdx = tmp;
                                    }
                                }
                            }
                            return { score: sScore, wickets: sWkts };
                        };

                        // bowlingTeam was batting first in the main match, so they bat first in the Super Over
                        const superA = simulateSuperOverInningLive(bowlingTeam, battingTeam, null);
                        // battingTeam bats second in Super Over with target superA.score + 1
                        const superB = simulateSuperOverInningLive(battingTeam, bowlingTeam, superA.score + 1);

                        if (superB.score > superA.score) {
                            actualWinnerId = battingTeam.id;
                            actualLoserId = bowlingTeam.id;
                            resultText = `Match Tied. ${battingTeam.name} won via Super Over (${battingTeam.name}: ${superB.score}/${superB.wickets} vs ${bowlingTeam.name}: ${superA.score}/${superA.wickets})`;
                        } else if (superA.score > superB.score) {
                            actualWinnerId = bowlingTeam.id;
                            actualLoserId = battingTeam.id;
                            resultText = `Match Tied. ${bowlingTeam.name} won via Super Over (${bowlingTeam.name}: ${superA.score}/${superA.wickets} vs ${battingTeam.name}: ${superB.score}/${superB.wickets})`;
                        } else {
                            const drawRand = Math.random();
                            if (drawRand > 0.5) {
                                actualWinnerId = bowlingTeam.id;
                                actualLoserId = battingTeam.id;
                                resultText = `Match Tied. ${bowlingTeam.name} won via Double Super Over (Sudden Death)`;
                            } else {
                                actualWinnerId = battingTeam.id;
                                actualLoserId = bowlingTeam.id;
                                resultText = `Match Tied. ${battingTeam.name} won via Double Super Over (Sudden Death)`;
                            }
                        }
                    } else {
                        resultText = `${bowlingTeam.name} won by ${target! - currentInning.score} runs`;
                        actualWinnerId = bowlingTeam.id;
                        actualLoserId = battingTeam.id;
                    }
                }
            }

            if (matchEnded) {
                stopAutoPlay(); // Ensure stopped
                
                // Identify Match Winner Performance
                const winId = actualWinnerId || bowlingTeam?.id;
                const winningTeamInningAsBatter = innings.find(inn => inn?.teamId === winId);
                const winningTeamInningAsBowler = innings.find(inn => inn && inn.teamId !== winId);
                
                const winnerBatters = winningTeamInningAsBatter?.batting || [];
                const winnerBowlers = winningTeamInningAsBowler?.bowling || [];
                
                const bestBatter = winnerBatters.length > 0 ? [...winnerBatters].sort((a,b) => (b?.runs ?? 0) - (a?.runs ?? 0))[0] : null;
                const bestBowler = winnerBowlers.length > 0 ? [...winnerBowlers].sort((a,b) => (b?.wickets ?? 0) - (a?.wickets ?? 0))[0] : null;
                
                if (bestBatter && (bestBatter.runs ?? 0) >= 40) {
                   triggerMilestone("MATCH WINNING PERFORMANCE!", `${bestBatter.playerName} guides his team to victory with ${bestBatter.runs} runs!`, 'match_winner', bestBatter.playerId);
                } else if (bestBowler && (bestBowler.wickets ?? 0) >= 3) {
                   triggerMilestone("MATCH WINNING SPELL!", `${bestBowler.playerName} takes ${bestBowler.wickets} wickets to clinch the win!`, 'match_winner', bestBowler.playerId);
                }

                const result: MatchResult = {
                    matchNumber: match.matchNumber,
                    summary: resultText,
                    firstInning: innings[0],
                    secondInning: innings[1],
                    winnerId: actualWinnerId,
                    loserId: actualLoserId,
                    manOfTheMatch: { playerId: '', playerName: 'TBD', teamId: '', summary: '' },
                    tossWinnerId: newState.tossWinnerId || undefined,
                    tossDecision: newState.tossDecision || undefined
                };
                let bestPerf = -1;
                [innings[0], innings[1]].forEach(inn => {
                    inn.batting.forEach(b => { if (b.runs > bestPerf) { bestPerf = b.runs; result.manOfTheMatch = { playerId: b.playerId, playerName: b.playerName, teamId: inn.teamId, summary: `${b.runs} runs (${b.balls}b)` } } });
                });

                // End of Match Commentary Generation
                let allBatting: { name: string; runs: number; balls: number }[] = [];
                let allBowling: { name: string; wickets: number; runsConceded: number }[] = [];

                [innings[0], innings[1]].forEach(inn => {
                    if (inn) {
                        inn.batting.forEach(b => { if (b.balls > 0) allBatting.push({ name: b.playerName, runs: b.runs, balls: b.balls }); });
                        inn.bowling.forEach(bw => { if (bw.ballsBowled > 0) allBowling.push({ name: bw.playerName, wickets: bw.wickets, runsConceded: bw.runsConceded }); });
                    }
                });

                allBatting.sort((a,b) => b.runs - a.runs);
                allBowling.sort((a,b) => b.wickets !== a.wickets ? b.wickets - a.wickets : a.runsConceded - b.runsConceded);

                const topBatter = allBatting[0] || { name: 'N/A', runs: 0, balls: 0 };
                const topBowler = allBowling[0] || { name: 'N/A', wickets: 0, runsConceded: 0 };

                const potmName = result.manOfTheMatch?.playerName || topBatter.name;

                const endCtx: CommentaryContext = {
                    resultText: resultText,
                    potmName: potmName,
                    topBatterName: topBatter.name,
                    topBatterRuns: topBatter.runs,
                    topBatterBalls: topBatter.balls,
                    topBowlerName: topBowler.name,
                    topBowlerWickets: topBowler.wickets,
                    topBowlerRuns: topBowler.runsConceded
                };

                const endSummary = getRandomExpandedLine(EXPANDED_COMMENTARY_BANK.end_of_match.summary, endCtx);
                const scorecardBreakdown = getRandomExpandedLine(EXPANDED_COMMENTARY_BANK.end_of_match.scorecard_breakdown, endCtx);

                newState.commentary.unshift(scorecardBreakdown);
                newState.commentary.unshift(endSummary);
                speakCommentary(endSummary);
                
                setTimeout(() => onMatchComplete(result), 2000);
            }

            // Generate next pending bowler delivery if match is still in progress
            if (newState.status !== 'completed' && !matchEnded && newState.currentBowlerId && newState.currentBatters?.strikerId) {
                const nextStriker = getPlayerById(newState.currentBatters.strikerId, allPlayers);
                const nextBowler = getPlayerById(newState.currentBowlerId, allPlayers);
                if (nextStriker && nextBowler) {
                    const totalBallsSoFar = innings[newState.currentInningIndex].bowling.reduce((acc, b) => acc + b.ballsBowled, 0);
                    const isNextPP = totalBallsSoFar <= 36;
                    const isNextDeath = totalBallsSoFar >= 96;
                    newState.pendingBowlerDelivery = generatePendingBowlerDelivery(
                        nextBowler,
                        nextStriker,
                        gameData.currentFormat,
                        { isPowerplay: isNextPP, isDeath: isNextDeath, currentPartnership: newState.currentPartnership.runs }
                    );
                }
            }

            return newState;
        });
    }, [state, allPlayers, gameData, groundPitch, onMatchComplete]);

    const playOver = () => {
        let balls = 0;
        if (autoPlayRef.current) clearInterval(autoPlayRef.current);
        lastAutoPlayTypeRef.current = 'regular';
        
        setState(prev => prev ? { ...prev, autoPlayType: 'regular' } : null);

        autoPlayRef.current = setInterval(() => {
            playBall();
            balls++;
            if (balls >= 6) {
                if (autoPlayRef.current) clearInterval(autoPlayRef.current);
                autoPlayRef.current = null;
                lastAutoPlayTypeRef.current = null;
                setState(prev => prev ? { ...prev, autoPlayType: null } : null);
            }
        }, 100);
    };

    const autoSimulate = () => {
        if (autoPlayRef.current) return;
        lastAutoPlayTypeRef.current = 'regular';
        setState(prev => prev ? { ...prev, autoPlayType: 'regular' } : null);
        autoPlayRef.current = setInterval(() => {
            playBall();
        }, 50);
    };
    
    const simulateInning = () => {
         if (autoPlayRef.current) clearInterval(autoPlayRef.current);
         lastAutoPlayTypeRef.current = 'inning';
         setState(prev => prev ? { ...prev, autoPlayType: 'inning' } : null);
         autoPlayRef.current = setInterval(() => {
            playBall();
        }, 10); 
    };

    const simulateMatch = () => {
        if (autoPlayRef.current) clearInterval(autoPlayRef.current);
        lastAutoPlayTypeRef.current = 'match';
        setState(prev => prev ? { ...prev, autoPlayType: 'match' } : null);
        autoPlayRef.current = setInterval(() => {
           playBall();
       }, 5); 
   };
    
    useEffect(() => {
        return () => {
            if (autoPlayRef.current) clearInterval(autoPlayRef.current);
        };
    }, []);

    const setBattingStrategy = (s: Strategy) => setState(prev => prev ? { ...prev, strategies: { ...prev.strategies, batting: s } } : null);
    const setBowlingStrategy = (s: Strategy) => setState(prev => prev ? { ...prev, strategies: { ...prev.strategies, bowling: s } } : null);
    const toggleExploitWeakness = (val: boolean) => setState(prev => prev ? { ...prev, isExploitingWeakness: val } : null);

    const selectOpeners = (strikerId: string, nonStrikerId: string) => {
        setState(prev => {
            if (!prev) return null;
            
            return {
                ...prev,
                currentBatters: { strikerId, nonStrikerId },
                currentPartnership: { runs: 0, balls: 0 },
                waitingFor: null,
            };
        });
    };

    const selectNextBatter = (batterId: string) => {
        setState(prev => {
            if (!prev) return null;
            const currentInning = prev.innings[prev.currentInningIndex];
            const strikerOut = currentInning.batting.find(b => b.playerId === prev.currentBatters.strikerId)?.isOut;
            
            const newBatters = { ...prev.currentBatters };
            if (strikerOut) newBatters.strikerId = batterId;
            else newBatters.nonStrikerId = batterId;

            const totalBalls = currentInning.bowling.reduce((acc, b) => acc + b.ballsBowled, 0);
            let nextWaitingFor: LiveMatchState['waitingFor'] = null;
            let nextBowlerId = prev.currentBowlerId;
            
            if (totalBalls % 6 === 0 && totalBalls > 0) {
                 if (prev.bowlingTeam.id === gameData.userTeamId && prev.autoPlayType !== 'inning' && prev.autoPlayType !== 'match') {
                      nextWaitingFor = 'bowler';
                 } else {
                      const overLimit = gameData.currentFormat.includes('T20') ? 4 : 10;
                      const validBowlers = currentInning.bowling.filter(b => b.playerId !== prev.currentBowlerId && b.ballsBowled < overLimit * 6);
                      
                      let nextBowler = validBowlers.sort((a,b) => {
                           const pa = getPlayerById(a.playerId, allPlayers);
                           const pb = getPlayerById(b.playerId, allPlayers);
                           return pb.secondarySkill - pa.secondarySkill;
                      })[0] || currentInning.bowling.find(b => b.playerId !== prev.currentBowlerId);
                      
                      if (nextBowler) nextBowlerId = nextBowler.playerId;
                 }
            }

            return {
                ...prev,
                currentBatters: newBatters, 
                currentBowlerId: nextBowlerId,
                currentPartnership: { runs: 0, balls: 0 },
                waitingFor: nextWaitingFor,
                commentary: [`${getPlayerById(batterId, allPlayers).name} is the new batter.`, ...prev.commentary]
            };
        });
    };

    const selectNextBowler = (bowlerId: string) => {
        setState(prev => {
            if (!prev) return null;
            return {
                ...prev,
                currentBowlerId: bowlerId,
                waitingFor: null,
                commentary: [`${getPlayerById(bowlerId, allPlayers).name} comes into the attack.`, ...prev.commentary]
            };
        });
    };

    const requestDrsReview = (event?: DRSReviewEvent) => {
        stopAutoPlay();
        setState(prev => {
            if (!prev) return null;
            const evt = event || prev.pendingDrsOpportunity;
            if (!evt) return prev;
            return {
                ...prev,
                activeDrsModal: evt,
                pendingDrsOpportunity: null
            };
        });
    };

    const dismissDrsOpportunity = () => {
        setState(prev => prev ? { ...prev, pendingDrsOpportunity: null } : null);
    };

    const resolveDrsReview = (evt: DRSReviewEvent) => {
        setState(prev => {
            if (!prev) return null;
            const currentInning = { ...prev.innings[prev.currentInningIndex] };
            currentInning.batting = currentInning.batting.map(b => ({ ...b }));
            currentInning.bowling = currentInning.bowling.map(b => ({ ...b }));
            const drsReviews = { ...(prev.drsReviews || { [prev.battingTeam.id]: 2, [prev.bowlingTeam.id]: 2 }) };

            const reviewingTeamId = evt.reviewingTeamId;
            const wasSuccessful = evt.finalDecision === 'OVERTURNED';

            if (!wasSuccessful && evt.finalDecision !== 'UMPIRES_CALL') {
                drsReviews[reviewingTeamId] = Math.max(0, (drsReviews[reviewingTeamId] ?? 2) - 1);
            }

            let newWaitingFor = prev.waitingFor;
            let commentaryMsg = '';

            if (evt.onFieldDecision === 'OUT') {
                const striker = currentInning.batting.find(b => b.playerId === evt.batterId);
                const bowler = currentInning.bowling.find(b => b.playerId === evt.bowlerId);

                if (wasSuccessful) {
                    if (striker) {
                        striker.isOut = false;
                        striker.dismissalText = 'not out';
                    }
                    if (bowler && bowler.wickets > 0) {
                        bowler.wickets--;
                    }
                    if (currentInning.wickets > 0) {
                        currentInning.wickets--;
                    }
                    const newFOW = prev.fallOfWickets.filter(f => f.player !== evt.batterName);
                    
                    // FIX BATTER ROTATION BUG: Ensure original batter is restored onto crease
                    const newBatters = { ...prev.currentBatters };
                    if (newBatters.strikerId !== evt.batterId && newBatters.nonStrikerId !== evt.batterId) {
                        newBatters.strikerId = evt.batterId;
                    }

                    commentaryMsg = `📺 DRS OVERTURNED! Decision overturned to NOT OUT for ${evt.batterName}. Review retained! (${drsReviews[reviewingTeamId]} left)`;
                    
                    return {
                        ...prev,
                        currentBatters: newBatters,
                        innings: prev.innings.map((inn, idx) => idx === prev.currentInningIndex ? currentInning : inn),
                        drsReviews,
                        activeDrsModal: null,
                        pendingDrsOpportunity: null,
                        fallOfWickets: newFOW,
                        waitingFor: null,
                        commentary: [commentaryMsg, ...prev.commentary]
                    };
                } else {
                    commentaryMsg = `📺 DRS UPHELD! Decision stands. OUT for ${evt.batterName}! Review lost (${drsReviews[reviewingTeamId]} left).`;
                    return {
                        ...prev,
                        drsReviews,
                        activeDrsModal: null,
                        pendingDrsOpportunity: null,
                        commentary: [commentaryMsg, ...prev.commentary]
                    };
                }
            } else {
                const striker = currentInning.batting.find(b => b.playerId === evt.batterId);
                const bowler = currentInning.bowling.find(b => b.playerId === evt.bowlerId);

                if (wasSuccessful) {
                    if (striker) {
                        striker.isOut = true;
                        striker.dismissalText = `${evt.type === 'LBW' ? 'lbw' : 'c keeper'} b ${evt.bowlerName}`;
                    }
                    if (bowler) {
                        bowler.wickets++;
                    }
                    currentInning.wickets++;
                    const newFOW = [
                        ...prev.fallOfWickets,
                        { score: currentInning.score, wicket: currentInning.wickets, over: currentInning.overs, player: evt.batterName }
                    ];

                    if (currentInning.wickets < 10) {
                        if (prev.battingTeam.id === gameData.userTeamId) {
                            newWaitingFor = 'batter';
                        } else {
                            const nextBatter = currentInning.batting.find(b => !b.isOut && b.playerId !== prev.currentBatters.strikerId && b.playerId !== prev.currentBatters.nonStrikerId);
                            if (nextBatter) {
                                prev.currentBatters.strikerId = nextBatter.playerId;
                            }
                        }
                    }

                    commentaryMsg = `📺 DRS OVERTURNED! Decision overturned to OUT! ${evt.batterName} is OUT! Review retained! (${drsReviews[reviewingTeamId]} left)`;
                    return {
                        ...prev,
                        innings: prev.innings.map((inn, idx) => idx === prev.currentInningIndex ? currentInning : inn),
                        drsReviews,
                        activeDrsModal: null,
                        pendingDrsOpportunity: null,
                        fallOfWickets: newFOW,
                        waitingFor: newWaitingFor,
                        commentary: [commentaryMsg, ...prev.commentary]
                    };
                } else {
                    commentaryMsg = `📺 DRS UPHELD! Decision stands. NOT OUT! Review lost (${drsReviews[reviewingTeamId]} left).`;
                    return {
                        ...prev,
                        drsReviews,
                        activeDrsModal: null,
                        pendingDrsOpportunity: null,
                        commentary: [commentaryMsg, ...prev.commentary]
                    };
                }
            }
        });

        const lastMode = lastAutoPlayTypeRef.current;
        if (lastMode) {
            setTimeout(() => {
                if (lastMode === 'match') simulateMatch();
                else if (lastMode === 'inning') simulateInning();
                else if (lastMode === 'regular') autoSimulate();
            }, 100);
        }
    };

    return {
        state,
        playBall,
        playOver,
        autoSimulate,
        simulateInning,
        simulateMatch,
        setBattingStrategy,
        setBowlingStrategy,
        toggleExploitWeakness,
        selectOpeners,
        selectNextBatter,
        selectNextBowler,
        requestDrsReview,
        dismissDrsOpportunity,
        resolveDrsReview,
        startMatch,
        proceedToMatch
    };
};

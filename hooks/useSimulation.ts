
import React, { useCallback } from 'react';
import { GameData, Format, PlayerRole, MatchResult, Inning, BattingPerformance, BowlingPerformance, Team, Match, Player } from '../types';
import { PITCH_MODIFIERS, formatOvers, getPlayerById, generateAutoXI, getBatterTier, BATTING_PROFILES, getBatterProfile } from '../utils';
import { generateSingleFormatInitialStats } from '../data';
import { getPlayerOfTheMatch } from '../utils/awardUtils';
import { evaluateDynamicNews } from '../utils/dynamicNewsEngine';
import { advanceGameDate, getMatchDurationDays, isDateBefore } from '../utils/gameCalendar';
import { updateRankingsAfterMatch } from '../utils/rankingsEngine';

export const getMatchRainImpact = (matchNumber: string | number, format: Format, season: number) => {
    const isT20 = format.includes('T20');
    const isODI = format.includes('ODI') || format.includes('One-Day') || format.includes('List-A');
    if (!isT20 && !isODI) return null;

    const matchStr = String(matchNumber);
    const isKnockout = matchStr.includes('SF') || matchStr.includes('Final') || matchStr.includes('Playoff') || matchStr.includes('P1') || matchStr.includes('P2') || matchStr.toLowerCase().includes('semi');

    const matchNumInt = typeof matchNumber === 'number' ? matchNumber : (parseInt(matchNumber.toString().replace(/\D/g, ''), 10) || 1);
    const seed = (season * 997 + matchNumInt * 37) % 100;

    const threshold = isT20 ? 35 : 30;

    if (seed < threshold) {
        const minOversRequired = isT20 ? 5 : 20;
        const maxNormalOvers = isT20 ? 20 : 50;

        // Knockouts have mandatory reserve day / DLS play — NO FULL WASHOUT FOR SEMIS AND FINALS!
        if (isKnockout) {
            const reducedOvers = Math.max(minOversRequired, isT20 ? 12 : 25);
            return {
                isRainAffected: true,
                isAbandoned: false, // NEVER ABANDONED FOR SEMIS & FINALS
                reducedOvers,
                minOversRequired,
                reason: `Rain interrupted knockout. Played on Reserve Day under DLS (${reducedOvers} overs per side).`
            };
        }

        // ~60% chance rain causes washout below minimum required overs for standard round-robin matches
        const isAbandoned = (seed % 10) < 6;

        if (isAbandoned) {
            return {
                isRainAffected: true,
                isAbandoned: true,
                reducedOvers: 0,
                minOversRequired,
                reason: `Match Abandoned due to persistent rain. Minimum ${minOversRequired} overs required for DLS result not completed.`
            };
        } else {
            const availableRange = maxNormalOvers - minOversRequired - 2;
            const reducedOvers = minOversRequired + (availableRange > 0 ? ((seed * 7) % availableRange) : 0);

            return {
                isRainAffected: true,
                isAbandoned: false,
                reducedOvers,
                minOversRequired,
                reason: `Rain Interrupted Match. Reduced to ${reducedOvers} overs per side under DLS Method.`
            };
        }
    }

    return null;
};

export const useSimulation = (gameData: GameData, setGameData: React.Dispatch<React.SetStateAction<GameData | null>>) => {
    const simulateInning = useCallback((
        battingTeam: Team, 
        bowlingTeam: Team, 
        format: Format, 
        target: number | null, 
        pitch: string, 
        groundCode: string, 
        inningNumber: number, 
        allPlayers: Player[], 
        playerForms: Record<string, number>,
        overrideMaxOvers?: number | null
    ): Inning => {
        const pitchMods = PITCH_MODIFIERS[pitch as keyof typeof PITCH_MODIFIERS] || PITCH_MODIFIERS["Balanced Sporting Pitch"];
        const formatMods = pitchMods[format];
        let score = 0, wickets = 0, balls = 0, extras = 0;
        
        const isT20 = format.includes('T20');
        const isODI = format.includes('One-Day') || format.includes('List-A') || format.includes('ODI');
        const normalOvers = isT20 ? 20 : isODI ? 50 : 90;
        const actualMaxOvers = overrideMaxOvers && overrideMaxOvers > 0 ? overrideMaxOvers : normalOvers;
        const maxBalls = actualMaxOvers * 6;
        
        let limits: any = null;
        const groundLimits = gameData.scoreLimits?.[groundCode];
        if (groundLimits) {
            const formatLimits = groundLimits[format];
            if (formatLimits) {
                limits = formatLimits[inningNumber];
            }
        }
        const maxWicketsForInning = (limits?.maxWickets && limits.maxWickets > 0 && limits.maxWickets <= 10) ? limits.maxWickets : 10;

        const battingLineup: BattingPerformance[] = battingTeam.squad.map((p, idx) => { 
            const d = getPlayerById(p.id, allPlayers); 
            return { 
                playerId: d.id, 
                playerName: d.name, 
                runs: 0, 
                balls: 0, 
                fours: 0, 
                sixes: 0, 
                isOut: false, 
                dismissalText: 'not out', 
                dismissal: { type: 'not out', bowlerId: '' }, 
                ballsToFifty: 0, 
                ballsToHundred: 0,
                ppRuns: 0, ppBalls: 0, ppDismissals: 0,
                moRuns: 0, moBalls: 0, moDismissals: 0,
                doRuns: 0, doBalls: 0, doDismissals: 0,
                battingPosition: idx + 1
            }; 
        });
        
        const bowlingLineup = bowlingTeam.squad
            .filter(p => getPlayerById(p.id, allPlayers).role !== PlayerRole.WICKET_KEEPER)
            .map(p => { 
                const d = getPlayerById(p.id, allPlayers); 
                return { 
                    playerId: d.id, 
                    playerName: d.name, 
                    overs: '0.0', 
                    maidens: 0, 
                    runsConceded: 0, 
                    wickets: 0, 
                    ballsBowled: 0,
                    role: d.role,
                    skill: d.secondarySkill,
                    ppWickets: 0, ppRunsConceded: 0, ppBallsBowled: 0,
                    moWickets: 0, moRunsConceded: 0, moBallsBowled: 0,
                    doWickets: 0, doRunsConceded: 0, doBallsBowled: 0
                } 
            });
        
        if (bowlingLineup.length < 2) { 
            const p1 = getPlayerById(bowlingTeam.squad[0].id, allPlayers);
            const p2 = getPlayerById(bowlingTeam.squad[1]?.id || bowlingTeam.squad[0].id, allPlayers);
            if (bowlingLineup.length === 0) {
                bowlingLineup.push({ 
                    playerId: p1.id, playerName: p1.name, overs: '0.0', maidens: 0, runsConceded: 0, wickets: 0, ballsBowled: 0, role: p1.role, skill: p1.secondarySkill,
                    ppWickets: 0, ppRunsConceded: 0, ppBallsBowled: 0,
                    moWickets: 0, moRunsConceded: 0, moBallsBowled: 0,
                    doWickets: 0, doRunsConceded: 0, doBallsBowled: 0
                });
            }
            if (bowlingLineup.length === 1) {
                bowlingLineup.push({ 
                    playerId: p2.id, playerName: p2.name, overs: '0.0', maidens: 0, runsConceded: 0, wickets: 0, ballsBowled: 0, role: p2.role, skill: p2.secondarySkill,
                    ppWickets: 0, ppRunsConceded: 0, ppBallsBowled: 0,
                    moWickets: 0, moRunsConceded: 0, moBallsBowled: 0,
                    doWickets: 0, doRunsConceded: 0, doBallsBowled: 0
                });
            }
        }

        let onStrikeBatterIndex = 0, offStrikeBatterIndex = 1, bowlerIndex = 0, runsThisOver = 0;

        while (balls < maxBalls && wickets < maxWicketsForInning) {
            if (target && score >= target) break;
            if (limits?.maxRuns && limits.maxRuns > 0 && score >= limits.maxRuns) break;

            const onStrikeBatter = battingLineup[onStrikeBatterIndex];
            if (!onStrikeBatter) break; 
            const onStrikeBatterDetails = getPlayerById(onStrikeBatter.playerId, allPlayers);
            const currentBowler = bowlingLineup[bowlerIndex];
            const bowlerDetails = getPlayerById(currentBowler.playerId, allPlayers);

            const batterForm = playerForms[onStrikeBatterDetails.id] || 1.0;
            const bowlerForm = playerForms[bowlerDetails.id] || 1.0;
            const batterFatigue = Math.max(0.75, 1 - (onStrikeBatter.balls / 250)) * batterForm;
            const bowlerFatigue = Math.max(0.7, 1 - (currentBowler.ballsBowled / 150)) * bowlerForm;

            let pressureFactor = 1.0;
            let aggressionFactor = 1.0;
            
            if (target) {
                const remainingBalls = maxBalls - balls;
                const remainingRuns = target - score;
                if (remainingBalls > 0) {
                    const requiredRR = (remainingRuns / remainingBalls) * 6;
                    if (isT20) {
                        if (requiredRR > 12) aggressionFactor = 1.6;
                        else if (requiredRR > 10) aggressionFactor = 1.4;
                        else if (requiredRR > 8) aggressionFactor = 1.25;
                        else if (requiredRR < 6) aggressionFactor = 0.95;
                    } else if (isODI) {
                        if (requiredRR > 10) aggressionFactor = 1.5;
                        else if (requiredRR > 8) aggressionFactor = 1.3;
                        else if (requiredRR > 6) aggressionFactor = 1.15;
                        else if (requiredRR < 4) aggressionFactor = 0.85;
                    }
                    const skillClutchness = (onStrikeBatterDetails.battingSkill - 60) / 100;
                    if (requiredRR > 9) {
                        const basePressure = (requiredRR - 9) * 0.06;
                        pressureFactor = 1 + Math.max(0, basePressure - skillClutchness);
                    }
                }
            } else {
                const progress = balls / maxBalls;
                if (isT20) {
                    if (progress > 0.8) aggressionFactor = 1.4;
                    else if (progress > 0.5) aggressionFactor = 1.15;
                    else if (progress < 0.3) aggressionFactor = 1.05;
                } else if (isODI) {
                    if (progress > 0.9) aggressionFactor = 1.5;
                    else if (progress > 0.7) aggressionFactor = 1.2;
                    else if (progress < 0.2) aggressionFactor = 1.1;
                }
            }

            let batterProfile;
            const customProfile = onStrikeBatterDetails.customProfiles?.[format];
            if (customProfile && customProfile.avg > 0 && customProfile.sr > 0) {
                batterProfile = customProfile;
            } else {
                const batterTier = getBatterTier(onStrikeBatterDetails.battingSkill * batterFatigue);
                const batterStyle = onStrikeBatterDetails.style;
                batterProfile = getBatterProfile(format, batterTier, batterStyle);
            }

            let effectiveChasePenalty = target !== null ? pitchMods.chasePenalty : 1;
            if (target && aggressionFactor > 1.3) effectiveChasePenalty = 1.0;
            const expectedRunsPerBall = (batterProfile.sr / 100) * aggressionFactor * effectiveChasePenalty;
            const riskMitigation = (onStrikeBatterDetails.battingSkill - 50) / 100;
            const aggressionWicketPenalty = Math.max(1.0, aggressionFactor - riskMitigation);
            const baseWicketProb = batterProfile.avg > 0 ? (expectedRunsPerBall / aggressionFactor / batterProfile.avg) * aggressionWicketPenalty : 0.05;
            
            let wicketProbability = (baseWicketProb * pressureFactor)
                + (((bowlerDetails.secondarySkill * bowlerFatigue) - (onStrikeBatterDetails.battingSkill * batterFatigue)) / 600) 
                + (bowlerDetails.role === PlayerRole.FAST_BOWLER ? pitchMods.paceBonus / 2 : 0) 
                + (bowlerDetails.role === PlayerRole.SPIN_BOWLER ? pitchMods.spinBonus / 2 : 0);
            
            wicketProbability *= formatMods.wicketChance;
            if (!format.includes('First-Class')) {
                if (target) {
                    if (score < 50) wicketProbability *= 0.05;
                    else if (score < 120) wicketProbability *= 0.35;
                } else {
                    if (score < 40) wicketProbability *= 0.1;
                    else if (score < 80) wicketProbability *= 0.4;
                    else if (balls < 60 && score < 100) wicketProbability *= 0.7;
                }
            }
            if (format.includes('First-Class')) wicketProbability *= 0.8;
            else if (isT20) wicketProbability *= 1.1;

            wicketProbability = Math.max(0.004, Math.min(0.4, wicketProbability));

            balls++;
            onStrikeBatter.balls++;
            currentBowler.ballsBowled++;

            let currentPhase: 'pp' | 'mo' | 'do' | null = null;
            if (isT20) {
                if (balls <= 36) currentPhase = 'pp';
                else if (balls <= 96) currentPhase = 'mo';
                else currentPhase = 'do';
            } else if (isODI) {
                if (balls <= 60) currentPhase = 'pp';
                else if (balls <= 240) currentPhase = 'mo';
                else currentPhase = 'do';
            }

            if (currentPhase) {
                if (currentPhase === 'pp') {
                    onStrikeBatter.ppBalls = (onStrikeBatter.ppBalls || 0) + 1;
                    currentBowler.ppBallsBowled = (currentBowler.ppBallsBowled || 0) + 1;
                } else if (currentPhase === 'mo') {
                    onStrikeBatter.moBalls = (onStrikeBatter.moBalls || 0) + 1;
                    currentBowler.moBallsBowled = (currentBowler.moBallsBowled || 0) + 1;
                } else if (currentPhase === 'do') {
                    onStrikeBatter.doBalls = (onStrikeBatter.doBalls || 0) + 1;
                    currentBowler.doBallsBowled = (currentBowler.doBallsBowled || 0) + 1;
                }
            }

            let runsScored = 0;
            let isWicket = false;
            
            if (Math.random() < wicketProbability) {
                isWicket = true;
            } else {
                const rand = Math.random();
                let p_dot=0.32, p_1=0.40, p_2=0.08, p_3=0.02, p_4=0.12, p_6=0.06;
                if (format.includes('First-Class')) {
                    p_dot = 0.70; p_1 = 0.22; p_2 = 0.03; p_3 = 0.01; p_4 = 0.04; p_6 = 0.00;
                } else if (isT20) {
                    p_dot = 0.30; p_1 = 0.40; p_2 = 0.08; p_3 = 0.02; p_4 = 0.12; p_6 = 0.08;
                } else if (isODI) {
                    p_dot = 0.35; p_1 = 0.42; p_2 = 0.09; p_3 = 0.02; p_4 = 0.08; p_6 = 0.04;
                }
                const skillDiff = (onStrikeBatterDetails.battingSkill * batterFatigue - bowlerDetails.secondarySkill * bowlerFatigue) / 100;
                p_dot -= skillDiff * 0.1; p_4 += skillDiff * 0.05; p_6 += skillDiff * 0.03;
                if (!target && !format.includes('First-Class') && score < 70) {
                    p_dot *= 0.6; p_4 *= 1.5; p_6 *= 2.0;
                }
                if (aggressionFactor > 1.2) { p_dot *= 0.8; p_4 *= 1.4; p_6 *= 1.6; }
                else if (aggressionFactor < 0.9) { p_dot *= 1.4; p_4 *= 0.7; p_6 *= 0.5; }
                const totalP = p_dot + p_1 + p_2 + p_3 + p_4 + p_6;
                const normRand = rand * totalP;
                if (normRand < p_dot) runsScored = 0;
                else if (normRand < p_dot + p_1) runsScored = 1;
                else if (normRand < p_dot + p_1 + p_2) runsScored = 2;
                else if (normRand < p_dot + p_1 + p_2 + p_3) runsScored = 3;
                else if (normRand < p_dot + p_1 + p_2 + p_3 + p_4) runsScored = 4;
                else runsScored = 6;
                if (runsScored === 0 && Math.random() < 0.02 && !format.includes('First-Class')) runsScored = 1;
            }

            if (isWicket) {
                wickets++;
                onStrikeBatter.isOut = true;
                onStrikeBatter.dismissal = { type: 'bowled', bowlerId: currentBowler.playerId };
                onStrikeBatter.dismissalText = `b ${currentBowler.playerName}`;
                currentBowler.wickets++;
                if (currentPhase) {
                    if (currentPhase === 'pp') { onStrikeBatter.ppDismissals = (onStrikeBatter.ppDismissals || 0) + 1; currentBowler.ppWickets = (currentBowler.ppWickets || 0) + 1; }
                    else if (currentPhase === 'mo') { onStrikeBatter.moDismissals = (onStrikeBatter.moDismissals || 0) + 1; currentBowler.moWickets = (currentBowler.moWickets || 0) + 1; }
                    else if (currentPhase === 'do') { onStrikeBatter.doDismissals = (onStrikeBatter.doDismissals || 0) + 1; currentBowler.doWickets = (currentBowler.doWickets || 0) + 1; }
                }
                onStrikeBatterIndex = Math.max(onStrikeBatterIndex, offStrikeBatterIndex) + 1;
            } else {
                const oldRuns = onStrikeBatter.runs;
                onStrikeBatter.runs += runsScored;
                if (oldRuns < 50 && onStrikeBatter.runs >= 50 && !onStrikeBatter.ballsToFifty) { onStrikeBatter.ballsToFifty = onStrikeBatter.balls; }
                if (oldRuns < 100 && onStrikeBatter.runs >= 100 && !onStrikeBatter.ballsToHundred) { onStrikeBatter.ballsToHundred = onStrikeBatter.balls; }
                score += runsScored; currentBowler.runsConceded += runsScored; runsThisOver += runsScored;
                if (runsScored === 4) onStrikeBatter.fours++;
                if (runsScored === 6) onStrikeBatter.sixes++;
                if (currentPhase) {
                    if (currentPhase === 'pp') { onStrikeBatter.ppRuns = (onStrikeBatter.ppRuns || 0) + runsScored; currentBowler.ppRunsConceded = (currentBowler.ppRunsConceded || 0) + runsScored; }
                    else if (currentPhase === 'mo') { onStrikeBatter.moRuns = (onStrikeBatter.moRuns || 0) + runsScored; currentBowler.moRunsConceded = (currentBowler.moRunsConceded || 0) + runsScored; }
                    else if (currentPhase === 'do') { onStrikeBatter.doRuns = (onStrikeBatter.doRuns || 0) + runsScored; currentBowler.doRunsConceded = (currentBowler.doRunsConceded || 0) + runsScored; }
                }
                if (runsScored % 2 !== 0) { [onStrikeBatterIndex, offStrikeBatterIndex] = [offStrikeBatterIndex, onStrikeBatterIndex]; }
            }

            if (balls % 6 === 0) {
                if (runsThisOver === 0) currentBowler.maidens++;
                runsThisOver = 0;
                [onStrikeBatterIndex, offStrikeBatterIndex] = [offStrikeBatterIndex, onStrikeBatterIndex];
                const maxOversPerBowler = isT20 ? 4 : isODI ? 10 : Infinity;
                const lastBowlerIndex = bowlerIndex;
                let bestNextBowlerIndex = -1; let bestScore = -Infinity;
                for (let i = 0; i < bowlingLineup.length; i++) {
                    if (i === lastBowlerIndex) continue;
                    if (bowlingLineup[i].ballsBowled >= maxOversPerBowler * 6) continue;
                    const b = bowlingLineup[i]; let bScore = b.skill;
                    if (wickets < 5) { if (b.role === PlayerRole.FAST_BOWLER) bScore += 10; } else { if (b.role === PlayerRole.SPIN_BOWLER) bScore += 5; }
                    bScore -= (b.ballsBowled / 6) * 2; bScore += Math.random() * 10;
                    if (bScore > bestScore) { bestScore = bScore; bestNextBowlerIndex = i; }
                }
                if (bestNextBowlerIndex !== -1) bowlerIndex = bestNextBowlerIndex;
                else bowlerIndex = (lastBowlerIndex + 1) % bowlingLineup.length;
            }
        }
        return { 
            teamId: battingTeam.id, teamName: battingTeam.name, score, wickets, overs: formatOvers(balls), extras, 
            batting: battingLineup.slice(0, Math.min(battingLineup.length, wickets + 2)), 
            bowling: bowlingLineup.map(b => ({...b, overs: formatOvers(b.ballsBowled)})) 
        };
    }, [gameData.scoreLimits]);

    const runLimitedOversMatchSimulation = useCallback((match: Match, teamAPlayers: Player[], teamBPlayers: Player[], gameData: GameData): MatchResult => {
        const allAvailableTeams: any[] = [
            ...(gameData.teams || []),
            ...(gameData.worldLeague?.teams || []),
            ...(gameData.championsLeague?.teams || [])
        ];

        const teamAData = allAvailableTeams.find(t => t.name?.toLowerCase() === match.teamA?.toLowerCase()) || gameData.teams?.find(t => t.name === match.teamA); 
        const teamBData = allAvailableTeams.find(t => t.name?.toLowerCase() === match.teamB?.toLowerCase()) || gameData.teams?.find(t => t.name === match.teamB);

        const teamA: Team = {
            id: teamAData?.id || `team-${match.teamA?.toLowerCase().replace(/\s+/g, '-') || 'a'}`,
            name: match.teamA || teamAData?.name || 'Team A',
            captains: teamAData?.captains || {},
            purse: teamAData?.purse ?? 100,
            squad: teamAPlayers || []
        };
        const teamB: Team = {
            id: teamBData?.id || `team-${match.teamB?.toLowerCase().replace(/\s+/g, '-') || 'b'}`,
            name: match.teamB || teamBData?.name || 'Team B',
            captains: teamBData?.captains || {},
            purse: teamBData?.purse ?? 100,
            squad: teamBPlayers || []
        };
        const homeGround = gameData.grounds.find(g => g.code === gameData.allTeamsData.find(t => t.name === match.teamA)?.homeGround); 
        const pitch = homeGround?.pitch || "Balanced Sporting Pitch";
        const playerForms: Record<string, number> = {};
        [...teamAPlayers, ...teamBPlayers].forEach(p => { if (p?.id) playerForms[p.id] = 0.9 + (Math.random() * 0.2); });

        const rainImpact = getMatchRainImpact(match.matchNumber, gameData.currentFormat, gameData.currentSeason);

        if (rainImpact?.isAbandoned) {
            return {
                matchNumber: match.matchNumber,
                winnerId: null,
                loserId: null,
                summary: `Match Abandoned due to persistent rain. Minimum ${rainImpact.minOversRequired} overs required for DLS result not completed. (Points Shared: 1 point each)`,
                firstInning: {
                    teamId: teamA.id,
                    teamName: teamA.name,
                    score: 0,
                    wickets: 0,
                    overs: '0.0',
                    extras: 0,
                    batting: [],
                    bowling: []
                },
                secondInning: {
                    teamId: teamB.id,
                    teamName: teamB.name,
                    score: 0,
                    wickets: 0,
                    overs: '0.0',
                    extras: 0,
                    batting: [],
                    bowling: []
                },
                manOfTheMatch: {
                    playerId: '',
                    playerName: 'N/A',
                    teamId: '',
                    summary: 'Match Abandoned due to Rain'
                }
            };
        }

        const isRainReduced = rainImpact?.isRainAffected && !rainImpact.isAbandoned;
        const reducedOvers = isRainReduced ? rainImpact.reducedOvers : null;

        const firstInning = simulateInning(
            teamA, teamB, gameData.currentFormat, null, pitch, homeGround?.code || 'KCG', 1, 
            [...teamAPlayers, ...teamBPlayers], playerForms, reducedOvers
        );

        let secondInningTarget = firstInning.score + 1;
        // If both teams played equal reduced overs (e.g. 12 overs per side), target is simply 1st inning score + 1.
        // DLS target scaling only applies if 1st inning played more overs than 2nd inning.
        if (isRainReduced && reducedOvers) {
            secondInningTarget = firstInning.score + 1;
        }

        const secondInning = simulateInning(
            teamB, teamA, gameData.currentFormat, secondInningTarget, pitch, homeGround?.code || 'KCG', 2, 
            [...teamAPlayers, ...teamBPlayers], playerForms, reducedOvers
        );

        let winnerId: string | null = null, loserId: string | null = null, summary = '';

        if (isRainReduced && reducedOvers) {
            if (secondInning.score >= secondInningTarget) {
                winnerId = teamB.id;
                loserId = teamA.id;
                summary = `Rain Interrupted (DLS Method): ${teamB.name} won by ${10 - secondInning.wickets} wickets (Target: ${secondInningTarget} in ${reducedOvers} ov).`;
            } else {
                winnerId = teamA.id;
                loserId = teamB.id;
                summary = `Rain Interrupted (DLS Method): ${teamA.name} won by ${secondInningTarget - 1 - secondInning.score} runs (Target: ${secondInningTarget} in ${reducedOvers} ov).`;
            }
        } else if (secondInning.score > firstInning.score) { 
            winnerId = teamB.id; 
            loserId = teamA.id; 
            summary = `${teamB.name} won by ${10 - secondInning.wickets} wickets.`; 
        } else if (firstInning.score > secondInning.score) { 
            winnerId = teamA.id; 
            loserId = teamB.id; 
            summary = `${teamA.name} won by ${firstInning.score - secondInning.score} runs.`; 
        } else {
            // Match Tied! Run modern Super Over shootout
            const simulateSuperOverInning = (
                batting: Team,
                bowling: Team,
                targetVal: number | null
            ) => {
                let sScore = 0, sWkts = 0, sBalls = 0;
                const topBatters = batting.squad.slice(0, 3).map(p => getPlayerById(p.id, [...teamAPlayers, ...teamBPlayers]));
                const bestBowler = [...bowling.squad]
                    .map(p => getPlayerById(p.id, [...teamAPlayers, ...teamBPlayers]))
                    .filter(p => p.role !== PlayerRole.WICKET_KEEPER)
                    .sort((a, b) => b.secondarySkill - a.secondarySkill)[0] || getPlayerById(bowling.squad[0].id, [...teamAPlayers, ...teamBPlayers]);

                let sStrikerIdx = 0;
                let sNonStrikerIdx = 1;

                while (sBalls < 6 && sWkts < 2) {
                    if (targetVal && sScore >= targetVal) break;

                    const activeStriker = topBatters[sStrikerIdx] || topBatters[0];
                    const activeStrikerForm = playerForms[activeStriker.id] || 1.0;
                    const activeBowlerForm = playerForms[bestBowler.id] || 1.0;

                    const aggFactor = 1.45;
                    const bTier = getBatterTier(activeStriker.battingSkill * activeStrikerForm);
                    const bStyle = activeStriker.style;
                    const bProfile = getBatterProfile(gameData.currentFormat, bTier, bStyle);

                    let wProbability = 0.16 + (bestBowler.secondarySkill * activeBowlerForm - activeStriker.battingSkill * activeStrikerForm) / 400;
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

            // Team A bats first in the Super Over
            const superA = simulateSuperOverInning(teamA, teamB, null);
            // Team B bats second with target superA.score + 1
            const superB = simulateSuperOverInning(teamB, teamA, superA.score + 1);

            if (superB.score > superA.score) {
                winnerId = teamB.id;
                loserId = teamA.id;
                summary = `Match Tied. ${teamB.name} won via Super Over (${teamB.name}: ${superB.score}/${superB.wickets} vs ${teamA.name}: ${superA.score}/${superA.wickets}).`;
            } else if (superA.score > superB.score) {
                winnerId = teamA.id;
                loserId = teamB.id;
                summary = `Match Tied. ${teamA.name} won via Super Over (${teamA.name}: ${superA.score}/${superA.wickets} vs ${teamB.name}: ${superB.score}/${superB.wickets}).`;
            } else {
                const drawRand = Math.random();
                if (drawRand > 0.5) {
                    winnerId = teamA.id;
                    loserId = teamB.id;
                    summary = `Match Tied. ${teamA.name} won via Double Super Over (Sudden Death checkout).`;
                } else {
                    winnerId = teamB.id;
                    loserId = teamA.id;
                    summary = `Match Tied. ${teamB.name} won via Double Super Over (Sudden Death checkout).`;
                }
            }
        }

        const result: MatchResult = { matchNumber: match.matchNumber, winnerId, loserId, summary, firstInning, secondInning, manOfTheMatch: { playerId: '', playerName: '', teamId: '', summary: '' } };
        result.manOfTheMatch = getPlayerOfTheMatch(result);
        return result;
    }, [simulateInning]);

    const runFirstClassMatchSimulation = useCallback((match: Match, teamAPlayers: Player[], teamBPlayers: Player[], gameData: GameData): MatchResult => {
        const allAvailableTeams: any[] = [
            ...(gameData.teams || []),
            ...(gameData.worldLeague?.teams || []),
            ...(gameData.championsLeague?.teams || [])
        ];

        const teamAData = allAvailableTeams.find(t => t.name?.toLowerCase() === match.teamA?.toLowerCase()) || gameData.teams?.find(t => t.name === match.teamA); 
        const teamBData = allAvailableTeams.find(t => t.name?.toLowerCase() === match.teamB?.toLowerCase()) || gameData.teams?.find(t => t.name === match.teamB);

        const teamA: Team = {
            id: teamAData?.id || `team-${match.teamA?.toLowerCase().replace(/\s+/g, '-') || 'a'}`,
            name: match.teamA || teamAData?.name || 'Team A',
            captains: teamAData?.captains || {},
            purse: teamAData?.purse ?? 100,
            squad: teamAPlayers || []
        };
        const teamB: Team = {
            id: teamBData?.id || `team-${match.teamB?.toLowerCase().replace(/\s+/g, '-') || 'b'}`,
            name: match.teamB || teamBData?.name || 'Team B',
            captains: teamBData?.captains || {},
            purse: teamBData?.purse ?? 100,
            squad: teamBPlayers || []
        };
        const homeGround = gameData.grounds?.find(g => g.code === gameData.allTeamsData?.find(t => t.name === match.teamA)?.homeGround);
        const playerForms: Record<string, number> = {}; 
        [...teamAPlayers, ...teamBPlayers].forEach(p => { if (p?.id) playerForms[p.id] = 0.9 + (Math.random() * 0.2); });

        const firstInning = simulateInning(teamA, teamB, gameData.currentFormat, null, homeGround?.pitch || "Balanced", homeGround?.code || 'KCG', 1, [...teamAPlayers, ...teamBPlayers], playerForms);
        const secondInning = simulateInning(teamB, teamA, gameData.currentFormat, null, homeGround?.pitch || "Balanced", homeGround?.code || 'KCG', 2, [...teamAPlayers, ...teamBPlayers], playerForms);
        const thirdInning = simulateInning(teamA, teamB, gameData.currentFormat, null, homeGround?.pitch || "Balanced", homeGround?.code || 'KCG', 3, [...teamAPlayers, ...teamBPlayers], playerForms);
        const target = (firstInning.score + thirdInning.score - secondInning.score) + 1;
        const fourthInning = simulateInning(teamB, teamA, gameData.currentFormat, target, homeGround?.pitch || "Balanced", homeGround?.code || 'KCG', 4, [...teamAPlayers, ...teamBPlayers], playerForms);

        let winnerId: string | null = null, loserId: string | null = null, summary = '';
        if (fourthInning.score >= target) { 
            winnerId = teamB.id; 
            loserId = teamA.id; 
            summary = `${teamB.name} won by ${10 - fourthInning.wickets} wickets.`; 
        } else if (fourthInning.wickets >= 10) { 
            winnerId = teamA.id; 
            loserId = teamB.id; 
            summary = `${teamA.name} won by ${target - 1 - fourthInning.score} runs.`; 
        } else {
            if (match.group === 'Semi-Finals' || match.group === 'Final') {
                const standings = gameData.standings?.[gameData.currentFormat] || [];
                const rankA = standings.findIndex(s => s.teamId === teamA.id);
                const rankB = standings.findIndex(s => s.teamId === teamB.id);
                
                if (rankA !== -1 && rankB !== -1) {
                    if (rankA < rankB) { // rankA is higher in standings table (smaller index)
                        winnerId = teamA.id;
                        loserId = teamB.id;
                        summary = `Match Drawn. ${teamA.name} advanced to next stage on superior league standing.`;
                    } else {
                        winnerId = teamB.id;
                        loserId = teamA.id;
                        summary = `Match Drawn. ${teamB.name} advanced to next stage on superior league standing.`;
                    }
                } else {
                    // Fallback
                    if (Math.random() > 0.5) {
                        winnerId = teamA.id;
                        loserId = teamB.id;
                        summary = `Match Drawn. ${teamA.name} advanced on higher qualification seeding.`;
                    } else {
                        winnerId = teamB.id;
                        loserId = teamA.id;
                        summary = `Match Drawn. ${teamB.name} advanced on higher qualification seeding.`;
                    }
                }
            } else {
                summary = 'Match Drawn.'; 
                winnerId = null; 
                loserId = null; 
            }
        }

        const result: MatchResult = { matchNumber: match.matchNumber, winnerId, loserId, summary, firstInning, secondInning, thirdInning, fourthInning, manOfTheMatch: { playerId: '', playerName: '', teamId: '', summary: '' } };
        result.manOfTheMatch = getPlayerOfTheMatch(result);
        return result;
    }, [simulateInning]);

    const runSimulationForCurrentFormat = useCallback((match: Match, gameData: GameData) => {
        const allAvailableTeams: any[] = [
            ...(gameData.teams || []),
            ...(gameData.worldLeague?.teams || []),
            ...(gameData.championsLeague?.teams || [])
        ];

        let teamAData = allAvailableTeams.find(t => t.name?.toLowerCase() === match.teamA?.toLowerCase()) || gameData.teams?.find(t => t.name === match.teamA); 
        let teamBData = allAvailableTeams.find(t => t.name?.toLowerCase() === match.teamB?.toLowerCase()) || gameData.teams?.find(t => t.name === match.teamB);

        if (!teamAData) {
            teamAData = { id: `team-${match.teamA?.toLowerCase().replace(/\s+/g, '-') || 'a'}`, name: match.teamA, homeGround: 'KCG', squad: [] };
        }
        if (!teamBData) {
            teamBData = { id: `team-${match.teamB?.toLowerCase().replace(/\s+/g, '-') || 'b'}`, name: match.teamB, homeGround: 'KCG', squad: [] };
        }

        const getXI = (t: any) => {
            if (t.id === gameData.userTeamId) {
                if (t.playingXI && Array.isArray(t.playingXI) && t.playingXI.length === 11 && t.squad) {
                    const mapped = t.playingXI.map((id: string) => t.squad.find((p: any) => p.id === id)).filter(Boolean) as Player[];
                    if (mapped.length === 11) return mapped;
                }
                if (gameData.playingXIs?.[t.id]?.[gameData.currentFormat] && t.squad) {
                    const mapped = gameData.playingXIs[t.id][gameData.currentFormat].map((id: string) => t.squad.find((p: any) => p.id === id)).filter(Boolean) as Player[];
                    if (mapped.length === 11) return mapped;
                }
            } else {
                if (gameData.playingXIs?.[t.id]?.[gameData.currentFormat] && t.squad) {
                    const mapped = gameData.playingXIs[t.id][gameData.currentFormat].map((id: string) => t.squad.find((p: any) => p.id === id)).filter(Boolean) as Player[];
                    if (mapped.length === 11) return mapped;
                }
            }
            if (t.squad && t.squad.length > 0) {
                return generateAutoXI(t.squad, gameData.currentFormat || Format.T20);
            }
            return (gameData.allPlayers || []).slice(0, 11);
        };

        const pA = getXI(teamAData); 
        const pB = getXI(teamBData);
        return (gameData.currentFormat?.includes('First-Class')) ? runFirstClassMatchSimulation(match, pA, pB, gameData) : runLimitedOversMatchSimulation(match, pA, pB, gameData);
    }, [runLimitedOversMatchSimulation, runFirstClassMatchSimulation]);

    const updateStatsFromMatch = useCallback((result: MatchResult, format: Format, gameData: GameData): GameData => {
        const newGameData = JSON.parse(JSON.stringify(gameData)) as GameData;
        const allInnings = [result.firstInning, result.secondInning, result.thirdInning, result.fourthInning].filter(Boolean) as Inning[];
        const isT20OrODI = format.includes('T20') || format.includes('One-Day') || format.includes('List-A');

        // Determine international and domestic format keys
        let intlFormatKey: 'Test' | 'ODI' | 'T20i' = 'T20i';
        const fStr = String(format).toLowerCase();
        if (fStr.includes('test') || fStr.includes('first-class') || fStr.includes('shield') || fStr.includes('fc')) {
            intlFormatKey = 'Test';
        } else if (fStr.includes('odi') || fStr.includes('one-day') || fStr.includes('list-a') || fStr.includes('list a')) {
            intlFormatKey = 'ODI';
        }

        let domFormatKey: 'T20' | 'List A' | 'FC' = 'T20';
        if (intlFormatKey === 'Test') domFormatKey = 'FC';
        else if (intlFormatKey === 'ODI') domFormatKey = 'List A';

        for (const inning of allInnings) {
            for (const batPerf of inning.batting) { 
                const player = newGameData.allPlayers.find(p => p.id === batPerf.playerId); if (!player) continue; 
                if (!player.stats) player.stats = {} as any;
                if (!player.stats[format]) player.stats[format] = generateSingleFormatInitialStats();
                if (!player.internationalStats) player.internationalStats = { 'Test': generateSingleFormatInitialStats(), 'ODI': generateSingleFormatInitialStats(), 'T20i': generateSingleFormatInitialStats() };
                if (!player.internationalStats[intlFormatKey]) player.internationalStats[intlFormatKey] = generateSingleFormatInitialStats();
                if (!player.domesticStats) player.domesticStats = { 'T20': generateSingleFormatInitialStats(), 'List A': generateSingleFormatInitialStats(), 'FC': generateSingleFormatInitialStats() };
                if (!player.domesticStats[domFormatKey]) player.domesticStats[domFormatKey] = generateSingleFormatInitialStats();

                const isMatchIncrement = (inning === result.firstInning || (inning === result.secondInning && !result.thirdInning));
                const targetStatContainers = [player.stats[format], player.internationalStats[intlFormatKey], player.domesticStats[domFormatKey]];

                for (const stats of targetStatContainers) {
                    if (isMatchIncrement) stats.matches += 1;
                    stats.inningsBatting += 1;
                    stats.runs += batPerf.runs;
                    stats.ballsFaced += batPerf.balls;
                    if (batPerf.isOut) stats.dismissals++; 
                    if (batPerf.runs > stats.highestScore) stats.highestScore = batPerf.runs;
                    if (batPerf.runs >= 100) stats.hundreds++;
                    else if (batPerf.runs >= 50) stats.fifties++; 
                    stats.fours += batPerf.fours;
                    stats.sixes += batPerf.sixes;
                    stats.average = stats.dismissals > 0 ? parseFloat((stats.runs / stats.dismissals).toFixed(2)) : stats.runs; 
                    stats.strikeRate = stats.ballsFaced > 0 ? parseFloat(((stats.runs / stats.ballsFaced) * 100).toFixed(2)) : 0; 

                    // Aggregate phase stats safely
                    if (!stats.phaseStats) {
                        stats.phaseStats = {
                            batting: {
                                pp: { runs: 0, balls: 0, dismissals: 0 },
                                mo: { runs: 0, balls: 0, dismissals: 0 },
                                do: { runs: 0, balls: 0, dismissals: 0 }
                            },
                            bowling: {
                                pp: { wickets: 0, runsConceded: 0, ballsBowled: 0 },
                                mo: { wickets: 0, runsConceded: 0, ballsBowled: 0 },
                                do: { wickets: 0, runsConceded: 0, ballsBowled: 0 }
                            }
                        };
                    }
                    stats.phaseStats.batting.pp.runs += batPerf.ppRuns || 0;
                    stats.phaseStats.batting.pp.balls += batPerf.ppBalls || 0;
                    stats.phaseStats.batting.pp.dismissals += batPerf.ppDismissals || 0;
                    stats.phaseStats.batting.mo.runs += batPerf.moRuns || 0;
                    stats.phaseStats.batting.mo.balls += batPerf.moBalls || 0;
                    stats.phaseStats.batting.mo.dismissals += batPerf.moDismissals || 0;
                    stats.phaseStats.batting.do.runs += batPerf.doRuns || 0;
                    stats.phaseStats.batting.do.balls += batPerf.doBalls || 0;
                    stats.phaseStats.batting.do.dismissals += batPerf.doDismissals || 0;

                    // Aggregate position stats safely
                    if (!stats.positionStats) {
                        stats.positionStats = {};
                        for (let pos = 1; pos <= 11; pos++) {
                            stats.positionStats[pos] = { innings: 0, runs: 0, balls: 0, dismissals: 0, thirties: 0, fifties: 0, hundreds: 0 };
                        }
                    }
                    const pos = batPerf.battingPosition || 1;
                    if (stats.positionStats[pos]) {
                        stats.positionStats[pos].innings += 1;
                        stats.positionStats[pos].runs += batPerf.runs;
                        stats.positionStats[pos].balls += batPerf.balls;
                        if (batPerf.isOut) stats.positionStats[pos].dismissals += 1;
                        if (batPerf.runs >= 100) stats.positionStats[pos].hundreds += 1;
                        else if (batPerf.runs >= 50) stats.positionStats[pos].fifties += 1;
                        else if (batPerf.runs >= 30) stats.positionStats[pos].thirties += 1;
                    }
                }
            }
            for (const bowlPerf of inning.bowling) { 
                const player = newGameData.allPlayers.find(p => p.id === bowlPerf.playerId); if (!player) continue; 
                if (!player.stats) player.stats = {} as any;
                if (!player.stats[format]) player.stats[format] = generateSingleFormatInitialStats();
                if (!player.internationalStats) player.internationalStats = { 'Test': generateSingleFormatInitialStats(), 'ODI': generateSingleFormatInitialStats(), 'T20i': generateSingleFormatInitialStats() };
                if (!player.internationalStats[intlFormatKey]) player.internationalStats[intlFormatKey] = generateSingleFormatInitialStats();
                if (!player.domesticStats) player.domesticStats = { 'T20': generateSingleFormatInitialStats(), 'List A': generateSingleFormatInitialStats(), 'FC': generateSingleFormatInitialStats() };
                if (!player.domesticStats[domFormatKey]) player.domesticStats[domFormatKey] = generateSingleFormatInitialStats();

                const targetStatContainers = [player.stats[format], player.internationalStats[intlFormatKey], player.domesticStats[domFormatKey]];

                for (const stats of targetStatContainers) {
                    stats.inningsBowling += (bowlPerf.ballsBowled > 0 ? 1 : 0);
                    stats.wickets += bowlPerf.wickets;
                    stats.runsConceded += bowlPerf.runsConceded;
                    stats.ballsBowled += bowlPerf.ballsBowled;
                    stats.bowlingAverage = stats.wickets > 0 ? parseFloat((stats.runsConceded / stats.wickets).toFixed(2)) : stats.runsConceded; 
                    stats.economy = stats.ballsBowled > 0 ? parseFloat(((stats.runsConceded / stats.ballsBowled) * 6).toFixed(2)) : 0; 
                    if (bowlPerf.wickets > stats.bestBowlingWickets || (bowlPerf.wickets === stats.bestBowlingWickets && bowlPerf.runsConceded < stats.bestBowlingRuns)) { 
                        stats.bestBowlingWickets = bowlPerf.wickets;
                        stats.bestBowlingRuns = bowlPerf.runsConceded;
                        stats.bestBowling = `${bowlPerf.wickets}/${bowlPerf.runsConceded}`; 
                    } 
                    if (bowlPerf.wickets >= 5) stats.fiveWicketHauls++;
                    else if (bowlPerf.wickets >= 3) stats.threeWicketHauls++; 

                    // Aggregate bowling phase stats safely
                    if (!stats.phaseStats) {
                        stats.phaseStats = {
                            batting: {
                                pp: { runs: 0, balls: 0, dismissals: 0 },
                                mo: { runs: 0, balls: 0, dismissals: 0 },
                                do: { runs: 0, balls: 0, dismissals: 0 }
                            },
                            bowling: {
                                pp: { wickets: 0, runsConceded: 0, ballsBowled: 0 },
                                mo: { wickets: 0, runsConceded: 0, ballsBowled: 0 },
                                do: { wickets: 0, runsConceded: 0, ballsBowled: 0 }
                            }
                        };
                    }
                    stats.phaseStats.bowling.pp.wickets += bowlPerf.ppWickets || 0;
                    stats.phaseStats.bowling.pp.runsConceded += bowlPerf.ppRunsConceded || 0;
                    stats.phaseStats.bowling.pp.ballsBowled += bowlPerf.ppBallsBowled || 0;
                    stats.phaseStats.bowling.mo.wickets += bowlPerf.moWickets || 0;
                    stats.phaseStats.bowling.mo.runsConceded += bowlPerf.moRunsConceded || 0;
                    stats.phaseStats.bowling.mo.ballsBowled += bowlPerf.moBallsBowled || 0;
                    stats.phaseStats.bowling.do.wickets += bowlPerf.doWickets || 0;
                    stats.phaseStats.bowling.do.runsConceded += bowlPerf.doRunsConceded || 0;
                    stats.phaseStats.bowling.do.ballsBowled += bowlPerf.doBallsBowled || 0;
                }
            }
        }
        const motmPlayer = newGameData.allPlayers.find(p => p.id === result.manOfTheMatch.playerId); 
        if (motmPlayer) { 
            if (!motmPlayer.stats) motmPlayer.stats = {} as any;
            if (!motmPlayer.stats[format]) motmPlayer.stats[format] = generateSingleFormatInitialStats();
            motmPlayer.stats[format].manOfTheMatchAwards++;
            if (motmPlayer.internationalStats?.[intlFormatKey]) {
                motmPlayer.internationalStats[intlFormatKey].manOfTheMatchAwards++;
            }
        }
        
        // Record match-by-match performance history for participating players
        const updatedPlayerIds = new Set<string>();
        for (const inning of allInnings) {
            for (const batPerf of inning.batting) updatedPlayerIds.add(batPerf.playerId);
            for (const bowlPerf of inning.bowling) updatedPlayerIds.add(bowlPerf.playerId);
        }
        for (const pId of updatedPlayerIds) {
            const player = newGameData.allPlayers.find(p => p.id === pId);
            if (!player) continue;
            if (!player.performanceHistory) player.performanceHistory = {};
            if (!player.performanceHistory[format]) {
                const baseAvg = player.stats[format]?.average || (player.battingSkill > 0 ? player.battingSkill * 0.5 : 25);
                const baseEcon = player.stats[format]?.economy || (player.role === PlayerRole.FAST_BOWLER || player.role === PlayerRole.SPIN_BOWLER ? 7.2 : 8.5);
                player.performanceHistory[format] = [
                    { matchNumber: "M-4", battingAverage: Number((baseAvg * (0.9 + Math.random() * 0.2)).toFixed(2)), bowlingEconomy: Number((baseEcon * (0.9 + Math.random() * 0.15)).toFixed(2)) },
                    { matchNumber: "M-3", battingAverage: Number((baseAvg * (0.9 + Math.random() * 0.2)).toFixed(2)), bowlingEconomy: Number((baseEcon * (0.9 + Math.random() * 0.15)).toFixed(2)) },
                    { matchNumber: "M-2", battingAverage: Number((baseAvg * (0.9 + Math.random() * 0.2)).toFixed(2)), bowlingEconomy: Number((baseEcon * (0.9 + Math.random() * 0.15)).toFixed(2)) },
                    { matchNumber: "M-1", battingAverage: Number((baseAvg * (0.9 + Math.random() * 0.2)).toFixed(2)), bowlingEconomy: Number((baseEcon * (0.9 + Math.random() * 0.15)).toFixed(2)) }
                ];
            }
            const currentHistory = player.performanceHistory[format] || [];
            player.performanceHistory[format] = [
                ...currentHistory,
                {
                    matchNumber: `M-${currentHistory.length + 1}`,
                    battingAverage: Number((player.stats[format]?.average || 0).toFixed(2)),
                    bowlingEconomy: Number((player.stats[format]?.economy || 0).toFixed(2))
                }
            ];
        }

        // Sync local teams.squad with new stats & history from allPlayers
        newGameData.teams.forEach(t => {
            t.squad = t.squad.map(sp => {
                const updatedPlayer = newGameData.allPlayers.find(ap => ap.id === sp.id);
                return updatedPlayer ? JSON.parse(JSON.stringify(updatedPlayer)) : sp;
            });
        });

        if (!newGameData.standings[format]) {
            newGameData.standings[format] = [];
        }
        if (!newGameData.matchResults[format]) {
            newGameData.matchResults[format] = [];
        }

        newGameData.standings[format].forEach(s => {
            if (s.teamId === result.firstInning.teamId || s.teamId === result.secondInning.teamId) {
                s.played++; if (result.winnerId === s.teamId) s.won++, s.points += format.includes('First-Class') ? 4 : 2;
                else if (!result.winnerId) s.points += 1; else s.lost++;
            }
        });
        newGameData.standings[format].sort((a, b) => b.points - a.points); 
        newGameData.matchResults[format].push(result); 

        // Update dynamic ICC Team and Player Rankings
        try {
            const updatedRankings = updateRankingsAfterMatch(newGameData, result, format);
            if (updatedRankings) {
                newGameData.rankings = updatedRankings;
            }
        } catch (e) {
            console.error("Error updating rankings after match:", e);
        } 

        // Evaluate Dynamic News Engine based on actual match records and milestones
        try {
            const { newArticles, updatedRegisteredMilestones } = evaluateDynamicNews(newGameData, result, format);
            if (!newGameData.news) newGameData.news = [];
            if (newArticles.length > 0) {
                newGameData.news = [...newArticles, ...newGameData.news];
            }
            newGameData.registeredMilestones = updatedRegisteredMilestones;
        } catch (e) {
            console.error("Error generating dynamic news:", e);
        }

        // Advance Game Date based on format and duration
        try {
            const daysToAdvance = getMatchDurationDays(format, result);
            const currentDate = newGameData.gameDate || { year: newGameData.currentSeason || 1, month: 1, day: 1 };
            const { newDate } = advanceGameDate(currentDate, daysToAdvance);
            newGameData.gameDate = newDate;

            // Update series statuses if any match belonged to a series
            if (newGameData.seriesList && newGameData.seriesList.length > 0) {
                newGameData.seriesList = newGameData.seriesList.map(s => {
                    if (isDateBefore(s.endDate, newDate)) {
                        return { ...s, status: 'completed' as const };
                    } else if (!isDateBefore(newDate, s.startDate)) {
                        return { ...s, status: 'live' as const };
                    }
                    return s;
                });
            }
        } catch (e) {
            console.error("Error advancing game date:", e);
        }

        return newGameData;
    }, []);

    return { runSimulationForCurrentFormat, updateStatsFromMatch };
}

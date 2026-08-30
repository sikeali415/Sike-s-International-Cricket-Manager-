import { 
    GameData, 
    MatchResult, 
    Format, 
    NewsArticle, 
    Inning, 
    Player, 
    Team 
} from '../types';
import { 
    getAllEnrichedMatches, 
    calculatePlayerVsTeamRecords, 
    calculateTeamHeadToHead,
    calculateTeamRecords 
} from './advancedStatsUtils';

/**
 * Generates dynamic news articles strictly from actual database matches and state
 */
export const evaluateDynamicNews = (
    gameData: GameData, 
    latestResult?: MatchResult, 
    format?: Format
): { newArticles: NewsArticle[]; updatedRegisteredMilestones: string[] } => {
    const existingMilestones = new Set<string>(gameData.registeredMilestones || []);
    const articles: NewsArticle[] = [];
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const currentFormat = format || gameData.currentFormat || Format.T20;
    const currentSeason = gameData.currentSeason || 1;

    // Helper to add deduplicated milestone
    const pushMilestoneArticle = (key: string, article: NewsArticle) => {
        if (!existingMilestones.has(key)) {
            existingMilestones.add(key);
            article.milestoneKey = key;
            articles.push(article);
        }
    };

    // 1. MATCH-SPECIFIC DYNAMIC NEWS
    if (latestResult) {
        const teamAId = latestResult.firstInning?.teamId;
        const teamAName = latestResult.firstInning?.teamName || 'Team A';
        const teamBId = latestResult.secondInning?.teamId;
        const teamBName = latestResult.secondInning?.teamName || 'Team B';

        const winnerId = latestResult.winnerId;
        const winnerTeam = gameData.teams.find(t => t.id === winnerId);
        const winnerName = winnerTeam?.name || (winnerId === teamAId ? teamAName : teamBName);
        const loserName = winnerId === teamAId ? teamBName : teamAName;

        // Century or 5-Wicket Haul in this match
        const innings = [latestResult.firstInning, latestResult.secondInning, latestResult.thirdInning, latestResult.fourthInning].filter(Boolean) as Inning[];
        for (const inn of innings) {
            for (const bat of inn.batting) {
                if (bat.runs >= 100) {
                    const mKey = `match_century_${bat.playerId}_${latestResult.matchNumber}_s${currentSeason}`;
                    pushMilestoneArticle(mKey, {
                        id: `news_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                        headline: `CENTURY MASTERCLASS: ${bat.playerName.toUpperCase()} SCORES ${bat.runs}*`,
                        date: dateStr,
                        excerpt: `${bat.playerName} played a blistering knock of ${bat.runs} off ${bat.balls} balls against ${inn.teamId === teamAId ? teamBName : teamAName}.`,
                        content: `In an extraordinary display of batting dominance, ${bat.playerName} reached three figures with ${bat.runs} runs including ${bat.fours || 0} boundaries and ${bat.sixes || 0} sixes. His innings was pivotal for ${inn.teamName || 'his side'}.`,
                        type: 'milestone',
                        priority: 'major',
                        category: 'Player Impact',
                        relatedPlayerId: bat.playerId,
                        relatedPlayerName: bat.playerName,
                        relatedTeamId: inn.teamId,
                        relatedTeamName: inn.teamName
                    });
                } else if (bat.runs >= 50 && bat.runs < 100) {
                    const mKey = `match_fifty_${bat.playerId}_${latestResult.matchNumber}_s${currentSeason}`;
                    pushMilestoneArticle(mKey, {
                        id: `news_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                        headline: `${bat.playerName.toUpperCase()} LEADS CHARGE WITH CRUCIAL ${bat.runs}`,
                        date: dateStr,
                        excerpt: `${bat.playerName} scored a vital ${bat.runs} runs off ${bat.balls} deliveries.`,
                        content: `${bat.playerName}'s composed half-century (${bat.runs} runs, ${bat.balls} balls, ${bat.fours || 0}x4, ${bat.sixes || 0}x6) proved decisive in match ${latestResult.matchNumber}.`,
                        type: 'performance',
                        priority: 'normal',
                        category: 'Player Impact',
                        relatedPlayerId: bat.playerId,
                        relatedPlayerName: bat.playerName,
                        relatedTeamId: inn.teamId,
                        relatedTeamName: inn.teamName
                    });
                }
            }

            for (const bowl of inn.bowling) {
                if (bowl.wickets >= 5) {
                    const mKey = `match_fivewkt_${bowl.playerId}_${latestResult.matchNumber}_s${currentSeason}`;
                    pushMilestoneArticle(mKey, {
                        id: `news_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                        headline: `HISTORIC 5-WICKET HAUL: ${bowl.playerName.toUpperCase()} DESTROYS BATTING LINEUP`,
                        date: dateStr,
                        excerpt: `${bowl.playerName} claimed spectacular figures of ${bowl.wickets}/${bowl.runsConceded} in a match-winning spell.`,
                        content: `A devastating bowling exhibition by ${bowl.playerName} produced match-defining figures of ${bowl.wickets} wickets for ${bowl.runsConceded} runs in ${bowl.overs} overs, tearing through the opposition top and middle order.`,
                        type: 'record',
                        priority: 'major',
                        category: 'Record Breaker',
                        relatedPlayerId: bowl.playerId,
                        relatedPlayerName: bowl.playerName
                    });
                }
            }
        }

        // Head to Head rivalry check
        if (teamAId && teamBId) {
            const h2h = calculateTeamHeadToHead(teamAId, teamBId, gameData);
            if (h2h.currentWinningStreak.count >= 3) {
                const streakTeam = h2h.currentWinningStreak.teamName;
                const losingTeam = streakTeam === teamAName ? teamBName : teamAName;
                const h2hKey = `h2h_streak_${streakTeam}_vs_${losingTeam}_count_${h2h.currentWinningStreak.count}`;
                pushMilestoneArticle(h2hKey, {
                    id: `news_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    headline: `${streakTeam.toUpperCase()} DOMINATE ${losingTeam.toUpperCase()}`,
                    date: dateStr,
                    excerpt: `${streakTeam} have now won ${h2h.currentWinningStreak.count} consecutive matches against ${losingTeam}.`,
                    content: `The rivalry between ${streakTeam} and ${losingTeam} continues to be one-sided as ${streakTeam} extended their winning streak to ${h2h.currentWinningStreak.count} straight victories. Overall head-to-head stands at ${h2h.winsA} wins to ${h2h.winsB}.`,
                    type: 'h2h',
                    priority: 'important',
                    category: 'Head-to-Head',
                    relatedTeamName: streakTeam
                });
            }
        }
    }

    // 2. TEAM PERFORMANCE & STREAKS (From Standings & Results)
    for (const team of gameData.teams) {
        const teamRecords = calculateTeamRecords(team.id, gameData);
        const teamMatches = getAllEnrichedMatches(gameData, { teamId: team.id });
        
        // Calculate recent form (last 5 matches)
        const recentMatches = teamMatches.slice(-5);
        const recentWins = recentMatches.filter(m => m.matchResult.winnerId === team.id).length;

        if (recentMatches.length >= 4 && recentWins >= 4) {
            const streakKey = `team_run_${team.id}_s${currentSeason}_recent_${recentWins}`;
            pushMilestoneArticle(streakKey, {
                id: `news_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                headline: `${team.name.toUpperCase()} ARE FLYING THIS SEASON`,
                date: dateStr,
                excerpt: `${team.name} have won ${recentWins} of their last ${recentMatches.length} matches and are in scintillating form.`,
                content: `${team.name}'s championship momentum is reaching its peak. With ${recentWins} victories in their last ${recentMatches.length} outings, the squad has established dominance across both batting and bowling departments.`,
                type: 'performance',
                priority: 'important',
                category: 'Team Performance',
                relatedTeamId: team.id,
                relatedTeamName: team.name
            });
        }

        // Dominant bowling attack check
        const totalWktsThisSeason = teamRecords.bowling.mostWicketsInASeason.wickets;
        if (totalWktsThisSeason >= 30) {
            const bowlKey = `team_bowling_dom_${team.id}_s${currentSeason}_${Math.floor(totalWktsThisSeason / 10) * 10}`;
            pushMilestoneArticle(bowlKey, {
                id: `news_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                headline: `WHY ${team.name.toUpperCase()} ARE DOMINATING`,
                date: dateStr,
                excerpt: `${team.name}'s recent success has been driven by their bowling attack, which has taken ${totalWktsThisSeason} wickets this season.`,
                content: `Tactical discipline and relentless wicket-taking have powered ${team.name}. Their bowling unit has amassed ${totalWktsThisSeason} wickets this campaign, consistently restricting opponents to below-par scores.`,
                type: 'performance',
                priority: 'important',
                category: 'Team Performance',
                relatedTeamId: team.id,
                relatedTeamName: team.name
            });
        }
    }

    // 3. PLAYER MILESTONES & CAREER MARKS
    for (const player of gameData.allPlayers) {
        const stats = player.stats?.[currentFormat];
        if (!stats) continue;

        const totalCareerRuns = Object.values(player.stats || {}).reduce((sum, s) => sum + (s.runs || 0), 0);
        const totalCareerWkts = Object.values(player.stats || {}).reduce((sum, s) => sum + (s.wickets || 0), 0);
        const totalCareerMatches = Object.values(player.stats || {}).reduce((sum, s) => sum + (s.matches || 0), 0);

        // Runs Milestones: 500, 1000, 2000, 5000
        const runThresholds = [500, 1000, 2000, 5000];
        for (const thresh of runThresholds) {
            if (totalCareerRuns >= thresh) {
                const rKey = `milestone_runs_${player.id}_${thresh}`;
                pushMilestoneArticle(rKey, {
                    id: `news_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    headline: `CAREER MILESTONE: ${player.name.toUpperCase()} CROSSES ${thresh} RUNS`,
                    date: dateStr,
                    excerpt: `${player.name} has entered an elite club by surpassing ${thresh} career runs.`,
                    content: `A monumental milestone for ${player.name}, who has accumulated ${totalCareerRuns} career runs across all formats. His consistency and tactical game management have solidified his status as a premier batsman.`,
                    type: 'milestone',
                    priority: 'major',
                    category: 'Career Milestone',
                    relatedPlayerId: player.id,
                    relatedPlayerName: player.name
                });
            }
        }

        // Wickets Milestones: 25, 50, 100, 200
        const wktThresholds = [25, 50, 100, 200];
        for (const thresh of wktThresholds) {
            if (totalCareerWkts >= thresh) {
                const wKey = `milestone_wkts_${player.id}_${thresh}`;
                pushMilestoneArticle(wKey, {
                    id: `news_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    headline: `BOWLING MILESTONE: ${player.name.toUpperCase()} REACHES ${thresh} WICKETS`,
                    date: dateStr,
                    excerpt: `${player.name} has taken his ${thresh}th career wicket in professional competition.`,
                    content: `${player.name} continues his exceptional career with ${totalCareerWkts} wickets in the database. His variations and accuracy make him a constant threat to opposition batters.`,
                    type: 'milestone',
                    priority: 'major',
                    category: 'Career Milestone',
                    relatedPlayerId: player.id,
                    relatedPlayerName: player.name
                });
            }
        }

        // Matches Milestones: 25, 50, 100
        const matchThresholds = [25, 50, 100];
        for (const thresh of matchThresholds) {
            if (totalCareerMatches >= thresh) {
                const mKey = `milestone_matches_${player.id}_${thresh}`;
                pushMilestoneArticle(mKey, {
                    id: `news_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    headline: `VETERAN STATUS: ${player.name.toUpperCase()} MAKES ${thresh}TH APPEARANCE`,
                    date: dateStr,
                    excerpt: `${player.name} has reached ${thresh} career appearances.`,
                    content: `Durability, skill, and consistency: ${player.name} has now featured in ${totalCareerMatches} career matches, playing an integral role across multiple franchise seasons.`,
                    type: 'milestone',
                    priority: 'important',
                    category: 'Career Milestone',
                    relatedPlayerId: player.id,
                    relatedPlayerName: player.name
                });
            }
        }

        // Season Leader / Impact News
        if (stats.runs >= 250) {
            const leadKey = `impact_batter_${player.id}_s${currentSeason}_${Math.floor(stats.runs / 100) * 100}`;
            const playerTeam = gameData.teams.find(t => t.squad.some(p => p.id === player.id));
            pushMilestoneArticle(leadKey, {
                id: `news_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                headline: `${player.name.toUpperCase()} LEADING THE ${playerTeam?.name.toUpperCase() || 'FRANCHISE'} CHARGE`,
                date: dateStr,
                excerpt: `${player.name} has scored ${stats.runs} runs this season and has been one of the main reasons behind the team's campaign.`,
                content: `With ${stats.runs} runs at an average of ${stats.average.toFixed(1)} and strike rate of ${stats.strikeRate.toFixed(1)}, ${player.name} has consistently produced match-winning innings when his team needed it most.`,
                type: 'performance',
                priority: 'important',
                category: 'Player Impact',
                relatedPlayerId: player.id,
                relatedPlayerName: player.name,
                relatedTeamId: playerTeam?.id,
                relatedTeamName: playerTeam?.name
            });
        }

        if (stats.wickets >= 12) {
            const bowlLeadKey = `impact_bowler_${player.id}_s${currentSeason}_${stats.wickets}`;
            const playerTeam = gameData.teams.find(t => t.squad.some(p => p.id === player.id));
            pushMilestoneArticle(bowlLeadKey, {
                id: `news_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                headline: `${player.name.toUpperCase()} LEADS THE ATTACK`,
                date: dateStr,
                excerpt: `${player.name} has taken ${stats.wickets} wickets this season and leads the team's bowling charts.`,
                content: `${player.name} has been the spearhead of the bowling attack, claiming ${stats.wickets} wickets with best figures of ${stats.bestBowling} and an economy of ${stats.economy.toFixed(2)}.`,
                type: 'performance',
                priority: 'important',
                category: 'Player Impact',
                relatedPlayerId: player.id,
                relatedPlayerName: player.name,
                relatedTeamId: playerTeam?.id,
                relatedTeamName: playerTeam?.name
            });
        }

        // Form watch news
        if (player.performanceHistory?.[currentFormat] && player.performanceHistory[currentFormat].length >= 3) {
            const hist = player.performanceHistory[currentFormat].slice(-3);
            const recentAvgs = hist.map(h => h.battingAverage);
            const isRedHot = recentAvgs.every(a => a >= 35);
            const isStruggling = recentAvgs.every(a => a < 15);

            if (isRedHot) {
                const hotKey = `form_hot_${player.id}_s${currentSeason}_${hist.length}`;
                pushMilestoneArticle(hotKey, {
                    id: `news_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    headline: `${player.name.toUpperCase()} IN RED-HOT FORM`,
                    date: dateStr,
                    excerpt: `${player.name} has maintained an average over 35.0 across his last 3 matches.`,
                    content: `Opposition bowlers are finding it nearly impossible to dislodge ${player.name}, who is striking the ball cleanly and anchoring his team's batting order with supreme confidence.`,
                    type: 'form',
                    priority: 'important',
                    category: 'Form Watch',
                    relatedPlayerId: player.id,
                    relatedPlayerName: player.name
                });
            } else if (isStruggling && player.battingSkill >= 65) {
                const coldKey = `form_cold_${player.id}_s${currentSeason}_${hist.length}`;
                pushMilestoneArticle(coldKey, {
                    id: `news_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    headline: `${player.name.toUpperCase()} SEARCHING FOR FORM`,
                    date: dateStr,
                    excerpt: `${player.name} has struggled in recent outings after previously producing strong performances.`,
                    content: `Team management remains supportive of star player ${player.name} despite a dip in recent scores. Tactical adjustments in shot selection and patience at the crease will be crucial in upcoming fixtures.`,
                    type: 'form',
                    priority: 'normal',
                    category: 'Form Watch',
                    relatedPlayerId: player.id,
                    relatedPlayerName: player.name
                });
            }
        }

        // Opponent favourite check
        const vsTeams = calculatePlayerVsTeamRecords(player.id, gameData);
        for (const vs of vsTeams) {
            if (vs.batting.runs >= 200 && vs.batting.average >= 40) {
                const favKey = `vs_favourite_${player.id}_vs_${vs.vsTeamId}`;
                pushMilestoneArticle(favKey, {
                    id: `news_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    headline: `${player.name.toUpperCase()} LOVES PLAYING ${vs.vsTeamName.toUpperCase()}`,
                    date: dateStr,
                    excerpt: `${player.name} has scored ${vs.batting.runs} runs against ${vs.vsTeamName} with an average of ${vs.batting.average.toFixed(1)}.`,
                    content: `${vs.vsTeamName} will need special tactical planning for ${player.name}, who boasts ${vs.batting.runs} runs (HS ${vs.batting.highestScore}) and ${vs.batting.fifties} fifties in head-to-head fixtures against them.`,
                    type: 'h2h',
                    priority: 'important',
                    category: 'Head-to-Head',
                    relatedPlayerId: player.id,
                    relatedPlayerName: player.name,
                    relatedTeamId: vs.vsTeamId,
                    relatedTeamName: vs.vsTeamName
                });
            }
        }
    }

    return {
        newArticles: articles,
        updatedRegisteredMilestones: Array.from(existingMilestones)
    };
};

/**
 * Generates dynamic squad announcement news articles highlighting captain, incomers, and dropped players
 */
export const generateSquadAnnouncementNews = (
    team: Team,
    opponentName: string,
    selected15: Player[],
    droppedPlayers: Player[],
    captain: Player,
    format: Format,
    isUserTeam: boolean = false
): NewsArticle => {
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const captainName = captain?.name || team.squad[0]?.name || 'Captain';

    // Pick 1-2 prominent incomers/stars in the 15
    const topPicks = [...selected15].sort((a, b) => (b.battingSkill + b.secondarySkill) - (a.battingSkill + a.secondarySkill));
    const starIncomer = topPicks[0]?.name;
    const secondIncomer = topPicks[1]?.name;

    // Pick prominent dropped players if any
    const prominentDropped = droppedPlayers.length > 0
        ? droppedPlayers.slice(0, 2).map(p => p.name).join(' & ')
        : null;

    let headline = `${team.name.toUpperCase()} CONFIRM 15-MAN SQUAD: ${captainName.toUpperCase()} TO LEAD`;
    if (prominentDropped) {
        headline = `${team.name.toUpperCase()} SQUAD: ${starIncomer || captainName} IN, ${prominentDropped} LEFT OUT`;
    }

    let excerpt = `${team.name} selectors have officially named their 15-member match squad ahead of their upcoming ${format} fixture against ${opponentName}. ${captainName} has been confirmed as captain.`;
    if (prominentDropped) {
        excerpt += ` Notable omissions include ${prominentDropped}.`;
    }

    const squadNames = selected15.map(p => p.name).join(', ');
    let content = `In an official announcement from the selection committee, ${team.name} have confirmed their 15-man squad for the upcoming clash against ${opponentName}.\n\n`;
    content += `Leadership: ${captainName} will lead the side as Team Captain.\n\n`;
    content += `15-Player Squad: ${squadNames}.\n\n`;

    if (prominentDropped) {
        content += `Key Omissions: Selectors noted that players left out (${prominentDropped}) remain vital squad members for rotation across the grueling international calendar.`;
    } else {
        content += `Team management expressed full confidence in this 15-man touring party to execute their tactical plans on match day.`;
    }

    return {
        id: `squad_announcement_${team.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        headline,
        date: dateStr,
        excerpt,
        content,
        type: 'squad' as any,
        priority: isUserTeam ? 'major' : 'normal',
        category: 'Tournament & Draft',
        relatedTeamId: team.id,
        relatedTeamName: team.name,
        relatedPlayerId: captain?.id,
        relatedPlayerName: captainName
    };
};


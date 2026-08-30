
import { GoogleGenAI } from "@google/genai";
import { MatchResult, GameData, Message, PlayerRole, Player, Format, SikePost } from './types';
import { INITIAL_SPONSORSHIPS } from './data';

const GEMINI_MODEL = 'gemini-3-flash-preview';

let ai: GoogleGenAI;

function getAi() {
    if (!ai) {
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    }
    return ai;
}

const getSystemInstruction = (gameData: GameData) => {
    const userTeam = gameData.teams.find(t => t.id === gameData.userTeamId);
    const currentFormat = gameData.currentFormat;
    const currentSeason = gameData.currentSeason;

    // Extract in-game player database summary with stats across current format & career
    const allInGamePlayers = gameData.allPlayers.map(p => {
        const team = gameData.teams.find(t => t.squad.some(sp => sp.id === p.id));
        const currentStats = p.stats[currentFormat] || { runs: 0, wickets: 0, average: 0, strikeRate: 0, economy: 0, matches: 0, highestScore: 0, hundreds: 0, fifties: 0, bestBowling: '0/0' };
        
        let totalRuns = 0;
        let totalWickets = 0;
        Object.values(p.stats).forEach(st => {
            totalRuns += (st?.runs || 0);
            totalWickets += (st?.wickets || 0);
        });

        const injuryInfo = p.injury ? ` [INJURED: ${p.injury.text}, ${p.injury.durationValue} ${p.injury.durationType} remaining]` : '';

        return `- ${p.name} (${p.role}, Team: ${team?.name || 'Free Agent'}, BatSkill: ${p.battingSkill}, BowlSkill: ${p.secondarySkill}, Foreign: ${p.isForeign ? 'Yes' : 'No'}, Style: ${p.style})${injuryInfo} | ${currentFormat}: ${currentStats.runs} runs (Avg: ${(currentStats.average || 0).toFixed(1)}, SR: ${(currentStats.strikeRate || 0).toFixed(1)}, HS: ${currentStats.highestScore || 0}, 100s: ${currentStats.hundreds || 0}, 50s: ${currentStats.fifties || 0}), ${currentStats.wickets} wkts (Econ: ${(currentStats.economy || 0).toFixed(2)}, Best: ${currentStats.bestBowling || 'N/A'}) | Career Overall: ${totalRuns} runs, ${totalWickets} wkts`;
    }).join('\n');

    // Extract Standings Table
    const currentStandings = (gameData.standings[currentFormat] || []).map((s, idx) => 
        `#${idx+1} ${s.teamName} - Played: ${s.played}, Won: ${s.won}, Lost: ${s.lost}, Drawn: ${s.drawn}, Points: ${s.points}, NRR: ${s.netRunRate >= 0 ? '+' : ''}${s.netRunRate.toFixed(3)}`
    ).join('\n');

    // Extract Top Run Scorers
    const sortedRunScorers = [...gameData.allPlayers]
        .sort((a,b) => (b.stats[currentFormat]?.runs || 0) - (a.stats[currentFormat]?.runs || 0))
        .slice(0, 5)
        .map((p, i) => {
            const st = p.stats[currentFormat];
            const team = gameData.teams.find(t => t.squad.some(sp => sp.id === p.id));
            return `${i+1}. ${p.name} (${team?.name || 'Free Agent'}) - ${st?.runs || 0} runs (Avg: ${(st?.average || 0).toFixed(1)}, SR: ${(st?.strikeRate || 0).toFixed(1)}, HS: ${st?.highestScore || 0})`;
        }).join('\n');

    // Extract Top Wicket Takers
    const sortedWicketTakers = [...gameData.allPlayers]
        .sort((a,b) => (b.stats[currentFormat]?.wickets || 0) - (a.stats[currentFormat]?.wickets || 0))
        .slice(0, 5)
        .map((p, i) => {
            const st = p.stats[currentFormat];
            const team = gameData.teams.find(t => t.squad.some(sp => sp.id === p.id));
            return `${i+1}. ${p.name} (${team?.name || 'Free Agent'}) - ${st?.wickets || 0} wickets (Econ: ${(st?.economy || 0).toFixed(2)}, Best: ${st?.bestBowling || 'N/A'})`;
        }).join('\n');

    // Recent Match Results
    const recentResults = (gameData.matchResults[currentFormat] || []).slice(-5).map(r => 
        `- Match ${r.matchNumber}: ${r.summary} (MOTM: ${r.manOfTheMatch?.playerName || 'N/A'})`
    ).join('\n');

    return `
    You are "Signify", an expert AI cricket manager assistant for '${userTeam?.name}'.
    
    **CRITICAL IN-GAME DATABASE & STATS DIRECTIVE:**
    - You have FULL, REAL-TIME access to all live in-game player statistics, league standings, tournament top performers, match results, and squad rosters provided below.
    - You MUST ONLY refer to, discuss, and recommend IN-GAME players listed in the IN-GAME PLAYER DATABASE below.
    - DO NOT introduce, mention, or recommend real-world famous players UNLESS they explicitly exist in the in-game database below.
    - When asked about player performance, statistics, averages, strike rates, top run scorers, top wicket takers, points table, or match results, ALWAYS answer accurately using the real data below.

    **League Rules You Must Enforce & Advise On:**
    1. **Squad Composition:** Teams can have up to 3 foreign players in their squad.
    2. **Playing XI:** Up to 2 foreign players are allowed in the starting XI for any match.
    3. **Season Transition:** At the end of each season, managers can retain up to 5 players. Retaining a player costs their market value + a 1 Crore premium. 
    4. **Weather & DLS Method:**
       - Rainy weather affects 6-8 T20 matches and 5-7 ODI matches each season.
       - T20 games require a MINIMUM of 5 overs per side to apply the DLS method.
       - ODI games require a MINIMUM of 23 overs per side to apply the DLS method.
       - If persistent rain curtails overs below these thresholds, the match is ABANDONED and 1 point is awarded to each team.
    
    **Current Context:**
    - Season: ${currentSeason} | Format: ${currentFormat}
    - User Team: ${userTeam?.name} (Purse: ₹${(userTeam?.purse || 0).toFixed(1)} Cr)
    - Squad Size: ${userTeam?.squad.length} / 22
    - Foreign Players in Squad: ${userTeam?.squad.filter(p => p.isForeign).length} / 3 (Max 2 in Playing XI)
    
    **LEAGUE STANDINGS (${currentFormat}):**
    ${currentStandings || 'No standings available yet.'}

    **TOP 5 RUN SCORERS (${currentFormat}):**
    ${sortedRunScorers || 'No run data yet.'}

    **TOP 5 WICKET TAKERS (${currentFormat}):**
    ${sortedWicketTakers || 'No wicket data yet.'}

    **RECENT MATCH RESULTS (${currentFormat}):**
    ${recentResults || 'No completed matches yet.'}

    **IN-GAME PLAYER DATABASE & INDIVIDUAL STATS:**
    ${allInGamePlayers}
    
    **Guidelines:**
    - Always refer to yourself as "Signify".
    - Be analytical, concise, and helpful. Use clear formatting or bullet points when listing stats or player recommendations.
    - For auction, transfer, or lineup advice, analyze player skills, role gaps, and current stats directly from the database above.
    `;
};

export async function* streamAssistantResponse(
    prompt: string,
    history: Message[],
    gameData: GameData
): AsyncGenerator<string> {
    const ai = getAi();
    const systemInstruction = getSystemInstruction(gameData);
    const contents = history.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
    }));
    contents.push({ role: 'user', parts: [{ text: prompt }] });

    try {
        const result = await ai.models.generateContentStream({
            model: GEMINI_MODEL,
            contents,
            config: { systemInstruction }
        });
        for await (const chunk of result) {
            if (chunk.text) yield chunk.text;
        }
    } catch (e) {
        yield "I'm having trouble connecting to the strategy room. Please check your connection.";
    }
}

export const generateMatchAnalysis = async (matchResult: MatchResult): Promise<string> => {
    const ai = getAi();
    const prompt = `Analyze this cricket match scorecard. Highlight turning points and MOTM impact.
    Summary: ${matchResult.summary}
    Man of Match: ${matchResult.manOfTheMatch.playerName}`;

    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: prompt,
        });
        return response.text || "Analysis unavailable.";
    } catch (e) {
        return "Could not generate analysis at this time.";
    }
};

export const generateDetailedMatchSummary = async (matchResult: MatchResult): Promise<string> => {
    const ai = getAi();
    const formatInningDetails = (inn?: any, num?: number) => {
        if (!inn) return "";
        const topBatters = [...inn.batting].sort((a: any, b: any) => b.runs - a.runs).slice(0, 3).map((b: any) => `${b.playerName} ${b.runs}(${b.balls})`).join(', ');
        const topBowlers = [...inn.bowling].sort((a: any, b: any) => b.wickets - a.wickets).slice(0, 2).map((b: any) => `${b.playerName} ${b.wickets}/${b.runsConceded}`).join(', ');
        return `Inning ${num} (${inn.teamName}): ${inn.score}/${inn.wickets} in ${inn.overs} overs. Top Batters: ${topBatters}. Top Bowlers: ${topBowlers}.`;
    };
    
    const prompt = `Write a brief, highly engaging sports reporter summary (about 120-150 words) of this cricket match. Highlight the key batting milestones, pivotal bowling performances, turning points, and the Man of the Match:
    Match Summary: ${matchResult.summary}
    Man of the Match: ${matchResult.manOfTheMatch.playerName} (${matchResult.manOfTheMatch.summary})
    ${formatInningDetails(matchResult.firstInning, 1)}
    ${formatInningDetails(matchResult.secondInning, 2)}`;

    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: prompt,
        });
        return response.text || "Highlights summary unavailable.";
    } catch (e) {
        return "The stadium broadcasters are offline. Standard scorecard analysis remains available.";
    }
};

export const analyzePlayerWithAI = async (player: Player, format: Format, gameData: GameData): Promise<string> => {
    const ai = getAi();
    const systemInstruction = getSystemInstruction(gameData);
    
    const team = gameData.teams.find(t => t.squad.some(sp => sp.id === player.id));
    const stats = player.stats[format] || { runs: 0, wickets: 0, average: 0, strikeRate: 0, economy: 0, matches: 0, highestScore: 0, hundreds: 0, fifties: 0, bestBowling: '0/0' };
    
    let totalRuns = 0;
    let totalWickets = 0;
    Object.values(player.stats).forEach((st: any) => {
        totalRuns += (st?.runs || 0);
        totalWickets += (st?.wickets || 0);
    });

    const prompt = `Provide a comprehensive AI scout analysis for player '${player.name}':
    - Role: ${player.role}, Style: ${player.style}, Team: ${team?.name || 'Free Agent'}
    - Foreign Player: ${player.isForeign ? 'Yes' : 'No'}, Health: ${player.healthStatus || 'Fit'}
    - Batting Skill: ${player.battingSkill}/99, Bowling Skill: ${player.secondarySkill}/99
    - ${format} Stats: Matches: ${stats.matches}, Runs: ${stats.runs}, Avg: ${(stats.average || 0).toFixed(1)}, SR: ${(stats.strikeRate || 0).toFixed(1)}, HS: ${stats.highestScore || 0}, 50s: ${stats.fifties || 0}, 100s: ${stats.hundreds || 0}
    - Bowling Stats (${format}): Wickets: ${stats.wickets}, Econ: ${(stats.economy || 0).toFixed(2)}, Best: ${stats.bestBowling || 'N/A'}
    - Overall Career Totals: ${totalRuns} runs, ${totalWickets} wickets across all formats.

    Instructions:
    1. Evaluate their performance and statistical rating in ${format}.
    2. Outline key strengths, tactical role (e.g. powerplay hitter, middle-order anchor, death bowler), and potential weaknesses.
    3. Give actionable manager advice on ideal batting order / bowling overs usage. Keep it concise, engaging, and structured with clear bullet points.`;

    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: prompt,
            config: { systemInstruction }
        });
        return response.text || "AI Scout Report currently unavailable.";
    } catch (e) {
        return "Could not generate AI player report at this time.";
    }
};

export const comparePlayersWithAI = async (playerA: Player, playerB: Player, format: Format, gameData: GameData): Promise<string> => {
    const ai = getAi();
    const systemInstruction = getSystemInstruction(gameData);
    
    const teamA = gameData.teams.find(t => t.squad.some(sp => sp.id === playerA.id));
    const teamB = gameData.teams.find(t => t.squad.some(sp => sp.id === playerB.id));
    
    const statsA = playerA.stats[format] || { runs: 0, wickets: 0, average: 0, strikeRate: 0, economy: 0, matches: 0, highestScore: 0, hundreds: 0, fifties: 0, bestBowling: '0/0' };
    const statsB = playerB.stats[format] || { runs: 0, wickets: 0, average: 0, strikeRate: 0, economy: 0, matches: 0, highestScore: 0, hundreds: 0, fifties: 0, bestBowling: '0/0' };

    const prompt = `Perform a head-to-head AI player comparison between '${playerA.name}' vs '${playerB.name}' in ${format}:

    Player A: ${playerA.name} (${playerA.role}, ${teamA?.name || 'Free Agent'})
    - Skills: Batting ${playerA.battingSkill}, Bowling ${playerA.secondarySkill}
    - ${format} Stats: Matches: ${statsA.matches}, Runs: ${statsA.runs} (Avg: ${(statsA.average || 0).toFixed(1)}, SR: ${(statsA.strikeRate || 0).toFixed(1)}), Wickets: ${statsA.wickets} (Econ: ${(statsA.economy || 0).toFixed(2)})

    Player B: ${playerB.name} (${playerB.role}, ${teamB?.name || 'Free Agent'})
    - Skills: Batting ${playerB.battingSkill}, Bowling ${playerB.secondarySkill}
    - ${format} Stats: Matches: ${statsB.matches}, Runs: ${statsB.runs} (Avg: ${(statsB.average || 0).toFixed(1)}, SR: ${(statsB.strikeRate || 0).toFixed(1)}), Wickets: ${statsB.wickets} (Econ: ${(statsB.economy || 0).toFixed(2)})

    Instructions:
    1. Compare their statistical productivity, consistency, and skill attributes in ${format}.
    2. Determine who offers greater tactical value in batting, bowling, or match impact.
    3. Conclude with a clear manager recommendation on who to prefer for starting lineups, transfer targets, or auction bids. Keep it formatted with bullet points.`;

    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: prompt,
            config: { systemInstruction }
        });
        return response.text || "Could not generate AI comparison report at this time.";
    } catch (e) {
        return "Could not generate AI comparison report at this time.";
    }
};

export const generateSikeShareGeminiPosts = async (matchResult: MatchResult, gameData: GameData): Promise<SikePost[]> => {
    const ai = getAi();
    const systemInstruction = getSystemInstruction(gameData);

    const winner = gameData.teams.find(t => t.id === matchResult.winnerId)?.name || 'Winner';
    const loser = gameData.teams.find(t => t.id === matchResult.loserId)?.name || 'Opponent';
    const motm = matchResult.manOfTheMatch?.playerName || 'Star Player';

    const prompt = `Generate 3 short social media posts for "Sike Share" (the in-game social media platform like X/Twitter) reacting to Match ${matchResult.matchNumber}: ${matchResult.summary}. Winner: ${winner}, Loser: ${loser}, Player of Match: ${motm}.

Return ONLY a valid JSON array of objects with these exact keys:
[
  {
    "authorName": "Fan or Journalist name",
    "authorHandle": "@handle",
    "authorRole": "fan" or "expert" or "journalist",
    "isVerified": true or false,
    "content": "Short social media post (max 280 chars) with emojis and hashtags like #SikeShare",
    "likes": number (500 to 15000),
    "reposts": number (50 to 3000),
    "replies": number (10 to 500)
  }
]`;

    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: prompt,
            config: { systemInstruction, responseMimeType: 'application/json' }
        });

        if (response.text) {
            const parsed = JSON.parse(response.text);
            if (Array.isArray(parsed)) {
                return parsed.map((item: any, idx: number) => ({
                    id: `post-ai-${Date.now()}-${idx}`,
                    authorName: item.authorName || 'Cricket Voice',
                    authorHandle: item.authorHandle || '@cricket_voice',
                    authorRole: item.authorRole || 'fan',
                    isVerified: !!item.isVerified,
                    content: item.content || 'Great cricket match today!',
                    timestamp: '1m ago',
                    likes: item.likes || Math.floor(Math.random() * 2000) + 500,
                    reposts: item.reposts || Math.floor(Math.random() * 500) + 100,
                    replies: item.replies || Math.floor(Math.random() * 100) + 20
                }));
            }
        }
    } catch (e) {
        console.warn('Gemini Sike Share generation fallback to offline generator.');
    }
    return [];
};


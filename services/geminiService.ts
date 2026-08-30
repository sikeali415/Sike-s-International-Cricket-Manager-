
import { GoogleGenAI, Type } from "@google/genai";
import { Player, Team, LiveMatchState } from "../types";

// Initialize the Google GenAI client using the API key from environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Gets tactical advice for the cricket team using Gemini.
 */
export const getAITacticalAdvice = async (team: Team) => {
  try {
    // Fixed battingRating/bowlingRating to battingSkill/secondarySkill.
    const squadInfo = team.squad.map(p => `${p.name} (${p.role}, Rating: ${p.battingSkill}/${p.secondarySkill})`).join(", ");
    // Generate content using the gemini-3-flash-preview model for strategic analysis.
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      // Removed budget since it does not exist on Team type.
      contents: `Analyze this cricket team and provide tactical advice: ${team.name}. Squad: ${squadInfo}. Provide scouting recommendations, a tactical tip, and a player of the month.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scoutingReport: { type: Type.STRING },
            tacticalTip: { type: Type.STRING },
            playerOfTheMonthSuggestion: { type: Type.STRING }
          },
          required: ["scoutingReport", "tacticalTip", "playerOfTheMonthSuggestion"]
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("AI Advice Error:", error);
    return {
      scoutingReport: "Focus on strengthening the middle-order batting.",
      tacticalTip: "Try utilizing your spinners during the middle overs to choke the run rate.",
      playerOfTheMonthSuggestion: team.squad[0]?.name || "Your Captain"
    };
  }
};

/**
 * Narrates a match event using Gemini as a commentator.
 */
export const getMatchNarration = async (matchState: LiveMatchState, event: string) => {
  try {
    const currentInning = matchState.innings[matchState.currentInningIndex];
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      // Updated matchState usage to match LiveMatchState structure.
      contents: `You are a cricket commentator. Narrate a specific match event: "${event}". Current Score: ${currentInning.score}/${currentInning.wickets} in ${currentInning.overs} overs. Keep it exciting and under 50 words.`
    });
    return response.text;
  } catch (error) {
    return "What a fantastic delivery! The crowd is going wild!";
  }
};

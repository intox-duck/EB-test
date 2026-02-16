
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const geminiApiKey = process.env.GEMINI_API_KEY;
if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY is required');
}
const genAI = new GoogleGenerativeAI(geminiApiKey);
console.log("Using GEMINI_API_KEY from environment");

const geminiModel = genAI.getGenerativeModel({
    model: "gemini-3-flash-preview",
    tools: [{ googleSearch: {} }]
});
// Tools removed for quota testing


async function getVerifiedTalentSentiment(companyName, retryCount = 0) {
    if (!geminiModel) return null;
    try {
        console.log(`[Gemini] Grounding Check: Searching for exact Glassdoor score and details for ${companyName}...`);
        const prompt = `Research the current exact Glassdoor and Indeed ratings for "${companyName}".
        Specifically check: https://www.glassdoor.co.uk/Reviews/Collinson-Reviews-E231645.htm
        
        I need the detailed breakdown if available.
        Return ONLY a JSON object (no markdown) in this format: 
        {
          "aggregatedScore": 3.6, 
          "totalReviews": 591, 
          "workLifeBalance": 3.7,
          "careerOpportunities": 3.3,
          "compensation": 3.3,
          "sentiment": "Balanced",
          "keyThemes": ["Flexible remote work", "Strong peer relationships", "Legacy management challenges", "Inclusive leadership"],
          "summary": "Glassdoor: 3.6/5. Employees value the flexible working conditions and strong peer support. However, feedback indicates mixed views on management effectiveness, with recent initiatives focusing on leadership development."
        }. 
        
        INSTRUCTIONS for 'summary':
        - Tone: PROFESSIONAL, BALANCED, OBJECTIVE, ANALYTICAL. 
        - DO NOT USE: "rave about", "brilliant", "cheery", "vibe". 
        - Focus on facts: "Employees report...", "Data suggests...", "Common themes include..."
        - LENGTH: Under 300 characters.`;

        const result = await geminiModel.generateContent(prompt);
        const text = result.response.text();
        console.log("RAW GEMINI RESPONSE:", text);
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    } catch (e) {
        console.error('[Gemini] FULL ERROR OBJECT:', e);
        if (e.message && e.message.includes('429') && retryCount < 3) {
            console.warn(`[Gemini] Rate limited. Retrying in 15s... (Attempt ${retryCount + 1})`);
            await new Promise(resolve => setTimeout(resolve, 15000));
            return getVerifiedTalentSentiment(companyName, retryCount + 1);
        }
        console.warn('[Gemini] Sentiment lookup failed:', e.message);
    }
    return null;
}

getVerifiedTalentSentiment("Collinson Group").then(res => {
    console.log("\n--- FINAL GEMINI PARSED OUTPUT ---");
    console.log(JSON.stringify(res, null, 2));
});

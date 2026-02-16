const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const geminiApiKey = process.env.GEMINI_API_KEY;
if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY is required');
}

const genAI = new GoogleGenerativeAI(geminiApiKey);
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    tools: [{ googleSearch: {} }]
});

async function test() {
    console.log("Testing sentiment grounding...");
    const prompt = `Search for the EXACT current employer ratings for "DragonPass" from:
        1. UK Glassdoor (glassdoor.co.uk) - get the EXACT rating shown (e.g., 3.6, not rounded to 3.5 or 4.0)
        2. Indeed company reviews
        
        CRITICAL: Return the EXACT decimal rating shown on each site. Do NOT round. 
        If Glassdoor shows 3.6, return 3.6 - NOT 3.5, NOT 3.8, NOT 4.0.
        
        Return ONLY a JSON object (no markdown) in this format: 
        {
          "glassdoorRating": 3.6,
          "glassdoorReviews": 250,
          "indeedRating": 3.5,
          "indeedReviews": 180,
          "aggregatedScore": 3.55,
          "totalReviews": 430,
          "workLifeBalance": 3.4,
          "careerOpportunities": 3.3,
          "compensation": 3.7,
          "sentiment": "Balanced",
          "keyThemes": ["Flexible work", "Strong peers"],
          "summary": "Glassdoor: 3.6/5. Indeed: 3.5/5."
        }
        
        RULES:
        - aggregatedScore = weighted average of glassdoorRating and indeedRating  
        - Use EXACT ratings from the sites, do NOT estimate or round
        - UK English spelling only`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        console.log("\n=== RAW RESPONSE ===\n", text);

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            console.log("\n=== PARSED JSON ===\n", JSON.stringify(parsed, null, 2));
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}

test();

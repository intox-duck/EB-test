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

async function testDragonPass() {
    const companyName = "DragonPass";
    console.log(`Testing sentiment fetch for: ${companyName}`);

    const prompt = `GOAL: Find the EXACT verified employer ratings for "${companyName}".

    SEARCH STRATEGY:
    1. SEARCH 1: "site:glassdoor.co.uk ${companyName} reviews" -> Look for "DragonPass Company" or similar.
    2. SEARCH 2: "site:indeed.co.uk ${companyName} reviews"
    
    CRITICAL:
    - The user has verified that "DragonPass Company" on Glassdoor has a 3.5 rating.
    - YOU MUST FIND THIS SPECIFIC PAGE.
    - URL might look like: glassdoor.co.uk/Overview/Working-at-DragonPass-Company...
    - Extract the 3.5 rating.

    Return this exact JSON format (no markdown):

    Return this exact JSON format (no markdown):
    {
      "glassdoorRating": <the exact decimal you found>,
      "glassdoorReviews": <number of reviews>,
      "indeedRating": <indeed rating or null>,
      "indeedReviews": <number or null>,
      "aggregatedScore": <average of the ratings>,
      "totalReviews": <sum of reviews>,
      "workLifeBalance": <sub-rating or null>,
      "careerOpportunities": <sub-rating or null>,
      "compensation": <sub-rating or null>,
      "sentiment": "Positive" or "Balanced" or "Negative",
      "keyThemes": ["theme1", "theme2", "theme3"],
      "summary": "<rating sources and key insight, under 150 chars>"
    }`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        console.log("\n=== RAW RESPONSE ===\n", text);

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            console.log("\n=== PARSED JSON ===\n", JSON.stringify(parsed, null, 2));
        } else {
            console.log("No JSON found in response");
        }
    } catch (e) {
        console.error("FULL ERROR OBJECT:", e);
        if (e.response) {
            console.error("Response details:", await e.response.text());
        }
    }
}

testDragonPass();

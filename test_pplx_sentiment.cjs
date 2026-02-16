require('dotenv').config();

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || '';

if (!PERPLEXITY_API_KEY) {
    throw new Error('Missing PERPLEXITY_API_KEY environment variable');
}

async function testPerplexitySentiment(companyName, url) {
    console.log(`[Perplexity] Testing sentiment for: ${companyName} (${url})`);
    try {
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'sonar-pro',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert talent intelligence analyst. Research the employer brand and employee sentiment for the given company using real-time web search (Glassdoor, Indeed, LinkedIn, etc.). Return only JSON.'
                    },
                    {
                        role: 'user',
                        content: `Perform a deep research for "Collinson Group" (${url}). 
                        1. Find the current Glassdoor rating and review count.
                        2. Find the LinkedIn follower count.
                        3. Identify the main themes in employee reviews (pros/cons).
                        4. Provide a professional talent sentiment summary.
                        
                        Return in this format:
                        {
                          "companyName": "Collinson Group",
                          "aggregatedScore": 3.7, 
                          "totalReviews": "number", 
                          "linkedInFollowers": "number",
                          "sentiment": "Positive/Balanced/Negative",
                          "keyThemes": ["Theme 1", "Theme 2", "Theme 3"],
                          "summary": "Professional objective analysis under 400 characters."
                        }`
                    }
                ],
                max_tokens: 1000
            })
        });

        if (response.ok) {
            const data = await response.json();
            const content = data.choices[0].message.content;
            return JSON.parse(content.match(/\{[\s\S]*\}/)[0]);
        } else {
            console.error("API Error:", await response.text());
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
    return null;
}

testPerplexitySentiment("Collinson Group", "https://www.collinsongroup.com/").then(res => {
    console.log("\n--- TALENT SENTIMENT REPORT: COLLINSON GROUP ---");
    console.log(JSON.stringify(res, null, 2));
});

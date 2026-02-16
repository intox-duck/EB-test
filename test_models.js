import { GoogleGenerativeAI } from "@google/generative-ai";
import fetch from 'node-fetch';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const jinaContent = fs.readFileSync('jina_output.txt', 'utf-8');
const PROMPT = `
CRITICAL INSTRUCTION: Analyze the "LIVE WEBSITE CONTENT" below to determine the EXACT number of "Jobs Advertised" or "Live Vacancies".
- **PRIORITY 1**: Look for a "Total Count" indicator like "Showing 1-12 of 75 jobs" or "75 Vacancies". -> Return 75.
- **PRIORITY 2**: Look for "We found 75 jobs". -> Return 75.
- **PAGINATION TRAP**: If you simply count the listed items and find between 1 and 15 (e.g. 10 or 12), and you do NOT see a "Total" text, **YOU MUST ASSUME THIS IS PAGE 1 OF MANY**. In this case return "SEARCH_REQUIRED".

CONTENT:
${jinaContent.slice(0, 15000)}
`;

async function testGemini() {
    console.log('--- GEMINI TEST ---');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    const result = await model.generateContent(PROMPT);
    console.log('Gemini Output:', result.response.text());
}

async function testSonar() {
    console.log('\n--- SONAR (PERPLEXITY) TEST ---');
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'sonar-pro',
            messages: [
                { role: 'user', content: PROMPT }
            ]
        })
    });
    const data = await response.json();
    console.log('Sonar Output:', data.choices?.[0]?.message?.content || JSON.stringify(data));
}

(async () => {
    await testGemini();
    await testSonar();
})();


import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env.local') });

const COMPANY = "Collinson Group"; // Testing the corrected name
const PERPLEXITY_KEY = process.env.PERPLEXITY_API_KEY;

async function testJinaDDG() {
    console.log('\n--- Testing Jina + DuckDuckGo ---');
    const queries = [
        `"${COMPANY}" linkedin followers`,
        `site:linkedin.com/company "${COMPANY}"`,
        `"${COMPANY}" glassdoor reviews total`
    ];

    for (const q of queries) {
        const ddgUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
        const jinaUrl = `https://r.jina.ai/${ddgUrl}`;

        console.log(`\nQuery: ${q}`);
        try {
            const response = await fetch(jinaUrl, { headers: { 'X-No-Cache': 'true' } });
            if (!response.ok) {
                console.log(`Failed: ${response.status}`);
                continue;
            }
            const text = await response.text();

            // Log snippets that look like followers
            const followersMatch = text.match(/([0-9.,Kk]+)\s+followers/gi);
            console.log("Potential follower matches:", followersMatch || "None");

            // Capture snippet of raw text to see if it's garbage/captcha
            console.log("Raw preview:", text.slice(0, 300).replace(/\n/g, ' '));

        } catch (e) {
            console.log("Error:", e.message);
        }
    }
}

async function testPerplexity() {
    console.log('\n--- Testing Perplexity Sonar Pro ---');
    if (!PERPLEXITY_KEY) {
        console.log("No Perplexity Key found!");
        return;
    }

    try {
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PERPLEXITY_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'sonar-pro',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a researcher. Return raw stats only.'
                    },
                    {
                        role: 'user',
                        content: `Search for the specific LinkedIn follower count and Glassdoor rating and review count for "${COMPANY}". If you find it, output "LINKEDIN: <count>".`
                    }
                ]
            }),
        });

        const data = await response.json();
        console.log("Perplexity Output:", data.choices?.[0]?.message?.content);
    } catch (e) {
        console.log("Perplexity Error:", e.message);
    }
}

async function start() {
    await testJinaDDG();
    await testPerplexity();
}

start();


import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

console.log("Starting...");

async function testStrategies() {
    const company = "collinson-group";

    // 1. Direct LinkedIn via Jina
    console.log("\n1. Direct LinkedIn (Jina)...");
    try {
        const url = `https://r.jina.ai/https://www.linkedin.com/company/${company}`;
        const res = await fetch(url);
        console.log(`Status: ${res.status}`);
        if (res.ok) {
            const text = await res.text();
            console.log("Direct Preview:", text.slice(0, 200).replace(/\n/g, ' '));
            const followers = text.match(/[0-9,.]+\s+followers/i);
            console.log("Followers found:", followers ? followers[0] : "No");
        }
    } catch (e) { console.log(e.message); }

    // 2. Bing via Jina
    console.log("\n2. Bing Search (Jina)...");
    try {
        const q = encodeURIComponent('"Collinson Group" linkedin followers');
        const url = `https://r.jina.ai/https://www.bing.com/search?q=${q}`;
        const res = await fetch(url);
        console.log(`Status: ${res.status}`);
        if (res.ok) {
            const text = await res.text();
            console.log("Bing Preview:", text.slice(0, 200).replace(/\n/g, ' '));
            const matches = text.match(/[0-9,.]+\s+followers/gi);
            console.log("Matches:", matches ? matches.slice(0, 3) : "None");
        }
    } catch (e) { console.log(e.message); }
}

testStrategies();

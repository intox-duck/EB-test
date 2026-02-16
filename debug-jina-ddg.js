
import fetch from 'node-fetch';

async function jinaDDGSearch(query) {
    console.log(`Searching Jina-DDG for: ${query}`);
    const ddgUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const jinaUrl = `https://r.jina.ai/${ddgUrl}`;

    const res = await fetch(jinaUrl, {
        headers: { 'X-No-Cache': 'true' }
    });

    const text = await res.text();
    console.log("--- Jina Response Preview ---");
    console.log(text.slice(0, 1500));

    if (text.includes("followers") || text.includes("LinkedIn")) {
        console.log("SUCCESS: Found potential stats");
    } else {
        console.log("FAIL: No useful stats found");
    }
}

jinaDDGSearch('"Collinson Group" linkedin followers');


import fetch from 'node-fetch';

async function jinaGoogleSearch(query) {
    console.log(`Searching Jina-Google for: ${query}`);
    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    const jinaUrl = `https://r.jina.ai/${googleUrl}`;

    // Pass headers to ask for text
    const res = await fetch(jinaUrl, {
        headers: { 'X-No-Cache': 'true' }
    });

    const text = await res.text();
    console.log("--- Jina Response Preview ---");
    console.log(text.slice(0, 500));

    if (text.includes("followers") || text.includes("LinkedIn")) {
        console.log("SUCCESS: Found potential stats");
    } else {
        console.log("FAIL: No useful stats found");
    }
}

jinaGoogleSearch('"Collinson Group" linkedin followers');

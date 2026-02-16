
import fetch from 'node-fetch';

async function searchJina(query) {
    console.log(`Searching Jina for: ${query}`);
    // Jina Search endpoint
    const url = `https://s.jina.ai/${encodeURIComponent(query)}`;
    const res = await fetch(url, {
        headers: {
            'Accept': 'text/plain', // Request markdown
            'X-No-Cache': 'true'
        }
    });

    if (!res.ok) {
        console.log("Jina Error:", res.status, res.statusText);
        return;
    }

    const text = await res.text();
    console.log("--- Jina Response Preview ---");
    console.log(text.slice(0, 500));
}

searchJina('"Collinson Group" linkedin followers');

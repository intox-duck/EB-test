import fetch from 'node-fetch';

async function searchSocialStats(query) {
    try {
        console.log(`[Social Search] Querying: ${query}`);
        const ddgUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        const jinaUrl = `https://r.jina.ai/${ddgUrl}`;

        console.log(`Fetching: ${jinaUrl}`);
        const res = await fetch(jinaUrl, {
            headers: { 'X-No-Cache': 'true' }
        });

        if (!res.ok) {
            console.log('Status:', res.status);
            return null;
        }

        const text = await res.text();
        console.log('Length:', text.length);
        console.log('Preview:', text.slice(0, 500));
        return text.slice(0, 2000);
    } catch (e) {
        console.error('[Social Search] Failed:', e.message);
        return null;
    }
}

searchSocialStats('"Collinson Group" linkedin followers');

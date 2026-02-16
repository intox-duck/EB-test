import fetch from 'node-fetch';

async function testHeaders() {
    const url = 'https://r.jina.ai/https://www.collinsongroup.com/en-GB/careers';
    console.log(`Fetching ${url}...`);
    try {
        const res = await fetch(url);
        console.log('Status:', res.status);
        console.log('--- HEADERS ---');
        res.headers.forEach((val, key) => console.log(`${key}: ${val}`));
    } catch (e) {
        console.error('Fetch failed:', e);
    }
}

testHeaders();

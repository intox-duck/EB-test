
import fetch from 'node-fetch';

async function testLinkedin() {
    const url = 'https://www.linkedin.com/company/collinson/';
    const jinaUrl = `https://r.jina.ai/${url}`;

    console.log(`Fetching ${jinaUrl}...`);
    const res = await fetch(jinaUrl);
    const text = await res.text();

    console.log(`Status: ${res.status}`);
    console.log(`Length: ${text.length}`);
    console.log('--- PREVIEW ---');
    console.log(text.slice(0, 1000));
    console.log('--- END PREVIEW ---');

    if (text.includes('Sign In') || text.includes('Join now')) {
        console.log('DETECTED: Login Wall');
    }
}

testLinkedin();

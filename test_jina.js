import { extractWebsiteContent } from './api/_utils.js';

async function testJina() {
    console.log('Testing Jina scraping...');
    const url = 'https://www.collinsongroup.com/en-GB/careers'; // Target specific careers page
    const content = await extractWebsiteContent(url);
    if (content) {
        console.log('Successfully scraped!');
        console.log('Length:', content.length);
        const fs = await import('fs');
        fs.writeFileSync('jina_output.txt', content);
        console.log('Saved to jina_output.txt');
    } else {
        console.error('Scraping failed.');
    }
}

testJina();

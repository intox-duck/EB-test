// Test ScrapingBee API for Glassdoor data extraction - WITH FILE OUTPUT
const fs = require('fs');

const SCRAPINGBEE_API_KEY = '5DECUX804HE1FIRJ4HDXPEHUAKTXV2F0QAUI1BDGDOBYWAAMVEY3PO5Y7HLZO5HLDUBSKLUB1MMMH96T';

async function testScrapingBeeGlassdoor() {
    const companyName = 'Collinson Group';
    const glassdoorUrl = 'https://www.glassdoor.co.uk/Reviews/Collinson-Group-Reviews-E39565.htm';

    const log = (msg) => {
        console.log(msg);
        fs.appendFileSync('scrapingbee_test_result.txt', msg + '\n');
    };

    // Clear previous results
    fs.writeFileSync('scrapingbee_test_result.txt', '');

    log(`[ScrapingBee] Testing Glassdoor scrape for: ${companyName}`);
    log(`[ScrapingBee] URL: ${glassdoorUrl}`);

    try {
        const params = new URLSearchParams({
            api_key: SCRAPINGBEE_API_KEY,
            url: glassdoorUrl,
            render_js: 'true',
            premium_proxy: 'true',
            country_code: 'gb'
        });

        const apiUrl = `https://app.scrapingbee.com/api/v1/?${params.toString()}`;

        log('[ScrapingBee] Making request...');
        const startTime = Date.now();

        const response = await fetch(apiUrl);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

        log(`[ScrapingBee] Response status: ${response.status} (${elapsed}s)`);

        if (!response.ok) {
            const errorText = await response.text();
            log('[ScrapingBee] Error: ' + errorText);
            return;
        }

        const html = await response.text();
        log(`[ScrapingBee] Got ${html.length} chars of HTML`);

        // Save full HTML for inspection
        fs.writeFileSync('glassdoor_scraped.html', html);
        log('[ScrapingBee] Saved full HTML to glassdoor_scraped.html');

        // Extract rating
        let foundRating = null;
        const ratingMatch = html.match(/(\d\.\d)\s*(?:out of 5|\/5)/i) ||
            html.match(/"ratingValue"[:\s]*"?(\d\.?\d?)"?/i) ||
            html.match(/>(\d\.\d)<\/span>/);
        if (ratingMatch) {
            foundRating = parseFloat(ratingMatch[1]);
            log(`[ScrapingBee] Found rating: ${foundRating}`);
        }

        // Extract review count
        let foundReviews = null;
        const reviewMatch = html.match(/(\d{1,4}(?:,\d{3})?)\s*Reviews?/i) ||
            html.match(/"reviewCount"[:\s]*"?(\d+)"?/i);
        if (reviewMatch) {
            foundReviews = parseInt(reviewMatch[1].replace(/,/g, ''));
            log(`[ScrapingBee] Found review count: ${foundReviews}`);
        }

        log('\n========== RESULTS ==========');
        log(`Company: ${companyName}`);
        log(`Rating: ${foundRating || 'NOT FOUND'}`);
        log(`Review Count: ${foundReviews || 'NOT FOUND'}`);
        log(`Time: ${elapsed}s`);
        log('=============================');

    } catch (error) {
        log('[ScrapingBee] Request failed: ' + error.message);
    }
}

testScrapingBeeGlassdoor();

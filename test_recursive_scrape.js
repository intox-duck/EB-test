import fetch from 'node-fetch';

async function extractWebsiteContent(url) {
    try {
        console.log(`[Jina] Extracting content from: ${url}`);
        const jinaUrl = `https://r.jina.ai/${url}`;
        const response = await fetch(jinaUrl, { headers: { 'Accept': 'text/plain' } });
        if (!response.ok) return null;
        return await response.text();
    } catch (error) {
        return null;
    }
}

async function testRecursiveScrape() {
    const startUrl = 'https://www.collinsongroup.com/en-GB/careers';
    console.log(`Starting Scrape: ${startUrl}`);

    const scraped = await extractWebsiteContent(startUrl);
    if (!scraped) return console.error("Initial scrape failed");

    console.log("Initial scrape length:", scraped.length);

    // Test Regex
    const atsLinkMatch = scraped.match(/\[.*?(?:Open Roles|Search Jobs|View Jobs|Current Vacancies|Apply Now).*?\]\((https?:\/\/[^\s\)]+)\)/i);

    if (atsLinkMatch && atsLinkMatch[1]) {
        const atsUrl = atsLinkMatch[1];
        console.log(`SUCCESS: Found ATS Link: ${atsUrl}`);

        console.log(`Following link...`);
        const atsContent = await extractWebsiteContent(atsUrl);

        if (atsContent) {
            console.log("ATS Content Length:", atsContent.length);
            console.log("Preview:", atsContent.slice(0, 500));
            // Check for keywords
            // Print likely count context
            const match = atsContent.match(/(\d+)\s*(?:jobs|roles|vacancies|openings)/i);
            if (match) {
                console.log(`FOUND EXACT COUNT: ${match[1]} (Context: "${match[0]}")`);
            } else {
                console.log("Searching for '75' specifically:");
                const index = atsContent.indexOf("75");
                if (index !== -1) {
                    console.log(`Found '75' in context: "...${atsContent.slice(index - 20, index + 20)}..."`);
                }
            }
        }
    } else {
        console.error("FAILED to find ATS link with current regex.");
        console.log("First 1000 chars of content for debugging:");
        console.log(scraped.slice(0, 1000));
    }
}

testRecursiveScrape();

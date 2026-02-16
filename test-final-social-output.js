
import fetch from 'node-fetch';

async function testApi() {
    console.log("Sending request to local API (port 3001)...");

    try {
        const response = await fetch('http://localhost:3001/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                companyUrl: 'https://www.collinsongroup.com/en-GB'
            })
        });

        if (!response.ok) {
            console.error(`Error: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error(text);
            return;
        }

        const data = await response.json();
        const result = data.data;

        console.log(`\nCompany: ${result.companyName}`);
        console.log(`Overall Score: ${result.overallScore}`);

        console.log("\n--- SOCIAL DIMENSIONS ---");
        const socialDims = result.dimensions.filter(d =>
            d.dimension_name.includes('Social') || d.dimension_name.includes('Leadership')
        );

        socialDims.forEach(d => {
            console.log(`\n[${d.dimension_name}] Score: ${d.score}`);
            console.log(`Insight: ${d.insight_text}`);
        });

        console.log("\n--- COMPETITORS FOUND ---");
        console.log(result.competitors);

    } catch (error) {
        console.error("Failed:", error);
    }
}

testApi();

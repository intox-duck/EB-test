
import fetch from 'node-fetch';

async function testGemini() {
    console.log("Testing Gemini API connection...");

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

        if (data.success) {
            console.log("\nSUCCESS: Gemini Analysis Received");
            console.log(`Provider: ${data.data.provider}`);
            console.log(`Overall Score: ${data.data.overallScore}`);
            console.log("Competitors:", data.data.competitors);
            console.log("Dimensions:");
            data.data.dimensions.forEach(d => {
                if (d.dimension_name.includes('Social')) {
                    console.log(`\n--- ${d.dimension_name} ---`);
                    console.log(`Score: ${d.score}`);
                    console.log(`Insight: ${d.insight_text}`);
                } else {
                    console.log(`- ${d.dimension_name}: ${d.score}`);
                }
            });
        } else {
            console.log("FAILED:", data.error);
        }

    } catch (error) {
        console.error("Test Failed:", error);
    }
}

testGemini();

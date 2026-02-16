// Test the enhanced API

async function testEnhancedApi() {
    console.log("Testing Enhanced API at http://127.0.0.1:3001/api/analyze...");
    console.log("Analyzing: https://www.collinsongroup.com");
    console.log("");

    try {
        const response = await fetch('http://127.0.0.1:3001/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                companyName: "Collinson Group",
                companyUrl: "https://www.collinsongroup.com"
            })
        });

        if (!response.ok) {
            const text = await response.text();
            console.log("Error:", response.status, text);
            return;
        }

        const data = await response.json();

        if (data.success) {
            console.log("=== SUCCESS ===");
            console.log("Company:", data.data.companyName);
            console.log("Overall Score:", data.data.overallScore);
            console.log("Provider:", data.data.provider);
            console.log("");
            console.log("COMPETITORS:", data.data.competitors?.join(", ") || "None identified");
            console.log("");
            console.log("SUMMARY:", data.data.summary || "No summary");
            console.log("");
            console.log("DIMENSIONS:");
            data.data.dimensions.forEach(d => {
                console.log(`  ${d.dimension_name}: ${d.score}/100`);
                console.log(`    → ${d.insight_text.slice(0, 100)}...`);
            });
            console.log("");
            console.log("SOURCES:", data.data.sources?.length || 0, "citations");
        } else {
            console.log("Analysis failed:", data.error);
        }
    } catch (e) {
        console.log("Fetch failed:", e);
    }
}

testEnhancedApi();

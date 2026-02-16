

async function testApi() {
    console.log("Testing API at http://127.0.0.1:3001/api/analyze...");
    try {
        const response = await fetch('http://127.0.0.1:3001/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ companyName: "Stripe" })
        });

        if (!response.ok) {
            console.error(`Error: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error(text.substring(0, 500));
            return;
        }

        const data = await response.json();
        console.log("Success!");
        console.log("Company:", data.data.companyName);
        console.log("Overall Score:", data.data.overallScore);
        console.log("Provider:", data.data.provider);
        console.log("Sources Found:", data.data.sources.length);
        console.log("First Source:", data.data.sources[0]);
    } catch (error) {
        console.error("Fetch failed:", error);
    }
}

testApi();

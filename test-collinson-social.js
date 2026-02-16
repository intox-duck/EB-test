
import fetch from 'node-fetch';

async function testAnalysis() {
    const url = 'http://localhost:3001/api/analyze';
    const body = {
        companyUrl: "https://www.collinsongroup.com/en-GB"
    };

    console.log("Testing analysis for:", body.companyUrl);

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            const socialPresence = data.data.dimensions.find(d => d.dimension_name === 'Social Presence');
            const socialImpact = data.data.dimensions.find(d => d.dimension_name === 'Social Impact');
            const employeeExp = data.data.dimensions.find(d => d.dimension_name === 'Employee Experience');

            console.log("\n=== SOCIAL PRESENCE ===");
            console.log("Score:", socialPresence?.score);
            console.log("Insight:", socialPresence?.insight_text);

            console.log("\n=== SOCIAL IMPACT ===");
            console.log("Score:", socialImpact?.score);
            console.log("Insight:", socialImpact?.insight_text);

            console.log("\n=== EMPLOYEE EXPERIENCE ===");
            console.log("Score:", employeeExp?.score);
            console.log("Insight:", employeeExp?.insight_text);

        } else {
            console.log("Analysis failed:", data.error);
        }

    } catch (error) {
        console.error("Test failed:", error);
    }
}

testAnalysis();

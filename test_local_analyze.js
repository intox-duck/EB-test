import fetch from 'node-fetch';

async function testAnalyze() {
    console.log('Testing /api/analyze endpoint on localhost:3001...');
    try {
        const response = await fetch('http://localhost:3001/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                companyUrl: "https://www.collinsongroup.com/en-GB"
            })
        });

        console.log(`Status: ${response.status}`);
        const text = await response.text();
        console.log('Raw Response length:', text.length);
        console.log('Sample:', text.slice(0, 200));

        try {
            const json = JSON.parse(text);
            console.log('JSON Parse Success:', json.success);
        } catch (e) {
            console.error('JSON Parse Failed:', e.message);
        }

    } catch (error) {
        console.error('Fetch Failed:', error.message);
    }
}

testAnalyze();

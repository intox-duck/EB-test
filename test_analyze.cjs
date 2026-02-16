
const http = require('http');

const data = JSON.stringify({
    companyName: "Collinson Group",
    companyUrl: "https://www.collinsongroup.com"
});

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/analyze',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    },
    timeout: 90000 // 90s timeout
};

const req = http.request(options, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        console.log('Response Status:', res.statusCode);
        try {
            const json = JSON.parse(body);
            if (json.success && json.data) {
                const empExp = json.data.dimensions.find(d => d.dimension_name === 'Employee Experience');
                console.log('--- Employee Experience Dimension ---');
                console.log('Score:', empExp.score);
                console.log('Insight:', empExp.insight_text);
            } else {
                console.log('Full Body:', body);
            }
        } catch (e) {
            console.log('Raw Body:', body);
        }
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.write(data);
req.end();

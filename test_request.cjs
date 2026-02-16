
const http = require('http');

const data = JSON.stringify({
    companyName: "Collinson Group",
    location: "London, UK"
});

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/deep-dive',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    },
    timeout: 60000 // 60s timeout
};

const req = http.request(options, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        console.log('Response Status:', res.statusCode);
        try {
            const json = JSON.parse(body);
            if (json.data && json.data.talentSentiment) {
                console.log('Talent Sentiment:', JSON.stringify(json.data.talentSentiment, null, 2));
            } else {
                console.log('Full Body:', body.substring(0, 1000));
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

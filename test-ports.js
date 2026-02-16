
import http from 'http';

const ports = [3000, 3001, 3002, 3003, 3004];

async function checkPort(port) {
    return new Promise((resolve) => {
        const req = http.request({
            hostname: 'localhost',
            port: port,
            path: '/api/analyze',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`Port ${port}: Status ${res.statusCode}`);
                console.log(`Body: ${data.substring(0, 100)}...`);
                resolve(true);
            });
        });

        req.on('error', (e) => {
            // console.log(`Port ${port} failed: ${e.message}`);
            resolve(false);
        });

        req.write(JSON.stringify({ companyName: "Google" }));
        req.end();
    });
}

async function scan() {
    console.log("Scanning ports...");
    for (const port of ports) {
        await checkPort(port);
    }
}

scan();

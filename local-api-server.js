import http from 'http';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { resolveCompanyIdentity, scrapeGlassdoorBaseline } from './api/_company-identity.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PORT = 3001;

function decodeEnvBuffer(buffer) {
    if (!buffer || buffer.length === 0) return '';

    const isUtf16LeBom = buffer[0] === 0xff && buffer[1] === 0xfe;
    const isUtf16BeBom = buffer[0] === 0xfe && buffer[1] === 0xff;

    if (isUtf16LeBom) {
        return buffer.toString('utf16le');
    }

    if (isUtf16BeBom) {
        const swapped = Buffer.allocUnsafe(buffer.length);
        for (let i = 0; i + 1 < buffer.length; i += 2) {
            swapped[i] = buffer[i + 1];
            swapped[i + 1] = buffer[i];
        }
        return swapped.toString('utf16le');
    }

    return buffer.toString('utf8');
}

function parseEnvFile(filepath) {
    if (!fs.existsSync(filepath)) return {};

    try {
        const rawBuffer = fs.readFileSync(filepath);
        const decoded = decodeEnvBuffer(rawBuffer).replace(/^\uFEFF/, '');
        return dotenv.parse(decoded);
    } catch (error) {
        console.warn(`[Env] Failed to parse ${path.basename(filepath)}: ${error.message}`);
        return {};
    }
}

function loadEnvWithFallback() {
    dotenv.config();
    dotenv.config({ path: path.join(__dirname, '.env.local') });

    const merged = {
        ...parseEnvFile(path.join(__dirname, '.env')),
        ...parseEnvFile(path.join(__dirname, '.env.local'))
    };

    for (const [key, value] of Object.entries(merged)) {
        if (!process.env[key] && value !== undefined) {
            process.env[key] = String(value);
        }
    }
}

function extractRetryAfterSeconds(message = '') {
    const text = String(message);

    const direct = text.match(/retry in (\d+(?:\.\d+)?)s/i);
    if (direct?.[1]) {
        return Math.max(1, Math.ceil(Number.parseFloat(direct[1])));
    }

    const rpc = text.match(/"retryDelay":"(\d+)s"/i);
    if (rpc?.[1]) {
        return Math.max(1, Number.parseInt(rpc[1], 10));
    }

    return null;
}

function normalizeGeminiError(message = '', defaultStatus = 500) {
    const text = String(message || '');
    const isQuotaOrRateLimit = /(429|too many requests|quota exceeded|rate limit)/i.test(text);

    if (!isQuotaOrRateLimit) {
        return {
            normalized: false,
            statusCode: defaultStatus,
            message: text,
            code: null,
            retryAfterSeconds: null
        };
    }

    const retryAfterSeconds = extractRetryAfterSeconds(text);
    const userMessage = retryAfterSeconds
        ? `Gemini quota is currently exhausted. Please retry in about ${retryAfterSeconds} seconds.`
        : 'Gemini quota is currently exhausted. Please retry shortly or use a higher-quota API key.';

    return {
        normalized: true,
        statusCode: 429,
        message: userMessage,
        code: 'GEMINI_RATE_LIMIT',
        retryAfterSeconds
    };
}

function normalizeErrorPayload(payload, statusCode) {
    if (!payload || typeof payload !== 'object' || typeof payload.error !== 'string') {
        return { statusCode, payload };
    }

    const normalized = normalizeGeminiError(payload.error, statusCode);
    if (!normalized.normalized) {
        return { statusCode, payload };
    }

    return {
        statusCode: normalized.statusCode,
        payload: {
            ...payload,
            error: normalized.message,
            code: normalized.code,
            retryAfterSeconds: normalized.retryAfterSeconds
        }
    };
}

function sendJson(res, statusCode, payload) {
    const adjusted = normalizeErrorPayload(payload, statusCode);
    res.statusCode = adjusted.statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(adjusted.payload));
}

function decorateResponse(res) {
    if (typeof res.status !== 'function') {
        res.status = function status(code) {
            this.statusCode = code;
            return this;
        };
    }

    if (typeof res.json !== 'function') {
        res.json = function json(payload) {
            sendJson(this, this.statusCode || 200, payload);
        };
    }
}

async function readJsonBody(req) {
    let body = '';
    for await (const chunk of req) {
        body += chunk;
        if (body.length > 2_000_000) {
            throw new Error('Request payload too large');
        }
    }

    if (!body.trim()) return {};
    return JSON.parse(body);
}

async function createServer() {
    loadEnvWithFallback();

    const [{ default: analyzeHandler }, { default: deepDiveHandler }, { default: agentHandler }] = await Promise.all([
        import('./api/analyze.js'),
        import('./api/deep-dive.js'),
        import('./api/agent.js')
    ]);

    const routes = new Map([
        ['POST /api/analyze', analyzeHandler],
        ['POST /api/deep-dive', deepDiveHandler],
        ['POST /api/agent', agentHandler]
    ]);

    const server = http.createServer(async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        decorateResponse(res);

        if (req.method === 'OPTIONS') {
            res.status(200).end();
            return;
        }

        const pathname = new URL(req.url || '/', 'http://localhost').pathname;

        try {
            if (req.method === 'POST') {
                req.body = await readJsonBody(req);
            }
        } catch (error) {
            sendJson(res, 400, { success: false, error: `Invalid JSON payload: ${error.message}` });
            return;
        }

        if (req.method === 'POST' && pathname === '/api/company-resolver') {
            const { companyName = '', companyUrl = '' } = req.body || {};

            if (!companyName && !companyUrl) {
                sendJson(res, 400, { success: false, error: 'companyName or companyUrl is required' });
                return;
            }

            try {
                const identity = await resolveCompanyIdentity({ companyName, companyUrl, fetchImpl: fetch });
                const glassdoorBaseline = await scrapeGlassdoorBaseline(identity, { fetchImpl: fetch });

                sendJson(res, 200, {
                    success: true,
                    data: {
                        identity,
                        glassdoorBaseline,
                        resolvedAt: new Date().toISOString()
                    }
                });
            } catch (error) {
                sendJson(res, 500, {
                    success: false,
                    error: error?.message || 'Unexpected resolver error'
                });
            }
            return;
        }

        const key = `${req.method} ${pathname}`;
        const handler = routes.get(key);

        if (!handler) {
            sendJson(res, 404, { success: false, error: `Route not found: ${pathname}` });
            return;
        }

        try {
            await handler(req, res);
        } catch (error) {
            const normalized = normalizeGeminiError(error?.message || String(error), 500);
            sendJson(res, normalized.statusCode, {
                success: false,
                error: normalized.message,
                code: normalized.code,
                retryAfterSeconds: normalized.retryAfterSeconds
            });
        }
    });

    const port = Number.parseInt(process.env.LOCAL_API_PORT || '', 10) || DEFAULT_PORT;
    server.listen(port, () => {
        const keyConfigured = Boolean(process.env.GEMINI_API_KEY);
        console.log(`Local API server running at http://localhost:${port}`);
        console.log(`Routes: /api/analyze, /api/deep-dive, /api/agent, /api/company-resolver`);
        console.log(`Gemini key: ${keyConfigured ? 'configured' : 'not configured'}`);
    });
}

createServer().catch((error) => {
    console.error('[Local API] Failed to start:', error);
    process.exit(1);
});

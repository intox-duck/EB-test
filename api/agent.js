import { getGeminiModel, normalizeApiError } from './_utils.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { query, context } = req.body;

        console.log(`[Agent] Handling query about: ${context?.companyName || 'General'}...`);

        const model = getGeminiModel();
        if (!model) {
            throw new Error('Gemini model not configured');
        }

        try {
            console.log('[Agent] Calling Gemini...');
            const prompt = `You are the C2 Talent Intelligence Assistant. Respond with a HIGHLY CHEERY, POSITIVE tone.
                
                RULE: USE BRITISH (UK) ENGLISH SPELLING ONLY.
                
                CONTEXT DATA:
                ${JSON.stringify(context || {}, null, 2)}
                
                USER QUESTION:
                ${query}`;

            const result = await model.generateContent(prompt);
            const answer = result.response.text();
            res.status(200).json({ success: true, answer });
        } catch (err) {
            throw new Error(`Gemini agent call failed: ${err.message}`);
        }

    } catch (error) {
        console.error('[Agent] Final Error:', error);
        const normalized = normalizeApiError(error, 'Agent query failed');
        res.status(normalized.status).json({
            success: false,
            error: normalized.error,
            code: normalized.code,
            retryAfterSeconds: normalized.retryAfterSeconds
        });
    }
}

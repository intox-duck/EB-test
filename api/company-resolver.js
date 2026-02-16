import { resolveCompanyIdentity, scrapeGlassdoorBaseline } from './_company-identity.js';

export const config = {
  runtime: 'edge'
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: CORS_HEADERS
  });
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }

  try {
    const body = await req.json();
    const { companyName = '', companyUrl = '' } = body || {};

    if (!companyName && !companyUrl) {
      return jsonResponse({ success: false, error: 'companyName or companyUrl is required' }, 400);
    }

    const identity = await resolveCompanyIdentity({ companyName, companyUrl, fetchImpl: fetch });
    const glassdoorBaseline = await scrapeGlassdoorBaseline(identity, { fetchImpl: fetch });

    return jsonResponse({
      success: true,
      data: {
        identity,
        glassdoorBaseline,
        resolvedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    return jsonResponse({ success: false, error: error?.message || 'Unexpected error' }, 500);
  }
}

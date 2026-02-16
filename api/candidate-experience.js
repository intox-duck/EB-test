import { assessCandidateExperience } from './_candidate-experience.js';

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
    const { companyName = '', companyUrl = '', talentSentiment = null } = body || {};

    if (!companyName && !companyUrl) {
      return jsonResponse({ success: false, error: 'companyName or companyUrl is required' }, 400);
    }

    const assessment = await assessCandidateExperience({
      companyName,
      companyUrl,
      talentSentiment,
      fetchImpl: fetch
    });

    return jsonResponse({
      success: true,
      data: assessment,
      assessedAt: new Date().toISOString()
    });
  } catch (error) {
    return jsonResponse({ success: false, error: error?.message || 'Unexpected error' }, 500);
  }
}

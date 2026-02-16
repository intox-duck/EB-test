import { resolveCompanyIdentity } from './_company-identity.js';

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9'
};

const BLOCKED_PATTERNS = [
  /access denied/i,
  /forbidden/i,
  /just a moment/i,
  /cloudflare/i,
  /verify you are a human/i,
  /captcha/i,
  /temporarily unavailable/i,
  /error\s*403/i
];

function normaliseWhitespace(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function stripMarkup(value = '') {
  return normaliseWhitespace(
    String(value)
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&#x27;/g, "'")
  );
}

function isBlockedContent(text = '') {
  if (!text) return false;
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(text));
}

function confidenceFromScore(score = 0) {
  if (score >= 75) return 'high';
  if (score >= 62) return 'medium';
  return 'low';
}

function safeHostname(url = '') {
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch {
    return '';
  }
}

function uniqueUrls(urls = []) {
  const seen = new Set();
  const result = [];
  for (const value of urls) {
    if (!value) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

function buildCandidateCareerUrls(companyUrl = '', companyName = '') {
  let host = safeHostname(companyUrl);
  if (!host && companyName) {
    host = `${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
  }
  if (!host) return [];

  const base = `https://${host}`;
  const common = [
    companyUrl,
    `${base}/careers`,
    `${base}/careers/`,
    `${base}/jobs`,
    `${base}/jobs/`,
    `${base}/career`,
    `${base}/join-us`,
    `${base}/work-with-us`,
    `https://careers.${host}`,
    `https://jobs.${host}`
  ];

  return uniqueUrls(common);
}

async function fetchText(url, fetchImpl, timeoutMs = 3500) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: DEFAULT_HEADERS,
      redirect: 'follow',
      signal: controller?.signal
    });

    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      finalUrl: response.url || url,
      text
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      finalUrl: url,
      text: '',
      error: error?.message || 'Request failed'
    };
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function toJinaMirror(url = '') {
  if (!url) return null;
  if (url.startsWith('http://')) return `https://r.jina.ai/${url}`;
  if (url.startsWith('https://')) return `https://r.jina.ai/http://${url.slice('https://'.length)}`;
  return `https://r.jina.ai/http://${url}`;
}

function extractSignals(rawText = '') {
  const text = stripMarkup(rawText);
  const lowered = text.toLowerCase();

  const rolesMatch = lowered.match(/(\d{1,4}(?:,\d{3})?)\s*(?:\+)?\s*(open roles|open positions|vacancies|jobs)/i);
  const openRoles = rolesMatch ? Number.parseInt(String(rolesMatch[1]).replace(/,/g, ''), 10) : null;

  const hasApply = /(apply now|submit application|view jobs|search jobs|join our team)/i.test(lowered);
  const hasHiringProcess = /(interview process|hiring process|application process|candidate journey|recruitment process)/i.test(lowered);
  const hasBenefits = /(benefits|compensation|healthcare|wellbeing|well-being|pension|perks)/i.test(lowered);
  const hasLocationSignals = /(location|remote|hybrid|onsite|on-site|global offices|work from)/i.test(lowered);
  const hasGraduateOrIntern = /(internship|graduate programme|early careers|student opportunities)/i.test(lowered);

  return {
    openRoles,
    hasApply,
    hasHiringProcess,
    hasBenefits,
    hasLocationSignals,
    hasGraduateOrIntern
  };
}

function scoreFromSignals(signals, sourceType = 'direct') {
  let score = 58;

  if (sourceType === 'direct') score += 10;
  if (sourceType === 'jina') score += 6;

  if (signals.openRoles && signals.openRoles > 0) score += 8;
  if (signals.hasApply) score += 5;
  if (signals.hasHiringProcess) score += 5;
  if (signals.hasBenefits) score += 4;
  if (signals.hasLocationSignals) score += 3;
  if (signals.hasGraduateOrIntern) score += 3;

  return Math.max(45, Math.min(92, score));
}

function buildDirectInsight(companyName, sourceUrl, signals) {
  const highlights = [];
  if (signals.openRoles) highlights.push(`${signals.openRoles.toLocaleString()} open roles signals`);
  if (signals.hasApply) highlights.push('clear apply flow');
  if (signals.hasHiringProcess) highlights.push('hiring process guidance');
  if (signals.hasBenefits) highlights.push('benefits visibility');
  if (signals.hasLocationSignals) highlights.push('location/remote clarity');
  if (signals.hasGraduateOrIntern) highlights.push('early-careers pathways');

  const details = highlights.length ? highlights.join(', ') : 'basic careers information';
  return `${companyName}'s careers experience was assessed from ${sourceUrl}. Candidate journey indicators show ${details}.`;
}

function buildFallbackInsight(companyName, identity, talentSentiment, attemptedUrls = []) {
  const rating = typeof talentSentiment?.aggregatedScore === 'number' ? talentSentiment.aggregatedScore : null;
  const reviews = typeof talentSentiment?.totalReviews === 'number' ? talentSentiment.totalReviews : null;
  const sources = [];

  if (identity?.glassdoor?.url) sources.push('Glassdoor');
  if (identity?.indeed?.url) sources.push('Indeed');

  let score = 56;
  if (rating !== null) {
    if (rating >= 4.2) score += 12;
    else if (rating >= 3.7) score += 8;
    else if (rating >= 3.2) score += 4;
    else score += 1;
  }
  if (reviews && reviews > 1000) score += 4;
  else if (reviews && reviews > 100) score += 2;
  if (identity?.indeed?.url) score += 3;
  if (identity?.glassdoor?.url) score += 3;

  score = Math.max(50, Math.min(80, score));

  const sourceLabel = sources.length ? sources.join(' and ') : 'alternative public review sources';
  const attempted = attemptedUrls.length ? `Careers URL checks (${attemptedUrls.slice(0, 3).join(', ')}) were restricted or inconsistent. ` : '';
  const sentimentSnippet = rating !== null
    ? `${sourceLabel} suggest an employee sentiment baseline of ${rating}/5${reviews ? ` from ${reviews.toLocaleString()} reviews` : ''}.`
    : `${sourceLabel} provide partial signals for candidate expectations and employer responsiveness.`;

  return {
    score,
    insight: `${attempted}${companyName}'s candidate experience was estimated using ${sourceLabel} when direct careers content was unavailable. ${sentimentSnippet}`,
    sourceType: 'fallback',
    sourceUrl: identity?.glassdoor?.url || identity?.indeed?.url || null
  };
}

export async function assessCandidateExperience({
  companyName = '',
  companyUrl = '',
  talentSentiment = null,
  fetchImpl = fetch
} = {}) {
  const safeCompanyName = normaliseWhitespace(companyName) || 'The company';
  const identity = await resolveCompanyIdentity({ companyName, companyUrl, fetchImpl });
  const urls = buildCandidateCareerUrls(companyUrl, identity?.canonicalCompanyName || companyName);
  const attempted = urls.slice(0, 3);

  const attempts = attempted.flatMap((url) => {
    const entries = [{ url, sourceType: 'direct', requestUrl: url }];
    const jinaMirror = toJinaMirror(url);
    if (jinaMirror) {
      entries.push({ url, sourceType: 'jina', requestUrl: jinaMirror });
    }
    return entries;
  });

  // Run career-page probes in parallel; keep scoring deterministic and choose best evidence.
  const attemptResults = await Promise.all(
    attempts.map(async (attempt) => {
      const response = await fetchText(attempt.requestUrl, fetchImpl);
      return { ...attempt, response };
    })
  );

  const rankedCandidates = attemptResults
    .filter((attempt) => attempt.response?.ok && !isBlockedContent(attempt.response?.text || ''))
    .map((attempt) => {
      const signals = extractSignals(attempt.response.text);
      const score = scoreFromSignals(signals, attempt.sourceType);
      return {
        score,
        sourceType: attempt.sourceType,
        sourceUrl: attempt.url,
        signals
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.sourceType !== b.sourceType) return a.sourceType === 'direct' ? -1 : 1;
      return 0;
    });

  if (rankedCandidates.length > 0) {
    const best = rankedCandidates[0];
    return {
      score: best.score,
      insight: buildDirectInsight(safeCompanyName, best.sourceUrl, best.signals),
      sourceType: best.sourceType,
      sourceUrl: best.sourceUrl,
      confidence: confidenceFromScore(best.score),
      fallbackUsed: false,
      attemptedUrls: attempted
    };
  }

  const fallback = buildFallbackInsight(safeCompanyName, identity, talentSentiment, attempted);
  return {
    ...fallback,
    confidence: confidenceFromScore(fallback.score),
    fallbackUsed: true,
    attemptedUrls: attempted
  };
}

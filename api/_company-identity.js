const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9'
};

const CHAPTER2_CANONICAL_NAME = 'Chapter 2';
const CHAPTER2_CANONICAL_URL = 'https://www.chapter2.group/';
const CHAPTER2_GLASSDOOR_URL = 'https://www.glassdoor.co.uk/Overview/Working-at-Chapter-2-United-Kingdom-EI_IE6970558.11,35.htm';
const CHAPTER2_GLASSDOOR_COMPANY_ID = '6970558';
const KNOWN_COMPANY_URL_HINTS = [
  { pattern: /\bdragon\s*pass\b/i, url: 'https://www.dragonpass.com/' },
  { pattern: /\bcollinson(\s*group)?\b/i, url: 'https://www.collinsongroup.com/' }
];

function normalizeWhitespace(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function decodeHtmlEntities(value = '') {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripMarkup(value = '') {
  const text = decodeHtmlEntities(String(value))
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[(.*?)\]\([^)]+\)/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\s+/g, ' ');

  return normalizeWhitespace(text);
}

function normaliseToken(token = '') {
  return token.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function tokenizeName(value = '') {
  return normalizeWhitespace(value)
    .split(/[\s\-_]+/)
    .map(normaliseToken)
    .filter(Boolean);
}

function titleCase(value = '') {
  return normalizeWhitespace(value)
    .split(' ')
    .filter(Boolean)
    .map((part) => {
      if (part.length <= 3 && part === part.toUpperCase()) {
        return part;
      }
      if (/[A-Z]/.test(part.slice(1))) {
        return part;
      }
      return `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`;
    })
    .join(' ');
}

export function parseCompactNumber(value) {
  if (value === null || value === undefined) return null;

  const normalized = String(value)
    .toLowerCase()
    .replace(/,/g, '')
    .replace(/\s+/g, '')
    .trim();

  const match = normalized.match(/^(\d+(?:\.\d+)?)([km])?$/i);
  if (!match) return null;

  const numeric = Number.parseFloat(match[1]);
  if (!Number.isFinite(numeric)) return null;

  const suffix = match[2]?.toLowerCase();
  if (suffix === 'k') return Math.round(numeric * 1000);
  if (suffix === 'm') return Math.round(numeric * 1000000);
  return Math.round(numeric);
}

function parseRatingFromContext(context = '') {
  const checks = [
    /employee rating[^0-9]{0,25}(\d(?:\.\d)?)(?:\s*(?:out of|\/)\s*5)?/i,
    /overall(?:\s+rating)?[^0-9]{0,25}(\d(?:\.\d)?)(?:\s*(?:out of|\/)\s*5)?/i,
    /(\d(?:\.\d)?)\s*out of\s*5\s*stars?/i,
    /(\d(?:\.\d)?)\s*\/\s*5(?:\s*stars?)?/i
  ];

  for (const pattern of checks) {
    const match = context.match(pattern);
    if (!match) continue;
    const value = Number.parseFloat(match[1]);
    if (Number.isFinite(value) && value >= 1 && value <= 5) {
      return value;
    }
  }

  return null;
}

function parseReviewCountFromContext(context = '') {
  const patterns = [
    /based on\s+(\d[\d,.]*(?:\s*[km])?)\s+(?:company\s+)?reviews?/i,
    /(\d[\d,.]*(?:\s*[km])?)\s+(?:company\s+)?reviews?/i
  ];

  for (const pattern of patterns) {
    const match = context.match(pattern);
    if (!match) continue;
    const value = parseCompactNumber(match[1]);
    if (Number.isInteger(value) && value > 0) return value;
  }

  return null;
}

function parseSubRatingFromContext(context = '', label = '') {
  if (!label) return null;
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`${escaped}[^0-9]{0,20}(\\d(?:\\.\\d)?)`, 'i');
  const match = context.match(pattern);
  if (!match) return null;
  const value = Number.parseFloat(match[1]);
  if (!Number.isFinite(value) || value < 1 || value > 5) return null;
  return value;
}

function extractCompanyFromUrlInput(companyUrl = '') {
  if (!companyUrl) return null;

  try {
    const parsed = new URL(companyUrl.startsWith('http') ? companyUrl : `https://${companyUrl}`);
    const host = parsed.hostname.replace(/^www\./i, '');
    const parts = host.split('.').filter(Boolean);
    if (!parts.length) return null;

    let core = parts[0];
    if (core === 'careers' && parts.length > 1) {
      core = parts[1];
    }

    return titleCase(core.replace(/[-_]+/g, ' '));
  } catch {
    return null;
  }
}

function extractDomainToken(rawUrl = '') {
  if (!rawUrl) return '';

  try {
    const parsed = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    const parts = host.split('.').filter(Boolean);
    if (!parts.length) return '';

    let core = parts[0];
    if (core === 'careers' && parts.length > 1) {
      core = parts[1];
    }

    return core.replace(/[^a-z0-9]/g, '');
  } catch {
    return '';
  }
}

function inferPreferredCompanyUrl(companyName = '') {
  const cleaned = normalizeWhitespace(companyName);
  if (!cleaned) return null;

  for (const hint of KNOWN_COMPANY_URL_HINTS) {
    if (hint.pattern.test(cleaned)) {
      return hint.url;
    }
  }

  const compact = cleaned.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (compact.length >= 4 && compact.length <= 24) {
    return `https://www.${compact}.com/`;
  }

  return null;
}

function canonicalizeUrl(rawUrl = '') {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
    parsed.hash = '';
    parsed.search = '';
    parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    return parsed.toString();
  } catch {
    return null;
  }
}

function domainFor(rawUrl = '') {
  try {
    return new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return '';
  }
}

export function extractCompanyNameFromGlassdoorUrl(rawUrl = '') {
  const sanitizeSlug = (slug = '') => {
    let normalized = slug;
    normalized = normalized.replace(
      /-(work-environment|culture-and-values|compensation-and-benefits|career-opportunities|senior-management|recommend-to-a-friend|ceo-approval)$/i,
      ''
    );
    normalized = normalized.replace(/-(interview-questions|salaries|benefits|photos)$/i, '');
    const parts = normalized.split('-').filter(Boolean);
    const deduped = [];
    for (const part of parts) {
      if (!deduped.length || deduped[deduped.length - 1].toLowerCase() !== part.toLowerCase()) {
        deduped.push(part);
      }
    }
    normalized = deduped.join('-');
    return normalized.trim();
  };

  try {
    const { pathname } = new URL(rawUrl);
    const reviewsMatch = pathname.match(/\/Reviews\/([^/]+?)-Reviews-/i);
    if (reviewsMatch?.[1]) {
      return sanitizeSlug(decodeURIComponent(reviewsMatch[1])).replace(/-/g, ' ').trim();
    }

    const overviewMatch = pathname.match(/Working-at-([^/]+?)-EI_/i);
    if (overviewMatch?.[1]) {
      return sanitizeSlug(decodeURIComponent(overviewMatch[1])).replace(/-/g, ' ').trim();
    }
  } catch {
    // noop
  }

  return null;
}

function extractCompanyNameFromIndeedUrl(rawUrl = '') {
  try {
    const { pathname } = new URL(rawUrl);
    const cmpMatch = pathname.match(/\/cmp\/([^/?#]+)/i);
    if (cmpMatch?.[1]) {
      return decodeURIComponent(cmpMatch[1]).replace(/[-_]+/g, ' ').trim();
    }
  } catch {
    // noop
  }
  return null;
}

function extractGlassdoorCompanyId(rawUrl = '') {
  const match = rawUrl.match(/(?:EI_IE|E)(\d{4,})/i);
  return match?.[1] || null;
}

function decodeDuckDuckGoTarget(fragment = '') {
  if (!fragment) return null;

  try {
    const params = new URLSearchParams(fragment);
    const encoded = params.get('uddg');
    if (encoded) return decodeURIComponent(encoded);
  } catch {
    // noop
  }

  const fallback = fragment.match(/uddg=([^&]+)/i);
  if (!fallback?.[1]) return null;

  try {
    return decodeURIComponent(fallback[1]);
  } catch {
    return fallback[1];
  }
}

function parseMention(url, context = '') {
  const cleanedContext = stripMarkup(context);
  const ratingHint = parseRatingFromContext(cleanedContext);
  const reviewsHint = parseReviewCountFromContext(cleanedContext);
  const workLifeBalance = parseSubRatingFromContext(cleanedContext, 'Work-Life Balance');
  const careerOpportunities = parseSubRatingFromContext(cleanedContext, 'Career Opportunities');
  const compensation = parseSubRatingFromContext(cleanedContext, 'Compensation');

  return {
    url,
    context: cleanedContext,
    ratingHint,
    reviewsHint,
    workLifeBalance,
    careerOpportunities,
    compensation
  };
}

function extractMentionsFromSearch(rawText = '') {
  const mentions = [];

  const addMention = (url, index, spanLength = 500) => {
    const canonical = canonicalizeUrl(url);
    if (!canonical) return;
    const start = Math.max(0, index - spanLength);
    const end = Math.min(rawText.length, index + spanLength);
    mentions.push(parseMention(canonical, rawText.slice(start, end)));
  };

  const redirectPattern = /(?:https?:)?\/\/duckduckgo\.com\/l\/\?([^"'()\s<>]+)/gi;
  let redirectMatch;
  while ((redirectMatch = redirectPattern.exec(rawText)) !== null) {
    const target = decodeDuckDuckGoTarget(redirectMatch[1]);
    if (target) addMention(target, redirectMatch.index);
  }

  const directPattern = /https?:\/\/(?:www\.)?(?:glassdoor\.(?:com|co\.uk)|indeed\.(?:com|co\.uk|[a-z]{2}))/gi;
  let directMatch;
  while ((directMatch = directPattern.exec(rawText)) !== null) {
    const start = directMatch.index;
    const tail = rawText.slice(start).match(/^https?:\/\/[^\s<>"')\]]+/i);
    if (!tail?.[0]) continue;
    addMention(tail[0], start, 350);
  }

  return mentions;
}

function extractFallbackPlatformUrl(rawText = '', platform = 'glassdoor') {
  const safeText = String(rawText || '');
  if (!safeText) return null;

  const hostPattern = platform === 'indeed'
    ? '(?:https?:\\/\\/)?(?:www\\.)?indeed\\.(?:com|co\\.uk|[a-z]{2})'
    : '(?:https?:\\/\\/)?(?:www\\.)?glassdoor\\.(?:com|co\\.uk|[a-z]{2}|co\\.[a-z]{2})';

  const reviewPathPattern = platform === 'indeed'
    ? '\\/cmp\\/[A-Za-z0-9%._\\-]+(?:\\/reviews)?'
    : '\\/(?:Reviews|Overview)\\/[A-Za-z0-9%._\\-\\/]+';

  const pattern = new RegExp(`${hostPattern}${reviewPathPattern}`, 'i');
  const match = safeText.match(pattern);
  if (!match?.[0]) return null;

  const normalized = match[0].startsWith('http') ? match[0] : `https://${match[0]}`;
  return canonicalizeUrl(normalized);
}

function isLikelyCategoryPage(url = '') {
  return /(salary|interview|benefits|culture|work-life|worklife|work-environment|career-opportunities|senior-management|ceo-approval|recommend-to-a-friend|photos|jobs|job|office|intern|engineer|developer|scientist|analyst|manager)/i.test(url);
}

function hasGlassdoorTopicSlug(url = '') {
  return /-(work-environment|culture-and-values|compensation-and-benefits|career-opportunities|senior-management|recommend-to-a-friend|ceo-approval)-reviews/i.test(url);
}

function overlapScore(companyTokens = [], candidateName = '') {
  if (!candidateName) return 0;
  const tokens = tokenizeName(candidateName);
  if (!tokens.length || !companyTokens.length) return 0;
  const overlap = tokens.filter((token) => companyTokens.includes(token)).length;
  return overlap;
}

function scoreGlassdoorCandidate(candidate, companyTokens) {
  let score = 0;
  const url = candidate.url || '';
  const host = domainFor(url);
  const companyName = extractCompanyNameFromGlassdoorUrl(url) || '';
  const companyNameTokens = tokenizeName(companyName);

  if (host.includes('glassdoor.')) score += 25;
  if (/\/Reviews\//i.test(url)) score += 18;
  if (/\/Overview\/Working-at-/i.test(url)) score += 14;
  if (/-Reviews-E/i.test(url)) score += 10;
  if (isLikelyCategoryPage(url)) score -= 12;
  if (hasGlassdoorTopicSlug(url)) score -= 20;
  if (/-US-Reviews-|_IL\./i.test(url)) score -= 12;

  const overlap = overlapScore(companyTokens, companyName);
  score += overlap * 8;
  if (overlap > 0 && companyNameTokens.length === overlap) score += 6;
  if (overlap > 0 && companyNameTokens.length >= overlap + 2) score -= 8;

  if (candidate.ratingHint !== null) {
    const hasOverallSignal = /(employee rating|overall|company average)/i.test(candidate.context || '');
    const hasCategorySignal = /(compensation|benefits|work life|work-life|career|culture|salary)/i.test(candidate.context || '');
    score += hasOverallSignal ? 6 : 1;
    if (hasCategorySignal && !hasOverallSignal) score -= 3;
  }
  if (candidate.reviewsHint !== null) score += 4;

  return score;
}

function scoreIndeedCandidate(candidate, companyTokens) {
  let score = 0;
  const url = candidate.url || '';
  const host = domainFor(url);
  const companyName = extractCompanyNameFromIndeedUrl(url) || '';

  if (host.includes('indeed.')) score += 25;
  if (/\/cmp\//i.test(url)) score += 16;
  if (isLikelyCategoryPage(url)) score -= 8;

  const overlap = overlapScore(companyTokens, companyName);
  score += overlap * 8;
  if (overlap > 0 && tokenizeName(companyName).length === overlap) score += 6;

  if (candidate.ratingHint !== null) score += 4;
  if (candidate.reviewsHint !== null) score += 4;

  return score;
}

function buildPlatformCandidate(mentions, companyTokens, scoreFn) {
  if (!mentions.length) return null;

  const byUrl = new Map();
  for (const mention of mentions) {
    const key = canonicalizeUrl(mention.url);
    if (!key) continue;

    const existing = byUrl.get(key) || {
      ...mention,
      url: key,
      contexts: []
    };

    existing.contexts.push(mention.context);
    if (mention.ratingHint !== null && existing.ratingHint === null) {
      existing.ratingHint = mention.ratingHint;
    }
    if (mention.reviewsHint !== null) {
      existing.reviewsHint = Math.max(existing.reviewsHint || 0, mention.reviewsHint);
    }
    if (mention.workLifeBalance !== null && existing.workLifeBalance === null) {
      existing.workLifeBalance = mention.workLifeBalance;
    }
    if (mention.careerOpportunities !== null && existing.careerOpportunities === null) {
      existing.careerOpportunities = mention.careerOpportunities;
    }
    if (mention.compensation !== null && existing.compensation === null) {
      existing.compensation = mention.compensation;
    }
    if (mention.context && (!existing.context || mention.context.length > existing.context.length)) {
      existing.context = mention.context;
    }

    byUrl.set(key, existing);
  }

  const scored = [...byUrl.values()].map((candidate) => ({
    ...candidate,
    score: scoreFn(candidate, companyTokens)
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored[0] || null;
}

function toConfidence(score = 0) {
  if (score >= 50) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

async function safeFetchText(url, fetchImpl, timeoutMs = 12000) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('Fetch implementation is not available');
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: DEFAULT_HEADERS,
      redirect: 'follow',
      signal: controller?.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function fetchSearchPage(query, fetchImpl) {
  const encoded = encodeURIComponent(query);
  const variants = [
    `https://r.jina.ai/http://duckduckgo.com/html/?q=${encoded}`,
    `https://r.jina.ai/http://www.google.com/search?q=${encoded}&hl=en`,
    `https://duckduckgo.com/html/?q=${encoded}&kl=us-en`,
    `https://r.jina.ai/http://www.bing.com/search?q=${encoded}&setlang=en-us`
  ];

  for (const url of variants) {
    try {
      const text = await safeFetchText(url, fetchImpl);
      if (text && text.length > 200) return text;
    } catch {
      // Try next variant
    }
  }

  return '';
}

function normalizeCompanyInput(companyName = '', companyUrl = '') {
  const normalizedName = normalizeWhitespace(companyName);
  const preferredCompanyUrl = canonicalizeUrl(companyUrl) || inferPreferredCompanyUrl(normalizedName);
  const fromUrl = extractCompanyFromUrlInput(preferredCompanyUrl || companyUrl);
  const displayName = normalizedName || fromUrl || '';
  const domainToken = extractDomainToken(preferredCompanyUrl || companyUrl);
  const mergedTokens = tokenizeName([displayName, domainToken].filter(Boolean).join(' '));

  return {
    displayName: displayName || '',
    searchName: displayName || '',
    tokens: mergedTokens,
    preferredCompanyUrl: preferredCompanyUrl || null,
    domainToken
  };
}

function isChapter2Alias(value = '') {
  const raw = normalizeWhitespace(value).toLowerCase();
  if (!raw) return false;

  const normalized = raw
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '');

  return (
    normalized.includes('chapter2.group') ||
    /^chapter\s*2(\s*group)?$/.test(raw) ||
    /^chapter2(\s*group)?$/.test(raw)
  );
}

export async function resolveCompanyIdentity({ companyName = '', companyUrl = '', fetchImpl = fetch } = {}) {
  if (isChapter2Alias(companyName) || isChapter2Alias(companyUrl)) {
    return {
      inputCompanyName: normalizeWhitespace(companyName),
      normalizedCompanyName: CHAPTER2_CANONICAL_NAME,
      canonicalCompanyName: CHAPTER2_CANONICAL_NAME,
      confidence: 'high',
      glassdoor: {
        url: CHAPTER2_GLASSDOOR_URL,
        companyId: CHAPTER2_GLASSDOOR_COMPANY_ID,
        companyName: CHAPTER2_CANONICAL_NAME,
        score: 100,
        ratingHint: null,
        reviewsHint: null
      },
      indeed: null,
      preferredCompanyUrl: CHAPTER2_CANONICAL_URL
    };
  }

  const normalized = normalizeCompanyInput(companyName, companyUrl);
  if (!normalized.searchName) {
    return {
      inputCompanyName: normalizeWhitespace(companyName),
      normalizedCompanyName: '',
      canonicalCompanyName: '',
      confidence: 'low',
      glassdoor: null,
      indeed: null,
      preferredCompanyUrl: normalized.preferredCompanyUrl || null
    };
  }

  const queryPool = [
    `site:glassdoor.com "${normalized.searchName}" "Reviews"`,
    `site:glassdoor.co.uk "${normalized.searchName}" "Working at"`,
    `site:glassdoor.com "${normalized.searchName}" "Working at"`,
    `site:indeed.com "${normalized.searchName}" reviews`,
    `"${normalized.searchName}" glassdoor reviews`,
    `"${normalized.searchName}" company reviews glassdoor`
  ];

  if (normalized.domainToken) {
    queryPool.unshift(`site:glassdoor.com "${normalized.domainToken}" "Reviews"`);
    queryPool.unshift(`site:glassdoor.co.uk "${normalized.domainToken}" "Reviews"`);
    queryPool.push(`"${normalized.domainToken}.com" glassdoor reviews`);
  }

  if (normalized.preferredCompanyUrl) {
    queryPool.push(`"${normalized.preferredCompanyUrl}" glassdoor`);
    queryPool.push(`"${normalized.preferredCompanyUrl}" indeed reviews`);
  }

  const queries = [...new Set(queryPool)];

  const searchPages = await Promise.all(
    queries.map(async (query) => {
      const text = await fetchSearchPage(query, fetchImpl);
      return { query, text };
    })
  );

  const mentions = searchPages.flatMap((page) => extractMentionsFromSearch(page.text));
  const glassdoorMentions = mentions.filter((mention) => /glassdoor\./i.test(mention.url));
  const indeedMentions = mentions.filter((mention) => /indeed\./i.test(mention.url));

  const bestGlassdoor = buildPlatformCandidate(glassdoorMentions, normalized.tokens, scoreGlassdoorCandidate);
  const bestIndeed = buildPlatformCandidate(indeedMentions, normalized.tokens, scoreIndeedCandidate);

  const fallbackGlassdoorUrl = !bestGlassdoor
    ? searchPages.map((page) => extractFallbackPlatformUrl(page.text, 'glassdoor')).find(Boolean)
    : null;
  const fallbackIndeedUrl = !bestIndeed
    ? searchPages.map((page) => extractFallbackPlatformUrl(page.text, 'indeed')).find(Boolean)
    : null;

  const resolvedGlassdoor = bestGlassdoor || (
    fallbackGlassdoorUrl
      ? {
          url: fallbackGlassdoorUrl,
          score: 24,
          ratingHint: null,
          reviewsHint: null,
          context: ''
        }
      : null
  );

  const resolvedIndeed = bestIndeed || (
    fallbackIndeedUrl
      ? {
          url: fallbackIndeedUrl,
          score: 20,
          ratingHint: null,
          reviewsHint: null,
          context: ''
        }
      : null
  );

  const glassdoorName = resolvedGlassdoor ? extractCompanyNameFromGlassdoorUrl(resolvedGlassdoor.url) : null;
  const indeedName = resolvedIndeed ? extractCompanyNameFromIndeedUrl(resolvedIndeed.url) : null;
  const canonicalCompanyName = titleCase(glassdoorName || indeedName || normalized.displayName);
  const confidenceScore = Math.max(resolvedGlassdoor?.score || 0, resolvedIndeed?.score || 0);

  return {
    inputCompanyName: normalizeWhitespace(companyName),
    normalizedCompanyName: normalized.displayName,
    canonicalCompanyName,
    confidence: toConfidence(confidenceScore),
    glassdoor: resolvedGlassdoor
      ? {
          url: resolvedGlassdoor.url,
          companyId: extractGlassdoorCompanyId(resolvedGlassdoor.url),
          companyName: titleCase(glassdoorName || normalized.displayName),
          score: resolvedGlassdoor.score,
          ratingHint: resolvedGlassdoor.ratingHint ?? null,
          reviewsHint: resolvedGlassdoor.reviewsHint ?? null
        }
      : null,
    indeed: resolvedIndeed
      ? {
          url: resolvedIndeed.url,
          companyName: titleCase(indeedName || normalized.displayName),
          score: resolvedIndeed.score,
          ratingHint: null,
          reviewsHint: null
        }
      : null,
    preferredCompanyUrl: normalized.preferredCompanyUrl || null
  };
}

function pickBestRating(candidates = []) {
  const rated = candidates.filter((candidate) => candidate.ratingHint !== null);
  if (!rated.length) return null;

  rated.sort((a, b) => {
    const aHasOverallSignal = /(employee rating|overall|company average)/i.test(a.context || '');
    const bHasOverallSignal = /(employee rating|overall|company average)/i.test(b.context || '');
    if (aHasOverallSignal !== bHasOverallSignal) {
      return bHasOverallSignal - aHasOverallSignal;
    }
    const aHasCategorySignal = /(compensation|benefits|work life|work-life|career|culture|salary)/i.test(a.context || '');
    const bHasCategorySignal = /(compensation|benefits|work life|work-life|career|culture|salary)/i.test(b.context || '');
    if (aHasCategorySignal !== bHasCategorySignal) {
      return aHasCategorySignal - bHasCategorySignal;
    }
    return (b.ratingHint || 0) - (a.ratingHint || 0);
  });

  return rated[0].ratingHint;
}

function pickBestReviews(candidates = []) {
  const values = candidates
    .map((candidate) => candidate.reviewsHint)
    .filter((value) => Number.isInteger(value) && value > 0);

  if (!values.length) return null;
  return Math.max(...values);
}

export async function scrapeGlassdoorBaseline(identity, { fetchImpl = fetch } = {}) {
  if (!identity) return null;

  const searchName = identity.canonicalCompanyName || identity.normalizedCompanyName;
  const domainToken = extractDomainToken(identity.preferredCompanyUrl || '');
  if (!searchName) return null;

  const baselineQueryPool = [
    `site:glassdoor.com "${searchName}" "company reviews"`,
    `site:glassdoor.co.uk "${searchName}" "company reviews"`,
    `site:glassdoor.com "${searchName}" "out of 5 stars"`,
    `"${searchName}" glassdoor reviews`
  ];

  if (domainToken) {
    baselineQueryPool.unshift(`site:glassdoor.com "${domainToken}" "company reviews"`);
    baselineQueryPool.unshift(`site:glassdoor.co.uk "${domainToken}" "company reviews"`);
    baselineQueryPool.push(`"${domainToken}.com" glassdoor reviews`);
  }

  if (identity.glassdoor?.url) {
    baselineQueryPool.unshift(`"${identity.glassdoor.url}"`);
  }

  if (identity.preferredCompanyUrl) {
    baselineQueryPool.push(`"${identity.preferredCompanyUrl}" glassdoor`);
  }

  const baselineQueries = [...new Set(baselineQueryPool)];

  const pages = await Promise.all(
    baselineQueries.map(async (query) => {
      const text = await fetchSearchPage(query, fetchImpl);
      return extractMentionsFromSearch(text);
    })
  );

  const mentions = pages
    .flat()
    .filter((mention) => /glassdoor\./i.test(mention.url));

  if (!mentions.length && !identity.glassdoor) {
    return null;
  }

  const targetCompanyId = identity.glassdoor?.companyId || null;
  const relevantMentions = targetCompanyId
    ? mentions.filter((mention) => extractGlassdoorCompanyId(mention.url) === targetCompanyId)
    : mentions;

  const candidates = relevantMentions.length ? relevantMentions : mentions;
  const rating = pickBestRating(candidates) ?? identity.glassdoor?.ratingHint ?? null;
  const reviews = pickBestReviews(candidates) ?? identity.glassdoor?.reviewsHint ?? null;
  const bestCandidate = buildPlatformCandidate(candidates, tokenizeName(searchName), scoreGlassdoorCandidate);

  if (rating === null && reviews === null) {
    return null;
  }

  return {
    platform: 'Glassdoor',
    source: 'duckduckgo-search-scrape',
    sourceUrl: bestCandidate?.url || identity.glassdoor?.url || null,
    glassdoorRating: rating,
    glassdoorReviews: reviews,
    workLifeBalance: bestCandidate?.workLifeBalance ?? null,
    careerOpportunities: bestCandidate?.careerOpportunities ?? null,
    compensation: bestCandidate?.compensation ?? null,
    confidence: toConfidence(bestCandidate?.score || 0),
    evidence: bestCandidate?.context ? bestCandidate.context.slice(0, 220) : null,
    capturedAt: new Date().toISOString()
  };
}

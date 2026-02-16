// Brand Analysis API - uses Vercel Serverless Functions

export interface AxisData {
  subject: string;
  score: number;
  benchmark: number;
  fullMark: number;
}

export interface ResolverIdentity {
  canonicalCompanyName?: string;
  confidence?: 'high' | 'medium' | 'low';
  glassdoor?: {
    url?: string | null;
    companyName?: string;
    companyId?: string | null;
  } | null;
  indeed?: {
    url?: string | null;
    companyName?: string;
  } | null;
}

export interface GlassdoorBaseline {
  glassdoorRating?: number | null;
  glassdoorReviews?: number | null;
  sourceUrl?: string | null;
  confidence?: 'high' | 'medium' | 'low';
  capturedAt?: string;
}

export interface ResolverDebugData {
  identity?: ResolverIdentity | null;
  glassdoorBaseline?: GlassdoorBaseline | null;
  resolvedAt?: string;
}

export interface BrandAnalysisData {
  companyName: string;
  industry?: string;
  axes: AxisData[];
  insights: Record<string, string>;
  overallScore: number;
  lastUpdated: string;
  groundingSources?: string[];
  provider?: string;
  competitors?: string[];
  summary?: string;
  resolverDebug?: ResolverDebugData | null;
  talentSentiment?: any;
}

const CHAPTER2_CANONICAL_NAME = 'Chapter 2';
const CHAPTER2_CANONICAL_URL = 'https://www.chapter2.group/';

const isChapter2Alias = (value: string): boolean => {
  const raw = (value || '').trim().toLowerCase();
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
};

const resolveCompanyUrl = (companyInput: string): string => {
  if (isChapter2Alias(companyInput)) {
    return CHAPTER2_CANONICAL_URL;
  }

  const isUrl = companyInput.includes('.') &&
    (companyInput.startsWith('http') || companyInput.startsWith('www') || /^[a-z0-9-]+\.[a-z]{2,}/i.test(companyInput));

  return isUrl
    ? (companyInput.startsWith('http') ? companyInput : `https://${companyInput}`)
    : `https://www.${companyInput.toLowerCase().replace(/\s+/g, '')}.com`;
};

const toDisplayCompanyName = (value: string): string => {
  const cleaned = (value || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';

  return cleaned
    .split(' ')
    .filter(Boolean)
    .map((part) => {
      if (/[A-Z].*[a-z]|[a-z].*[A-Z]/.test(part)) return part;
      if (/^[A-Z0-9&.-]{2,5}$/.test(part)) return part;
      return `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`;
    })
    .join(' ');
};

async function parseApiError(response: Response, fallback: string): Promise<string> {
  let payload: any = null;

  try {
    payload = await response.json();
  } catch {
    // Keep fallback when response body is not JSON.
  }

  const retryAfterSeconds = Number(payload?.retryAfterSeconds);
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return `Gemini quota is currently exhausted. Please retry in about ${Math.ceil(retryAfterSeconds)} seconds.`;
  }

  return payload?.error || fallback;
}

function deriveResolverDebug(result: any, requestCompanyName: string): ResolverDebugData | null {
  if (result?.resolverDebug) {
    return result.resolverDebug;
  }

  const talentSentiment = result?.talentSentiment || {};
  const resolution = talentSentiment?.resolution || {};
  const glassdoorSource = (Array.isArray(talentSentiment?.sources) ? talentSentiment.sources : [])
    .find((source: any) => /glassdoor/i.test(String(source?.name || '')));

  const canonicalName = toDisplayCompanyName(
    resolution?.canonicalCompanyName ||
    result?.companyName ||
    requestCompanyName
  );

  const glassdoorUrl = resolution?.glassdoorUrl || glassdoorSource?.url || null;

  const glassdoorRating = talentSentiment?.glassdoorRating ??
    (Number.isFinite(glassdoorSource?.score) ? glassdoorSource.score : null);

  const glassdoorReviews = talentSentiment?.glassdoorReviews ??
    (Number.isInteger(glassdoorSource?.reviewCount) ? glassdoorSource.reviewCount : null);

  const identity: ResolverIdentity = {
    canonicalCompanyName: canonicalName,
    confidence: resolution?.confidence || (glassdoorUrl ? 'medium' : 'low'),
    glassdoor: glassdoorUrl
      ? {
        url: glassdoorUrl,
        companyName: canonicalName,
        companyId: null
      }
      : null,
    indeed: null
  };

  const hasBaseline = (
    glassdoorRating !== null && glassdoorRating !== undefined
  ) || (
    glassdoorReviews !== null && glassdoorReviews !== undefined
  );

  const baseline: GlassdoorBaseline | null = hasBaseline
    ? {
      glassdoorRating: glassdoorRating ?? null,
      glassdoorReviews: glassdoorReviews ?? null,
      sourceUrl: glassdoorUrl || null,
      confidence: identity.confidence || 'low',
      capturedAt: result?.analysedAt || result?.analyzedAt || new Date().toISOString()
    }
    : null;

  if (!identity.glassdoor && !baseline) {
    return null;
  }

  return {
    identity,
    glassdoorBaseline: baseline,
    resolvedAt: result?.analysedAt || result?.analyzedAt || new Date().toISOString()
  };
}

export async function fetchBrandAnalysis(companyInput: string): Promise<BrandAnalysisData> {
  // Pseudo-flow:
  // 1) Run a single /api/analyze request.
  // 2) Derive resolver debug metadata from analyze payload.
  // 3) Return normalized analysis data for UI rendering.

  const requestCompanyName = isChapter2Alias(companyInput)
    ? CHAPTER2_CANONICAL_NAME
    : toDisplayCompanyName(companyInput);
  const companyUrl = resolveCompanyUrl(companyInput);

  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyName: requestCompanyName, companyUrl }),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to analyse brand'));
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Analysis failed');
  }

  // Transform the response to match the expected format
  const result = data.data;
  const resolverDebug = deriveResolverDebug(result, requestCompanyName);
  const displayCompanyName = toDisplayCompanyName(result.companyName || requestCompanyName);
  return {
    companyName: displayCompanyName,
    industry: result.industry || '',
    axes: result.dimensions.map((d: any) => ({
      subject: d.dimension_name,
      score: d.score,
      benchmark: d.benchmark_score,
      fullMark: 100,
    })),
    insights: result.dimensions.reduce((acc: Record<string, string>, d: any) => {
      acc[d.dimension_name] = d.insight_text || 'No insight available.';
      return acc;
    }, {}),
    overallScore: result.overallScore,
    lastUpdated: result.analysedAt || result.analyzedAt,
    groundingSources: result.sources,
    provider: result.provider,
    competitors: (result.competitors || []).map((name: string) => toDisplayCompanyName(name)).filter(Boolean),
    summary: result.summary || '',
    resolverDebug,
    talentSentiment: result.talentSentiment || null,
  };
}

// Mock data for initial display
export const mockBrandData: BrandAnalysisData = {
  companyName: "Your Company",
  axes: [
    { subject: "Search", score: 75, benchmark: 70, fullMark: 100 },
    { subject: "Social Presence", score: 65, benchmark: 65, fullMark: 100 },
    { subject: "Social Impact", score: 50, benchmark: 55, fullMark: 100 },
    { subject: "Values & Proposition", score: 80, benchmark: 68, fullMark: 100 },
    { subject: "Employee Experience", score: 68, benchmark: 65, fullMark: 100 },
    { subject: "Content", score: 55, benchmark: 58, fullMark: 100 },
    { subject: "UX", score: 65, benchmark: 62, fullMark: 100 },
    { subject: "Candidate Experience", score: 72, benchmark: 60, fullMark: 100 },
    { subject: "Leadership", score: 60, benchmark: 58, fullMark: 100 },
  ],
  insights: {
    "Search": "Enter a company name and click 'Generate Benchmark' to receive AI-powered insights grounded in real-time web data.",
    "Social Presence": "Enter a company name and click 'Generate Benchmark' to receive AI-powered insights grounded in real-time web data.",
    "Social Impact": "Enter a company name and click 'Generate Benchmark' to receive AI-powered insights grounded in real-time web data.",
    "Values & Proposition": "Enter a company name and click 'Generate Benchmark' to receive AI-powered insights grounded in real-time web data.",
    "Employee Experience": "Enter a company name and click 'Generate Benchmark' to receive AI-powered insights grounded in real-time web data.",
    "Content": "Enter a company name and click 'Generate Benchmark' to receive AI-powered insights grounded in real-time web data.",
    "UX": "Enter a company name and click 'Generate Benchmark' to receive AI-powered insights grounded in real-time web data.",
    "Candidate Experience": "Enter a company name and click 'Generate Benchmark' to receive AI-powered insights grounded in real-time web data.",
    "Leadership": "Enter a company name and click 'Generate Benchmark' to receive AI-powered insights grounded in real-time web data.",
  },
  overallScore: 66,
  lastUpdated: new Date().toISOString(),
};

export async function fetchCompanyInsights(params: {
  companyName: string;
  location: string;
  jobTitle?: string;
  seniorityLevel?: string;
  resolverSeed?: ResolverDebugData | null;
  talentSentimentSeed?: any | null;
}): Promise<any> {
  const requestCompanyName = isChapter2Alias(params.companyName)
    ? CHAPTER2_CANONICAL_NAME
    : params.companyName;

  const response = await fetch('/api/deep-dive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...params, companyName: requestCompanyName }),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Failed to fetch insights'));
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Analysis failed');
  }

  return result.data;
}

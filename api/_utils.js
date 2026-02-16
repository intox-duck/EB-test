import { GoogleGenerativeAI } from "@google/generative-ai";
import fetch from 'node-fetch';
import { resolveCompanyIdentity, scrapeGlassdoorBaseline } from './_company-identity.js';
import { isChapter2Alias, getChapter2Profile } from './_chapter2-profile.js';

// Initialize keys
const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export function getGeminiModel() {
  if (!genAI) {
    console.warn('[Config] Gemini API Key missing.');
    return null;
  }

  // Use Gemini 2.5 Flash for speed + grounding (thinking disabled for latency)
  return genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    tools: [{ googleSearch: {} }],
    generationConfig: {
      thinkingConfig: { thinkingBudget: 0 }  // Disable thinking for speed
    }
  });
}

export const DIMENSIONS = [
  { name: 'Search', benchmark: 70, description: 'SEO visibility, search rankings, brand searchability' },
  { name: 'Social Presence', benchmark: 65, description: 'Social media followers, engagement, platform visibility' },
  { name: 'Social Impact', benchmark: 55, description: 'ESG initiatives, sustainability, DE&I, community programmes' },
  { name: 'Values & Proposition', benchmark: 68, description: 'EVP clarity, company values, mission statement' },
  { name: 'Employee Experience', benchmark: 65, description: 'Glassdoor reviews, employee testimonials, culture' },
  { name: 'Content', benchmark: 58, description: 'Blog posts, case studies, thought leadership content' },
  { name: 'UX', benchmark: 62, description: 'Website design, user experience, mobile responsiveness' },
  { name: 'Candidate Experience', benchmark: 60, description: 'Careers page, application process, job listings' },
  { name: 'Leadership', benchmark: 58, description: 'Executive visibility, thought leadership, industry influence' }
];

export async function extractWebsiteContent(url) {
  try {
    console.log(`[Jina] Extracting content from: ${url} `);
    const jinaUrl = `https://r.jina.ai/${url}`;
    const response = await fetch(jinaUrl, {
      headers: { 'Accept': 'text/plain' }
    });

    if (!response.ok) {
      console.log(`[Jina] Failed with status: ${response.status}`);
      return null;
    }

    const content = await response.text();
    const truncated = content.slice(0, 25000);
    console.log(`[Jina] Extracted ${truncated.length} chars`);
    return truncated;
  } catch (error) {
    console.error('[Jina] Extraction failed:', error.message);
    return null;
  }
}

export async function searchSocialStats(companyName) {
  console.log(`[Social Search] Researching stats and talent sentiment for: ${companyName}`);

  // 1. Try Gemini with Google Search Grounding first (Primary)
  const model = getGeminiModel();
  if (model) {
    try {
      const prompt = `Research and provide a detailed summary of the employer brand "Social Presence" for "${companyName}". 
            1. Identify their active platforms (LinkedIn, Twitter/X, Instagram, etc.).
            2. PROVIDE A SUMMARY OF THEIR CONTENT AND ENGAGEMENT STYLE.
            3. Find exact LinkedIn follower counts and Glassdoor ratings IF AVAILABLE.
            4. If exact numbers are missing, DESCRIBE the scale of their visibility based on job post activity and employee count.
            
            DO NOT output technical excuses or "no data found". If you find nothing specific, write a "General Market Presence" summary based on the industry norms for a company of their size.
            
            Return a concise summary with these specific metrics and THEMES.`;
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (e) {
      console.error('[Social Search] Gemini failed:', e.message);
    }
  }

  return null;
}

export function extractCompanyName(url) {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    const parts = domain.split('.');
    if (parts.length > 2) {
      return parts[parts.length - 2].charAt(0).toUpperCase() + parts[parts.length - 2].slice(1);
    }
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  } catch (e) {
    return url;
  }
}

export function buildPrompt(companyName, targetUrl, websiteContent, socialContext, competitorGuidance) {
  return `You are an expert employer brand analyst (UK-based). 
    IMPORTANT: YOU MUST USE BRITISH (UK) ENGLISH SPELLING AND TERMINOLOGY AT ALL TIMES (e.g., 'programme' not 'program', 'optimise' not 'optimize', 'centre' not 'center', 'analyse' not 'analyze').
        
TARGET COMPANY: "${companyName}" (${targetUrl})
${competitorGuidance}

CONTEXT FROM WEBSITE:
${websiteContent ? websiteContent.slice(0, 15000) : "No website content available."}

${socialContext}

TASKS:
1. RESEARCH & SYNTHESISE the company's online footprint using the context provided (Website + Search results).
2. For Social Presence, if exact counts (like LinkedIn followers) are missing, ESTIMATE the scale based on the company size and activity vibe. DO NOT output "data missing".
3. For Employee Experience, proactively find the "Cultural Signature" (e.g. from Glassdoor/Indeed summaries) and frame it EXTREMELY POSITIVELY.
4. ANALYSE & SCORE the 9 dimensions (0-100) based on this combined intelligence.
5. OUTPUT: Valid JSON format ONLY.

DIMENSIONS:
- Search (SEO/Visibility)
- Social_Media_Reach (Social Presence & Engagement): Research via web search to identify platforms used (LinkedIn, Twitter, Instagram, etc.). Summarise the company's social personality and reach.
- Environmental_Social_Governance (ESG/Charity ONLY): Sustainability, DE&I, Charity, Social Good.
- Values & Proposition
- Employee Experience (Talent Sentiment & Reviews): MAX 450 CHARACTERS. CITING EXACT RATINGS IS MANDATORY (e.g. "Glassdoor: 3.6/5"). Balance the tone: Accurately reflect both strengths (e.g. "supportive colleagues") and areas for development (e.g. "leadership consistency"). Use UK English. AVOID generic superlatives (e.g., 'vibrant', 'excel', 'perfect'); maintain the objective tone of a critical market analyst.
- Content (Blog/Thought Leadership)
- Review Content (Media presence)
- UX (Website quality)
- Candidate Experience (Careers page)
- Leadership (Executive visibility)

CRITICAL: 
- For Social Presence, summarize the company's social personality based on grounded context.
- For Employee Experience, YOU MUST use the exact ratings provided in the context. Do not invent scores.
- SCORING RULE: Assume a "Mature Stable" baseline of 60-70 if no data is found.
- Social Impact = Values/Good Deeds.
- COMPETITOR EXCLUSION RULE: DO NOT list products, subsidiaries, or legal entities owned by the target company as competitors. (e.g., if targeting 'Collinson Group', exclude 'Priority Pass' and 'LoungeKey'). Only return external market rivals.

JSON SCHEMA:
{
  "companyName": "String",
  "industry": "String",
  "dimensions": [
    { "name": "Search", "score": Number, "insight": "String" },
    { "name": "Social_Media_Reach", "score": Number, "insight": "String" },
    { "name": "Environmental_Social_Governance", "score": Number, "insight": "String" },
    { "name": "Values & Proposition", "score": Number, "insight": "String" },
    { "name": "Employee Experience", "score": Number, "insight": "String" },
    { "name": "Content", "score": Number, "insight": "String" },
    { "name": "Review Content", "score": Number, "insight": "String" },
    { "name": "UX", "score": Number, "insight": "String" },
    { "name": "Candidate Experience", "score": Number, "insight": "String" },
    { "name": "Leadership", "score": Number, "insight": "String" }
  ],
  "overallScore": Number,
  "competitors": ["String", "String", "String", "String", "String"],
  "summary": "String"
}
`;
}

export async function callGemini(prompt) {
  const model = getGeminiModel();
  if (!model) throw new Error('Gemini not configured');
  console.log('[Gemini] Generating analysis...');
  const result = await model.generateContent(prompt);
  return result.response.text();
}

// Improved parser that handles markdown code blocks and basic cleanup
export function parseAIResponse(text) {
  console.log('[AI Raw Response Preview]:', text.slice(0, 200) + '...');
  try {
    // 1. Try extracting strict JSON code blocks first (most reliable)
    const jsonMatch = text.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) return JSON.parse(jsonMatch[1]);

    // 2. Try identifying the first outer-most bracket pair
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const candidate = text.slice(firstBrace, lastBrace + 1);
      return JSON.parse(candidate);
    }

    // 3. Fallback: Try regex (greedy)
    const regexMatch = text.match(/\{[\s\S]*\}/);
    if (regexMatch) return JSON.parse(regexMatch[0]);

    throw new Error('No JSON found in response');
  } catch (e) {
    console.error('[AI Parse Error] Message:', e.message);
    console.error('[AI Parse Error] Raw Snippet:', text.slice(0, 500));
    throw e;
  }
}

export function normalizeDimensions(parsed) {
  return DIMENSIONS.map((dim) => {
    let searchKey = dim.name;
    if (dim.name === 'Social Presence') searchKey = 'Social_Media_Reach';
    if (dim.name === 'Social Impact') searchKey = 'Environmental_Social_Governance';

    const found = parsed.dimensions?.find(d =>
      d.name === searchKey ||
      d.name === dim.name ||
      (dim.name !== 'Social Presence' && dim.name !== 'Social Impact' &&
        d.name?.toLowerCase().includes(dim.name.toLowerCase().split(' ')[0]))
    );
    return {
      dimension_name: dim.name,
      score: found?.score || 50,
      benchmark_score: dim.benchmark,
      insight_text: found?.insight || `No specific data for ${dim.name}`
    };
  });
}

export function extractRetryAfterSeconds(message = '') {
  const text = String(message || '');

  const directMatch = text.match(/retry in (\d+(?:\.\d+)?)s/i);
  if (directMatch?.[1]) {
    return Math.max(1, Math.ceil(Number.parseFloat(directMatch[1])));
  }

  const rpcMatch = text.match(/"retryDelay":"(\d+)s"/i);
  if (rpcMatch?.[1]) {
    return Math.max(1, Number.parseInt(rpcMatch[1], 10));
  }

  return null;
}

export function normalizeApiError(error, fallbackMessage = 'Unexpected error') {
  const rawMessage = String(error?.message || error || fallbackMessage);
  const isQuotaOrRateLimit = /(429|too many requests|quota exceeded|rate limit)/i.test(rawMessage);

  if (!isQuotaOrRateLimit) {
    return {
      status: 500,
      error: rawMessage,
      code: null,
      retryAfterSeconds: null
    };
  }

  const retryAfterSeconds = extractRetryAfterSeconds(rawMessage);
  const message = retryAfterSeconds
    ? `Gemini quota is currently exhausted. Please retry in about ${retryAfterSeconds} seconds.`
    : 'Gemini quota is currently exhausted. Please retry shortly or use a higher-quota API key.';

  return {
    status: 429,
    error: message,
    code: 'GEMINI_RATE_LIMIT',
    retryAfterSeconds
  };
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number.parseFloat(value);
  return Number.isFinite(num) ? num : null;
}

function toNullableInt(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number.parseInt(value, 10);
  return Number.isFinite(num) ? num : null;
}

function averageRatings(ratings = [], fallback = null) {
  const valid = ratings
    .map(toNullableNumber)
    .filter((value) => value !== null && value > 0 && value <= 5);

  if (!valid.length) {
    const fallbackValue = toNullableNumber(fallback);
    return fallbackValue && fallbackValue > 0 ? Number(fallbackValue.toFixed(1)) : null;
  }

  const avg = valid.reduce((sum, value) => sum + value, 0) / valid.length;
  return Number(avg.toFixed(1));
}

function sumReviewCounts(counts = [], fallback = null) {
  const valid = counts
    .map(toNullableInt)
    .filter((value) => value !== null && value > 0);

  if (!valid.length) {
    const fallbackValue = toNullableInt(fallback);
    return fallbackValue && fallbackValue > 0 ? fallbackValue : 0;
  }

  return valid.reduce((sum, value) => sum + value, 0);
}

function deriveSentiment(score) {
  const numeric = toNullableNumber(score);
  if (numeric === null) return 'Balanced';
  if (numeric >= 4) return 'Positive';
  if (numeric >= 3) return 'Balanced';
  return 'Negative';
}

function mergeTalentSentiment(companyName, identity, baseline, aiData, options = {}) {
  const includeIndeed = options.includeIndeed !== false;
  const glassdoorRating = toNullableNumber(baseline?.glassdoorRating ?? aiData?.glassdoorRating);
  const glassdoorReviews = toNullableInt(baseline?.glassdoorReviews ?? aiData?.glassdoorReviews);

  const indeedRating = includeIndeed ? toNullableNumber(aiData?.indeedRating) : null;
  const indeedReviews = includeIndeed ? toNullableInt(aiData?.indeedReviews) : null;

  const aggregatedScore = averageRatings([glassdoorRating, indeedRating], aiData?.aggregatedScore) ?? 0;
  const totalReviews = sumReviewCounts([glassdoorReviews, indeedReviews], aiData?.totalReviews);

  const workLifeBalance = toNullableNumber(aiData?.workLifeBalance ?? baseline?.workLifeBalance) ?? aggregatedScore;
  const careerOpportunities = toNullableNumber(aiData?.careerOpportunities ?? baseline?.careerOpportunities) ?? aggregatedScore;
  const compensation = toNullableNumber(aiData?.compensation ?? baseline?.compensation) ?? aggregatedScore;

  const keyThemes = Array.isArray(aiData?.keyThemes) && aiData.keyThemes.length
    ? aiData.keyThemes
    : ['Compensation', 'Career development', 'Work-life balance'];

  const sentiment = aiData?.sentiment || deriveSentiment(aggregatedScore);

  const sources = [];
  if (glassdoorRating !== null || glassdoorReviews !== null) {
    sources.push({
      name: 'Glassdoor',
      score: glassdoorRating,
      reviewCount: glassdoorReviews || 0,
      url: identity?.glassdoor?.url || baseline?.sourceUrl || null
    });
  }
  if (includeIndeed && (indeedRating !== null || indeedReviews !== null)) {
    sources.push({
      name: 'Indeed',
      score: indeedRating,
      reviewCount: indeedReviews || 0,
      url: identity?.indeed?.url || null
    });
  }

  if (!sources.length) {
    sources.push({
      name: 'Glassdoor',
      score: aggregatedScore,
      reviewCount: totalReviews || 0,
      url: identity?.glassdoor?.url || baseline?.sourceUrl || null
    });
  }

  const summary = aiData?.summary || (
    glassdoorRating !== null
      ? `Glassdoor baseline for ${identity?.canonicalCompanyName || companyName}: ${glassdoorRating}/5 from ${(glassdoorReviews || 0).toLocaleString()} reviews.`
      : `No verified Glassdoor rating found for ${identity?.canonicalCompanyName || companyName}; fallback sentiment signals are being used.`
  );

  return {
    glassdoorRating,
    glassdoorReviews,
    indeedRating,
    indeedReviews,
    aggregatedScore,
    totalReviews,
    workLifeBalance,
    careerOpportunities,
    compensation,
    sentiment,
    keyThemes,
    summary,
    sources,
    resolution: {
      canonicalCompanyName: identity?.canonicalCompanyName || companyName,
      confidence: identity?.confidence || 'low',
      glassdoorUrl: identity?.glassdoor?.url || null
    }
  };
}

export async function getVerifiedTalentSentiment(companyName, retryCount = 0) {
  const model = getGeminiModel();
  let identity = null;
  let glassdoorBaseline = null;
  let chapter2GlassdoorOnly = isChapter2Alias(companyName);

  try {
    identity = await resolveCompanyIdentity({ companyName, fetchImpl: fetch });
    chapter2GlassdoorOnly = chapter2GlassdoorOnly || isChapter2Alias(identity?.canonicalCompanyName || '');
    if (identity?.glassdoor?.url) {
      console.log(`[Resolver] ${companyName} -> ${identity.glassdoor.url} (confidence: ${identity.confidence})`);
    } else {
      console.log(`[Resolver] No Glassdoor URL confidently resolved for ${companyName}`);
    }
  } catch (resolverError) {
    console.warn('[Resolver] Company identity resolution failed:', resolverError.message);
  }

  try {
    glassdoorBaseline = await scrapeGlassdoorBaseline(identity, { fetchImpl: fetch });
    if (glassdoorBaseline?.glassdoorRating !== null || glassdoorBaseline?.glassdoorReviews !== null) {
      console.log(
        `[Glassdoor Baseline] ${companyName}: rating=${glassdoorBaseline?.glassdoorRating ?? 'n/a'} reviews=${glassdoorBaseline?.glassdoorReviews ?? 'n/a'}`
      );
    }
  } catch (baselineError) {
    console.warn('[Glassdoor Baseline] Failed:', baselineError.message);
  }

  if (!model) {
    return glassdoorBaseline
      ? mergeTalentSentiment(companyName, identity, glassdoorBaseline, null, { includeIndeed: !chapter2GlassdoorOnly })
      : null;
  }

  try {
    console.log(`[Gemini] Grounding: Fetching exact ${chapter2GlassdoorOnly ? 'Glassdoor' : 'Glassdoor/Indeed'} ratings for ${companyName}...`);

    const resolvedCompanyName = identity?.canonicalCompanyName || companyName;
    const resolvedGlassdoorUrl = identity?.glassdoor?.url || 'Unknown';
    const baselineContext = glassdoorBaseline
      ? JSON.stringify(glassdoorBaseline, null, 2)
      : 'No baseline captured.';

    const prompt = `GOAL: Find verified employer ratings for "${resolvedCompanyName}".
    
    RESOLVED COMPANY IDENTITY:
    - canonicalCompanyName: "${resolvedCompanyName}"
    - resolvedGlassdoorUrl: "${resolvedGlassdoorUrl}"
    - confidence: "${identity?.confidence || 'low'}"
    
    GLASSDOOR BASELINE SCRAPE:
    ${baselineContext}

    SEARCH STRATEGY:
    1. Verify the resolved Glassdoor company page first.
    ${chapter2GlassdoorOnly
      ? '2. For this company, use GLASSDOOR ONLY. Do not use Indeed.'
      : `2. Search Indeed for "${resolvedCompanyName}" ratings.`}
    3. Keep Glassdoor numbers anchored to the resolved identity.

    CRITICAL EXTRACTION:
    - Extract overall Glassdoor rating (1-5 scale).
    - ${chapter2GlassdoorOnly ? 'Set Indeed fields to null.' : 'Extract Indeed rating/review count if available.'}
    - Extract total review count for each platform used.
    - If text says "28k reviews", return 28000.
    - If text says "1.2k reviews", return 1200.
    - If baseline contains Glassdoor values, do not contradict them unless you have stronger explicit evidence.

    Return this exact JSON format (no markdown, no extra keys):
{
  "glassdoorRating": <decimal>,
  "glassdoorReviews": <integer>,
  "indeedRating": <decimal or null>,
  "indeedReviews": <integer or null>,
  "aggregatedScore": <average ratings or null>,
  "totalReviews": <sum reviews or 0>,
  "workLifeBalance": <sub-rating or null>,
  "careerOpportunities": <sub-rating or null>,
  "compensation": <sub-rating or null>,
  "sentiment": "Positive" or "Balanced" or "Negative" or "Neutral",
  "keyThemes": ["theme1", "theme2", "theme3"],
  "summary": "<short summary under 180 chars>"
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const aiData = JSON.parse(jsonMatch[0]);
      if (chapter2GlassdoorOnly) {
        aiData.indeedRating = null;
        aiData.indeedReviews = null;
      }
      return mergeTalentSentiment(companyName, identity, glassdoorBaseline, aiData, { includeIndeed: !chapter2GlassdoorOnly });
    }
  } catch (e) {
    if (e.message.includes('429') && retryCount < 2) {
      console.log(`[Gemini] Rate limited. Retrying in 5 seconds... (Attempt ${retryCount + 1})`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      return getVerifiedTalentSentiment(companyName, retryCount + 1);
    }
    console.warn('[Gemini] Sentiment lookup failed:', e.message);
  }
  return glassdoorBaseline
    ? mergeTalentSentiment(companyName, identity, glassdoorBaseline, null, { includeIndeed: !chapter2GlassdoorOnly })
    : null;
}

export async function getVerifiedCompanySize(companyName, retryCount = 0) {
  if (isChapter2Alias(companyName)) {
    const chapter2 = getChapter2Profile();
    return {
      totalEmployees: `${chapter2.companySizeApprox}`,
      reach: 'global embedded delivery model',
      formattedString: `Approx. ${chapter2.companySizeApprox} employees across a global embedded talent delivery model`,
      locations: Array.isArray(chapter2.coreLocations) ? chapter2.coreLocations : []
    };
  }

  const model = getGeminiModel();
  if (!model) return null;
  try {
    console.log(`[Gemini] Grounding Check: Searching for exact Company Size for ${companyName}...`);
    const prompt = `Find the current exact Total Employee count and KEY Corporate Hubs for "${companyName}".
        
        CRITICAL LOCATION RULE: "CORPORATE OFFICES ONLY"
        - EXCLUDE: Airport lounges, retail branches, service points, partner locations.
        - EXCLUDE: "Access to 1300+ lounges" - this is a product, NOT office locations.
        - FILTER: Only list cities with actual corporate offices (e.g. HQ, Tech Hubs).
        - MAX LIMIT: Return maximum 12 key locations.

        Return ONLY a JSON object (no markdown) in this format:
        {
            "totalEmployees": "2,300+",
            "reach": "14 countries",
            "formattedString": "2,300+ employees across 14 countries",
            "locations": ["London, UK", "Guangzhou, China", "Hong Kong"] 
        }
        
        Source from LinkedIn, official "About Us", or recent annual reports.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    if (e.message.includes('429') && retryCount < 2) {
      console.log(`[Gemini] Rate limited. Retrying in 5 seconds... (Attempt ${retryCount + 1})`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      return getVerifiedCompanySize(companyName, retryCount + 1);
    }
    console.warn('[Gemini] Company Size lookup failed:', e.message);
  }
  return null;
}

export const DEEP_DIVE_SYSTEM_PROMPT = `You are InsightsGPT, a specialist AI that generates comprehensive talent acquisition intelligence reports with advanced competitive analysis and role-specific insights. Your task is to research and provide detailed, accurate information about companies for talent acquisition purposes.
IMPORTANT: YOU MUST USE BRITISH (UK) ENGLISH SPELLING AND TERMINOLOGY AT ALL TIMES (e.g., 'programme' not 'program', 'optimise' not 'optimize', 'centre' not 'center').

- TECH STACK: Scan specifically for "Engineering Manager", "Full Stack Developer", "Data Scientist", "Platform Engineer" job descriptions. 
  * STRICT EXCLUSION LIST: DO NOT include internal tools like Workday, Cornerstone, Salesforce, SAP, Oracle HR, LMS, HRIS, Microsoft Office, Visio, Teams, Zoom, SharePoint.
  * YOUR GOAL: Find the "Product Engineering Stack".
  * Languages: (e.g. Java, Python, TypeScript, C#, Go)
  * Frameworks: (e.g. React, Node.js, .NET Core, Next.js, Spring Boot)
  * Cloud/Infra: (e.g. AWS, Azure, GCP, Kubernetes, Terraform, Docker)
  * Data: (e.g. MongoDB, Snowflake, SQL, Kafka, Redis)
  * IF you find a stack acronym like MERN, you MUST list out the components: "MongoDB, Express, React, Node.js".

- PRODUCTS: Identify the company's FLAGSHIP consumer brands, B2B platforms, or key service lines. Provide specific product names where possible.
- CORE CAPABILITIES: Look for "What we do", "Our Solutions", "Services", "Sectors" or "About Us" sections.
  * INSTRUCTION: Extract the actual business lines (e.g. "Airport Experiences", "Loyalty Management", "Travel Insurance", "Investment Solutions") rather than generic corporate terms (like "Stakeholder Management" or "Strategic Thinking").
  * Look for the "Menu" or "Navigation" of their website which often lists these categories.

- LOCATIONS: You MUST perform a deep search to find the company's "Our presence", "Global locations", "Offices", or "Contact Us" page.
  * STRICT RULE: List ALL operational hubs and cities found globally. Do not stop at the HQ.
  * Search iteratively for regions: "United Kingdom", "United States", "Europe", "Asia Pacific", "Middle East".
  * MANDATORY: Provide the City and Country for each (e.g. "London, UK", "New York, USA", "Sydney, Australia").
  * ANTI-HALLUCINATION RULE: Do NOT list "Service Locations" as offices.
    - For travel companies (e.g. Collinson), do NOT list airport lounges.
    - For logistics (e.g. DHL), do NOT list every drop-off point.
    - For retail, do NOT list every shop.
    - ONLY list Corporate Offices where white-collar staff are based.

ABSOLUTELY CRITICAL RULE: DO NOT INVENT OR GENERATE FAKE NAMES, FAKE PEOPLE, OR FAKE EMPLOYEE DATA. For talent movement data (recentJoins, recentExits), you MUST ALWAYS return empty arrays []. Never create fictional employee names or movement data.

COMPETITOR EXCLUSION RULE: When identifying competitors, DO NOT include products, sub-brands, or subsidiaries of the target company. For example, if the target is "Collinson Group", "Priority Pass" and "LoungeKey" are NOT competitors; they are products. Only provide external business rivals.

CURRENCY REQUIREMENT: ALL MONETARY VALUES MUST BE IN GBP STERLING (£). Use the format "£X,XXX - £XX,XXX" for salary ranges and "£X,XXX" for specific amounts. Convert all costs and salaries to British Pounds.

For each company requested, provide the following information in a structured JSON format:

{
  "companyName": "string",
  "locations": ["array of office locations"],
  "companySize": "string (e.g., '10,000-50,000 employees')",
  "keyProducts": ["array of main products/services"],
  "jobsAdvertised": number,
  "complexityRating": number (1-5),
  "techStack": [
    {
      "name": "string (e.g., 'React')",
      "proficiency": number,
      "importance": number,
      "marketDemand": "high/medium/low"
    }
  ],
  "coreCapabilities": [
      {
        "name": "capability name (Business Line/Sector, NOT soft skill)",
        "importance": number (1-10),
        "marketDemand": "high/medium/low"
      }
  ],
  "projectIntelligence": [
    {
      "category": "string (e.g., 'Strategic Initiatives', 'Product Development', 'Technology Modernization')",
      "title": "string (project/initiative name)",
      "description": "string (detailed description of the project)",
      "status": "string (e.g., 'Active', 'Planning', 'Completed', 'On Hold')",
      "timeline": "string (e.g., 'Q1 2024 - Q3 2024')",
      "businessImpact": "string (expected or actual business impact)",
      "technicalDetails": "string (technical aspects, technologies used)",
      "teamSize": "string (estimated team size if available)",
      "investmentLevel": "string (e.g., 'High', 'Medium', 'Low' or amount in GBP if public)"
    }
  ],
  "salaryData": {
    "averageSalary": "string IN GBP (e.g., '£65,000 - £95,000')",
    "roleSpecificSalary": "string IN GBP (role-specific salary if requested)",
    "sources": [
      {
        "name": "source name (e.g., 'Glassdoor')",
        "salary": "string IN GBP (specific salary range from this source)",
        "url": "string (reference URL if available)"
      }
    ],
    "competitorComparison": [
      {
        "company": "competitor name",
        "salary": "salary range IN GBP",
        "source": "data source",
        "percentileRank": number (10-90)
      }
    ],
    "salaryProgression": [
      {
        "level": "experience level",
        "salary": "salary range IN GBP",
        "yearsExperience": "years of experience"
      }
    ]
  },
  "costOfLiving": {
    "overallIndex": number (100 = average, higher = more expensive),
    "comparedToAverage": "string (e.g., '25% above national average')",
    "breakdown": {
      "housing": "string IN GBP (cost range and percentage of income)",
      "food": "string IN GBP (monthly food costs)",
      "transportation": "string IN GBP (monthly transportation costs)",
      "healthcare": "string IN GBP (average healthcare costs)",
      "utilities": "string IN GBP (average utility costs)"
    },
    "monthlyExpenses": "string IN GBP (total estimated monthly expenses)",
    "qualityOfLifeIndex": number (1-100, higher is better)
  },
  "costToHire": {
    "baseSalary": "string IN GBP (average salary for the role)",
    "employerTaxes": "string IN GBP (payroll taxes, national insurance, etc.)",
    "benefits": "string IN GBP (health insurance, pension, PTO, etc.)",
    "recruitmentCosts": "string IN GBP (job postings, recruiter fees, etc.)",
    "onboardingCosts": "string IN GBP (training, equipment, setup costs)",
    "totalAnnualCost": "string IN GBP (sum of all hiring costs)",
    "breakdown": "string (explanation of cost components and percentages)"
  },
  "competitors": [
    {
      "name": "competitor name",
      "reason": "why they are a competitor",
      "salaryComparison": "salary comparison vs target company IN GBP",
      "techStackOverlap": number (0-100 percentage),
      "hiringVelocity": "hiring pace description"
    }
  ],
  "roleInsights": {
    "requestedRole": "job title if specified",
    "seniorityLevel": "seniority if specified", 
    "demandScore": number (1-10),
    "geographicSpread": [
      {
        "location": "city/region",
        "percentage": number,
        "openRoles": number
      }
    ],
    "hiringTrends": {
      "recentHires": number,
      "monthlyGrowth": "growth percentage",
      "retentionRate": "percentage"
    }
  },
  "talentMovement": {
    "recentJoins": [],
    "recentExits": [],
    "poachingPatterns": [
      {
        "company": "competitor name",
        "direction": "incoming or outgoing",
        "count": number,
        "trend": "increasing/stable/decreasing"
      }
    ],
    "dataAvailability": "limited - no individual movement data available"
  },
  "benchmarkScore": {
    "overall": number (1-100),
    "compensation": number (1-100),
    "hiringVolume": number (1-100),
    "techModernity": number (1-100),
    "employeeReviews": number (1-100),
    "marketSentiment": number (1-100),
    "breakdown": "explanation of scores"
  },
  "talentSentiment": {
    "sources": [
      {
        "name": "source name (e.g., 'Glassdoor', 'Indeed', 'Comparably', 'Blind', 'LinkedIn')",
        "score": number (1-5),
        "reviewCount": number,
        "url": "string (reference URL if available)"
      }
    ],
    "aggregatedScore": number (1-5, average across all sources. SEARCH GLASSDOOR/INDEED EXACTLY. IF NOT FOUND, RETURN 0. DO NOT GUESS.),
    "totalReviews": number (sum across all sources),
    "sentiment": "positive/neutral/negative",
    "keyThemes": ["array of themes from all sources"],
    "workLifeBalance": number (1-5),
    "careerOpportunities": number (1-5),
    "compensation": number (1-5)
  }
}

IMPORTANT: For salary data, research and include information from exactly 5 different sources such as Glassdoor, PayScale, Salary.com, Indeed, LinkedIn Salary Insights, or other reputable salary databases. Calculate a comprehensive average salary range based on these sources. Include the specific salary ranges from each source with proper attribution. ALL SALARIES MUST BE IN GBP (£).

STRICT JSON RULE: For techStack and coreCapabilities, you MUST use the key "name" (lowercase) for the technology or skill name.
CRITICAL: coreCapabilities MUST be populated with COMPANY BUSINESS LINES (e.g. "Insurance", "Loyalty"), NOT soft skills.

CRITICAL: For techStack, do NOT use generic terms or internal tools (Workday, LMS). FOCUS ON PRODUCT ENGINEERING.

CRITICAL: For projectIntelligence, provide 8-12 detailed project entries covering various categories such as Strategic Initiatives, Product Development, Technology Modernization, etc.

FINAL REMINDER: TALENT MOVEMENT ARRAYS MUST BE EMPTY.
STRICT OUTPUT RULES: Return ONLY a single valid JSON object that conforms exactly to the specified schema. No markdown, no code fences.`;


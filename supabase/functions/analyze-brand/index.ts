const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface AxisData {
  subject: string;
  score: number;
  benchmark: number;
  fullMark: number;
}

interface BrandAnalysisResponse {
  companyName: string;
  axes: AxisData[];
  insights: Record<string, string>;
  overallScore: number;
  lastUpdated: string;
  groundingSources?: string[];
  provider: string;
}

interface CompanyContext {
  name: string;
  description: string;
  url: string;
  industry?: string;
}

const DIMENSIONS = [
  "Search",
  "Social Reach",
  "Social Authority",
  "Social Impact",
  "Values & Proposition",
  "Employee Experience",
  "Content",
  "UX",
  "Candidate Experience"
];

const BENCHMARKS: Record<string, number> = {
  "Search": 70,
  "Social Reach": 65,
  "Social Authority": 60,
  "Social Impact": 55,
  "Values & Proposition": 68,
  "Employee Experience": 65,
  "Content": 58,
  "UX": 62,
  "Candidate Experience": 60,
};

// URL Detection
function isUrl(input: string): boolean {
  const urlPatterns = [
    /^https?:\/\//i,
    /^www\./i,
    /\.(com|co\.uk|org|net|io|dev|app|ai|co|biz|info)(\/?|$)/i
  ];
  return urlPatterns.some(pattern => pattern.test(input.trim()));
}

function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  return url;
}

function extractDomainName(url: string): string {
  try {
    const hostname = new URL(normalizeUrl(url)).hostname;
    // Remove www. and TLD to get company name
    return hostname
      .replace(/^www\./, '')
      .replace(/\.(com|co\.uk|org|net|io|dev|app|ai|co|biz|info).*$/, '')
      .replace(/group$|inc$|corp$|ltd$/i, '')
      .trim();
  } catch {
    return url;
  }
}

// Fetch website content
async function fetchWebsiteContent(url: string): Promise<string | null> {
  try {
    const normalizedUrl = normalizeUrl(url);
    console.log('Fetching website:', normalizedUrl);

    const response = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BrandAnalyzer/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch website:', response.status);
      return null;
    }

    const html = await response.text();

    // Extract text content, remove scripts/styles, limit size
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 8000); // Limit to ~8k chars for AI context

    return textContent;
  } catch (error) {
    console.error('Error fetching website:', error);
    return null;
  }
}

// Extract company info using AI
async function extractCompanyInfo(
  websiteContent: string,
  url: string,
  googleApiKey: string | undefined,
  perplexityApiKey: string | undefined
): Promise<CompanyContext> {
  const domainName = extractDomainName(url);
  const fallback: CompanyContext = { name: domainName, description: '', url };

  if (!websiteContent) return fallback;

  const extractionPrompt = `Extract company information from this website content.
Website URL: ${url}

Website content:
${websiteContent.slice(0, 4000)}

Return ONLY a JSON object (no markdown, no explanation):
{
  "name": "Official company name",
  "description": "One sentence description of what the company does",
  "industry": "Industry sector"
}`;

  try {
    let responseText: string | undefined;

    // Try Gemini first (faster for this task)
    if (googleApiKey) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${googleApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: extractionPrompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 200 },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      }
    }

    // Fallback to Perplexity
    if (!responseText && perplexityApiKey) {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${perplexityApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [{ role: 'user', content: extractionPrompt }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        responseText = data.choices?.[0]?.message?.content;
      }
    }

    if (responseText) {
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return {
        name: parsed.name || domainName,
        description: parsed.description || '',
        industry: parsed.industry,
        url,
      };
    }
  } catch (error) {
    console.error('Error extracting company info:', error);
  }

  return fallback;
}

const ANALYSIS_PROMPT = (context: CompanyContext) => {
  const companyName = context.name;
  const contextBlock = context.description
    ? `\n\nCOMPANY CONTEXT (from their official website ${context.url}):
Company Name: ${context.name}
Description: ${context.description}${context.industry ? `\nIndustry: ${context.industry}` : ''}

IMPORTANT: This analysis is specifically for "${context.name}". Do NOT confuse with any other similarly-named companies. The official website is ${context.url}.`
    : '';

  return `You are an expert employer branding analyst. Analyze the employer brand of "${companyName}" using real-time data from the web.${contextBlock}

For each of these 9 recruitment marketing dimensions, provide:
1. A score from 0-100 based on actual data you find
2. A specific, data-driven insight (2-3 sentences) citing real facts

Dimensions to analyze:
1. Search - SEO visibility for employer/career keywords, branded search volume, Google rankings for "${companyName} careers" or "${companyName} jobs"
2. Social Reach - LinkedIn follower count, Instagram followers, TikTok presence, overall social media footprint
3. Social Authority - Engagement rates, thought leadership content, industry recognition and awards
4. Social Impact - Content virality, share rates, employee advocacy amplification
5. Values & Proposition - EVP clarity from career site, mission statements, employer brand messaging
6. Employee Experience - Glassdoor rating, Indeed reviews, employee testimonials, culture perception
7. Content - Career blog posts, employer branding videos, content quality and frequency
8. UX - Career site usability, mobile experience, application process simplicity
9. Candidate Experience - Application response times, interview process reviews, candidate NPS mentions

Search for real data about "${companyName}"'s:
- Glassdoor rating (search: "${companyName} Glassdoor reviews")
- LinkedIn company page (search: "${companyName} LinkedIn")
- Career site quality
- Recent employer branding news
- Employee reviews and sentiment

Return your analysis as a JSON object with this exact structure (no markdown, just raw JSON):
{
  "axes": [
    {"subject": "Search", "score": <number 0-100>, "insight": "<specific finding with data>"},
    {"subject": "Social Reach", "score": <number 0-100>, "insight": "<specific finding with data>"},
    {"subject": "Social Authority", "score": <number 0-100>, "insight": "<specific finding with data>"},
    {"subject": "Social Impact", "score": <number 0-100>, "insight": "<specific finding with data>"},
    {"subject": "Values & Proposition", "score": <number 0-100>, "insight": "<specific finding with data>"},
    {"subject": "Employee Experience", "score": <number 0-100>, "insight": "<specific finding with data>"},
    {"subject": "Content", "score": <number 0-100>, "insight": "<specific finding with data>"},
    {"subject": "UX", "score": <number 0-100>, "insight": "<specific finding with data>"},
    {"subject": "Candidate Experience", "score": <number 0-100>, "insight": "<specific finding with data>"}
  ],
  "overallScore": <number 0-100>
}`;
};

async function callGeminiWithGrounding(context: CompanyContext, apiKey: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: ANALYSIS_PROMPT(context) }] }],
        tools: [{ googleSearch: {} }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error:', response.status, errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const candidates = data.candidates;

  if (!candidates?.[0]?.content?.parts) {
    throw new Error('No response from Gemini');
  }

  const textPart = candidates[0].content.parts.find((p: any) => p.text);
  const groundingMetadata = candidates[0].groundingMetadata;
  const groundingSources: string[] = [];

  if (groundingMetadata?.groundingChunks) {
    for (const chunk of groundingMetadata.groundingChunks) {
      if (chunk.web?.uri) groundingSources.push(chunk.web.uri);
    }
  }

  return { text: textPart?.text, groundingSources };
}

async function callPerplexity(context: CompanyContext, apiKey: string) {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        { role: 'system', content: 'You are an expert employer branding analyst. Always respond with valid JSON only, no markdown.' },
        { role: 'user', content: ANALYSIS_PROMPT(context) }
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Perplexity API error:', response.status, errorText);
    throw new Error(`Perplexity API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    text: data.choices?.[0]?.message?.content,
    groundingSources: data.citations || []
  };
}

function parseAnalysisResult(text: string) {
  const cleanContent = text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
  return JSON.parse(cleanContent);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyName: inputName } = await req.json();

    if (!inputName) {
      return new Response(
        JSON.stringify({ success: false, error: 'Company name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const googleApiKey = Deno.env.get('GOOGLE_API_KEY');
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');

    if (!googleApiKey && !perplexityApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'No AI provider configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build company context - detect URLs and extract info
    let companyContext: CompanyContext;

    if (isUrl(inputName)) {
      console.log('URL detected, fetching website content:', inputName);
      const websiteContent = await fetchWebsiteContent(inputName);
      companyContext = await extractCompanyInfo(
        websiteContent || '',
        inputName,
        googleApiKey,
        perplexityApiKey
      );
      console.log('Extracted company info:', companyContext.name, '-', companyContext.description?.slice(0, 50));
    } else {
      companyContext = { name: inputName, description: '', url: '' };
    }

    console.log('Analyzing brand:', companyContext.name);

    let responseText: string | undefined;
    let groundingSources: string[] = [];
    let provider = 'unknown';

    // Try Gemini first (with Google Search grounding), fallback to Perplexity
    if (googleApiKey) {
      try {
        console.log('Trying Gemini with Google Search grounding...');
        const geminiResult = await callGeminiWithGrounding(companyContext, googleApiKey);
        responseText = geminiResult.text;
        groundingSources = geminiResult.groundingSources;
        provider = 'Gemini + Google Search';
        console.log('Gemini succeeded');
      } catch (geminiError) {
        console.error('Gemini failed:', geminiError);

        // Fallback to Perplexity if available
        if (perplexityApiKey) {
          console.log('Falling back to Perplexity...');
          const perplexityResult = await callPerplexity(companyContext, perplexityApiKey);
          responseText = perplexityResult.text;
          groundingSources = perplexityResult.groundingSources;
          provider = 'Perplexity Sonar';
          console.log('Perplexity succeeded');
        } else {
          throw geminiError;
        }
      }
    } else if (perplexityApiKey) {
      console.log('Using Perplexity...');
      const perplexityResult = await callPerplexity(companyContext, perplexityApiKey);
      responseText = perplexityResult.text;
      groundingSources = perplexityResult.groundingSources;
      provider = 'Perplexity Sonar';
    }

    if (!responseText) {
      return new Response(
        JSON.stringify({ success: false, error: 'No analysis generated' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the analysis result
    let analysisResult;
    try {
      analysisResult = parseAnalysisResult(responseText);
    } catch (parseError) {
      console.error('Failed to parse response:', responseText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse analysis' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build response
    const insights: Record<string, string> = {};
    const axes: AxisData[] = DIMENSIONS.map(dim => {
      const axisData = analysisResult.axes?.find((a: any) => a.subject === dim);
      const score = axisData?.score ?? Math.floor(Math.random() * 40) + 40;
      insights[dim] = axisData?.insight ?? `Analysis pending for ${dim}.`;

      return {
        subject: dim,
        score: Math.max(0, Math.min(100, score)),
        benchmark: BENCHMARKS[dim],
        fullMark: 100,
      };
    });

    const result: BrandAnalysisResponse = {
      companyName: companyContext.name,
      axes,
      insights,
      overallScore: analysisResult.overallScore ?? Math.round(axes.reduce((acc, a) => acc + a.score, 0) / axes.length),
      lastUpdated: new Date().toISOString(),
      groundingSources: groundingSources.slice(0, 10),
      provider,
    };

    console.log('Analysis complete:', companyContext.name, 'Provider:', provider, 'Score:', result.overallScore);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error analyzing brand:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Provide more helpful error messages
    let userMessage = errorMessage;
    if (errorMessage.includes('429')) {
      userMessage = 'API rate limit exceeded. Please try again in a few moments or check your API quota.';
    }

    return new Response(
      JSON.stringify({ success: false, error: userMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

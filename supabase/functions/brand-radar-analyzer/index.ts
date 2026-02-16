import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface PerplexityResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  citations?: string[];
}

interface DimensionResult {
  name: string;
  score: number;
  benchmark: number;
  insight: string;
}

const DIMENSIONS = [
  { name: 'Search', benchmark: 70 },
  { name: 'Social Reach', benchmark: 65 },
  { name: 'Social Authority', benchmark: 60 },
  { name: 'Social Impact', benchmark: 55 },
  { name: 'Values & Proposition', benchmark: 68 },
  { name: 'Employee Experience', benchmark: 65 },
  { name: 'Content', benchmark: 58 },
  { name: 'UX', benchmark: 62 },
  { name: 'Candidate Experience', benchmark: 60 }
];

async function queryPerplexity(
  query: string,
  apiKey: string,
  systemPrompt?: string,
  options?: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
    search_recency_filter?: 'day' | 'week' | 'month' | 'year';
    search_domain_filter?: string[];
    response_format?: unknown;
  }
): Promise<{ content: string; citations: string[] }> {
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options?.model ?? 'sonar',
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: query }
        ],
        search_recency_filter: options?.search_recency_filter ?? 'month',
        ...(typeof options?.temperature === 'number' ? { temperature: options.temperature } : {}),
        ...(typeof options?.max_tokens === 'number' ? { max_tokens: options.max_tokens } : {}),
        ...(Array.isArray(options?.search_domain_filter) ? { search_domain_filter: options.search_domain_filter } : {}),
        ...(options?.response_format ? { response_format: options.response_format } : {}),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data: PerplexityResponse = await response.json();
    return {
      content: data.choices?.[0]?.message?.content || '',
      citations: data.citations || []
    };
  } catch (error) {
    console.error('Error querying Perplexity:', error);
    return { content: '', citations: [] };
  }
}

async function callGeminiGrounding(companyName: string, apiKey: string): Promise<{ text: string; sources: string[] }> {
  try {
    const prompt = `Analyse the employer brand of "${companyName}".
        1. Find their Glassdoor/Indeed ratings, LinkedIn presence, and key cultural themes.
        2. Identify active social media platforms.
        Summarise concisely. USE BRITISH (UK) ENGLISH.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          tools: [{ googleSearch: {} }],
        }),
      }
    );

    if (!response.ok) return { text: '', sources: [] };
    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const sources: string[] = [];
    const metadata = data.candidates?.[0]?.groundingMetadata;
    if (metadata?.groundingChunks) {
      for (const chunk of metadata.groundingChunks) {
        if (chunk.web?.uri) sources.push(chunk.web.uri);
      }
    }
    return { text: content, sources };
  } catch (e) {
    console.error('Gemini grounding failed:', e);
    return { text: '', sources: [] };
  }
}

function parseJsonObjectFromText(text: string): unknown {
  // Remove markdown code blocks if present
  let content = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  // Fast path: looks like pure JSON
  if (content.startsWith('{') && content.endsWith('}')) {
    return JSON.parse(content);
  }

  // Robust extraction: find first balanced JSON object
  const jsonStart = content.indexOf('{');
  if (jsonStart === -1) throw new Error('No JSON object found in response');

  let depth = 0;
  let jsonEnd = -1;
  for (let i = jsonStart; i < content.length; i++) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') {
      depth--;
      if (depth === 0) {
        jsonEnd = i + 1;
        break;
      }
    }
  }

  if (jsonEnd === -1) throw new Error('No matching closing brace found');
  return JSON.parse(content.substring(jsonStart, jsonEnd));
}

function extractDomainName(url: string): string {
  try {
    const hostname = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
    return hostname
      .replace(/^www\./, '')
      .replace(/\.(com|co\.uk|org|net|io|dev|app|ai|co|biz|info).*$/, '')
      .split('.')
      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  } catch {
    return url;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyUrl } = await req.json();

    if (!companyUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'Company URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!perplexityApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'PERPLEXITY_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 0: Check Cache (Optimization)
    // We check if there are recent results for this URL to avoid expensive API calls
    const { forceRefresh } = await req.json().catch(() => ({}));

    if (!forceRefresh) {
      console.log('Checking cache for:', companyUrl);
      const { data: cachedRows, error: cacheError } = await supabase
        .from('brand_radar_scores')
        .select('*')
        .eq('company_url', companyUrl);

      if (!cacheError && cachedRows && cachedRows.length >= 5) {
        // Check if data is stale (older than 7 days)
        // We take the most recent update time from the rows
        const lastUpdateStr = cachedRows[0].last_updated;
        const lastUpdate = new Date(lastUpdateStr);
        const now = new Date();
        const daysDiff = (now.getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24);

        if (daysDiff < 7) {
          console.log(`Cache hit! Data is ${daysDiff.toFixed(1)} days old.`);

          // Reconstruct the response from DB rows
          const companyName = cachedRows[0].company_name;
          const dimensions = cachedRows.map(row => ({
            name: row.dimension_name,
            score: row.score,
            benchmark: row.benchmark_score,
            insight: row.insight_text
          }));

          // Recalculate overall score
          const overallScore = Math.round(dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length);

          // Get sources (taken from the first row as they are common)
          const sources = cachedRows[0].grounding_sources || [];

          return new Response(
            JSON.stringify({
              success: true,
              data: {
                companyName,
                companyUrl,
                industry: "Cached Analysis", // Industry is not stored in scores table, but needed for types?
                overallScore,
                dimensions: dimensions.map(d => ({
                  dimension_name: d.name,
                  score: d.score,
                  benchmark_score: d.benchmark,
                  insight_text: d.insight,
                  grounding_sources: sources
                })),
                sources: sources,
                analyzedAt: lastUpdateStr,
                provider: "Cached Result"
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          console.log(`Cache stale. Data is ${daysDiff.toFixed(1)} days old. Refreshing...`);
        }
      } else {
        console.log('No cache found or incomplete data.');
      }
    }

    // Step 1: Extract company info (1 API call)
    console.log('Step 1: Extracting company info from:', companyUrl);
    const companyInfoResult = await queryPerplexity(
      `What is the official company name and industry sector for the company at ${companyUrl}? Return ONLY JSON: {"name": "Company Name", "industry": "Industry"}`,
      perplexityApiKey
    );

    let companyName = extractDomainName(companyUrl);
    let industry = 'Unknown';

    try {
      const jsonMatch = companyInfoResult.content.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        companyName = parsed.name || companyName;
        industry = parsed.industry || industry;
      }
    } catch (e) {
      console.log('Could not parse company info, using fallback');
    }

    console.log('Company:', companyName, '| Industry:', industry);

    // Step 1.5: Grounding with Gemini Search (Native Grounding)
    let googleContextString = "";
    let groundingSources: string[] = [];
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_API_KEY'); // Use whichever is available

    if (geminiApiKey) {
      console.log('Step 1.5: Grounding with Gemini Search...');
      try {
        const geminiResult = await callGeminiGrounding(companyName, geminiApiKey);
        googleContextString = geminiResult.text;
        groundingSources = geminiResult.sources;
        console.log(`Found ${groundingSources.length} grounding sources from Gemini.`);
      } catch (e) {
        console.error('Gemini grounding failed:', e);
      }
    }

    // Step 2: Single comprehensive employer brand analysis with retry
    console.log('Step 2: Running comprehensive employer brand analysis');

    const analysisPrompt = `You are an employer brand analyst. Analyze ${companyName} (${industry} industry).

${googleContextString ? `USE THESE VERIFIED SOURCES FOR GROUNDING:\n${googleContextString}\n` : ''}

CRITICAL: You MUST respond with ONLY a JSON object. No explanations, no text, no markdown. Just pure JSON.

CRITICAL: Do NOT include bracketed citation markers like [1] or [2] in any insight text.

Even if data is limited, estimate scores based on available signals. Never refuse - always provide your best assessment.

Score these 9 dimensions (0-100 scale) based on ${companyName}'s employer brand:

1. Search - SEO visibility for "${companyName} careers/jobs"
2. Social Reach - LinkedIn followers, social media presence
3. Social Authority - Industry recognition, executive visibility
4. Social Impact - Content engagement, employee advocacy
5. Values & Proposition - EVP clarity, mission messaging
6. Employee Experience - Glassdoor/Indeed ratings, review sentiment
7. Content - Career blog, employee testimonials, videos
8. UX - Career site quality, mobile experience
9. Candidate Experience - Interview reviews, hiring process

RESPOND WITH THIS EXACT JSON FORMAT (no other text):
{"dimensions":[{"name":"Search","score":50,"insight":"Brief finding"},{"name":"Social Reach","score":50,"insight":"Brief finding"},{"name":"Social Authority","score":50,"insight":"Brief finding"},{"name":"Social Impact","score":50,"insight":"Brief finding"},{"name":"Values & Proposition","score":50,"insight":"Brief finding"},{"name":"Employee Experience","score":50,"insight":"Brief finding"},{"name":"Content","score":50,"insight":"Brief finding"},{"name":"UX","score":50,"insight":"Brief finding"},{"name":"Candidate Experience","score":50,"insight":"Brief finding"}],"overallScore":50}`;

    // Retry up to 2 times if we don't get valid JSON
    let analysisResult = { content: '', citations: [] as string[] };
    let parseSuccess = false;

    const analysisResponseFormat = {
      type: 'json_schema',
      json_schema: {
        name: 'employer_brand_analysis',
        schema: {
          type: 'object',
          properties: {
            dimensions: {
              type: 'array',
              minItems: 9,
              maxItems: 9,
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  score: { type: 'number', minimum: 0, maximum: 100 },
                  insight: { type: 'string' },
                },
                required: ['name', 'score', 'insight'],
                additionalProperties: false,
              },
            },
            overallScore: { type: 'number', minimum: 0, maximum: 100 },
          },
          required: ['dimensions', 'overallScore'],
          additionalProperties: false,
        },
      },
    };

    for (let attempt = 1; attempt <= 2 && !parseSuccess; attempt++) {
      console.log(`Perplexity API attempt ${attempt}`);
      analysisResult = await queryPerplexity(
        analysisPrompt,
        perplexityApiKey,
        'You are a JSON-only responder. Output valid JSON only. No text explanations. If you cannot find specific data, estimate reasonable scores based on industry context.',
        {
          response_format: analysisResponseFormat,
          temperature: 0.2,
          max_tokens: 1200,
        }
      );

      // Quick check if response looks like JSON
      const trimmed = analysisResult.content.trim();
      if (trimmed.startsWith('{') && trimmed.includes('"dimensions"')) {
        parseSuccess = true;
        console.log(`Got JSON-like response on attempt ${attempt}`);
      } else {
        console.log(`Attempt ${attempt} did not return JSON, retrying...`);
      }
    }

    // Parse the analysis result with robust JSON extraction
    let dimensions: DimensionResult[] = [];
    let overallScore = 50;

    console.log('Raw Perplexity response length:', analysisResult.content.length);

    try {
      const parsed = parseJsonObjectFromText(analysisResult.content) as any;

      if (parsed.dimensions && Array.isArray(parsed.dimensions)) {
        console.log('Found', parsed.dimensions.length, 'dimensions in response');
        dimensions = parsed.dimensions.map((d: any, i: number) => ({
          name: d.name || DIMENSIONS[i]?.name || `Dimension ${i + 1}`,
          score: Math.max(0, Math.min(100, typeof d.score === 'number' ? d.score : 50)),
          benchmark: DIMENSIONS.find(dim => dim.name === d.name)?.benchmark ?? DIMENSIONS[i]?.benchmark ?? 60,
          insight: (typeof d.insight === 'string' && d.insight.trim()) ? d.insight.trim() : 'Analysis in progress.'
        }));
        overallScore = typeof parsed.overallScore === 'number'
          ? parsed.overallScore
          : Math.round(dimensions.reduce((sum, d) => sum + d.score, 0) / Math.max(dimensions.length, 1));
        console.log('Successfully parsed dimensions, overall score:', overallScore);
      } else {
        console.error('No dimensions array found in parsed JSON');
        throw new Error('Invalid response structure');
      }
    } catch (e) {
      console.error('Error parsing analysis:', e);
      console.error('Response preview:', analysisResult.content.substring(0, 500));
      // Use defaults if parsing fails
      dimensions = DIMENSIONS.map(d => ({
        name: d.name,
        score: 50,
        benchmark: d.benchmark,
        insight: 'Unable to gather specific data. Please try again.'
      }));
    }

    // Ensure we have all 9 dimensions
    if (dimensions.length < 9) {
      const existingNames = new Set(dimensions.map(d => d.name));
      for (const dim of DIMENSIONS) {
        if (!existingNames.has(dim.name)) {
          dimensions.push({
            name: dim.name,
            score: 50,
            benchmark: dim.benchmark,
            insight: 'Data not available for this dimension.'
          });
        }
      }
    }

    console.log('Analysis complete. Overall score:', overallScore);

    // Step 3: Store results in database
    console.log('Step 3: Storing results');

    for (const dim of dimensions) {
      const { error: upsertError } = await supabase
        .from('brand_radar_scores')
        .upsert({
          company_url: companyUrl,
          company_name: companyName,
          dimension_name: dim.name,
          score: dim.score,
          benchmark_score: dim.benchmark,
          insight_text: dim.insight,
          grounding_sources: groundingSources.slice(0, 10),
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'company_url,dimension_name'
        });

      if (upsertError) {
        console.error('Error upserting score:', upsertError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          companyName,
          companyUrl,
          industry,
          overallScore,
          dimensions: dimensions.map(d => ({
            dimension_name: d.name,
            score: d.score,
            benchmark_score: d.benchmark,
            insight_text: d.insight,
            grounding_sources: groundingSources.slice(0, 10)
          })),
          sources: analysisResult.citations,
          analyzedAt: new Date().toISOString()
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in brand-radar-analyzer:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

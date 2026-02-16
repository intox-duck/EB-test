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

interface DimensionInsight {
  dimension: string;
  score: number;
  benchmark: number;
  insightText: string;
  sourceUrls: string[];
  recommendations: string[];
  confidenceLevel: 'high' | 'medium' | 'low';
}

const DIMENSION_BENCHMARKS: Record<string, number> = {
  'Search': 70,
  'Social Reach': 65,
  'Social Authority': 60,
  'Social Impact': 55,
  'Values & Proposition': 68,
  'Employee Experience': 65,
  'Content': 58,
  'UX': 62,
  'Candidate Experience': 60
};

async function queryPerplexity(
  query: string,
  apiKey: string,
  systemPrompt?: string
): Promise<{ content: string; citations: string[] }> {
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: query }
        ],
        search_recency_filter: 'month',
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
    const { companyUrl, dimensions } = await req.json();

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

    // Step 1: Get company info (1 API call)
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

    // Determine which dimensions to analyze
    const dimensionsToAnalyze = dimensions && dimensions.length > 0 
      ? dimensions 
      : Object.keys(DIMENSION_BENCHMARKS);

    // Step 2: Generate detailed insights for all dimensions in ONE query (1 API call)
    console.log('Step 2: Generating detailed insights for', dimensionsToAnalyze.length, 'dimensions');
    
    const insightsPrompt = `Analyze ${companyName}'s employer brand in detail for these dimensions: ${dimensionsToAnalyze.join(', ')}

For each dimension, search for REAL data and provide:
1. A score (0-100) based on actual findings
2. A detailed 2-3 sentence insight with SPECIFIC data points (numbers, ratings, facts)
3. 3 actionable recommendations to improve
4. Confidence level (high/medium/low) based on data availability

Search for:
- "${companyName} Glassdoor rating reviews"
- "${companyName} LinkedIn followers company page"
- "${companyName} careers website"
- "${companyName} employer brand news awards"
- "${companyName} interview process reviews"
- "${companyName} employee testimonials"

Return ONLY valid JSON:
{
  "insights": [
    {
      "dimension": "Search",
      "score": 65,
      "insight": "Specific finding with actual data...",
      "recommendations": ["Action 1", "Action 2", "Action 3"],
      "confidence": "medium"
    }
  ]
}`;

    const insightsResult = await queryPerplexity(
      insightsPrompt,
      perplexityApiKey,
      'You are an expert employer brand analyst. Provide specific, factual insights with real data points. Be precise with numbers and statistics.'
    );

    // Parse insights
    const insights: DimensionInsight[] = [];
    
    try {
      const jsonMatch = insightsResult.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.insights && Array.isArray(parsed.insights)) {
          for (const insight of parsed.insights) {
            const benchmark = DIMENSION_BENCHMARKS[insight.dimension] || 60;
            insights.push({
              dimension: insight.dimension,
              score: Math.max(0, Math.min(100, insight.score || 50)),
              benchmark,
              insightText: insight.insight || 'Analysis pending.',
              sourceUrls: insightsResult.citations.slice(0, 5),
              recommendations: insight.recommendations || [],
              confidenceLevel: insight.confidence || 'medium'
            });
          }
        }
      }
    } catch (e) {
      console.error('Error parsing insights:', e);
    }

    // Fill in missing dimensions with defaults
    for (const dim of dimensionsToAnalyze) {
      if (!insights.find(i => i.dimension === dim)) {
        insights.push({
          dimension: dim,
          score: 50,
          benchmark: DIMENSION_BENCHMARKS[dim] || 60,
          insightText: 'Unable to gather specific data for this dimension.',
          sourceUrls: [],
          recommendations: [`Research and improve ${dim} performance`],
          confidenceLevel: 'low'
        });
      }
    }

    console.log('Generated insights for', insights.length, 'dimensions');

    // Step 3: Store results in database
    console.log('Step 3: Storing insights');
    
    for (const insight of insights) {
      const { error: upsertError } = await supabase
        .from('dimension_insights')
        .upsert({
          company_url: companyUrl,
          dimension: insight.dimension,
          score: insight.score,
          benchmark: insight.benchmark,
          insight_text: insight.insightText,
          source_urls: insight.sourceUrls,
          recommendations: insight.recommendations,
          confidence_level: insight.confidenceLevel,
          scraped_at: new Date().toISOString()
        }, {
          onConflict: 'company_url,dimension'
        });

      if (upsertError) {
        console.error('Error upserting insight:', upsertError);
      }
    }

    // Calculate overall statistics
    const avgScore = Math.round(insights.reduce((sum, i) => sum + i.score, 0) / insights.length);
    const avgBenchmark = Math.round(insights.reduce((sum, i) => sum + i.benchmark, 0) / insights.length);

    console.log('Insights generation complete. Average score:', avgScore);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          companyName,
          companyUrl,
          industry,
          overallScore: avgScore,
          overallBenchmark: avgBenchmark,
          overallDelta: avgScore - avgBenchmark,
          insights: insights.map(i => ({
            dimension: i.dimension,
            score: i.score,
            benchmark: i.benchmark,
            delta: i.score - i.benchmark,
            insightText: i.insightText,
            sourceUrls: i.sourceUrls,
            recommendations: i.recommendations,
            confidenceLevel: i.confidenceLevel
          })),
          sources: insightsResult.citations,
          generatedAt: new Date().toISOString()
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in dimension-insights-generator:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

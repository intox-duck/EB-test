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

interface CompetitorData {
  name: string;
  url: string | null;
  industry: string;
  employeeCountRange: string;
  glassdoorRating: number | null;
  scores: Record<string, number>;
  vsSummary: string;
  advantages: string[];
  gaps: string[];
}

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
    
    console.log('Target company:', companyName, '| Industry:', industry);

    // Step 2: Get target company scores from database
    const { data: targetScoresData } = await supabase
      .from('brand_radar_scores')
      .select('dimension_name, score')
      .eq('company_url', companyUrl);

    const targetScores: Record<string, number> = {};
    if (targetScoresData) {
      for (const row of targetScoresData) {
        targetScores[row.dimension_name] = row.score;
      }
    }

    // Step 3: Identify and analyze competitors in ONE comprehensive query (1 API call)
    console.log('Step 2: Identifying and analyzing competitors');
    
    const competitorPrompt = `Identify the top 5 competitors to ${companyName} in the ${industry} sector for talent acquisition and employer branding.

For each competitor, search for:
- Company website URL
- Employee count range
- Glassdoor rating (if available)
- Key employer brand differentiators
- Recent employer brand initiatives

Also analyze each competitor's employer brand across these dimensions (score 0-100):
Search, Social Reach, Social Authority, Social Impact, Values & Proposition, Employee Experience, Content, UX, Candidate Experience

And provide a VS comparison with ${companyName}:
- 2-3 sentence summary
- 3 competitive advantages ${companyName} has
- 3 gaps where the competitor outperforms

Return ONLY valid JSON with this structure:
{
  "competitors": [
    {
      "name": "Competitor Name",
      "url": "https://competitor.com or null",
      "employeeCountRange": "1000-5000",
      "glassdoorRating": 4.2,
      "differentiators": ["Strong tech brand", "Remote-first culture"],
      "recentInitiatives": ["Launched new careers site"],
      "scores": {
        "Search": 70,
        "Social Reach": 65,
        "Social Authority": 60,
        "Social Impact": 55,
        "Values & Proposition": 68,
        "Employee Experience": 72,
        "Content": 58,
        "UX": 62,
        "Candidate Experience": 60
      },
      "vsSummary": "Competitor has stronger...",
      "advantages": ["Better X", "Stronger Y", "More Z"],
      "gaps": ["Weaker A", "Less B", "Missing C"]
    }
  ]
}`;

    const competitorResult = await queryPerplexity(
      competitorPrompt,
      perplexityApiKey,
      'You are a competitive intelligence analyst. Provide accurate competitor analysis with real data when available.'
    );

    // Parse competitors
    let competitors: CompetitorData[] = [];
    
    try {
      const jsonMatch = competitorResult.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.competitors && Array.isArray(parsed.competitors)) {
          competitors = parsed.competitors.slice(0, 5).map((c: any) => ({
            name: c.name || 'Unknown',
            url: c.url || null,
            industry: industry,
            employeeCountRange: c.employeeCountRange || 'Unknown',
            glassdoorRating: c.glassdoorRating || null,
            scores: c.scores || {},
            vsSummary: c.vsSummary || 'Comparison pending.',
            advantages: c.advantages || [],
            gaps: c.gaps || []
          }));
        }
      }
    } catch (e) {
      console.error('Error parsing competitors:', e);
    }

    console.log(`Found ${competitors.length} competitors`);

    // Step 4: Store results in database
    console.log('Step 3: Storing competitor data');
    
    for (const competitor of competitors) {
      const { error: upsertError } = await supabase
        .from('competitor_analysis')
        .upsert({
          target_company_url: companyUrl,
          target_company_name: companyName,
          competitor_name: competitor.name,
          competitor_url: competitor.url,
          industry: competitor.industry,
          employee_count_range: competitor.employeeCountRange,
          glassdoor_rating: competitor.glassdoorRating,
          comparison_scores: competitor.scores,
          vs_summary_text: competitor.vsSummary,
          competitive_advantages: competitor.advantages,
          competitive_gaps: competitor.gaps,
          sources: competitorResult.citations.slice(0, 10),
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'target_company_url,competitor_name'
        });

      if (upsertError) {
        console.error('Error upserting competitor:', upsertError);
      }
    }

    console.log('Competitor analysis complete');

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          targetCompany: {
            name: companyName,
            url: companyUrl,
            industry,
            scores: targetScores
          },
          competitors: competitors.map(c => ({
            name: c.name,
            url: c.url,
            industry: c.industry,
            employeeCountRange: c.employeeCountRange,
            glassdoorRating: c.glassdoorRating,
            scores: c.scores,
            vsSummary: c.vsSummary,
            advantages: c.advantages,
            gaps: c.gaps
          })),
          sources: competitorResult.citations,
          analyzedAt: new Date().toISOString()
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in competitor-intelligence:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

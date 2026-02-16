import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';

const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema with length limits and character restrictions
const inputSchema = z.object({
  companyName: z.string()
    .min(1, 'Company name is required')
    .max(200, 'Company name must be less than 200 characters')
    .regex(/^[a-zA-Z0-9\s\-\.\&\,\'\"]+$/, 'Company name contains invalid characters'),
  location: z.string()
    .min(1, 'Location is required')
    .max(200, 'Location must be less than 200 characters')
    .regex(/^[a-zA-Z0-9\s\-\,\.\']+$/, 'Location contains invalid characters'),
  jobTitle: z.string()
    .max(200, 'Job title must be less than 200 characters')
    .regex(/^[a-zA-Z0-9\s\-\/\&\,\.\']*$/, 'Job title contains invalid characters')
    .optional()
    .nullable(),
  seniorityLevel: z.string()
    .max(50, 'Seniority level must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s\-]*$/, 'Seniority level contains invalid characters')
    .optional()
    .nullable()
});

// Sanitize input for prompt injection prevention
function sanitizeForPrompt(input: string): string {
  return input
    .replace(/[{}\[\]]/g, '') // Remove JSON control characters
    .replace(/[<>]/g, '') // Remove HTML-like characters
    .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines
    .replace(/```/g, '') // Remove code fence markers
    .trim();
}

const SYSTEM_PROMPT = `You are InsightsGPT, a specialist AI that generates comprehensive talent acquisition intelligence reports with advanced competitive analysis and role-specific insights. Your task is to research and provide detailed, accurate information about companies for talent acquisition purposes.

ABSOLUTELY CRITICAL RULE: DO NOT INVENT OR GENERATE FAKE NAMES, FAKE PEOPLE, OR FAKE EMPLOYEE DATA. For talent movement data (recentJoins, recentExits), you MUST ALWAYS return empty arrays []. Never create fictional employee names or movement data.

CURRENCY REQUIREMENT: ALL MONETARY VALUES MUST BE IN GBP STERLING (£). Use the format "£X,XXX - £XX,XXX" for salary ranges and "£X,XXX" for specific amounts. Convert all costs and salaries to British Pounds.

For each company requested, provide the following information in a structured JSON format:

{
  "companyName": "string",
  "locations": ["array of office locations"],
  "companySize": "string (e.g., '10,000-50,000 employees')",
  "keyProducts": ["array of main products/services"],
  "jobsAdvertised": number,
  "complexityRating": number (1-5),
  "techStack": ["array of technologies used"],
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
    "skillsetBreakdown": [
      {
        "skill": "skill name",
        "importance": number (1-10),
        "marketDemand": "high/medium/low"
      }
    ],
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
    "aggregatedScore": number (1-5, average across all sources),
    "totalReviews": number (sum across all sources),
    "sentiment": "positive/neutral/negative",
    "keyThemes": ["array of themes from all sources"],
    "workLifeBalance": number (1-5),
    "careerOpportunities": number (1-5),
    "compensation": number (1-5)
  }
}

IMPORTANT: For salary data, research and include information from exactly 5 different sources such as Glassdoor, PayScale, Salary.com, Indeed, LinkedIn Salary Insights, or other reputable salary databases. Calculate a comprehensive average salary range based on these sources. Include the specific salary ranges from each source with proper attribution. ALL SALARIES MUST BE IN GBP (£).

TALENT SENTIMENT ANALYSIS (REQUIRED - MULTIPLE SOURCES):
For the company, gather employee sentiment data from AT LEAST 3-5 DIFFERENT sources such as:
- Glassdoor (employee reviews and ratings)
- Indeed (company reviews)
- Comparably (culture and compensation ratings)
- Blind (anonymous professional network)
- LinkedIn (employee sentiment indicators)
- Kununu (employee reviews)
- Other relevant review platforms

For each source, include:
- Source name
- Overall rating (1-5 scale)
- Number of reviews
- URL reference if available

Calculate aggregated metrics across all sources:
- Aggregated overall score (weighted average)
- Total number of reviews across all sources
- Overall sentiment (positive/neutral/negative)
- Key themes appearing across multiple sources
- Average ratings for work-life balance, career opportunities, and compensation

COST OF LIVING ANALYSIS (REQUIRED - IN GBP):
For the specified location, provide detailed cost of living data including:
- Overall cost of living index (100 = national average)
- Comparison to national/regional average (e.g., "25% above national average")
- Detailed breakdown of monthly expenses IN GBP:
  * Housing: rental/mortgage costs and percentage of income
  * Food: average monthly food and grocery costs
  * Transportation: public transit, car ownership, petrol costs
  * Healthcare: insurance and medical costs
  * Utilities: electricity, water, internet, phone
- Total estimated monthly expenses for a single professional IN GBP
- Quality of life index (1-100 scale considering safety, climate, culture, amenities)

COST TO HIRE ANALYSIS (REQUIRED - IN GBP):
For the specified role and location, provide comprehensive hiring cost analysis IN GBP:
- Base Salary: average salary for the role from salary data IN GBP
- Employer Taxes: payroll taxes, national insurance, pension contributions (typically 15-25% of base salary) IN GBP
- Benefits: health insurance, dental, vision, pension matching, PTO, sick leave (typically 25-35% of base salary) IN GBP
- Recruitment Costs: job postings, recruiter fees, background checks (typically £2,500-£12,000) IN GBP
- Onboarding Costs: training, equipment, software licenses, setup costs (typically £1,500-£8,000) IN GBP
- Total Annual Cost: sum of all above components IN GBP
- Breakdown: explain cost components as percentages and provide context

ABSOLUTELY CRITICAL - TALENT MOVEMENT DATA RULES:
1. NEVER GENERATE FAKE NAMES OR FICTIONAL EMPLOYEE DATA
2. recentJoins MUST ALWAYS BE AN EMPTY ARRAY: []
3. recentExits MUST ALWAYS BE AN EMPTY ARRAY: []
4. dataAvailability MUST ALWAYS BE: "limited - no individual movement data available"
5. Only provide aggregate poaching patterns if you have statistical data from reliable sources
6. DO NOT INVENT PEOPLE, NAMES, OR INDIVIDUAL EMPLOYEE MOVEMENTS

CRITICAL: For projectIntelligence, provide 8-12 detailed project entries covering various categories such as:
- Strategic Initiatives (major business transformations, market expansion, partnerships)
- Product Development (new products, feature releases, platform updates)
- Technology Modernization (cloud migration, AI/ML initiatives, infrastructure upgrades)
- Digital Transformation (automation, digitization, process improvements)
- Research & Development (innovation labs, emerging tech exploration, patents)
- Operational Excellence (efficiency improvements, cost optimization, quality initiatives)
- Sustainability & ESG (environmental projects, social impact, governance improvements)
- Market Expansion (geographic expansion, new market segments, acquisitions)

For each project, include comprehensive details about timeline, business impact, technical specifications, team structure, investment levels, and current status. Research recent news, press releases, job postings, and industry reports to provide accurate, up-to-date project intelligence.

FINAL REMINDER: TALENT MOVEMENT ARRAYS MUST BE EMPTY:
- recentJoins: []
- recentExits: []
- dataAvailability: "limited - no individual movement data available"

Include up to 10 competitors with detailed reasoning. Be thorough and accurate, citing reliable sources when possible. Focus on information relevant to talent acquisition and technical recruiting.

STRICT OUTPUT RULES:
- Return ONLY a single valid JSON object that conforms exactly to the specified schema.
- No markdown, no code fences, no explanations, no backticks, no comments.
- Do not include any text before or after the JSON.
- Ensure RFC 8259 compliant JSON: no trailing commas, proper string quoting, numbers as numbers unless the field specifies strings, and arrays/objects closed correctly.
- If a field is unavailable, use null, empty string, 0, or [] as appropriate to the field type. Do not invent data.
- Ensure salaryData.sources contains exactly 5 items.
- talentMovement.recentJoins and talentMovement.recentExits MUST be [].
- All currency values MUST be strings in GBP with the required format.

END OF INSTRUCTIONS.`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check - require valid JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse and validate input with Zod schema
    const rawBody = await req.json();
    const validation = inputSchema.safeParse(rawBody);

    if (!validation.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input', 
          details: validation.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Extract validated and sanitized inputs
    const companyName = sanitizeForPrompt(validation.data.companyName);
    const location = sanitizeForPrompt(validation.data.location);
    const jobTitle = validation.data.jobTitle ? sanitizeForPrompt(validation.data.jobTitle) : null;
    const seniorityLevel = validation.data.seniorityLevel ? sanitizeForPrompt(validation.data.seniorityLevel) : null;

    let userPrompt = `Generate a comprehensive talent acquisition intelligence report for "${companyName}" located in "${location}".`;
    
    if (jobTitle || seniorityLevel) {
      userPrompt += ` FOCUS ON ROLE-SPECIFIC ANALYSIS:`;
      if (jobTitle) userPrompt += ` Job Title/Family: "${jobTitle}".`;
      if (seniorityLevel) userPrompt += ` Seniority Level: "${seniorityLevel}".`;
      userPrompt += ` Provide detailed role-specific salary data, skill requirements, hiring trends, and competitive analysis for this specific position and level.`;
    }
    
    userPrompt += ` Include all requested details in the specified JSON format with comprehensive competitive visualization data, talent movement analysis, and AI benchmark scoring.`;
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        max_tokens: 8000,
        temperature: 0.2,
        return_related_questions: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Perplexity API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content received from Perplexity');
    }

    // Extract JSON robustly from the response (with one retry if needed)
    let jsonText: string | null = null;

    const tryExtractJson = (text: string): string | null => {
      // Prefer fenced JSON code block if present
      const fenced = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```\s*([\s\S]*?)```/);
      if (fenced) return fenced[1].trim();
      // Try to extract the first balanced JSON object
      const start = text.indexOf('{');
      if (start === -1) return null;
      let depth = 0; let inString = false; let escape = false;
      for (let i = start; i < text.length; i++) {
        const ch = text[i];
        if (inString) {
          if (escape) { escape = false; }
          else if (ch === '\\') { escape = true; }
          else if (ch === '"') { inString = false; }
        } else {
          if (ch === '"') inString = true;
          else if (ch === '{') depth++;
          else if (ch === '}') { depth--; if (depth === 0) return text.slice(start, i + 1); }
        }
      }
      return null;
    };

    jsonText = tryExtractJson(content);

    if (!jsonText) {
      console.error('Perplexity returned non-JSON content (first 1000 chars):', content.slice(0, 1000));
      // Retry once with stricter instruction
      const retry = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${perplexityApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'sonar-pro',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt + ' STRICT: Return ONLY a single valid JSON object per the schema. No markdown, no code fences, no commentary. Start with { and end with }.' }
          ],
          max_tokens: 8000,
          temperature: 0.0,
          return_related_questions: false,
        }),
      });

      if (!retry.ok) {
        const t = await retry.text();
        throw new Error(`Perplexity API retry error: ${t}`);
      }
      const retryData = await retry.json();
      const retryContent = retryData.choices?.[0]?.message?.content as string | undefined;
      if (retryContent) jsonText = tryExtractJson(retryContent);
      if (!jsonText) {
        console.error('Retry also returned non-JSON (first 1000 chars):', (retryContent || '').slice(0, 1000));
        throw new Error('Invalid JSON response from Perplexity after retry (no JSON found)');
      }
    }

    // Simple sanitization: remove trailing commas before } or ]
    jsonText = jsonText.replace(/,\s*([}\]])/g, '$1');

    let insights: any;
    try {
      insights = JSON.parse(jsonText);
    } catch (e) {
      console.error('Raw content from Perplexity (truncated to 2000 chars):', content.slice(0, 2000));
      console.error('Extracted JSON text (truncated to 2000 chars):', jsonText.slice(0, 2000));
      throw new Error('Invalid JSON response from Perplexity (parse error)');
    }
    
    // CRITICAL: Force empty talent movement arrays to prevent fake data
    if (insights.talentMovement) {
      insights.talentMovement.recentJoins = [];
      insights.talentMovement.recentExits = [];
      insights.talentMovement.dataAvailability = "limited - no individual movement data available";
    }
    
    // Validate the response has required fields
    if (!insights.companyName || !insights.locations || !insights.competitors || !insights.salaryData) {
      throw new Error('Incomplete data received from Perplexity');
    }

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-company-insights function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate company insights' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
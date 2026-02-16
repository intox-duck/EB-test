import { CompanyInsights } from '@/components/CompanyInsightsDisplay';
import { supabase } from '@/integrations/supabase/client';

const SYSTEM_PROMPT = `You are InsightsGPT, a specialist AI that generates comprehensive talent acquisition intelligence reports. Your task is to research and provide detailed, accurate information about companies for talent acquisition purposes.

For each company requested, provide the following information in a structured JSON format:

{
  "companyName": "string",
  "locations": ["array of office locations"],
  "companySize": "string (e.g., '10,000-50,000 employees')",
  "keyProducts": ["array of main products/services"],
  "jobsAdvertised": number,
  "complexityRating": number (1-5),
  "techStack": ["array of technologies used"],
  "projectIntelligence": ["array of key project insights"],
  "competitors": [
    {
      "name": "competitor name",
      "reason": "why they are a competitor"
    }
  ]
}

Include up to 10 competitors with detailed reasoning. Be thorough and accurate, citing reliable sources when possible. Focus on information relevant to talent acquisition and technical recruiting.`;

export class InsightsService {
  static async generateCompanyInsights(
    companyName: string,
    location: string,
    jobTitle?: string,
    seniorityLevel?: string
  ): Promise<CompanyInsights> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-company-insights', {
        body: { companyName, location, jobTitle, seniorityLevel }
      });

      if (error) {
        throw new Error(`API error: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data received from API');
      }

      // Validate the response has required fields
      if (!data.companyName || !data.locations || !data.competitors || !data.salaryData) {
        throw new Error('Incomplete data received from API');
      }

      // Handle legacy cultureSnapshot field by converting to talentSentiment
      if (data.cultureSnapshot && !data.talentSentiment) {
        data.talentSentiment = {
          sources: [{
            name: 'Glassdoor',
            score: data.cultureSnapshot.glassdoorScore,
            reviewCount: data.cultureSnapshot.reviewCount,
          }],
          aggregatedScore: data.cultureSnapshot.glassdoorScore,
          totalReviews: data.cultureSnapshot.reviewCount,
          sentiment: data.cultureSnapshot.sentiment,
          keyThemes: data.cultureSnapshot.keyThemes,
          workLifeBalance: data.cultureSnapshot.workLifeBalance,
          careerOpportunities: data.cultureSnapshot.careerOpportunities,
          compensation: data.cultureSnapshot.compensation,
        };
        delete data.cultureSnapshot;
      }

      return data as CompanyInsights;
    } catch (error) {
      console.error('Error generating company insights:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to generate company insights');
    }
  }
}
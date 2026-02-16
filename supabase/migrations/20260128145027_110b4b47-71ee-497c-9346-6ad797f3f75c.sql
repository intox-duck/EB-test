-- Create brand_radar_scores table
CREATE TABLE public.brand_radar_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_url TEXT NOT NULL,
  company_name TEXT NOT NULL,
  dimension_name TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  benchmark_score INTEGER NOT NULL CHECK (benchmark_score >= 0 AND benchmark_score <= 100),
  delta INTEGER GENERATED ALWAYS AS (score - benchmark_score) STORED,
  grounding_sources TEXT[] DEFAULT '{}',
  insight_text TEXT,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_url, dimension_name)
);

-- Create competitor_analysis table
CREATE TABLE public.competitor_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_company_url TEXT NOT NULL,
  target_company_name TEXT NOT NULL,
  competitor_name TEXT NOT NULL,
  competitor_url TEXT,
  industry TEXT,
  employee_count_range TEXT,
  glassdoor_rating NUMERIC(2,1),
  comparison_scores JSONB DEFAULT '{}',
  vs_summary_text TEXT,
  competitive_advantages TEXT[],
  competitive_gaps TEXT[],
  sources TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(target_company_url, competitor_name)
);

-- Create dimension_insights table
CREATE TABLE public.dimension_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_url TEXT NOT NULL,
  dimension TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  benchmark INTEGER NOT NULL CHECK (benchmark >= 0 AND benchmark <= 100),
  delta INTEGER GENERATED ALWAYS AS (score - benchmark) STORED,
  insight_text TEXT NOT NULL,
  source_urls TEXT[] DEFAULT '{}',
  recommendations TEXT[] DEFAULT '{}',
  confidence_level TEXT CHECK (confidence_level IN ('high', 'medium', 'low')),
  scraped_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_url, dimension)
);

-- Enable RLS on all tables
ALTER TABLE public.brand_radar_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dimension_insights ENABLE ROW LEVEL SECURITY;

-- Create public read policies (data is not user-specific)
CREATE POLICY "Anyone can view brand radar scores"
  ON public.brand_radar_scores FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view competitor analysis"
  ON public.competitor_analysis FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view dimension insights"
  ON public.dimension_insights FOR SELECT
  USING (true);

-- Service role can insert/update (edge functions will use service role)
CREATE POLICY "Service role can manage brand radar scores"
  ON public.brand_radar_scores FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage competitor analysis"
  ON public.competitor_analysis FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage dimension insights"
  ON public.dimension_insights FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create indexes for common queries
CREATE INDEX idx_brand_radar_company_url ON public.brand_radar_scores(company_url);
CREATE INDEX idx_competitor_target_url ON public.competitor_analysis(target_company_url);
CREATE INDEX idx_dimension_insights_company_url ON public.dimension_insights(company_url);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add update triggers
CREATE TRIGGER update_brand_radar_scores_updated_at
  BEFORE UPDATE ON public.brand_radar_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_competitor_analysis_updated_at
  BEFORE UPDATE ON public.competitor_analysis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dimension_insights_updated_at
  BEFORE UPDATE ON public.dimension_insights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
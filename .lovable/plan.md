# Employer Brand Intelligence System

## Status: ✅ IMPLEMENTED

## Architecture

Three Supabase Edge Functions with database persistence:

### 1. `brand-radar-analyzer` ✅
**Purpose:** Generate accurate Brand Radar scores for 9 dimensions

**API:** `POST /functions/v1/brand-radar-analyzer`
```json
{ "companyUrl": "https://company.com" }
```

**Flow:**
1. Extract company name + industry from URL (1 API call)
2. Comprehensive employer brand analysis across all 9 dimensions (1 API call)
3. Store results in `brand_radar_scores` table

**Returns:** Company name, 9 dimension scores with insights, grounding sources

---

### 2. `competitor-intelligence` ✅
**Purpose:** Identify and analyze top 5 competitors

**API:** `POST /functions/v1/competitor-intelligence`
```json
{ "companyUrl": "https://company.com" }
```

**Flow:**
1. Extract company info (1 API call)
2. Identify competitors + analyze their brands + generate VS comparisons (1 API call)
3. Store in `competitor_analysis` table

**Returns:** Target company scores, competitors with scores, advantages, gaps

---

### 3. `dimension-insights-generator` ✅
**Purpose:** Generate detailed, actionable insights per dimension

**API:** `POST /functions/v1/dimension-insights-generator`
```json
{ "companyUrl": "https://company.com", "dimensions": ["Search", "Social Reach"] }
```

**Flow:**
1. Extract company info (1 API call)
2. Generate detailed insights with recommendations (1 API call)
3. Store in `dimension_insights` table

**Returns:** Detailed insights with scores, recommendations, confidence levels

---

## Database Schema

### `brand_radar_scores`
- company_url, company_name, dimension_name
- score, benchmark_score, delta (computed)
- grounding_sources, insight_text, last_updated

### `competitor_analysis`
- target_company_url, target_company_name
- competitor_name, competitor_url, industry
- employee_count_range, glassdoor_rating
- comparison_scores (JSON), vs_summary_text
- competitive_advantages, competitive_gaps, sources

### `dimension_insights`
- company_url, dimension
- score, benchmark, delta (computed)
- insight_text, source_urls, recommendations
- confidence_level, scraped_at

---

## Performance

Each function optimized to make only **2 API calls** instead of 27+:
- ~10-15 seconds per function vs timing out previously
- All data persisted for caching/retrieval

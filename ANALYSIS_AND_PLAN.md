# Brand Radar - Analysis & Optimization Plan

## 1. App Analysis
**Technology Stack**:
- **Frontend**: Vite + React + TypeScript + Tailwind CSS (shadcn/ui).
- **Backend/Logic**: Supabase Edge Functions (`brand-radar-analyzer`) + Supabase DB.
- **AI**: Perplexity Sonar (via Edge Function) for analysis.

**Current Workflow**:
1. User enters company name/URL.
2. Frontend calls `brand-radar-analyzer` Edge Function.
3. Function:
    - Queries Perplexity to get Company Name & Industry.
    - Queries Perplexity (Sonar) again for detailed brand analysis (9 dimensions).
    - Parsing logic extracts JSON.
    - Upserts (saves) result to `brand_radar_scores` table in Supabase.
4. Returns result to Frontend.

**Deployability to Vercel**:
- The frontend is fully compatible with Vercel (Vite preset).
- The backend (`supabase/functions`) runs on Supabase Edge Network (Deno). This is fine; Vercel will host the frontend, which will continue to call the Supabase backend.

## 2. Optimization Suggestions

### A. Performance & Cost (Caching)
**Issue**: Every search triggers 2 Perplexity API calls, even if the company was analyzed 5 minutes ago. This is slow (~10-20s) and costs API credits.
**Solution**:
- **Read-Before-Write**: Modify the Edge Function to check the `brand_radar_scores` table for a recent analysis (e.g., < 7 days old) *before* calling Perplexity.
- **Impact**: Instant results for repeat searches; zero API cost for cached hits.

### B. Accuracy (Google Search Grounding)
**Issue**: Perplexity is great, but can sometimes hallucinate specific URLs or miss the "Carreers" page if generic.
**Solution**: 
- Use **Google Custom Search API** (since you have it available) in the Edge Function.
- **Workflow**:
    1. Search Google for: `"{Company}" official site`, `"{Company}" careers`, `"{Company}" glassdoor`.
    2. Pass these *verified URLs* to Perplexity as context.
    3. This ensures Perplexity analyzes the *correct* pages.

### C. UI/UX Polishing
- **Loading State**: The analysis takes time. Ensure the "processing" state gives feedback (e.g., "Analyzing Social Reach...", "Checking Glassdoor...").
- **History**: Since we store data, show "Recent Searches" on the home page using the `brand_radar_scores` table.

### D. Architecture (Vercel Integration)
- Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in Vercel.
- The Edge Functions can remain on Supabase, or be migrated to Vercel Functions (Node.js) if you prefer a monorepo approach (would require rewriting from Deno to Node). *Recommendation: Keep on Supabase for now to minimize friction.*

## 3. Implementation Status
- [x] **Vercel Migration Process**:
    - [x] **Backend**: Created `api/analyze.ts` (Vercel Serverless Function) replacing usage of Supabase Edge Functions. It implements Perplexity Sonar + Google Search Grounding.
    - [x] **Frontend**: Updated `src/lib/api/brandAnalysis.ts` and `src/pages/Competitors.tsx` to call the new Vercel API.
    - [x] **Auth Removed**: Removed `ProtectedRoute` from `App.tsx` for open testing access as requested ("move away from Supabase").

## 4. Vercel Deployment Instructions
1.  **Connect Repo**: Import this Git repository into Vercel.
2.  **Environment Variables**:
    Go to Vercel Project Settings > Environment Variables and add:
    *   `PERPLEXITY_API_KEY`: Your Perplexity API Key.
    *   `GOOGLE_API_KEY`: Google Custom Search API Key.
    *   `GOOGLE_CX`: Google Search Engine ID.
    *   *(Note: No Supabase keys are needed anymore for this testing phase)*.

3.  **Deploy**: Click Deploy.
    *   The API will live at `/api/analyze`.
    *   The App is now "Open Access" (no login required).

## 5. What's Next?
- **Persistence**: Currently, no data is saved to a DB (Supabase removed). If you need history, consider adding **Vercel Postgres** or **Vercel KV**.
- **Auth**: Currently disabled. If you need it back without Supabase, consider **Clerk** or **NextAuth**.


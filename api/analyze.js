import {
    extractCompanyName,
    getVerifiedTalentSentiment,
    searchSocialStats,
    buildPrompt,
    callGemini,
    parseAIResponse,
    normalizeDimensions,
    normalizeApiError
} from './_utils.js';
import { assessCandidateExperience } from './_candidate-experience.js';
import {
    isChapter2Alias,
    getChapter2Profile,
    buildChapter2PromptContext,
    getChapter2DimensionInsights,
    getChapter2Summary
} from './_chapter2-profile.js';

function toDisplayCompanyName(value = '') {
    const cleaned = String(value || '').replace(/\s+/g, ' ').trim();
    if (!cleaned) return '';

    return cleaned
        .split(' ')
        .filter(Boolean)
        .map((part) => {
            if (/[A-Z].*[a-z]|[a-z].*[A-Z]/.test(part)) return part;
            if (/^[A-Z0-9&.-]{2,5}$/.test(part)) return part;
            return `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`;
        })
        .join(' ');
}

function normalizeCompanyKey(value = '') {
    return String(value || '').trim().toLowerCase();
}

function tokenizeCompanyName(value = '') {
    return normalizeCompanyKey(value)
        .replace(/[^a-z0-9&]+/g, ' ')
        .split(' ')
        .filter(Boolean);
}

function namesLikelySameCompany(left = '', right = '') {
    const normalizedLeft = normalizeCompanyKey(left);
    const normalizedRight = normalizeCompanyKey(right);

    if (!normalizedLeft || !normalizedRight) return false;
    if (normalizedLeft === normalizedRight) return true;

    if (
        (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft)) &&
        Math.min(normalizedLeft.length, normalizedRight.length) >= 4
    ) {
        return true;
    }

    const leftTokens = tokenizeCompanyName(left);
    const rightTokens = tokenizeCompanyName(right);
    if (!leftTokens.length || !rightTokens.length) return false;

    return leftTokens.some((token) => token.length >= 4 && rightTokens.includes(token));
}

function applyCompetitorPriorityRules(primaryCompanyName = '', aiCompetitors = []) {
    const displayPrimary = toDisplayCompanyName(primaryCompanyName);
    const normalizedPrimary = normalizeCompanyKey(displayPrimary);

    const priorityCompetitors = [];
    if (/collinson/.test(normalizedPrimary) || /priority\s*pass/.test(normalizedPrimary)) {
        priorityCompetitors.push('DragonPass', 'Plaza Premium Group', 'Lounge Pass');
    }
    if (/dragon\s*pass|dragonpass/.test(normalizedPrimary)) {
        priorityCompetitors.push('Collinson Group', 'Priority Pass', 'LoungeKey');
    }

    const merged = [...priorityCompetitors, ...aiCompetitors]
        .map((name) => toDisplayCompanyName(name))
        .filter(Boolean);

    const deduped = [];
    for (const candidate of merged) {
        if (namesLikelySameCompany(candidate, displayPrimary)) continue;
        if (deduped.some((existing) => namesLikelySameCompany(existing, candidate))) continue;
        deduped.push(candidate);
    }

    return deduped.slice(0, 6);
}

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { companyName, companyUrl } = req.body;

        let extractedCompanyName = toDisplayCompanyName(companyName);
        let targetUrl = companyUrl;
        const chapter2Profile = getChapter2Profile();
        let isChapter2Company = false;

        // Company Name Extraction Logic
        if (companyUrl && !companyName) {
            extractedCompanyName = extractCompanyName(companyUrl);
            if (extractedCompanyName.toLowerCase().endsWith('group')) {
                const base = extractedCompanyName.slice(0, -5);
                extractedCompanyName = base + " Group";
            }
            // Title case
            extractedCompanyName = toDisplayCompanyName(extractedCompanyName);
        }

        if (!extractedCompanyName && !targetUrl) {
            res.status(400).json({ error: 'Company name or URL is required' });
            return;
        }

        if (isChapter2Alias(extractedCompanyName) || isChapter2Alias(targetUrl)) {
            extractedCompanyName = chapter2Profile.canonicalName;
            targetUrl = chapter2Profile.canonicalUrl;
            isChapter2Company = true;
        } else if (isChapter2Alias(extractedCompanyName)) {
            isChapter2Company = true;
        }

        console.log('\n=== Starting Analysis (Vercel) ===');
        console.log('Company Name:', extractedCompanyName);

        // Fetch research context with maximum safe parallelism:
        // - Social summary and verified sentiment start immediately.
        // - Candidate experience starts as soon as sentiment resolves (no need to wait for social).
        console.log('[Analyze] Fetching social stats, sentiment, and candidate experience with parallel orchestration...');
        const socialStatsPromise = searchSocialStats(extractedCompanyName).catch(e => {
            console.warn('[Social Search] Failed:', e.message);
            return null;
        });

        const talentSentimentPromise = getVerifiedTalentSentiment(extractedCompanyName).catch(e => {
            console.warn('[Sentiment Search] Failed:', e.message);
            return null;
        });

        const candidateExperiencePromise = talentSentimentPromise.then((verifiedSentiment) => {
            const candidateCompanyName = toDisplayCompanyName(
                verifiedSentiment?.resolution?.canonicalCompanyName ||
                extractedCompanyName
            );

            return assessCandidateExperience({
                companyName: candidateCompanyName,
                companyUrl: targetUrl,
                talentSentiment: verifiedSentiment
            }).catch(e => {
                console.warn('[Candidate Experience] Assessment failed:', e.message);
                return null;
            });
        });

        const [socialStats, talentSentiment, candidateExperience] = await Promise.all([
            socialStatsPromise,
            talentSentimentPromise,
            candidateExperiencePromise
        ]);

        const resolvedCompanyName = toDisplayCompanyName(
            talentSentiment?.resolution?.canonicalCompanyName ||
            extractedCompanyName
        );

        const chapter2PromptContext = isChapter2Company ? buildChapter2PromptContext() : '';
        const socialContext = `
=== RESEARCH CONTEXT (Talent Presence & Sentiment) ===
SOCIAL PRESENCE & REACH:
${socialStats || "General search for social presence in progress..."}

VERIFIED TALENT SENTIMENT & RATINGS:
${talentSentiment ? JSON.stringify(talentSentiment, null, 2) : "General search for talent sentiment in progress..."}

VERIFIED CANDIDATE EXPERIENCE:
${candidateExperience ? JSON.stringify(candidateExperience, null, 2) : "Candidate experience verification in progress..."}
${chapter2PromptContext}
`;

        const prompt = buildPrompt(resolvedCompanyName, targetUrl, "", socialContext, "");

        // Gemini-only analysis runtime
        let aiResponse;
        let provider = 'Gemini';

        try {
            aiResponse = await callGemini(prompt);
            console.log('[Gemini] Response received.');
        } catch (geminiError) {
            console.error('[Gemini] Failed:', geminiError.message);
            throw new Error(`Gemini analysis failed: ${geminiError.message}`);
        }

        // Parse and normalize
        const parsed = parseAIResponse(aiResponse);
        const dimensions = normalizeDimensions(parsed);

        if (isChapter2Company) {
            const chapter2DimensionInsights = getChapter2DimensionInsights();
            dimensions.forEach((dimension) => {
                const override = chapter2DimensionInsights[dimension.dimension_name];
                if (override) {
                    dimension.insight_text = override;
                }
            });

            parsed.companyName = chapter2Profile.canonicalName;
            parsed.industry = chapter2Profile.industry;
            parsed.summary = getChapter2Summary();
        }

        const normalizedTalentSentiment = talentSentiment ? {
            ...talentSentiment,
            sources: (talentSentiment.sources && talentSentiment.sources.length)
                ? talentSentiment.sources
                : [{ name: 'Glassdoor', score: talentSentiment.aggregatedScore ?? 0, reviewCount: talentSentiment.totalReviews ?? 0 }],
            aggregatedScore: talentSentiment.aggregatedScore ?? 0,
            totalReviews: talentSentiment.totalReviews ?? 0,
            sentiment: talentSentiment.sentiment || 'Neutral',
            keyThemes: talentSentiment.keyThemes || ['Limited verified review data'],
            workLifeBalance: talentSentiment.workLifeBalance ?? 0,
            careerOpportunities: talentSentiment.careerOpportunities ?? 0,
            compensation: talentSentiment.compensation ?? 0
        } : {
            sources: [{ name: 'Glassdoor', score: 0, reviewCount: 0 }],
            aggregatedScore: 0,
            totalReviews: 0,
            sentiment: 'Neutral',
            keyThemes: ['Limited verified review data'],
            workLifeBalance: 0,
            careerOpportunities: 0,
            compensation: 0
        };

        if (isChapter2Company) {
            const glassdoorSource = (normalizedTalentSentiment.sources || [])
                .find((source) => /glassdoor/i.test(String(source?.name || '')));

            normalizedTalentSentiment.sources = glassdoorSource
                ? [glassdoorSource]
                : (normalizedTalentSentiment.sources || []).filter((source) => !/indeed/i.test(String(source?.name || '')));

            normalizedTalentSentiment.indeedRating = null;
            normalizedTalentSentiment.indeedReviews = null;

            const glassdoorOnlyScore =
                typeof normalizedTalentSentiment.glassdoorRating === 'number'
                    ? normalizedTalentSentiment.glassdoorRating
                    : (typeof glassdoorSource?.score === 'number' ? glassdoorSource.score : null);

            const glassdoorOnlyReviews =
                Number.isInteger(normalizedTalentSentiment.glassdoorReviews) && normalizedTalentSentiment.glassdoorReviews > 0
                    ? normalizedTalentSentiment.glassdoorReviews
                    : (Number.isInteger(glassdoorSource?.reviewCount) ? glassdoorSource.reviewCount : null);

            if (glassdoorOnlyScore !== null) {
                normalizedTalentSentiment.aggregatedScore = glassdoorOnlyScore;
            }
            if (glassdoorOnlyReviews !== null) {
                normalizedTalentSentiment.totalReviews = glassdoorOnlyReviews;
            }

            normalizedTalentSentiment.summary = glassdoorOnlyScore !== null
                ? `Glassdoor-only baseline for Chapter 2: ${glassdoorOnlyScore}/5 from ${(glassdoorOnlyReviews || 0).toLocaleString()} reviews.`
                : 'Glassdoor-only baseline for Chapter 2 is still being verified.';
        }

        // GROUNDING OVERRIDE: Synchronize Employee Experience score AND insight with verified talent sentiment
        const employeeExpDim = dimensions.find(d => d.dimension_name === 'Employee Experience');
        if (employeeExpDim && normalizedTalentSentiment && normalizedTalentSentiment.totalReviews > 0) {
            const newScore = Math.round(normalizedTalentSentiment.aggregatedScore * 20);
            console.log(`[Grounding] Overriding Employee Experience score: ${employeeExpDim.score} -> ${newScore} (based on ${normalizedTalentSentiment.aggregatedScore}/5 rating)`);
            employeeExpDim.score = newScore;

            const workLife = normalizedTalentSentiment.workLifeBalance ?? 'n/a';
            const career = normalizedTalentSentiment.careerOpportunities ?? 'n/a';
            const compensation = normalizedTalentSentiment.compensation ?? 'n/a';
            const themeArray = Array.isArray(normalizedTalentSentiment.keyThemes) && normalizedTalentSentiment.keyThemes.length
                ? normalizedTalentSentiment.keyThemes.slice(0, 5)
                : [];
            const themes = themeArray.length ? themeArray.join(', ') : 'No recurring themes captured';
            const strengths = themeArray.slice(0, 2).join(' and ');
            const watchouts = themeArray.slice(2, 4).join(' and ');
            const sourceSummary = String(normalizedTalentSentiment.summary || '').trim();
            const hasRichSummary = sourceSummary && !/glassdoor baseline|no verified/i.test(sourceSummary);
            const qualitativeNarrative = hasRichSummary
                ? sourceSummary
                : strengths
                    ? (watchouts
                        ? `Qualitative feedback highlights strengths around ${strengths}, with recurring development areas around ${watchouts}.`
                        : `Qualitative feedback most often highlights strengths around ${strengths}.`)
                    : 'Qualitative review commentary is still being consolidated from verified sources.';

            // Override insight text with actual talent sentiment data
            employeeExpDim.insight_text = `${toDisplayCompanyName(parsed.companyName || resolvedCompanyName || extractedCompanyName)}'s Glassdoor rating is ${normalizedTalentSentiment.aggregatedScore} out of 5 stars from ${(normalizedTalentSentiment.totalReviews || 0).toLocaleString()} reviews. ` +
                `Category ratings include Work-Life Balance: ${workLife}/5, Career Opportunities: ${career}/5, and Compensation: ${compensation}/5. ` +
                `Overall sentiment is ${normalizedTalentSentiment.sentiment}. Key themes from reviews: ${themes}. ${qualitativeNarrative}`;

            if (isChapter2Company) {
                employeeExpDim.insight_text += ' The embedded operating model can accelerate ownership and delivery pace, so consistency of leadership cadence remains an important scale-up focus.';
            }
        }

        // Candidate Experience override:
        // If careers access is blocked or weak, use verified assessor output with review-source fallback.
        const candidateExpDim = dimensions.find(d => d.dimension_name === 'Candidate Experience');
        if (candidateExpDim && candidateExperience) {
            candidateExpDim.score = candidateExperience.score;

            const currentInsight = candidateExpDim.insight_text || '';
            const hasFailureLanguage = /(access denied|forbidden|could not access|unable to access|blocked|critical flaw|error 403)/i.test(currentInsight);
            if (hasFailureLanguage || candidateExperience.fallbackUsed || candidateExperience.sourceType) {
                candidateExpDim.insight_text = candidateExperience.insight;
            }

            if (isChapter2Company) {
                candidateExpDim.insight_text += ' Chapter 2 runs an embedded delivery model, so candidate experience quality depends on both Chapter 2 workflows and client-side hiring process design.';
            }
        }

        const finalResult = {
            companyName: isChapter2Company
                ? chapter2Profile.canonicalName
                : toDisplayCompanyName(parsed.companyName || resolvedCompanyName || extractedCompanyName),
            industry: isChapter2Company ? chapter2Profile.industry : (parsed.industry || ''),
            overallScore: parsed.overallScore || Math.round(dimensions.reduce((a, d) => a + d.score, 0) / dimensions.length),
            dimensions: dimensions,
            competitors: applyCompetitorPriorityRules(
                parsed.companyName || resolvedCompanyName || extractedCompanyName,
                parsed.competitors || []
            ),
            summary: isChapter2Company ? getChapter2Summary() : (parsed.summary || ''),
            sources: [],
            talentSentiment: normalizedTalentSentiment,
            candidateExperience: candidateExperience || null,
            analysedAt: new Date().toISOString(),
            provider: `Chapter 2 Brand Radar (${provider})`
        };

        res.status(200).json({ success: true, data: finalResult });

    } catch (error) {
        console.error('Analysis Error:', error);
        const normalized = normalizeApiError(error, 'Analysis failed');
        res.status(normalized.status).json({
            success: false,
            error: normalized.error,
            code: normalized.code,
            retryAfterSeconds: normalized.retryAfterSeconds
        });
    }
}

import {
    getVerifiedTalentSentiment,
    getVerifiedCompanySize,
    parseAIResponse,
    getGeminiModel,
    DEEP_DIVE_SYSTEM_PROMPT,
    normalizeApiError
} from './_utils.js';
import {
    isChapter2Alias,
    getChapter2Profile,
    buildChapter2PromptContext,
    getChapter2DeepDiveOverride
} from './_chapter2-profile.js';

const CORE_LOCATION_LIMIT = 15;
const TECH_STACK_LIMIT = 9;
const CORE_CAPABILITIES_LIMIT = 9;
const CORE_LOCATION_PATTERNS = [
    /headquarters|head office|global hq|global headquarters|\bhq\b/i,
    /regional hub|global hub|operations hub|operational hub|delivery hub/i,
    /tech hub|technology hub|innovation hub|engineering hub/i,
    /corporate office|corporate centre|corporate center|main office/i
];

const normalizeLocation = (value = '') => String(value).replace(/\s+/g, ' ').trim();

const normalizeName = (value = '') => String(value).replace(/\s+/g, ' ').trim();

const trimNamedItems = (items = [], limit = 10) => {
    if (!Array.isArray(items) || items.length === 0) return [];

    const deduped = [];
    const seen = new Set();

    for (const item of items) {
        const name = typeof item === 'string'
            ? normalizeName(item)
            : normalizeName(item?.name || '');

        if (!name) continue;
        const key = name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        if (typeof item === 'string') {
            deduped.push(name);
        } else {
            deduped.push({ ...item, name });
        }
    }

    return deduped.slice(0, limit);
};

const scoreCoreLocation = (location = '') => {
    let score = 0;
    CORE_LOCATION_PATTERNS.forEach((pattern, idx) => {
        if (pattern.test(location)) {
            score += 100 - idx * 15;
        }
    });
    if (/\((.*?)\)/.test(location)) score += 8;
    if (/,/.test(location)) score += 4;
    return score;
};

const selectCoreOperationalHubs = (verifiedLocations = [], modelLocations = [], limit = CORE_LOCATION_LIMIT) => {
    const dedupe = new Map();

    const addLocation = (rawLocation, source) => {
        const loc = normalizeLocation(rawLocation);
        if (!loc) return;
        const key = loc.toLowerCase();
        const baseScore = scoreCoreLocation(loc);
        const sourceBoost = source === 'verified' ? 40 : 0;
        const next = {
            location: loc,
            score: baseScore + sourceBoost,
            source
        };

        const existing = dedupe.get(key);
        if (!existing || next.score > existing.score) {
            dedupe.set(key, next);
        }
    };

    verifiedLocations.forEach((loc) => addLocation(loc, 'verified'));
    modelLocations.forEach((loc) => addLocation(loc, 'model'));

    const sorted = Array.from(dedupe.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((entry) => entry.location);

    return sorted;
};

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const averageRatings = (ratings = []) => {
    const valid = ratings.filter((value) => Number.isFinite(value) && value > 0 && value <= 5);
    if (!valid.length) return 0;
    return Number((valid.reduce((sum, value) => sum + value, 0) / valid.length).toFixed(1));
};

const mergeSentimentSources = (seedSources = [], verifiedSources = []) => {
    const merged = [];
    const seen = new Set();

    const addSource = (source) => {
        if (!source) return;
        const name = String(source.name || '').trim() || 'Unknown';
        const key = name.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        merged.push({
            name,
            score: toNumber(source.score, 0),
            reviewCount: Math.max(0, Math.round(toNumber(source.reviewCount, 0))),
            url: source.url || null
        });
    };

    verifiedSources.forEach(addSource);
    seedSources.forEach(addSource);
    return merged;
};

const normalizeSentimentSeed = (seed = null, resolverSeed = null) => {
    if (!seed && !resolverSeed) return null;

    const glassdoorFromSeedSource = (Array.isArray(seed?.sources) ? seed.sources : [])
        .find((source) => /glassdoor/i.test(String(source?.name || '')));

    const glassdoorRating = seed?.glassdoorRating ?? resolverSeed?.glassdoorBaseline?.glassdoorRating ?? glassdoorFromSeedSource?.score ?? null;
    const glassdoorReviews = seed?.glassdoorReviews ?? resolverSeed?.glassdoorBaseline?.glassdoorReviews ?? glassdoorFromSeedSource?.reviewCount ?? null;
    const indeedRating = seed?.indeedRating ?? null;
    const indeedReviews = seed?.indeedReviews ?? null;

    const aggregated = averageRatings([
        Number.isFinite(glassdoorRating) ? Number(glassdoorRating) : null,
        Number.isFinite(indeedRating) ? Number(indeedRating) : null,
        toNumber(seed?.aggregatedScore, 0) || null
    ]);

    const totalReviews = Math.max(
        0,
        Math.round(
            toNumber(glassdoorReviews, 0) +
            toNumber(indeedReviews, 0) +
            toNumber(seed?.totalReviews, 0)
        )
    );

    const sources = mergeSentimentSources(seed?.sources || [], [
        glassdoorRating !== null || glassdoorReviews !== null || resolverSeed?.identity?.glassdoor?.url
            ? {
                name: 'Glassdoor',
                score: toNumber(glassdoorRating, 0),
                reviewCount: Math.round(toNumber(glassdoorReviews, 0)),
                url: resolverSeed?.identity?.glassdoor?.url || resolverSeed?.glassdoorBaseline?.sourceUrl || null
            }
            : null
    ]);

    return {
        glassdoorRating: Number.isFinite(glassdoorRating) ? Number(glassdoorRating) : null,
        glassdoorReviews: Number.isFinite(glassdoorReviews) ? Math.round(Number(glassdoorReviews)) : null,
        indeedRating: Number.isFinite(indeedRating) ? Number(indeedRating) : null,
        indeedReviews: Number.isFinite(indeedReviews) ? Math.round(Number(indeedReviews)) : null,
        aggregatedScore: aggregated || toNumber(seed?.aggregatedScore, 0),
        totalReviews: totalReviews || Math.round(toNumber(seed?.totalReviews, 0)),
        sentiment: seed?.sentiment || (aggregated >= 4 ? 'Positive' : aggregated >= 3 ? 'Balanced' : 'Neutral'),
        keyThemes: Array.isArray(seed?.keyThemes) && seed.keyThemes.length ? seed.keyThemes : ['Compensation', 'Career development', 'Work-life balance'],
        workLifeBalance: toNumber(seed?.workLifeBalance, aggregated || 0),
        careerOpportunities: toNumber(seed?.careerOpportunities, aggregated || 0),
        compensation: toNumber(seed?.compensation, aggregated || 0),
        sources,
        summary: seed?.summary || '',
        resolution: {
            canonicalCompanyName: resolverSeed?.identity?.canonicalCompanyName || seed?.resolution?.canonicalCompanyName || null,
            confidence: resolverSeed?.identity?.confidence || seed?.resolution?.confidence || 'low',
            glassdoorUrl: resolverSeed?.identity?.glassdoor?.url || seed?.resolution?.glassdoorUrl || null
        }
    };
};

const mergeSentimentWithSeed = (verifiedSentiment, seedSentiment) => {
    if (!seedSentiment) return verifiedSentiment;
    if (!verifiedSentiment) return seedSentiment;

    const mergedSources = mergeSentimentSources(seedSentiment.sources || [], verifiedSentiment.sources || []);

    const glassdoorRating = verifiedSentiment.glassdoorRating ?? seedSentiment.glassdoorRating ?? null;
    const glassdoorReviews = verifiedSentiment.glassdoorReviews ?? seedSentiment.glassdoorReviews ?? null;
    const indeedRating = verifiedSentiment.indeedRating ?? seedSentiment.indeedRating ?? null;
    const indeedReviews = verifiedSentiment.indeedReviews ?? seedSentiment.indeedReviews ?? null;

    const aggregatedScore = averageRatings([glassdoorRating, indeedRating]) || toNumber(verifiedSentiment.aggregatedScore, 0) || toNumber(seedSentiment.aggregatedScore, 0);
    const totalReviews = Math.max(
        0,
        Math.round(toNumber(glassdoorReviews, 0) + toNumber(indeedReviews, 0))
    ) || Math.max(0, Math.round(toNumber(verifiedSentiment.totalReviews, 0) || toNumber(seedSentiment.totalReviews, 0)));

    return {
        ...seedSentiment,
        ...verifiedSentiment,
        sources: mergedSources,
        glassdoorRating,
        glassdoorReviews,
        indeedRating,
        indeedReviews,
        aggregatedScore,
        totalReviews,
        keyThemes: Array.isArray(verifiedSentiment.keyThemes) && verifiedSentiment.keyThemes.length
            ? verifiedSentiment.keyThemes
            : (Array.isArray(seedSentiment.keyThemes) ? seedSentiment.keyThemes : ['Compensation', 'Career development', 'Work-life balance']),
        sentiment: verifiedSentiment.sentiment || seedSentiment.sentiment || (aggregatedScore >= 4 ? 'Positive' : aggregatedScore >= 3 ? 'Balanced' : 'Neutral'),
        workLifeBalance: toNumber(verifiedSentiment.workLifeBalance, toNumber(seedSentiment.workLifeBalance, aggregatedScore)),
        careerOpportunities: toNumber(verifiedSentiment.careerOpportunities, toNumber(seedSentiment.careerOpportunities, aggregatedScore)),
        compensation: toNumber(verifiedSentiment.compensation, toNumber(seedSentiment.compensation, aggregatedScore)),
        resolution: {
            ...(seedSentiment.resolution || {}),
            ...(verifiedSentiment.resolution || {}),
            glassdoorUrl: verifiedSentiment?.resolution?.glassdoorUrl || seedSentiment?.resolution?.glassdoorUrl || null
        }
    };
};

const toNullableNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const toNullableInt = (value) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
};

const normalizeTalentSentimentPayload = (candidate = null, fallback = null, companyLabel = 'the company') => {
    const sourceInput = Array.isArray(candidate?.sources) ? candidate.sources : [];

    const glassdoorRating = toNullableNumber(candidate?.glassdoorRating ?? fallback?.glassdoorRating);
    const glassdoorReviews = toNullableInt(candidate?.glassdoorReviews ?? fallback?.glassdoorReviews);
    const indeedRating = toNullableNumber(candidate?.indeedRating ?? fallback?.indeedRating);
    const indeedReviews = toNullableInt(candidate?.indeedReviews ?? fallback?.indeedReviews);

    const aggregatedScore =
        averageRatings([glassdoorRating, indeedRating]) ||
        toNullableNumber(candidate?.aggregatedScore) ||
        toNullableNumber(fallback?.aggregatedScore) ||
        0;

    const combinedReviewCount = toNumber(glassdoorReviews, 0) + toNumber(indeedReviews, 0);
    const totalReviews =
        combinedReviewCount > 0
            ? combinedReviewCount
            : Math.max(
                0,
                Math.round(
                    toNumber(candidate?.totalReviews, toNumber(fallback?.totalReviews, 0))
                )
            );

    const inferredSources = [
        glassdoorRating !== null || glassdoorReviews !== null
            ? {
                name: 'Glassdoor',
                score: toNumber(glassdoorRating, 0),
                reviewCount: Math.max(0, Math.round(toNumber(glassdoorReviews, 0))),
                url: candidate?.resolution?.glassdoorUrl || fallback?.resolution?.glassdoorUrl || null
            }
            : null,
        indeedRating !== null || indeedReviews !== null
            ? {
                name: 'Indeed',
                score: toNumber(indeedRating, 0),
                reviewCount: Math.max(0, Math.round(toNumber(indeedReviews, 0))),
                url: candidate?.resolution?.indeedUrl || fallback?.resolution?.indeedUrl || null
            }
            : null
    ];

    const sources = mergeSentimentSources(sourceInput, inferredSources);

    const defaultSummary = glassdoorRating !== null
        ? `Glassdoor baseline for ${companyLabel}: ${glassdoorRating}/5 from ${Math.max(0, Math.round(toNumber(glassdoorReviews, 0))).toLocaleString()} reviews.`
        : 'Verified talent sentiment signals are still being consolidated from review platforms.';

    return {
        ...(fallback || {}),
        ...(candidate || {}),
        sources: sources.length ? sources : [{ name: 'Glassdoor', score: aggregatedScore, reviewCount: totalReviews, url: null }],
        glassdoorRating,
        glassdoorReviews,
        indeedRating,
        indeedReviews,
        aggregatedScore,
        totalReviews,
        sentiment: candidate?.sentiment || fallback?.sentiment || (aggregatedScore >= 4 ? 'Positive' : aggregatedScore >= 3 ? 'Balanced' : 'Neutral'),
        keyThemes: Array.isArray(candidate?.keyThemes) && candidate.keyThemes.length
            ? candidate.keyThemes
            : (Array.isArray(fallback?.keyThemes) && fallback.keyThemes.length ? fallback.keyThemes : ['Compensation', 'Career development', 'Work-life balance']),
        workLifeBalance: toNumber(candidate?.workLifeBalance, toNumber(fallback?.workLifeBalance, aggregatedScore)),
        careerOpportunities: toNumber(candidate?.careerOpportunities, toNumber(fallback?.careerOpportunities, aggregatedScore)),
        compensation: toNumber(candidate?.compensation, toNumber(fallback?.compensation, aggregatedScore)),
        summary: String(candidate?.summary || fallback?.summary || defaultSummary).trim(),
        resolution: {
            ...(fallback?.resolution || {}),
            ...(candidate?.resolution || {}),
            glassdoorUrl: candidate?.resolution?.glassdoorUrl || fallback?.resolution?.glassdoorUrl || null
        }
    };
};

export default async function handler(req, res) {
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
        const { companyName, location, jobTitle, seniorityLevel, resolverSeed = null, talentSentimentSeed = null } = req.body;
        const chapter2Profile = getChapter2Profile();
        const isChapter2Company = isChapter2Alias(companyName);
        const effectiveCompanyName = isChapter2Company ? chapter2Profile.canonicalName : companyName;

        if (!effectiveCompanyName || !location) {
            res.status(400).json({ error: 'Company name and location are required' });
            return;
        }

        console.log(`[Deep Dive] Starting analysis for ${effectiveCompanyName} (${location})...`);

        let userPrompt = `Generate a comprehensive talent acquisition intelligence report for "${effectiveCompanyName}" located in "${location}".`;
        if (jobTitle || seniorityLevel) {
            userPrompt += ` FOCUS ON ROLE-SPECIFIC ANALYSIS:`;
            if (jobTitle) userPrompt += ` Job Title/Family: "${jobTitle}".`;
            if (seniorityLevel) userPrompt += ` Seniority Level: "${seniorityLevel}".`;
            userPrompt += ` Provide detailed role-specific salary data, skill requirements, hiring trends, and competitive analysis for this specific position and level.`;
        }
        if (isChapter2Company) {
            userPrompt += `\n${buildChapter2PromptContext()}\n`;
            userPrompt += `\nCHAPTER 2 STRUCTURE RULES:
- Keep "keyProducts" and "coreCapabilities" aligned to the three service pillars.
- Keep company size close to approximately 120 employees.
- Keep project intelligence focused on embedded delivery, employer branding, and talent intelligence/advisory execution.
`;
        }

        // SCRAPING DISABLED FOR SPEED - AI uses Google Search for vacancy data
        console.log('[Deep Dive] Career scraping DISABLED for speed. AI will estimate via search.');
        userPrompt += `
INSTRUCTION: You do NOT have scraped career page data. Use your Google Search tool to find the current number of open roles at "${effectiveCompanyName}". For jobsAdvertised, provide your best estimate or "Data not available" if unsure.
`;

        // Fetch verified sentiment and size PARALLEL to save time
        console.log('[Deep Dive] Fetching verified sentiment and size in parallel...');
        const [verifiedSentiment, verifiedSize] = await Promise.all([
            getVerifiedTalentSentiment(effectiveCompanyName),
            getVerifiedCompanySize(effectiveCompanyName)
        ]);

        const seedSentiment = normalizeSentimentSeed(talentSentimentSeed, resolverSeed);
        const mergedVerifiedSentiment = mergeSentimentWithSeed(verifiedSentiment, seedSentiment);

        if (mergedVerifiedSentiment && mergedVerifiedSentiment.aggregatedScore !== null && mergedVerifiedSentiment.aggregatedScore !== undefined) {
            console.log(`[Deep Dive] Verified Sentiment: ${mergedVerifiedSentiment.aggregatedScore} (${mergedVerifiedSentiment.totalReviews})`);

            userPrompt += `\n\nCRITICAL VERIFIED SENTIMENT DATA START\n
            We have verified the detailed talent sentiment via Google Search.
            INSTRUCTIONS FOR "talentSentiment" OBJECT:
            - You MUST use these EXACT values:
              * aggregatedScore: ${mergedVerifiedSentiment.aggregatedScore}
              * totalReviews: ${mergedVerifiedSentiment.totalReviews}
              * sentiment: "${mergedVerifiedSentiment.sentiment || "Neutral"}"
              * keyThemes: ${JSON.stringify(mergedVerifiedSentiment.keyThemes || [])}

            INSTRUCTIONS FOR "Employee Experience":
            - Score: ${Math.round(mergedVerifiedSentiment.aggregatedScore * 20)}
            - Insight Text: MUST reference Glassdoor explicitly with verified score.
            - DO NOT INVENT A DIFFERENT SCORE.
            CRITICAL VERIFIED SENTIMENT DATA END\n`;
        }

        if (verifiedSize && verifiedSize.formattedString) {
            console.log(`[Deep Dive] Verified Size: ${verifiedSize.formattedString}`);
            userPrompt += `\n\nCRITICAL VERIFIED SIZE DATA START\n
            We have verified the company size via Google Search.
            YOU MUST USE THESE EXACT VALUES:
            - companySize: "${verifiedSize.formattedString}"
            - locations: ${JSON.stringify(verifiedSize.locations || [])}
            Override any other internal data with these facts.
            CRITICAL VERIFIED SIZE DATA END\n`;
        }

        userPrompt += ` Include all requested details in the specified JSON format with comprehensive competitive visualization data, talent movement analysis, and AI benchmark scoring.`;

        // Use Gemini only (Perplexity removed)
        console.log('[Deep Dive] Calling Gemini (Google Search enabled)...');
        const deepDiveModel = getGeminiModel();

        if (!deepDiveModel) {
            throw new Error('Gemini model not available');
        }

        let aiResponse;
        try {
            const result = await deepDiveModel.generateContent(`
${DEEP_DIVE_SYSTEM_PROMPT}

USER REQUEST:
${userPrompt}
`);
            aiResponse = result.response.text();
        } catch (e) {
            console.error("[Deep Dive] Gemini Failed. ", e.message);
            throw e;
        }

        // Parse the JSON response
        let parsedData = parseAIResponse(aiResponse);

        parsedData.techStack = trimNamedItems(parsedData.techStack, TECH_STACK_LIMIT);
        parsedData.coreCapabilities = trimNamedItems(parsedData.coreCapabilities, CORE_CAPABILITIES_LIMIT);

        // Safety: ensure talent movement is empty per rules
        if (parsedData.talentMovement) {
            parsedData.talentMovement.recentJoins = [];
            parsedData.talentMovement.recentExits = [];
            parsedData.talentMovement.dataAvailability = "limited - no individual movement data available";
        }

        // Normalize and cap location output to core operational hubs only.
        const verifiedLocations = Array.isArray(verifiedSize?.locations) ? verifiedSize.locations : [];
        const modelLocations = Array.isArray(parsedData.locations) ? parsedData.locations : [];
        const coreLocations = selectCoreOperationalHubs(verifiedLocations, modelLocations, CORE_LOCATION_LIMIT);
        if (coreLocations.length > 0) {
            parsedData.locations = coreLocations;
        }

        if (isChapter2Company) {
            const chapter2Override = getChapter2DeepDiveOverride();
            parsedData.companyName = chapter2Override.companyName;
            parsedData.companySize = chapter2Override.companySize;
            parsedData.keyProducts = chapter2Override.keyProducts;
            parsedData.coreCapabilities = trimNamedItems(chapter2Override.coreCapabilities, CORE_CAPABILITIES_LIMIT);

            const chapterProjects = Array.isArray(chapter2Override.projectIntelligence) ? chapter2Override.projectIntelligence : [];
            const existingProjects = Array.isArray(parsedData.projectIntelligence) ? parsedData.projectIntelligence : [];
            const mergedProjects = new Map();

            [...chapterProjects, ...existingProjects].forEach((project) => {
                const title = String(project?.title || '').trim();
                if (!title) return;
                const key = title.toLowerCase();
                if (!mergedProjects.has(key)) {
                    mergedProjects.set(key, project);
                }
            });

            parsedData.projectIntelligence = Array.from(mergedProjects.values()).slice(0, 12);

            if (!parsedData.benchmarkScore) {
                parsedData.benchmarkScore = {
                    overall: 0,
                    compensation: 0,
                    hiringVolume: 0,
                    techModernity: 0,
                    employeeReviews: 0,
                    marketSentiment: 0,
                    breakdown: ''
                };
            }

            parsedData.benchmarkScore.breakdown =
                'Chapter 2\'s benchmark context reflects an embedded RPO operating model, employer brand-led talent attraction, and data-driven advisory delivery with AI-enabled hiring guidance.';
        }

        // GROUNDING OVERRIDE: If we have verified sentiment, force it into the result to prevent AI hallucination (e.g. 0 reviews)
        if (mergedVerifiedSentiment && mergedVerifiedSentiment.aggregatedScore !== null && mergedVerifiedSentiment.aggregatedScore !== undefined) {
            console.log(`[Deep Dive] Overriding AI sentiment data with grounded facts for ${parsedData.companyName}`);
            parsedData.talentSentiment = {
                ...mergedVerifiedSentiment,
                sources: mergedVerifiedSentiment.sources || [
                    { name: 'Glassdoor', score: mergedVerifiedSentiment.aggregatedScore, reviewCount: mergedVerifiedSentiment.totalReviews }
                ]
            };
        }

        // Safety fallback: guarantee a complete talentSentiment shape (including summary + resolution metadata).
        parsedData.talentSentiment = normalizeTalentSentimentPayload(
            parsedData.talentSentiment || mergedVerifiedSentiment || seedSentiment,
            mergedVerifiedSentiment || seedSentiment,
            parsedData.companyName || effectiveCompanyName
        );

        res.status(200).json({ success: true, data: parsedData });

    } catch (error) {
        console.error('[Deep Dive] Error:', error);
        const normalized = normalizeApiError(error, 'Deep dive analysis failed');
        res.status(normalized.status).json({
            success: false,
            error: normalized.error,
            code: normalized.code,
            retryAfterSeconds: normalized.retryAfterSeconds
        });
    }
}

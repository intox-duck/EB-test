import { useState, useEffect, useRef } from "react";
import { Sidebar } from "@/components/Sidebar";
import { SearchBar } from "@/components/SearchBar";
import {
  Loader2,
  Sparkles,
  Plus,
  X,
  Search,
  Building2,
  ChevronDown,
  TrendingUp,
  DownloadCloud,
  Pickaxe
} from "lucide-react";
import { exportReportToPDF } from "@/lib/exportUtils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip
} from "recharts";
import { CompanyInsightsDisplay, CompanyInsights } from "@/components/CompanyInsightsDisplay";
import { ComparativeIntelligence } from "@/components/ComparativeIntelligence";
import { fetchBrandAnalysis, fetchCompanyInsights, BrandAnalysisData, ResolverDebugData } from "@/lib/api/brandAnalysis";
import { useAnalysis } from "@/hooks/useAnalysis";
import { toast } from "sonner";
import { AIAssistant } from "@/components/AIAssistant";
import newLogo from "@/assets/new_logo.png";


// --- Types ---
interface CompetitorScores {
  search: number;
  socialPresence: number;
  socialImpact: number;
  values: number;
  employee: number;
  content: number;
  ux: number;
  candidate: number;
  leadership: number;
}

interface CompetitorData {
  name: string;
  color: string;
  scores: CompetitorScores;
  insights: Record<string, string>;
  sources: string[];
  overallScore: number;
  provider: string;
  resolverDebug?: ResolverDebugData | null;
  talentSentiment?: any;
}

const DIMENSION_MAP: Record<string, keyof CompetitorScores> = {
  "Search": "search",
  "Social Presence": "socialPresence",
  "Social Impact": "socialImpact",
  "Values & Proposition": "values",
  "Employee Experience": "employee",
  "Content": "content",
  "UX": "ux",
  "Candidate Experience": "candidate",
  "Leadership": "leadership",
};

const DIMENSION_LABELS: Record<keyof CompetitorScores, string> = {
  search: "Search",
  socialPresence: "Social Presence",
  socialImpact: "Social Impact",
  values: "Values & Proposition",
  employee: "Employee Experience",
  content: "Content",
  ux: "UX",
  candidate: "Candidate Experience",
  leadership: "Leadership",
};

const COLORS = ["hsl(180, 60%, 35%)", "hsl(20, 70%, 50%)", "hsl(220, 10%, 50%)", "hsl(150, 50%, 40%)", "hsl(280, 50%, 50%)"];

const LoadingDots = ({ text }: { text: string }) => {
  const [dots, setDots] = useState("");
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? "" : prev + ".");
    }, 500);
    return () => clearInterval(interval);
  }, []);
  return <>{text}{dots}</>;
};

const DeepDiveLoadingCard = ({
  title,
  description,
  compact = false,
}: {
  title: string;
  description: string;
  compact?: boolean;
}) => (
  <Card
    className={`w-full border-2 border-dashed bg-muted/5 text-center flex flex-col items-center justify-center ${compact
      ? "min-h-[220px] p-6 sm:p-8"
      : "min-h-[280px] p-6 sm:min-h-[360px] sm:p-10 md:min-h-[400px] md:p-12"
      }`}
  >
    <div className="flex flex-col items-center justify-center space-y-5 animate-in fade-in zoom-in duration-500">
      <div className="relative">
        <div
          className={`rounded-full bg-primary/10 flex items-center justify-center ${compact ? "h-16 w-16" : "h-20 w-20"
            }`}
        >
          <Pickaxe className={`${compact ? "h-8 w-8" : "h-10 w-10"} text-primary animate-digging`} />
        </div>
        <div className="absolute -bottom-2 -right-2">
          <Loader2 className={`${compact ? "h-5 w-5" : "h-6 w-6"} text-primary animate-spin`} />
        </div>
      </div>
      <div className="space-y-2">
        <h3 className={`${compact ? "text-lg" : "text-xl"} font-bold text-foreground`}>
          <LoadingDots text={title} />
        </h3>
        <p className="mx-auto max-w-2xl text-muted-foreground text-sm sm:text-base">
          {description}
        </p>
      </div>
    </div>
  </Card>
);

const getTopDimension = (scores: CompetitorScores) =>
  (Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] || "search") as keyof CompetitorScores;

const getBottomDimension = (scores: CompetitorScores) =>
  (Object.entries(scores).sort((a, b) => a[1] - b[1])[0]?.[0] || "search") as keyof CompetitorScores;

const normalizeKey = (value: string) => value.trim().toLowerCase();
const COMPANY_NAME_STOPWORDS = new Set([
  "inc",
  "incorporated",
  "llc",
  "ltd",
  "limited",
  "plc",
  "corp",
  "corporation",
  "company",
  "co",
  "group",
  "holdings",
  "the"
]);

const tokenizeCompanyName = (value: string) =>
  normalizeKey(value)
    .replace(/[^a-z0-9&]+/g, " ")
    .split(" ")
    .filter((token) => token && !COMPANY_NAME_STOPWORDS.has(token));

const namesLikelySameCompany = (left: string, right: string) => {
  const normalizedLeft = normalizeKey(left);
  const normalizedRight = normalizeKey(right);

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
};

const upsertInsightAliases = (
  previous: Record<string, CompanyInsights>,
  preferredName: string,
  resolvedName: string,
  insight: CompanyInsights
) => {
  const next = { ...previous, [preferredName]: insight };
  if (resolvedName) {
    next[resolvedName] = insight;
  }
  return next;
};

const toDisplayCompanyName = (value: string) => {
  const cleaned = (value || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((part) => {
      if (/[A-Z].*[a-z]|[a-z].*[A-Z]/.test(part)) return part;
      if (/^[A-Z0-9&.-]{2,5}$/.test(part)) return part;
      return `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`;
    })
    .join(" ");
};

const extractLeadingNumber = (text?: string): number | null => {
  if (!text) return null;
  const match = text.match(/(\d[\d,]*)/);
  if (!match) return null;
  const parsed = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const formatListSnippet = (items: string[] = [], limit = 3): string => {
  const clean = items.map((item) => item.trim()).filter(Boolean);
  if (!clean.length) return "";
  if (clean.length <= limit) return clean.join(", ");
  return `${clean.slice(0, limit).join(", ")} +${clean.length - limit} more`;
};

const compactInsight = (value: string, maxLength = 220): string => {
  const cleaned = value
    .replace(/["']/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "Insight signals are still being compiled.";

  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
  const combined = sentences.slice(0, 3).join(" ");
  if (combined.length <= maxLength) {
    return combined;
  }
  return `${combined.slice(0, maxLength).trim()}...`;
};

const toFiniteNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const hasGlassdoorEvidence = (talentSentiment: any): boolean => {
  if (!talentSentiment) return false;

  const glassdoorScore = toFiniteNumber(talentSentiment?.glassdoorRating);
  const glassdoorReviews = toFiniteNumber(talentSentiment?.glassdoorReviews);

  if ((glassdoorScore !== null && glassdoorScore > 0) || (glassdoorReviews !== null && glassdoorReviews > 0)) {
    return true;
  }

  const sources = Array.isArray(talentSentiment?.sources) ? talentSentiment.sources : [];
  return sources.some((source: any) => {
    const name = String(source?.name || '').toLowerCase();
    if (!name.includes('glassdoor')) return false;
    const score = toFiniteNumber(source?.score);
    const reviewCount = toFiniteNumber(source?.reviewCount);
    return (score !== null && score > 0) || (reviewCount !== null && reviewCount > 0) || Boolean(source?.url);
  });
};

const isCurrentDeepDiveInsight = (insight: CompanyInsights | null | undefined, resolverDebug?: ResolverDebugData | null): boolean => {
  if (!insight || !insight.talentSentiment) return false;

  const talentSentiment: any = insight.talentSentiment;
  const hasSources = Array.isArray(talentSentiment.sources) && talentSentiment.sources.length > 0;
  const hasAggregatedScore = toFiniteNumber(talentSentiment?.aggregatedScore) !== null;
  if (!hasSources || !hasAggregatedScore) return false;

  // If resolver already found Glassdoor, deep-dive sentiment must carry Glassdoor evidence.
  const resolverHasGlassdoor = Boolean(resolverDebug?.identity?.glassdoor?.url);
  if (resolverHasGlassdoor && !hasGlassdoorEvidence(talentSentiment)) return false;

  return true;
};

const Index = () => {
  const [competitors, setCompetitors] = useState<CompetitorData[]>(() => {
    const saved = localStorage.getItem('brandRadar_savedCompetitors');
    if (!saved) return [];

    try {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((item) => ({
        ...item,
        name: toDisplayCompanyName(item?.name || ''),
      }));
    } catch {
      return [];
    }
  });
  const { detectedCompetitors, setLastAnalyzedCompany, saveIntelligenceReport, getIntelligenceReport, setLastAnalysis } = useAnalysis();
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleHomeClick = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [newCompetitor, setNewCompetitor] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window !== "undefined" ? window.innerWidth : 1280
  );

  const [selectedInsightCompany, setSelectedInsightCompany] = useState<string>("");
  const [insightsMap, setInsightsMap] = useState<Record<string, CompanyInsights>>({});
  const [insightsData, setInsightsData] = useState<CompanyInsights | null>(null);
  const [deepDiveLoadingByCompany, setDeepDiveLoadingByCompany] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    localStorage.setItem('brandRadar_savedCompetitors', JSON.stringify(competitors));
  }, [competitors]);

  useEffect(() => {
    if (!competitors.length) {
      setSelectedInsightCompany("");
      return;
    }
    const selectedExists = competitors.some(
      (comp) => namesLikelySameCompany(comp.name, selectedInsightCompany)
    );
    if (!selectedExists) {
      setSelectedInsightCompany(competitors[0].name);
    }
  }, [competitors, selectedInsightCompany]);

  useEffect(() => {
    if (!competitors.length) {
      setInsightsMap({});
      setDeepDiveLoadingByCompany({});
      return;
    }

    setInsightsMap((prev) => {
      const next: Record<string, CompanyInsights> = {};
      competitors.forEach((comp) => {
        const existingKey = Object.keys(prev).find((key) => namesLikelySameCompany(key, comp.name));
        if (existingKey) {
          const existingInsight = prev[existingKey];
          if (isCurrentDeepDiveInsight(existingInsight, comp.resolverDebug)) {
            next[comp.name] = existingInsight;
          }
          return;
        }
        const cachedReport = getIntelligenceReport(comp.name);
        if (isCurrentDeepDiveInsight(cachedReport, comp.resolverDebug)) {
          next[comp.name] = cachedReport;
        }
      });
      return next;
    });

    setDeepDiveLoadingByCompany((prev) => {
      const next: Record<string, boolean> = {};
      competitors.forEach((comp) => {
        const key = normalizeKey(comp.name);
        if (prev[key]) {
          next[key] = true;
        }
      });
      return next;
    });
  }, [competitors, getIntelligenceReport]);

  const getInsightForCompany = (companyName: string): CompanyInsights | null => {
    const keys = Object.keys(insightsMap);
    const exactMatch = keys.find((key) => normalizeKey(key) === normalizeKey(companyName));
    if (exactMatch) return insightsMap[exactMatch];

    const aliasMatch = keys.find((key) => namesLikelySameCompany(key, companyName));
    return aliasMatch ? insightsMap[aliasMatch] : null;
  };

  useEffect(() => {
    if (!selectedInsightCompany) {
      setInsightsData(null);
      return;
    }

    const selectedCompetitor = competitors.find(
      (comp) => namesLikelySameCompany(comp.name, selectedInsightCompany)
    ) || null;

    const mappedInsight = getInsightForCompany(selectedInsightCompany);
    if (isCurrentDeepDiveInsight(mappedInsight, selectedCompetitor?.resolverDebug)) {
      setInsightsData(mappedInsight);
      return;
    }

    const cachedReport = getIntelligenceReport(selectedInsightCompany);
    if (isCurrentDeepDiveInsight(cachedReport, selectedCompetitor?.resolverDebug)) {
      const preferredName = selectedCompetitor?.name || selectedInsightCompany;
      const resolvedName = cachedReport?.companyName || preferredName;
      setInsightsMap((prev) => upsertInsightAliases(prev, preferredName, resolvedName, cachedReport));
      setInsightsData(cachedReport);
      return;
    }

    setInsightsData(null);
  }, [selectedInsightCompany, insightsMap, getIntelligenceReport, competitors]);

  const transformToCompetitorData = (data: BrandAnalysisData, color: string): CompetitorData => {
    const scores: CompetitorScores = {
      search: 50, socialPresence: 50, socialImpact: 50,
      values: 50, employee: 50, content: 50, ux: 50, candidate: 50, leadership: 50,
    };

    data.axes.forEach((axis: any) => {
      const key = DIMENSION_MAP[axis.subject];
      if (key) scores[key] = axis.score;
    });

    return {
      name: toDisplayCompanyName(data.companyName),
      color,
      scores,
      insights: data.insights || {},
      sources: data.groundingSources || [],
      overallScore: data.overallScore,
      provider: 'Chapter 2 Employer Brand Radar',
      resolverDebug: data.resolverDebug || null,
      talentSentiment: data.talentSentiment || null,
    };
  };

  const radarData = competitors.length > 0 ? [
    { subject: "Search", fullMark: 100, ...Object.fromEntries(competitors.map(c => [c.name, c.scores.search])) },
    { subject: "Social Presence", fullMark: 100, ...Object.fromEntries(competitors.map(c => [c.name, c.scores.socialPresence])) },
    { subject: "Social Impact", fullMark: 100, ...Object.fromEntries(competitors.map(c => [c.name, c.scores.socialImpact])) },
    { subject: "Values & Proposition", fullMark: 100, ...Object.fromEntries(competitors.map(c => [c.name, c.scores.values])) },
    { subject: "Employee Experience", fullMark: 100, ...Object.fromEntries(competitors.map(c => [c.name, c.scores.employee])) },
    { subject: "Content", fullMark: 100, ...Object.fromEntries(competitors.map(c => [c.name, c.scores.content])) },
    { subject: "UX", fullMark: 100, ...Object.fromEntries(competitors.map(c => [c.name, c.scores.ux])) },
    { subject: "Candidate Experience", fullMark: 100, ...Object.fromEntries(competitors.map(c => [c.name, c.scores.candidate])) },
    { subject: "Leadership", fullMark: 100, ...Object.fromEntries(competitors.map(c => [c.name, c.scores.leadership])) },
  ] : [];

  const dimensions = Object.keys(DIMENSION_LABELS) as (keyof CompetitorScores)[];
  const suggestedCompetitors = detectedCompetitors.filter(
    (candidate) => !competitors.some((comp) => comp.name.trim().toLowerCase() === candidate.trim().toLowerCase())
  );
  const companiesWithInsights = competitors.filter((comp) => !!getInsightForCompany(comp.name)).map((comp) => comp.name);
  const missingInsightCompanies = competitors.filter((comp) => !getInsightForCompany(comp.name)).map((comp) => comp.name);
  const companyColors = Object.fromEntries(competitors.map((comp) => [comp.name, comp.color]));
  const isGeneratingDeep = Object.values(deepDiveLoadingByCompany).some(Boolean);
  const isMobileViewport = viewportWidth < 768;
  const isTabletViewport = viewportWidth >= 768 && viewportWidth < 1280;
  const radarChartHeight = isMobileViewport ? 340 : isTabletViewport ? 420 : 500;
  const radarChartMargin = isMobileViewport
    ? { top: 20, right: 16, bottom: 20, left: 16 }
    : isTabletViewport
      ? { top: 26, right: 36, bottom: 26, left: 36 }
      : { top: 30, right: 60, bottom: 30, left: 60 };
  const radarAngleTickSize = isMobileViewport ? 9 : 11;
  const radarRadiusTickSize = isMobileViewport ? 9 : 10;
  const selectedInsightKey = normalizeKey(selectedInsightCompany || "");
  const isSelectedInsightLoading = !!selectedInsightKey && Object.entries(deepDiveLoadingByCompany).some(([key, loading]) => {
    if (!loading) return false;
    return key === selectedInsightKey || key.includes(selectedInsightKey) || selectedInsightKey.includes(key);
  });
  const deepDiveLoaderTarget = missingInsightCompanies.length > 0
    ? missingInsightCompanies.join(", ")
    : selectedInsightCompany || "this company";
  const deepDiveLoaderTitle = missingInsightCompanies.length > 0
    ? "Building Comparative Deep Dive"
    : "Refreshing Deep Dive Intelligence";
  const selectedComparisonCompetitor = (() => {
    const primaryName = competitors[0]?.name || "";
    const peers = competitors.filter((comp) => normalizeKey(comp.name) !== normalizeKey(primaryName));
    if (!peers.length) return undefined;

    const explicitSelection = peers.find((comp) => namesLikelySameCompany(comp.name, selectedInsightCompany));
    if (explicitSelection) return explicitSelection;

    return peers.reduce((best, current) => (current.overallScore > best.overallScore ? current : best), peers[0]);
  })();

  const getDimensionNarrative = (dim: keyof CompetitorScores, label: string): string[] => {
    const primary = competitors[0];
    if (!primary) return ["Analysis metadata for this dimension is processing..."];

    const primaryScore = primary.scores[dim];
    const primaryInsight = compactInsight(primary.insights[label] || "Primary company insight is still being processed.", 380);
    const comparison = selectedComparisonCompetitor;

    if (!comparison) {
      return [primaryInsight];
    }

    const comparisonScore = comparison.scores[dim];
    const comparisonInsight = compactInsight(
      comparison.insights[label] || "Competitor insight is still being processed."
    , 380);
    const delta = primaryScore - comparisonScore;
    const gap = Math.abs(delta);
    const intensity = gap >= 12 ? "a significant gap" : gap >= 6 ? "a clear gap" : gap >= 3 ? "a narrow gap" : "a marginal gap";

    const paragraphOne = delta === 0
      ? `${primary.name} and ${comparison.name} are level on ${label} at ${primaryScore}/100, making this a direct parity area.`
      : delta > 0
        ? `${primary.name} leads ${comparison.name} on ${label} (${primaryScore} vs ${comparisonScore}), creating ${intensity} of ${gap} points.`
        : `${primary.name} trails ${comparison.name} on ${label} (${primaryScore} vs ${comparisonScore}), with ${intensity} of ${gap} points to close.`;

    const paragraphTwo = `${primary.name} signal: ${primaryInsight} ${comparison.name} signal: ${comparisonInsight}`;

    return [paragraphOne, paragraphTwo];
  };

  const analysisBreakdownParagraphs = (() => {
    if (!competitors.length) return [] as string[];

    const primary = competitors[0];
    const strongest = getTopDimension(primary.scores);
    const weakest = getBottomDimension(primary.scores);
    const primaryInsight = getInsightForCompany(primary.name);
    const primaryLocations = formatListSnippet(primaryInsight?.locations || [], 4);
    const primaryTech = formatListSnippet(
      (primaryInsight?.techStack || [])
        .map((tech) => (typeof tech === "string" ? tech : tech?.name))
        .filter(Boolean) as string[],
      4
    );
    const primaryThemes = formatListSnippet(primaryInsight?.talentSentiment?.keyThemes || [], 3);

    if (competitors.length === 1) {
      const paragraphOne = `${primary.name} appears as a ${primaryInsight?.companySize || "large"} operation with a Brand Radar score of ${primary.overallScore}/100. Current strength sits in ${DIMENSION_LABELS[strongest]} (${primary.scores[strongest]}), while ${DIMENSION_LABELS[weakest]} (${primary.scores[weakest]}) is the main area holding back the overall profile.`;

      const sentimentLine = primaryInsight?.talentSentiment?.aggregatedScore
        ? `Talent sentiment is ${primaryInsight.talentSentiment.aggregatedScore.toFixed(1)}/5 from ${primaryInsight.talentSentiment.totalReviews.toLocaleString()} reviews${primaryThemes ? `, with themes around ${primaryThemes}` : ""}`
        : "Talent sentiment signals are still limited, so the next update will prioritise validated review coverage";

      const techLine = primaryTech
        ? `Technology signals include ${primaryTech}`
        : "Technology stack evidence is still being expanded";

      const locationLine = primaryLocations
        ? `Operational footprint includes ${primaryLocations}`
        : "Operating footprint is still being resolved from deep-dive sources";

      const paragraphTwo = `${sentimentLine}. ${techLine}. ${locationLine}.`;

      return [paragraphOne, paragraphTwo];
    }

    if (!selectedComparisonCompetitor) {
      return [
        `${primary.name} currently leads this benchmark set at ${primary.overallScore}/100, with strongest execution in ${DIMENSION_LABELS[strongest]} and the largest risk in ${DIMENSION_LABELS[weakest]}.`
      ];
    }

    const comparison = selectedComparisonCompetitor;
    const comparisonInsight = getInsightForCompany(comparison.name);
    const comparisonStrongest = getTopDimension(comparison.scores);
    const comparisonWeakest = getBottomDimension(comparison.scores);
    const comparisonLocations = formatListSnippet(comparisonInsight?.locations || [], 4);
    const comparisonTechCount = comparisonInsight?.techStack?.length || 0;
    const scoreDelta = primary.overallScore - comparison.overallScore;
    const gapText = scoreDelta >= 0 ? `${primary.name} leads ${comparison.name} by ${Math.abs(scoreDelta)} points` : `${primary.name} trails ${comparison.name} by ${Math.abs(scoreDelta)} points`;

    const paragraphOne = `${gapText} overall (${primary.overallScore} vs ${comparison.overallScore}). ${primary.name} is strongest in ${DIMENSION_LABELS[strongest]} (${primary.scores[strongest]}), but has most headroom in ${DIMENSION_LABELS[weakest]} (${primary.scores[weakest]}), while ${comparison.name} currently leans on ${DIMENSION_LABELS[comparisonStrongest]} (${comparison.scores[comparisonStrongest]}) and shows relative weakness in ${DIMENSION_LABELS[comparisonWeakest]} (${comparison.scores[comparisonWeakest]}).`;

    const primarySize = extractLeadingNumber(primaryInsight?.companySize);
    const comparisonSize = extractLeadingNumber(comparisonInsight?.companySize);
    const sizeLine = primarySize && comparisonSize
      ? `Scale signals show ${primary.name} at ~${primarySize.toLocaleString()} employees versus ${comparison.name} at ~${comparisonSize.toLocaleString()}`
      : `Scale signals indicate ${primary.name}: ${primaryInsight?.companySize || "not yet confirmed"}; ${comparison.name}: ${comparisonInsight?.companySize || "not yet confirmed"}`;

    const primarySentimentScore = primaryInsight?.talentSentiment?.aggregatedScore;
    const comparisonSentimentScore = comparisonInsight?.talentSentiment?.aggregatedScore;
    const primaryThemesShort = formatListSnippet(primaryInsight?.talentSentiment?.keyThemes || [], 2);
    const comparisonThemes = formatListSnippet(comparisonInsight?.talentSentiment?.keyThemes || [], 2);
    const strategicSentimentLine = (() => {
      if (primarySentimentScore && comparisonSentimentScore) {
        const sentimentGap = Math.abs(primarySentimentScore - comparisonSentimentScore);
        if (sentimentGap < 0.2) {
          return `Strategic talent sentiment is effectively at parity (${primarySentimentScore.toFixed(1)}/5 vs ${comparisonSentimentScore.toFixed(1)}/5), with both companies showing similarly balanced culture signals`;
        }
        const leaderName = primarySentimentScore >= comparisonSentimentScore ? primary.name : comparison.name;
        const leaderScore = Math.max(primarySentimentScore, comparisonSentimentScore).toFixed(1);
        const laggerName = primarySentimentScore >= comparisonSentimentScore ? comparison.name : primary.name;
        const laggerScore = Math.min(primarySentimentScore, comparisonSentimentScore).toFixed(1);
        const leaderThemes = primarySentimentScore >= comparisonSentimentScore ? primaryThemesShort : comparisonThemes;
        return `Strategic talent sentiment favours ${leaderName} (${leaderScore}/5 vs ${laggerScore}/5), indicating a more balanced culture rating${leaderThemes ? ` with themes around ${leaderThemes}` : ''}`;
      }

      const primaryThemesText = primaryThemesShort ? `${primary.name} themes: ${primaryThemesShort}` : `${primary.name} themes still consolidating`;
      const comparisonThemesText = comparisonThemes ? `${comparison.name} themes: ${comparisonThemes}` : `${comparison.name} themes still consolidating`;
      return `Strategic talent sentiment comparison is still consolidating; ${primaryThemesText}; ${comparisonThemesText}`;
    })();

    const techLine = primaryTech
      ? `${primary.name} stack highlights include ${primaryTech}`
      : `${primary.name} stack signals are still being expanded`;

    const footprintLine = primaryLocations || comparisonLocations
      ? `operational footprint spans ${primary.name}${primaryLocations ? ` (${primaryLocations})` : ""}${comparisonLocations ? ` and ${comparison.name} (${comparisonLocations})` : ""}`
      : "operating footprint data is still being resolved";

    const depthLine = comparisonTechCount
      ? `${comparison.name} currently has ${comparisonTechCount} mapped technologies in the deep dive`
      : `${comparison.name} technology mapping is still being populated`;

    const paragraphTwo = `${sizeLine}. ${strategicSentimentLine}. ${techLine}; ${footprintLine}, and ${depthLine}.`;

    return [paragraphOne, paragraphTwo];
  })();

  const generateDeepDiveForCompany = async (
    companyName: string,
    options: { notifyOnSuccess?: boolean; notifyOnError?: boolean; force?: boolean } = {}
  ): Promise<CompanyInsights | null> => {
    const normalizedName = normalizeKey(companyName);
    const selectedCompetitor = competitors.find((comp) => namesLikelySameCompany(comp.name, companyName)) || null;
    const existingInsight = getInsightForCompany(companyName);
    if (!options.force && isCurrentDeepDiveInsight(existingInsight, selectedCompetitor?.resolverDebug)) {
      return existingInsight;
    }

    const cachedInsight = getIntelligenceReport(companyName);
    if (!options.force && isCurrentDeepDiveInsight(cachedInsight, selectedCompetitor?.resolverDebug)) {
      if (!existingInsight) {
        const preferredName = selectedCompetitor?.name || companyName;
        const resolvedName = cachedInsight?.companyName || preferredName;
        setInsightsMap((prev) => upsertInsightAliases(prev, preferredName, resolvedName, cachedInsight));
      }
      return cachedInsight;
    }

    if (deepDiveLoadingByCompany[normalizedName]) {
      return null;
    }

    setDeepDiveLoadingByCompany((prev) => ({ ...prev, [normalizedName]: true }));

    try {
      const deepDiveData = await fetchCompanyInsights({
        companyName,
        location: "United Kingdom",
        jobTitle: "Senior Software Engineer",
        seniorityLevel: "Senior",
        resolverSeed: selectedCompetitor?.resolverDebug || null,
        talentSentimentSeed: selectedCompetitor?.talentSentiment || null,
      });
      const preferredName = selectedCompetitor?.name || companyName;
      const resolvedName = deepDiveData?.companyName || preferredName;
      setInsightsMap((prev) => upsertInsightAliases(prev, preferredName, resolvedName, deepDiveData));
      saveIntelligenceReport(preferredName, deepDiveData);
      if (!namesLikelySameCompany(preferredName, resolvedName)) {
        saveIntelligenceReport(resolvedName, deepDiveData);
      }

      if (!selectedInsightCompany || namesLikelySameCompany(selectedInsightCompany, companyName)) {
        setSelectedInsightCompany(preferredName);
      }

      if (options.notifyOnSuccess) {
        toast.success(`Deep dive report ready for ${toDisplayCompanyName(preferredName)}`);
      }

      return deepDiveData;
    } catch (error) {
      console.error("[Deep Dive] Failed for", companyName, error);
      if (options.notifyOnError) {
        toast.error(`Failed to generate deep dive for ${companyName}`);
      }
      return null;
    } finally {
      setDeepDiveLoadingByCompany((prev) => {
        const next = { ...prev };
        delete next[normalizedName];
        return next;
      });
    }
  };

  const removeCompetitor = (name: string) => {
    const remaining = competitors.filter((comp) => normalizeKey(comp.name) !== normalizeKey(name));
    setCompetitors(remaining);
    setInsightsMap((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (namesLikelySameCompany(key, name)) {
          delete next[key];
        }
      });
      return next;
    });
    setDeepDiveLoadingByCompany((prev) => {
      const next = { ...prev };
      delete next[normalizeKey(name)];
      return next;
    });

    if (expandedCompany && normalizeKey(expandedCompany) === normalizeKey(name)) {
      setExpandedCompany(null);
    }

    if (namesLikelySameCompany(selectedInsightCompany || "", name)) {
      setSelectedInsightCompany(remaining[0]?.name || "");
    }
  };

  const handleMainSearch = async (term: string) => {
    if (!term.trim()) return;
    setCompetitors([]);
    setInsightsMap({});
    setInsightsData(null);
    setSelectedInsightCompany("");
    setDeepDiveLoadingByCompany({});
    setLastAnalyzedCompany(term);
    await addCompetitorByName(term, true);
  };

  const handleAddCompetitor = async () => {
    if (!newCompetitor.trim()) return;
    await addCompetitorByName(newCompetitor.trim());
  };

  const addCompetitorByName = async (companyName: string, isPrimary = false) => {
    if (!isPrimary && competitors.some(c => namesLikelySameCompany(c.name, companyName))) {
      toast.error("This company is already in the comparison");
      return;
    }

    setIsAnalyzing(true);
    if (!isPrimary) {
      setNewCompetitor("");
      setIsAdding(false);
    }

    // Parallel flow:
    // 1) Start deep-dive immediately for latency reduction.
    // 2) Run analyze (Brand Radar + Analysis Breakdown).
    // 3) Reconcile deep-dive with analyze resolver data; retry with seeds only if needed.
    const deepDiveRequestName = toDisplayCompanyName(companyName) || companyName;
    const deepDiveRequestKey = normalizeKey(deepDiveRequestName);
    setDeepDiveLoadingByCompany((prev) => ({ ...prev, [deepDiveRequestKey]: true }));

    const provisionalDeepDivePromise = fetchCompanyInsights({
      companyName: deepDiveRequestName,
      location: "United Kingdom",
      jobTitle: "Senior Software Engineer",
      seniorityLevel: "Senior",
    })
      .then((data) => ({ data, error: null as unknown }))
      .catch((error) => ({ data: null, error }));

    try {
      const data = await fetchBrandAnalysis(companyName);
      if (isPrimary) {
        setLastAnalysis(data);
      }
      let availableColor = COLORS[0];
      if (!isPrimary) {
        const usedColors = competitors.map(c => c.color);
        availableColor = COLORS.find(c => !usedColors.includes(c)) || COLORS[competitors.length % COLORS.length];
      }

      const newCompetitorData = transformToCompetitorData(data, availableColor);
      setCompetitors(prev => isPrimary ? [newCompetitorData] : [...prev, newCompetitorData]);

      if (isPrimary || competitors.length === 0) {
        setSelectedInsightCompany(newCompetitorData.name);
        setExpandedCompany(newCompetitorData.name);
      }

      toast.success(`Added ${data.companyName || companyName} to comparison`);

      // Keep deep-dive async so Brand Radar renders immediately, then hydrate when ready.
      void (async () => {
        let resolvedDeepDiveName = newCompetitorData.name;
        try {
          const provisional = await provisionalDeepDivePromise;
          if (provisional.error) {
            console.warn("[Deep Dive] Provisional parallel call failed:", provisional.error);
          }

          let deepDiveData = provisional.data as CompanyInsights | null;
          const hasValidDeepDive = isCurrentDeepDiveInsight(deepDiveData, data.resolverDebug || null);

          if (!hasValidDeepDive) {
            deepDiveData = await fetchCompanyInsights({
              companyName: newCompetitorData.name,
              location: "United Kingdom",
              jobTitle: "Senior Software Engineer",
              seniorityLevel: "Senior",
              resolverSeed: data.resolverDebug || null,
              talentSentimentSeed: data.talentSentiment || null,
            }).catch((error) => {
              console.error("[Deep Dive] Seeded reconciliation call failed:", error);
              return null;
            });
          }

          if (deepDiveData) {
            resolvedDeepDiveName = deepDiveData?.companyName || newCompetitorData.name;
            const preferredName = newCompetitorData.name;
            setInsightsMap((prev) => upsertInsightAliases(prev, preferredName, resolvedDeepDiveName, deepDiveData));
            saveIntelligenceReport(preferredName, deepDiveData);
            if (!namesLikelySameCompany(preferredName, resolvedDeepDiveName)) {
              saveIntelligenceReport(resolvedDeepDiveName, deepDiveData);
            }

            setSelectedInsightCompany((prev) => {
              if (!prev || namesLikelySameCompany(prev, newCompetitorData.name)) {
                return newCompetitorData.name;
              }
              return prev;
            });

            if (isPrimary) {
              toast.success(`Deep dive report ready for ${toDisplayCompanyName(newCompetitorData.name)}`);
            }
          } else if (isPrimary) {
            toast.error(`Failed to generate deep dive for ${newCompetitorData.name}`);
          }
        } catch (error) {
          console.error("[Deep Dive] Parallel hydration failed for", newCompetitorData.name, error);
          if (isPrimary) {
            toast.error(`Failed to generate deep dive for ${newCompetitorData.name}`);
          }
        } finally {
          setDeepDiveLoadingByCompany((prev) => {
            const next = { ...prev };
            delete next[deepDiveRequestKey];
            delete next[normalizeKey(resolvedDeepDiveName)];
            return next;
          });
        }
      })();

    } catch (err) {
      console.error('Analysis error:', err);
      setDeepDiveLoadingByCompany((prev) => {
        const next = { ...prev };
        delete next[deepDiveRequestKey];
        return next;
      });
      toast.error(err instanceof Error ? err.message : 'Failed to analyse company');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateDeepDive = async () => {
    if (!selectedInsightCompany) return;
    const result = await generateDeepDiveForCompany(selectedInsightCompany, {
      notifyOnSuccess: false,
      notifyOnError: true,
      force: true,
    });
    if (result) {
      toast.success("Deep dive analysis complete");
    }
  };

  const handleExport = async () => {
    if (competitors.length === 0) return;
    toast.info("Generating PDF report...");
    try {
      const primaryInsight = competitors[0] ? getInsightForCompany(competitors[0].name) : null;
      exportReportToPDF(primaryInsight, competitors, DIMENSION_LABELS);
      toast.success("Report exported successfully");
    } catch (e) {
      console.error(e);
      toast.error("Failed to export PDF.");
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main ref={scrollRef} className="flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <div className="mb-12 space-y-8 sm:mb-16 sm:space-y-12 lg:mb-20 lg:space-y-16">
              <div className="flex flex-col gap-4 md:relative md:min-h-[96px] md:justify-center">
                <div
                  onClick={handleHomeClick}
                  className="mx-auto flex w-fit items-center gap-3 cursor-pointer transition-opacity hover:opacity-70 md:absolute md:left-0 md:mx-0 md:gap-4"
                >
                  <Building2 className="h-8 w-8 text-primary sm:h-10 sm:w-10" />
                  <div className="flex flex-col items-center">
                    <img src={newLogo} alt="Employer Brand Logo" className="h-10 w-auto object-contain sm:h-14" />
                    <span className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-black sm:text-sm sm:tracking-[0.2em]">Employer Brand</span>
                  </div>
                </div>

                <div className="mx-auto rounded-full bg-[#16a085] px-4 py-2.5 shadow-sm transition-shadow duration-300 hover:shadow-md sm:px-8 sm:py-3">
                  <h1 className="text-center text-lg font-bold leading-tight tracking-tight text-black sm:text-2xl lg:text-3xl">Brand Radar Dashboard</h1>
                </div>

                {competitors.length > 0 && (
                  <div className="mx-auto w-full md:absolute md:right-0 md:mx-0 md:w-auto">
                    <Button
                      onClick={handleExport}
                      variant="default"
                      className="h-11 w-full bg-primary px-4 text-primary-foreground shadow-lg hover:bg-primary/90 sm:h-12 sm:px-6 md:w-auto"
                    >
                      <DownloadCloud className="mr-2 h-5 w-5" />
                      Export to PDF
                    </Button>
                  </div>
                )}
              </div>

              <p className="mx-auto max-w-4xl animate-in slide-in-from-top-4 text-center text-base font-bold text-black fade-in duration-1000 sm:text-lg lg:text-xl">
                Analyse and Compare Employer Brand Performance Across 9 Dimensions.
              </p>
            </div>

            <SearchBar onSearch={handleMainSearch} isLoading={isAnalyzing} />

            <div className="space-y-8">
              {suggestedCompetitors.length > 0 && (
                <div className="animate-in slide-in-from-top-2 fade-in flex flex-col items-start justify-between gap-4 rounded-lg border border-blue-200/50 bg-blue-50/5 p-4 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-slate-700">
                      AI Suggested Competitors
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {suggestedCompetitors
                      .slice(0, 4)
                      .map((competitor) => (
                        <Button
                          key={competitor}
                          variant="outline"
                          size="sm"
                          onClick={() => addCompetitorByName(competitor)}
                          disabled={isAnalyzing}
                          className="h-8 border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          {competitor}
                        </Button>
                      ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {competitors.map((comp) => (
                  <div
                    key={comp.name}
                    className="flex max-w-full cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 transition-colors hover:bg-muted/50"
                    style={{ borderColor: comp.color }}
                    onClick={() => setExpandedCompany(expandedCompany === comp.name ? null : comp.name)}
                  >
                    <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: comp.color }} />
                    <span className="max-w-[10rem] truncate text-sm font-medium sm:max-w-[14rem]">{toDisplayCompanyName(comp.name)}</span>
                    <span className="shrink-0 text-xs text-muted-foreground" title="Overall Brand Radar score">({comp.overallScore}/100)</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeCompetitor(comp.name); }}
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {!isAnalyzing || competitors.length > 0 ? (
                  isAnalyzing ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/50 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analysing...
                    </div>
                  ) : isAdding ? (
                    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                      <Input
                        placeholder="Company..."
                        value={newCompetitor}
                        onChange={(e) => setNewCompetitor(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddCompetitor()}
                        className="h-8 w-full sm:w-40"
                        autoFocus
                      />
                      <Button size="sm" onClick={handleAddCompetitor}>
                        <Search className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsAdding(true)}
                      disabled={competitors.length >= 5}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  )
                ) : null}
              </div>

              {competitors.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-muted/10 px-4 py-12 sm:py-16 md:py-20">
                  <Building2 className="mb-4 h-14 w-14 text-muted-foreground opacity-50 sm:h-16 sm:w-16" />
                  <h3 className="mb-2 text-lg font-semibold">Ready to Analyse</h3>
                  <p className="max-w-sm text-center text-muted-foreground">
                    Enter a company name above to generate the first Brand Radar and Deep Dive Intelligence report.
                  </p>
                </div>
              ) : (
                <div id="report-container" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                  <Card className="border border-primary/20 bg-primary/5 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        Analysis Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        {analysisBreakdownParagraphs.map((paragraph, idx) => (
                          <p key={`analysis-breakdown-${idx}`} className="text-sm text-muted-foreground leading-relaxed">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
                    <Card className="border border-slate-300 shadow-card">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-primary" />
                          Brand Radar Comparison
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="w-full" style={{ height: `${radarChartHeight}px` }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={radarData} margin={radarChartMargin}>
                              <PolarGrid stroke="hsl(220, 13%, 85%)" strokeWidth={1} />
                              <PolarAngleAxis
                                dataKey="subject"
                                tick={{ fill: "hsl(220, 9%, 46%)", fontSize: radarAngleTickSize, fontWeight: 500 }}
                                tickLine={false}
                              />
                              <PolarRadiusAxis
                                angle={90}
                                domain={[0, 100]}
                                tick={{ fill: "hsl(220, 9%, 60%)", fontSize: radarRadiusTickSize }}
                                tickCount={6}
                                axisLine={false}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'white',
                                  border: '1px solid hsl(220, 13%, 91%)',
                                  borderRadius: '8px',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                }}
                              />
                              {competitors.map((comp) => (
                                <Radar
                                  key={comp.name}
                                  name={comp.name}
                                  dataKey={comp.name}
                                  stroke={comp.color}
                                  fill={comp.color}
                                  fillOpacity={0.05}
                                  strokeWidth={2}
                                />
                              ))}
                              {!isMobileViewport && <Legend wrapperStyle={{ paddingTop: '20px' }} />}
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                        {isMobileViewport && (
                          <div className="mt-4 flex flex-wrap justify-center gap-2">
                            {competitors.map((comp) => (
                              <span
                                key={`legend-${comp.name}`}
                                className="rounded-full border px-2 py-0.5 text-[11px] font-medium"
                                style={{ borderColor: `${comp.color}66`, color: comp.color }}
                              >
                                {comp.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {dimensions.map((dim) => {
                        const label = DIMENSION_LABELS[dim];
                        const primaryComp = competitors[0];
                        const comparisonComp = selectedComparisonCompetitor;
                        const dimensionNarrative = getDimensionNarrative(dim, label);

                        return (
                          <Card key={dim} className="border border-slate-300 bg-muted/5 shadow-sm transition-colors hover:bg-muted/10">
                            <CardHeader className="p-4 pb-2">
                              <div className="flex items-start justify-between gap-2">
                                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</CardTitle>
                                <div className="flex items-center gap-1.5">
                                  <div className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded border border-primary/20">
                                    {primaryComp?.scores[dim]}/100
                                  </div>
                                  {comparisonComp && (
                                    <div
                                      className="text-[10px] font-bold px-1.5 py-0.5 rounded border"
                                      style={{
                                        color: comparisonComp.color,
                                        borderColor: `${comparisonComp.color}55`,
                                        backgroundColor: `${comparisonComp.color}1A`
                                      }}
                                    >
                                      {comparisonComp.scores[dim]}/100
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                              <div className="space-y-2">
                                {dimensionNarrative.slice(0, 2).map((paragraph, idx) => (
                                  <p key={`${label}-narrative-${idx}`} className="text-xs text-muted-foreground leading-relaxed">
                                    {paragraph}
                                  </p>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>

                  {/* DEEP DIVE SECTION */}
                  <div className="mt-12 space-y-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2 text-primary">
                        <Building2 className="w-5 h-5" />
                        <h2 className="text-xl font-bold">Deep Dive Intelligence</h2>
                      </div>

                      {competitors.length > 1 && (
                        <div className="w-full overflow-x-auto sm:w-auto">
                          <div className="inline-flex min-w-max items-center gap-2 rounded-full border border-border/50 bg-muted/50 p-1">
                            {competitors.map(comp => (
                              <button
                                key={comp.name}
                                onClick={() => setSelectedInsightCompany(comp.name)}
                                className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-all ${namesLikelySameCompany(selectedInsightCompany, comp.name)
                                  ? "bg-white shadow-sm text-primary"
                                  : "text-muted-foreground hover:text-foreground"
                                  }`}
                              >
                                {comp.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {competitors.length > 1 ? (
                      <div className="space-y-6">
                        {(missingInsightCompanies.length > 0 || isSelectedInsightLoading) && companiesWithInsights.length > 0 && (
                          <DeepDiveLoadingCard
                            compact
                            title={deepDiveLoaderTitle}
                            description={`We're scouring the digital landscape for the latest ${deepDiveLoaderTarget} intel to give you the inside track on where they're headed next.`}
                          />
                        )}

                        {companiesWithInsights.length > 0 ? (
                          <ComparativeIntelligence
                            companies={companiesWithInsights}
                            insights={insightsMap}
                            companyColors={companyColors}
                          />
                        ) : (
                          isGeneratingDeep ? (
                            <DeepDiveLoadingCard
                              title="Excavating Deep Intelligence"
                              description={`We're scouring the digital landscape for the latest ${selectedInsightCompany || "this company"} intel to give you the inside track on where they're headed next.`}
                            />
                          ) : (
                            <Card className="w-full min-h-[280px] border-2 border-dashed bg-muted/5 p-6 text-center sm:min-h-[360px] sm:p-10 md:min-h-[400px] md:p-12">
                              <Sparkles className="mx-auto mb-4 h-12 w-12 text-primary/30" />
                              <h3 className="mb-2 text-lg font-semibold">Detailed Intelligence Available</h3>
                              <p className="mx-auto mb-6 max-w-sm text-muted-foreground">
                                Generate a comprehensive research report for {selectedInsightCompany} covering tech stack, products, and financials.
                              </p>
                              <Button
                                onClick={handleGenerateDeepDive}
                                disabled={isGeneratingDeep}
                                className="bg-primary hover:bg-primary/90"
                              >
                                <Sparkles className="mr-2 h-4 w-4" /> Generate Full Report
                              </Button>
                            </Card>
                          )
                        )}
                      </div>
                    ) : insightsData ? (
                      <div className="space-y-4">
                        {isSelectedInsightLoading && (
                          <DeepDiveLoadingCard
                            compact
                            title="Refreshing Deep Dive Intelligence"
                            description={`We're scouring the digital landscape for the latest ${selectedInsightCompany || "this company"} intel to give you the inside track on where they're headed next.`}
                          />
                        )}
                        <CompanyInsightsDisplay
                          insights={insightsData}
                          onBack={() => setInsightsData(null)}
                        />
                      </div>
                    ) : (
                      isGeneratingDeep ? (
                        <DeepDiveLoadingCard
                          title="Excavating Deep Intelligence"
                          description={`We're scouring the digital landscape for the latest ${selectedInsightCompany || "this company"} intel to give you the inside track on where they're headed next.`}
                        />
                      ) : (
                        <Card className="w-full min-h-[280px] border-2 border-dashed bg-muted/5 p-6 text-center sm:min-h-[360px] sm:p-10 md:min-h-[400px] md:p-12">
                          <Sparkles className="mx-auto mb-4 h-12 w-12 text-primary/30" />
                          <h3 className="mb-2 text-lg font-semibold">Detailed Intelligence Available</h3>
                          <p className="mx-auto mb-6 max-w-sm text-muted-foreground">
                            Generate a comprehensive research report for {selectedInsightCompany} covering tech stack, products, and financials.
                          </p>
                          <Button
                            onClick={handleGenerateDeepDive}
                            disabled={isGeneratingDeep}
                            className="bg-primary hover:bg-primary/90"
                          >
                            <Sparkles className="mr-2 h-4 w-4" /> Generate Full Report
                          </Button>
                        </Card>
                      )
                    )}
                  </div>

                  {/* Removed Qualitative Insights section */}

                  <Card className="border border-slate-300 shadow-card mt-8">
                    <Collapsible defaultOpen={true}>
                      <CardHeader className="pb-0">
                        <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-80 transition-opacity">
                          <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-primary" />
                            Competitor Score Breakdown
                          </CardTitle>
                          <div className="bg-muted p-1 rounded-md">
                            <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200" />
                          </div>
                        </CollapsibleTrigger>
                      </CardHeader>
                      <CollapsibleContent>
                        <CardContent className="pt-6">
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[680px] text-sm">
                              <thead>
                                <tr className="border-b border-border">
                                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Dimension</th>
                                  {competitors.map((comp) => (
                                    <th key={comp.name} className="text-center py-3 px-4 font-medium" style={{ color: comp.color }}>
                                      {comp.name}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {dimensions.map((dim) => (
                                  <tr key={dim} className="border-b border-border/50">
                                    <td className="py-3 px-4 text-foreground">{DIMENSION_LABELS[dim]}</td>
                                    {competitors.map((comp) => {
                                      const score = comp.scores[dim];
                                      const maxScore = Math.max(...competitors.map(c => c.scores[dim]));
                                      return (
                                        <td key={comp.name} className="text-center py-3 px-4">
                                          <span className={score === maxScore && competitors.length > 1 ? "font-bold text-primary" : "text-muted-foreground"}>
                                            {score}
                                          </span>
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                                <tr className="bg-muted/30">
                                  <td className="py-3 px-4 font-medium text-foreground">Overall Score</td>
                                  {competitors.map((comp) => (
                                    <td key={comp.name} className="text-center py-3 px-4 font-bold" style={{ color: comp.color }}>
                                      {comp.overallScore}
                                    </td>
                                  ))}
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
      <AIAssistant context={{ competitors, insightsData, insightsMap }} />
    </div>
  );
};

export default Index;

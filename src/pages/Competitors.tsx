import { useState, useEffect } from "react";
import { mockBrandData, fetchBrandAnalysis, fetchCompanyInsights, BrandAnalysisData, ResolverDebugData } from "@/lib/api/brandAnalysis";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Search, Building2, Loader2, ChevronDown, ChevronUp, ExternalLink, Globe, Sparkles } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAnalysis } from "@/hooks/useAnalysis";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanyInsightsDisplay, CompanyInsights } from "@/components/CompanyInsightsDisplay";

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
    const reviews = toFiniteNumber(source?.reviewCount);
    return (score !== null && score > 0) || (reviews !== null && reviews > 0) || Boolean(source?.url);
  });
};

const isRenderableDeepDiveInsight = (insight: CompanyInsights | null | undefined, resolverDebug?: ResolverDebugData | null): boolean => {
  if (!insight || !insight.talentSentiment) return false;
  const sentiment: any = insight.talentSentiment;
  const hasSources = Array.isArray(sentiment?.sources) && sentiment.sources.length > 0;
  const hasScore = toFiniteNumber(sentiment?.aggregatedScore) !== null;
  if (!hasSources || !hasScore) return false;

  const resolverHasGlassdoor = Boolean(resolverDebug?.identity?.glassdoor?.url);
  if (resolverHasGlassdoor && !hasGlassdoorEvidence(sentiment)) return false;

  return true;
};

const Competitors = () => {
  const [competitors, setCompetitors] = useState<CompetitorData[]>(() => {
    const saved = localStorage.getItem('brandRadar_savedCompetitors');
    return saved ? JSON.parse(saved) : [];
  });
  const [newCompetitor, setNewCompetitor] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const [selectedInsightCompany, setSelectedInsightCompany] = useState<string>("");
  const [insightsData, setInsightsData] = useState<CompanyInsights | null>(null);
  const [insightsMap, setInsightsMap] = useState<Record<string, CompanyInsights>>({});
  const [isGeneratingDeep, setIsGeneratingDeep] = useState(false);
  const { lastAnalyzedCompany, currentAnalysis, detectedCompetitors } = useAnalysis();

  // Save to localStorage whenever competitors change
  useEffect(() => {
    localStorage.setItem('brandRadar_savedCompetitors', JSON.stringify(competitors));
  }, [competitors]);

  // Helper to transform API data to local CompetitorData format
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

  // Automatically add the main analyzed company IF it's not already in the list
  useEffect(() => {
    if (currentAnalysis) {
      const exists = competitors.some(c => namesLikelySameCompany(c.name, currentAnalysis.companyName));
      if (!exists && competitors.length === 0) {
        // Only auto-add if list is empty, otherwise we trust the user's persisted list
        setCompetitors([transformToCompetitorData(currentAnalysis, COLORS[0])]);
      }
    }
  }, [currentAnalysis]);

  const dimensions = Object.keys(DIMENSION_LABELS) as (keyof CompetitorScores)[];

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

  const getInsightForCompany = (companyName: string): CompanyInsights | null => {
    const keys = Object.keys(insightsMap);
    const exactMatch = keys.find((key) => normalizeKey(key) === normalizeKey(companyName));
    if (exactMatch) return insightsMap[exactMatch];

    const aliasMatch = keys.find((key) => namesLikelySameCompany(key, companyName));
    return aliasMatch ? insightsMap[aliasMatch] : null;
  };

  const removeCompetitor = (name: string) => {
    const nextCompetitors = competitors.filter(c => !namesLikelySameCompany(c.name, name));
    setCompetitors(nextCompetitors);
    setInsightsMap((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((entry) => {
        if (namesLikelySameCompany(entry, name)) {
          delete next[entry];
        }
      });
      return next;
    });
    if (expandedCompany && namesLikelySameCompany(expandedCompany, name)) setExpandedCompany(null);
    if (namesLikelySameCompany(selectedInsightCompany || '', name)) {
      setSelectedInsightCompany(nextCompetitors[0]?.name || "");
    }
  };

  const formatUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  const handleAddCompetitor = async () => {
    if (!newCompetitor.trim()) return;
    await addCompetitorByName(newCompetitor.trim());
  };

  const addCompetitorByName = async (companyName: string) => {
    if (competitors.some(c => namesLikelySameCompany(c.name, companyName))) {
      toast.error("This company is already in the comparison");
      return;
    }

    const usedColors = competitors.map(c => c.color);
    const availableColor = COLORS.find(c => !usedColors.includes(c)) || COLORS[competitors.length % COLORS.length];

    setIsAnalyzing(true);
    setNewCompetitor("");
    setIsAdding(false);

    // Run deep-dive in parallel with analyze to reduce overall latency.
    const deepDiveRequestName = toDisplayCompanyName(companyName) || companyName;
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
      const newCompetitorData = transformToCompetitorData(data, availableColor);

      setCompetitors(prev => [...prev, newCompetitorData]);
      if (!selectedInsightCompany) {
        setSelectedInsightCompany(newCompetitorData.name);
      }
      toast.success(`Added ${data.companyName || companyName} to comparison`);

      void (async () => {
        try {
          const provisional = await provisionalDeepDivePromise;
          if (provisional.error) {
            console.warn("[Deep Dive] Provisional parallel call failed:", provisional.error);
          }

          let deepDiveData = provisional.data as CompanyInsights | null;
          const hasRenderableDeepDive = isRenderableDeepDiveInsight(deepDiveData, data.resolverDebug || null);

          if (!hasRenderableDeepDive) {
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
            const resolvedName = deepDiveData.companyName || newCompetitorData.name;
            const preferredName = newCompetitorData.name;
            setInsightsMap((prev) => upsertInsightAliases(prev, preferredName, resolvedName, deepDiveData));
          }
        } catch (error) {
          console.error("[Deep Dive] Parallel hydration failed for", newCompetitorData.name, error);
        }
      })();
    } catch (err) {
      console.error('Analysis error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to analyse company');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Update selectedInsightCompany when competitors change or initially
  useEffect(() => {
    if (competitors.length > 0 && !selectedInsightCompany) {
      setSelectedInsightCompany(competitors[0].name);
    }
  }, [competitors]);

  useEffect(() => {
    if (!selectedInsightCompany) {
      setInsightsData(null);
      return;
    }

    const mapped = getInsightForCompany(selectedInsightCompany);
    if (mapped) {
      setInsightsData(mapped);
      return;
    }

    setInsightsData(null);
  }, [selectedInsightCompany, insightsMap]);

  const handleGenerateDeepDive = async () => {
    if (!selectedInsightCompany) return;

    const cached = getInsightForCompany(selectedInsightCompany);
    if (cached) {
      setInsightsData(cached);
      toast.success("Deep dive loaded from parallel prefetch");
      return;
    }

    const selectedCompetitor = competitors.find(
      (c) => namesLikelySameCompany(c.name, selectedInsightCompany)
    ) || null;

    setIsGeneratingDeep(true);
    try {
      const data = await fetchCompanyInsights({
        companyName: selectedInsightCompany,
        location: "United Kingdom", // Defaulting to UK context for now
        jobTitle: "Senior Software Engineer", // Defaulting for demo
        seniorityLevel: "Senior",
        resolverSeed: selectedCompetitor?.resolverDebug || null,
        talentSentimentSeed: selectedCompetitor?.talentSentiment || null,
      });
      const resolvedName = data?.companyName || selectedInsightCompany;
      setInsightsMap((prev) => upsertInsightAliases(prev, selectedInsightCompany, resolvedName, data));
      setInsightsData(data);
      toast.success("Deep dive analysis complete");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate deep dive report");
    } finally {
      setIsGeneratingDeep(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Competitors</h1>
            <p className="text-muted-foreground">
              Compare employer brands using real AI-powered analysis with data from Glassdoor, Indeed, LinkedIn and more.
            </p>
          </div>

          <Tabs defaultValue="comparison" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-8">
              <TabsTrigger value="comparison">Market Comparison</TabsTrigger>
              <TabsTrigger value="insights">Deep Dive Intelligence</TabsTrigger>
            </TabsList>

            <TabsContent value="comparison" className="space-y-8 animate-in fade-in-50">
              {/* Suggestion Bar */}
              {detectedCompetitors.filter(d => !competitors.some(c => c.name.toLowerCase().includes(d.toLowerCase()))).length > 0 && (
                <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 flex flex-col sm:flex-row items-center gap-4 justify-between animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-slate-700">
                      AI Suggested Competitors to compare vs <span className="font-bold text-blue-700">{lastAnalyzedCompany}</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {detectedCompetitors
                      .filter(d => !competitors.some(c => c.name.toLowerCase().includes(d.toLowerCase())))
                      .slice(0, 4) // Limit to 4 to save space
                      .map((competitor) => (
                        <Button
                          key={competitor}
                          variant="outline"
                          size="sm"
                          onClick={() => addCompetitorByName(competitor)}
                          disabled={isAnalyzing}
                          className="bg-white hover:bg-blue-50 text-blue-700 border-blue-200 h-8"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          {competitor}
                        </Button>
                      ))}
                  </div>
                </div>
              )}

              {/* Competitor Tags */}
              <div className="flex flex-wrap gap-2 items-center">
                {competitors.map((comp) => (
                  <div
                    key={comp.name}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer hover:bg-muted/50 transition-colors"
                    style={{ borderColor: comp.color }}
                    onClick={() => setExpandedCompany(expandedCompany === comp.name ? null : comp.name)}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: comp.color }} />
                    <span className="text-sm font-medium">{toDisplayCompanyName(comp.name)}</span>
                    <span className="text-xs text-muted-foreground" title="Overall Brand Radar score">({comp.overallScore}/100)</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeCompetitor(comp.name); }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {isAnalyzing ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/50 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analysing...
                  </div>
                ) : isAdding ? (
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Company name..."
                      value={newCompetitor}
                      onChange={(e) => setNewCompetitor(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddCompetitor()}
                      className="h-8 w-40"
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
                    Add Company
                  </Button>
                )}
              </div>

              {competitors.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No companies to compare</h3>
                    <p className="text-muted-foreground text-center mb-4 max-w-md">
                      Add companies to compare their employer brand scores side-by-side using real AI-powered analysis from Glassdoor, Indeed, LinkedIn and more.
                    </p>

                    <Button onClick={() => setIsAdding(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Company
                    </Button>

                    {!lastAnalyzedCompany && (
                      <p className="text-xs text-muted-foreground mt-4">
                        💡 Tip: Run a Brand Radar analysis first to get AI-suggested competitors
                      </p>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Comparison Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Brand Comparison Radar</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[500px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={radarData} margin={{ top: 30, right: 60, bottom: 30, left: 60 }}>
                            <PolarGrid stroke="hsl(220, 13%, 85%)" strokeWidth={1} />
                            <PolarAngleAxis
                              dataKey="subject"
                              tick={{ fill: "hsl(220, 9%, 46%)", fontSize: 11, fontWeight: 500 }}
                              tickLine={false}
                            />
                            <PolarRadiusAxis
                              angle={90}
                              domain={[0, 100]}
                              tick={{ fill: "hsl(220, 9%, 60%)", fontSize: 10 }}
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
                                strokeWidth={1.5}
                              />
                            ))}
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Score Comparison Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Score Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
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
                  </Card>

                  {/* Qualitative Summary section */}
                  <div className="bg-white rounded-xl shadow-sm border border-border p-6 mt-8">
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-primary">
                      <Sparkles className="w-5 h-5" />
                      AI Comparative Intelligence
                    </h2>

                    <div className="space-y-4">
                      {competitors.length < 2 ? (
                        <p className="text-muted-foreground italic">Add at least one competitor to generate comparative insights.</p>
                      ) : (
                        <div className="grid gap-4">
                          {/* Highest Overall */}
                          <div className="p-4 bg-muted/30 rounded-lg">
                            <h3 className="font-semibold text-primary mb-2">Overall Market Leader</h3>
                            <p className="text-sm">
                              <span className="font-medium">
                                {competitors.reduce((prev, current) => (prev.overallScore > current.overallScore) ? prev : current).name}
                              </span> leads the pack with an overall score of {Math.max(...competitors.map(c => c.overallScore))}, demonstrating superior employer brand strength across the board.
                            </p>
                          </div>

                          {/* Specific Strength Highlights */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
                              <h3 className="font-semibold text-emerald-800 mb-2">Employee Experience Leader</h3>
                              <p className="text-sm text-emerald-700">
                                {competitors.reduce((prev, current) => (prev.scores.employee > current.scores.employee) ? prev : current).name} works hardest for its people, scoring higest in employee sentiment ({Math.max(...competitors.map(c => c.scores.employee))}/100).
                              </p>
                            </div>
                            <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                              <h3 className="font-semibold text-blue-800 mb-2">Compensation & Benefits Perception</h3>
                              <p className="text-sm text-blue-700">
                                Based on review sentiment, {competitors.reduce((prev, current) => (prev.scores.values > current.scores.values) ? prev : current).name} is perceived to have the strongest value proposition ({Math.max(...competitors.map(c => c.scores.values))}/100).
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-border p-6 mt-8">
                    <h2 className="text-xl font-semibold mb-6 text-primary">Qualitative Insights</h2>
                    {competitors.map((comp) => (
                      <Collapsible
                        key={comp.name}
                        open={expandedCompany === comp.name}
                        onOpenChange={(open) => setExpandedCompany(open ? comp.name : null)}
                      >
                        <Card>
                          <CollapsibleTrigger asChild>
                            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: comp.color }} />
                                  <CardTitle className="text-lg">{comp.name}</CardTitle>
                                  <span className="text-sm text-muted-foreground">
                                    Overall Score: <span className="font-bold" style={{ color: comp.color }}>{comp.overallScore}</span>
                                  </span>
                                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                    via {comp.provider}
                                  </span>
                                </div>
                                {expandedCompany === comp.name ? (
                                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                )}
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <CardContent className="space-y-6">
                              {/* Insights Grid */}
                              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {Object.entries(comp.insights).map(([dimension, insight]) => (
                                  <div key={dimension} className="p-4 rounded-lg bg-muted/30 border border-border/50">
                                    <div className="flex items-center justify-between mb-2">
                                      <h4 className="font-semibold text-sm text-foreground">{dimension}</h4>
                                      <span className="text-xs font-bold" style={{ color: comp.color }}>
                                        {comp.scores[DIMENSION_MAP[dimension] as keyof CompetitorScores] || 'N/A'}
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                      {insight}
                                    </p>
                                  </div>
                                ))}
                              </div>

                              {/* Sources */}
                              {comp.sources.length > 0 && (
                                <div className="pt-4 border-t border-border">
                                  <div className="flex items-center gap-2 mb-3">
                                    <Globe className="w-4 h-4 text-primary" />
                                    <h4 className="text-sm font-semibold text-foreground">Data Sources</h4>
                                    <span className="text-xs text-muted-foreground">({comp.sources.length} sources)</span>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {comp.sources.map((source, index) => (
                                      <a
                                        key={index}
                                        href={source}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                                      >
                                        <span className="max-w-[150px] truncate">{formatUrl(source)}</span>
                                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    ))}
                  </div>
                </>
              )}

              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Add up to 5 companies to compare employer brand performance</p>
              </div>
            </TabsContent>

            <TabsContent value="insights" className="animate-in fade-in-50">
              {competitors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-muted/10 rounded-lg border border-dashed border-border">
                  <Building2 className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No companies added yet</h3>
                  <p className="text-muted-foreground mb-4">Add companies in the Market Comparison tab to view deep dive intelligence</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4 bg-muted/20 p-4 rounded-lg border border-border/50">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium">Select Company:</span>
                      <div className="flex flex-wrap gap-2">
                        {competitors.map(comp => (
                          <Button
                            key={comp.name}
                            variant={selectedInsightCompany === comp.name ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedInsightCompany(comp.name)}
                            className="rounded-full"
                          >
                            {comp.name}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {!insightsData && (
                      <Button
                        onClick={handleGenerateDeepDive}
                        disabled={isGeneratingDeep}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {isGeneratingDeep ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating Deep Dive...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Generate Full Report
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {isGeneratingDeep && !insightsData && (
                    <div className="flex flex-col items-center justify-center py-20">
                      <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                      <h3 className="text-lg font-semibold">Generating Intelligence Report...</h3>
                      <p className="text-muted-foreground text-center max-w-md mt-2">
                        Our AI is researching {selectedInsightCompany} across thousands of sources to compile salary data, project intelligence, and talent movement patterns. This may take 30-60 seconds.
                      </p>
                    </div>
                  )}

                  {insightsData && (
                    <CompanyInsightsDisplay
                      insights={insightsData}
                      onBack={() => setInsightsData(null)}
                      searchParams={{
                        companyName: selectedInsightCompany,
                        location: "Global"
                      }}
                    />
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Competitors;

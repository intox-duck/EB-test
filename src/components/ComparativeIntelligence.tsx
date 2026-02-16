import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Users,
    Briefcase,
    Star,
    MapPin,
    Package,
    Cpu,
    Target,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    DollarSign,
    Trophy,
    Sparkles
} from 'lucide-react';
import { useState } from 'react';
import { CompanyInsights } from './CompanyInsightsDisplay';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { BenchmarkScoreCard } from './BenchmarkScoreCard';
import { Progress as UIProgress } from '@/components/ui/progress';

interface ComparativeIntelligenceProps {
    companies: string[];
    insights: Record<string, CompanyInsights>;
    companyColors?: Record<string, string>;
}

const CORE_HUB_LIMIT = 15;
const TECH_STACK_LIMIT = 9;
const CORE_CAPABILITIES_LIMIT = 9;

const CORE_HUB_PATTERNS = [
    /headquarters|head office|global hq|global headquarters|\bhq\b/i,
    /regional hub|global hub|operations hub|operational hub|delivery hub/i,
    /tech hub|technology hub|innovation hub|engineering hub/i,
    /corporate office|corporate centre|corporate center|main office/i
];

// Normalize company names for consistent lookup
const normalizeKey = (name: string) => name.trim().toLowerCase();
const COMPANY_NAME_STOPWORDS = new Set([
    'inc',
    'incorporated',
    'llc',
    'ltd',
    'limited',
    'plc',
    'corp',
    'corporation',
    'company',
    'co',
    'group',
    'holdings',
    'the'
]);

const tokenizeCompanyName = (value: string) =>
    normalizeKey(value)
        .replace(/[^a-z0-9&]+/g, ' ')
        .split(' ')
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

// Find insight by normalized key matching
const getInsight = (insights: Record<string, CompanyInsights>, companyName: string): CompanyInsights | null => {
    const keys = Object.keys(insights);
    const normalizedSearch = normalizeKey(companyName);
    const exactMatch = keys.find(k => normalizeKey(k) === normalizedSearch);
    if (exactMatch) return insights[exactMatch];

    const matchingKey = keys.find((k) => namesLikelySameCompany(k, companyName));
    return matchingKey ? insights[matchingKey] : null;
};

const scoreHubPriority = (location: string) => {
    const normalized = location.trim();
    if (!normalized) return 0;

    let score = 0;
    CORE_HUB_PATTERNS.forEach((pattern, idx) => {
        if (pattern.test(normalized)) {
            score += 100 - idx * 15;
        }
    });

    if (/\((.*?)\)/.test(normalized)) score += 8;
    if (/,/.test(normalized)) score += 4;
    return score;
};

const getCoreOperationalHubs = (locations: string[] = [], limit = CORE_HUB_LIMIT): string[] => {
    const deduped: string[] = [];
    const seen = new Set<string>();

    for (const raw of locations) {
        const clean = String(raw || '').replace(/\s+/g, ' ').trim();
        if (!clean) continue;
        const key = clean.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(clean);
    }

    const withScore = deduped.map((loc, idx) => ({
        loc,
        score: scoreHubPriority(loc),
        index: idx
    }));

    withScore.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.index - b.index;
    });

    return withScore.slice(0, limit).map((item) => item.loc);
};

const dedupeNames = (items: any[] = [], limit = 10): string[] => {
    const seen = new Set<string>();
    const results: string[] = [];

    for (const item of items) {
        const raw = typeof item === 'string' ? item : item?.name;
        const clean = String(raw || '').replace(/\s+/g, ' ').trim();
        if (!clean) continue;

        const key = clean.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        results.push(clean);
    }

    return results.slice(0, limit);
};

export const ComparativeIntelligence = ({ companies, insights, companyColors }: ComparativeIntelligenceProps) => {
    const [expandedSections, setExpandedSections] = useState<Record<string, Record<string, boolean>>>({});

    const toggleSection = (category: string, company: string) => {
        setExpandedSections(prev => ({
            ...prev,
            [category]: {
                ...(prev[category] || {}),
                [company]: !prev[category]?.[company]
            }
        }));
    };

    const categories = [
        { id: 'benchmark', name: 'AI Benchmark Score', icon: Trophy },
        { id: 'sentiment', name: 'Talent Sentiment', icon: Star },
        { id: 'metrics', name: 'Key Metrics', icon: Users },
        { id: 'locations', name: 'Core Operational Hubs', icon: MapPin },
        { id: 'tech', name: 'Technology Stack', icon: Cpu },
        { id: 'capabilities', name: 'Core Capabilities', icon: Package },
        { id: 'projects', name: 'Group Project Intelligence', icon: Target },
    ];

    return (
        <div className="space-y-8 animate-in fade-in-50">
            {categories.map((cat) => (
                <div key={cat.id} className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border">
                        <cat.icon className="w-5 h-5 text-primary" />
                        <h3 className="text-xl font-bold text-foreground">{cat.name}</h3>
                        {cat.id === 'locations' && (
                            <span className="text-xs font-medium text-muted-foreground border border-border rounded-full px-2 py-0.5">
                                Core Operational Hubs
                            </span>
                        )}
                    </div>

                    <div className="space-y-6">
                        {companies.map((companyName) => {
                            const data = getInsight(insights, companyName);
                            if (!data) return null;

                            return (
                                <div key={`${cat.id}-${companyName}`} className="space-y-3">
                                    <div className="flex items-center gap-2 px-1">
                                        <div
                                            className="w-1 h-4 rounded-full"
                                            style={{ backgroundColor: companyColors?.[companyName] || 'var(--primary)' }}
                                        />
                                        <span className="text-sm font-bold text-slate-700">{companyName}</span>
                                    </div>
                                    <Card className="border-slate-300 shadow-sm overflow-hidden bg-white">
                                        <CardContent className="p-5">
                                            {cat.id === 'benchmark' && data.benchmarkScore && data.talentSentiment && (
                                                <BenchmarkScoreCard
                                                    benchmarkScore={data.benchmarkScore}
                                                    talentSentiment={data.talentSentiment}
                                                    companyName={companyName}
                                                />
                                            )}

                                            {cat.id === 'sentiment' && data.talentSentiment && (
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Aggregated</p>
                                                            <p className="text-xl font-bold text-primary">{data.talentSentiment.aggregatedScore}/5</p>
                                                        </div>
                                                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Reviews</p>
                                                            <p className="text-xl font-bold text-slate-700">{(data.talentSentiment.totalReviews || 0).toLocaleString()}</p>
                                                        </div>
                                                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Sentiment</p>
                                                            <p className="text-xl font-bold text-emerald-600 capitalize">{data.talentSentiment.sentiment}</p>
                                                        </div>
                                                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Work/Life</p>
                                                            <p className="text-xl font-bold text-blue-600">{data.talentSentiment.workLifeBalance}/5</p>
                                                        </div>
                                                    </div>
                                                    <div className="pt-2">
                                                        <p className="text-[10px] text-slate-400 uppercase font-bold mb-2">Key Talent Themes</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {(data.talentSentiment.keyThemes || []).map((theme, i) => (
                                                                <Badge key={i} variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-none px-3 py-1 text-xs">
                                                                    {theme}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {cat.id === 'metrics' && (
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-2 bg-blue-50 rounded-lg"><Users className="w-5 h-5 text-blue-600" /></div>
                                                        <div>
                                                            <p className="text-[10px] text-slate-500 uppercase font-bold">Company Size</p>
                                                            <p className="text-sm font-bold">{data.companySize}</p>
                                                        </div>
                                                    </div>
                                                    {/* Live Vacancies removed per user request */}
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-2 bg-purple-50 rounded-lg"><Target className="w-5 h-5 text-purple-600" /></div>
                                                        <div>
                                                            <p className="text-[10px] text-slate-500 uppercase font-bold">Complexity Rating</p>
                                                            <p className="text-sm font-bold">{data.complexityRating}/5</p>
                                                            <p className="text-[8px] text-slate-400 mt-0.5">Hiring difficulty based on role demand, skill availability & market competition</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {cat.id === 'locations' && (
                                                <div className="space-y-3">
                                                    {(() => {
                                                        const coreHubs = getCoreOperationalHubs(data.locations || []);
                                                        if (!coreHubs.length) {
                                                            return (
                                                                <p className="text-xs text-slate-500">
                                                                    Core hub data is still being consolidated for this company.
                                                                </p>
                                                            );
                                                        }
                                                        return (
                                                            <>
                                                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                                    Top {CORE_HUB_LIMIT} Critical Hubs
                                                                </p>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {coreHubs.map((loc, i) => (
                                                                        <Badge key={i} variant="outline" className="border-slate-200 text-slate-600 px-3 py-1 text-xs">
                                                                            <MapPin className="w-3 h-3 mr-1 opacity-50" />
                                                                            {loc}
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            )}

                                            {cat.id === 'tech' && (
                                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                                    {dedupeNames(data.techStack as any[], TECH_STACK_LIMIT).map((t, i) => (
                                                        <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-100">
                                                            <CheckCircle2 className="w-3 h-3 text-primary animate-in zoom-in duration-300" />
                                                            <span className="text-xs font-semibold text-slate-700 truncate">{t}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {cat.id === 'salary' && (
                                                <div className="space-y-4">
                                                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                        <div>
                                                            <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider mb-1">Average Market Range (GBP)</p>
                                                            <p className="text-2xl font-bold text-emerald-900">{data.salaryData?.averageSalary || 'Data Investigating...'}</p>
                                                        </div>
                                                        <div className="h-2 w-full md:w-48 bg-emerald-200 rounded-full overflow-hidden">
                                                            <div className="h-full bg-emerald-600 rounded-full" style={{ width: '70%' }} />
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                        {(data.salaryData?.sources || []).slice(0, 3).map((s, i) => (
                                                            <div key={i} className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                                                                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">{s.name}</p>
                                                                <p className="text-md font-bold text-slate-800">{s.salary}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {cat.id === 'capabilities' && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                                    {dedupeNames(data.coreCapabilities as any[], CORE_CAPABILITIES_LIMIT).map((c, i) => (
                                                        <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 border-l-4 border-l-emerald-500">
                                                            <span className="text-sm font-bold text-slate-700">{c}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {cat.id === 'projects' && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {(data.projectIntelligence || []).slice(0, 4).map((p, i) => (
                                                        <div key={i} className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-primary/30 transition-all group">
                                                            <div className="flex items-start justify-between mb-4">
                                                                <div className="space-y-1">
                                                                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider bg-white border-primary/20 text-primary">
                                                                        {p.category}
                                                                    </Badge>
                                                                    <h4 className="font-bold text-slate-800 text-sm leading-tight">{p.title}</h4>
                                                                </div>
                                                                <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                                                                    p.status === 'Completed' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                                                                    }`}>
                                                                    {p.status}
                                                                </div>
                                                            </div>

                                                            <p className="text-xs text-slate-600 mb-4 leading-relaxed line-clamp-2 italic">
                                                                "{p.description}"
                                                            </p>

                                                            <div className="grid grid-cols-2 gap-4 mb-4 border-y border-slate-100 py-3">
                                                                <div>
                                                                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Timeline</p>
                                                                    <p className="text-[11px] font-semibold text-slate-700">{p.timeline}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Investment</p>
                                                                    <p className="text-[11px] font-semibold text-slate-700">{p.investmentLevel}</p>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-3">
                                                                <div>
                                                                    <span className="text-[10px] font-bold text-primary block mb-1 uppercase">Business Impact</span>
                                                                    <p className="text-[11px] text-slate-600 leading-snug">{p.businessImpact}</p>
                                                                </div>
                                                                <div>
                                                                    <span className="text-[10px] font-bold text-primary block mb-1 uppercase">Technical Core</span>
                                                                    <p className="text-[11px] text-slate-600 leading-snug">{p.technicalDetails}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            );
                        })}

                        {/* Qualitative Comparison Summary Block */}
                        {companies.length > 1 && cat.id !== 'sentiment' && (
                            <div className="pt-2">
                                <Card className="bg-primary/5 border-primary/20 shadow-none border-dashed">
                                    <CardContent className="p-5 flex gap-4">
                                        <div className="p-3 bg-white rounded-full h-fit border border-primary/20 shadow-sm">
                                            <Sparkles className="w-5 h-5 text-primary" />
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="text-sm font-bold text-primary">Strategic Comparison Summary: {cat.name}</h4>
                                            <p className="text-xs text-slate-600 leading-relaxed">
                                                Comparing {companies.join(' vs ')}, {companies[0]} demonstrates a {cat.id === 'sentiment' ? 'more balanced culture rating' : 'slightly different operational focus'} compared to {companies[companies.length - 1]}.
                                                The data suggests {companies[0]} leads in {cat.name} maturity, though {companies[companies.length - 1]} shows aggressive growth in specific niche areas within this category.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

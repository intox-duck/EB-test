import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Building,
    MapPin,
    Users,
    Package,
    Briefcase,
    Star,
    Code,
    Download,
    Target,
    TrendingUp,
    DollarSign,
    ExternalLink,
    ArrowLeft,
    Save,
    Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { TechStackSection } from '@/components/TechStackSection';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import logoImage from '@/assets/c2-logo.png';
import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const CORE_HUB_LIMIT = 15;
const TECH_STACK_LIMIT = 9;
const CORE_CAPABILITIES_LIMIT = 9;
const CORE_HUB_PATTERNS = [
    /headquarters|head office|global hq|global headquarters|\bhq\b/i,
    /regional hub|global hub|operations hub|operational hub|delivery hub/i,
    /tech hub|technology hub|innovation hub|engineering hub/i,
    /corporate office|corporate centre|corporate center|main office/i
];

const normalizeName = (value = '') => String(value).replace(/\s+/g, ' ').trim();

const extractNamedValue = (item: any): string => {
    if (typeof item === 'string') return normalizeName(item);
    if (!item || typeof item !== 'object') return '';

    const candidates = [
        item.name,
        item.technology,
        item.technologyName,
        item.tool,
        item.stack,
        item.skill,
        item.label,
        item.title
    ];

    for (const candidate of candidates) {
        const clean = normalizeName(candidate || '');
        if (clean) return clean;
    }

    return '';
};

const scoreCoreHubPriority = (location: string) => {
    const normalized = normalizeName(location);
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
        const clean = normalizeName(raw);
        if (!clean) continue;
        const key = clean.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(clean);
    }

    return deduped
        .map((location, index) => ({ location, index, score: scoreCoreHubPriority(location) }))
        .sort((a, b) => (b.score - a.score) || (a.index - b.index))
        .slice(0, limit)
        .map((item) => item.location);
};

const uniqueNames = (items: any[] = [], limit = 10): string[] => {
    const result: string[] = [];
    const seen = new Set<string>();

    for (const item of items) {
        const name = extractNamedValue(item);
        if (!name) continue;
        const key = name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(name);
    }

    return result.slice(0, limit);
};

export interface CompanyInsights {
    companyName: string;
    locations: string[];
    companySize: string;
    keyProducts: string[];
    jobsAdvertised: number;
    complexityRating: number;
    techStack: Array<{
        name: string;
        importance: number;
        marketDemand: string;
        proficiency?: number;
    }>;
    projectIntelligence: Array<{
        category: string;
        title: string;
        description: string;
        status: string;
        timeline: string;
        businessImpact: string;
        technicalDetails: string;
        teamSize: string;
        investmentLevel: string;
    }>;
    salaryData: {
        averageSalary: string;
        roleSpecificSalary?: string;
        sources: Array<{
            name: string;
            salary: string;
            url: string;
        }>;
        competitorComparison?: Array<{
            company: string;
            salary: string;
            source: string;
            percentileRank: number;
        }>;
        salaryProgression?: Array<{
            level: string;
            salary: string;
            yearsExperience: string;
        }>;
    };
    costOfLiving?: {
        overallIndex: number;
        comparedToAverage: string;
        breakdown: {
            housing: string;
            food: string;
            transportation: string;
            healthcare: string;
            utilities: string;
        };
        monthlyExpenses: string;
        qualityOfLifeIndex: number;
    };
    costToHire?: {
        baseSalary: string;
        employerTaxes: string;
        benefits: string;
        recruitmentCosts: string;
        onboardingCosts: string;
        totalAnnualCost: string;
        breakdown: string;
    };
    competitors: Array<{
        name: string;
        reason: string;
        salaryComparison?: string;
        techStackOverlap?: number;
        hiringVelocity?: string;
    }>;
    coreCapabilities: Array<{
        name: string;
        importance: number;
        marketDemand: string;
    }>;
    roleInsights?: {
        requestedRole: string;
        seniorityLevel: string;
        demandScore: number;
        geographicSpread: Array<{
            location: string;
            percentage: number;
            openRoles: number;
        }>;
        hiringTrends: {
            recentHires: number;
            monthlyGrowth: string;
            retentionRate: string;
        };
    };
    talentMovement?: {
        recentJoins: Array<{
            name: string;
            previousCompany: string;
            role: string;
            joinDate: string;
        }>;
        recentExits: Array<{
            name: string;
            newCompany: string;
            role: string;
            exitDate: string;
        }>;
        poachingPatterns: Array<{
            company: string;
            direction: 'incoming' | 'outgoing';
            count: number;
            trend: string;
        }>;
        dataAvailability?: string;
    };
    benchmarkScore?: {
        overall: number;
        compensation: number;
        hiringVolume: number;
        techModernity: number;
        employeeReviews: number;
        marketSentiment: number;
        breakdown: string;
    };
    talentSentiment?: {
        sources: Array<{
            name: string;
            score: number;
            reviewCount: number;
            url?: string;
        }>;
        aggregatedScore: number;
        totalReviews: number;
        sentiment: string;
        keyThemes: string[];
        workLifeBalance: number;
        careerOpportunities: number;
        compensation: number;
    };
}

interface CompanyInsightsDisplayProps {
    insights: CompanyInsights;
    onBack: () => void;
    searchParams?: {
        companyName: string;
        location: string;
        jobTitle?: string;
        seniorityLevel?: string;
    };
}

export const CompanyInsightsDisplay = ({ insights, onBack, searchParams }: CompanyInsightsDisplayProps) => {
    const [saveDialogOpen, setSaveDialogOpen] = useState(false);
    const [reportName, setReportName] = useState(`${insights.companyName} Intelligence Report`);
    const [saving, setSaving] = useState(false);
    const { user } = useAuth();
    const { toast } = useToast();
    const coreOperationalHubs = getCoreOperationalHubs(insights.locations || [], CORE_HUB_LIMIT);
    const coreCapabilityItems = uniqueNames(insights.coreCapabilities as any[], CORE_CAPABILITIES_LIMIT);
    const techStackItems = uniqueNames(insights.techStack as any[], TECH_STACK_LIMIT);

    const handleSaveReport = async () => {
        if (!user) {
            toast({
                title: "Authentication Required",
                description: "Please sign in to save reports",
                variant: "destructive",
            });
            return;
        }

        setSaving(true);
        try {
            /* 
            // Supabase integration temporarily disabled in EB
            const { error } = await supabase
              .from('saved_reports')
              .insert([{
                user_id: user.id,
                report_name: reportName,
                company_name: insights.companyName,
                location: searchParams?.location || null,
                job_title: searchParams?.jobTitle || null,
                seniority_level: searchParams?.seniorityLevel || null,
                insights_data: insights as any,
              }]);
      
            if (error) throw error;
            */

            // Mock save
            await new Promise(resolve => setTimeout(resolve, 1000));

            toast({
                title: "Success! (Mock)",
                description: "Report saved to your library (Simulated)",
            });
            setSaveDialogOpen(false);
        } catch (error) {
            console.error('Error saving report:', error);
            toast({
                title: "Error",
                description: "Failed to save report. Please try again.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };
    const handleDownloadPDF = async () => {
        const { default: jsPDF } = await import('jspdf');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        let yPosition = 30;

        // Color scheme matching design system (converting HSL to RGB for jsPDF)
        const colors = {
            primary: [78, 205, 196] as [number, number, number], // hsl(174 72% 56%) -> teal
            secondary: [28, 35, 51] as [number, number, number], // hsl(220 13% 12%) -> dark blue-gray
            text: [249, 250, 251] as [number, number, number], // hsl(210 20% 98%) -> light
            accent: [147, 168, 186] as [number, number, number], // hsl(215 16% 65%) -> muted
            background: [15, 20, 31] as [number, number, number], // hsl(220 13% 6%) -> dark background
            surface: [22, 28, 42] as [number, number, number], // hsl(220 13% 10%) -> surface
        };

        // Set background for entire document
        pdf.setFillColor(...colors.background);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');

        // Header section with gradient-like effect
        pdf.setFillColor(...colors.primary);
        pdf.rect(0, 0, pageWidth, 40, 'F');

        // Add logo to PDF (convert to base64 for jsPDF)
        try {
            const logoSize = 25;
            pdf.addImage(logoImage, 'PNG', 20, 8, logoSize, logoSize);
        } catch (error) {
            console.log('Logo could not be added to PDF');
        }

        // Company name with curvy styling indication
        pdf.setTextColor(...colors.background);
        pdf.setFontSize(28);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${insights.companyName}`, 55, 22);

        // Subtitle with elegant styling
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Intelligence Report', 55, 32);

        yPosition = 55;

        // Key Metrics Section with elegant styling
        pdf.setTextColor(...colors.text);
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Key Metrics', 20, yPosition);
        yPosition += 20;

        // Create enhanced metric cards
        const metrics = [
            { label: 'Company Size', value: insights.companySize, icon: '🏢' },
            { label: 'Open Positions', value: insights.jobsAdvertised.toString(), icon: '💼' },
            { label: 'Complexity Rating', value: `${insights.complexityRating}/5`, icon: '⭐' },
            { label: 'Average Salary', value: insights.salaryData.averageSalary, icon: '💰' }
        ];

        let xPosition = 20;
        metrics.forEach((metric, index) => {
            if (index % 2 === 0 && index > 0) {
                yPosition += 35;
                xPosition = 20;
            } else if (index % 2 === 1) {
                xPosition = pageWidth / 2 + 10;
            }

            // Enhanced metric card with border and shadow effect
            pdf.setFillColor(...colors.surface);
            pdf.rect(xPosition, yPosition, 85, 28, 'F');

            // Card border
            pdf.setDrawColor(...colors.primary);
            pdf.setLineWidth(0.5);
            pdf.rect(xPosition, yPosition, 85, 28);

            // Icon and label
            pdf.setTextColor(...colors.primary);
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`${metric.icon} ${metric.label}`, xPosition + 6, yPosition + 10);

            // Value with emphasis
            pdf.setTextColor(...colors.text);
            pdf.setFontSize(13);
            pdf.setFont('helvetica', 'bold');
            pdf.text(metric.value, xPosition + 6, yPosition + 22);
        });

        yPosition += 45;

        // Locations Section with icon
        pdf.setTextColor(...colors.primary);
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('📍 Core Operational Hubs', 20, yPosition);
        yPosition += 12;

        pdf.setTextColor(...colors.text);
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        pdf.text(coreOperationalHubs.join(' • '), 20, yPosition);
        yPosition += 25;

        // Technology Stack Section with enhanced styling
        pdf.setTextColor(...colors.primary);
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('🔧 Technology Stack', 20, yPosition);
        yPosition += 12;

        pdf.setTextColor(...colors.text);
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        const techStackText = techStackItems.join(' • ');
        const splitTechStack = pdf.splitTextToSize(techStackText, pageWidth - 40);
        pdf.text(splitTechStack, 20, yPosition);
        yPosition += splitTechStack.length * 6 + 20;

        // Check if we need a new page
        if (yPosition > pageHeight - 60) {
            pdf.addPage();
            pdf.setFillColor(...colors.background);
            pdf.rect(0, 0, pageWidth, pageHeight, 'F');
            yPosition = 25;
        }

        // Project Intelligence Section
        pdf.setTextColor(...colors.primary);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Key Project Intelligence', 20, yPosition);
        yPosition += 15;

        insights.projectIntelligence.slice(0, 3).forEach((project, index) => {
            if (yPosition > pageHeight - 50) {
                pdf.addPage();
                pdf.setFillColor(...colors.background);
                pdf.rect(0, 0, pageWidth, pageHeight, 'F');
                yPosition = 25;
            }

            // Project box
            pdf.setFillColor(...colors.surface);
            pdf.rect(20, yPosition, pageWidth - 40, 35, 'F');

            // Project title
            pdf.setTextColor(...colors.primary);
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'bold');
            pdf.text(project.title, 25, yPosition + 8);

            // Project status
            pdf.setTextColor(...colors.accent);
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`Status: ${project.status} | Timeline: ${project.timeline}`, 25, yPosition + 16);

            // Project description
            pdf.setTextColor(...colors.text);
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            const descText = pdf.splitTextToSize(project.description, pageWidth - 50);
            pdf.text(descText.slice(0, 2), 25, yPosition + 24);

            yPosition += 45;
        });

        // Salary Sources Section
        if (yPosition > pageHeight - 80) {
            pdf.addPage();
            pdf.setFillColor(...colors.background);
            pdf.rect(0, 0, pageWidth, pageHeight, 'F');
            yPosition = 25;
        }

        pdf.setTextColor(...colors.primary);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Salary Information Sources', 20, yPosition);
        yPosition += 15;

        insights.salaryData.sources.forEach((source, index) => {
            pdf.setTextColor(...colors.text);
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`${source.name}:`, 25, yPosition);

            pdf.setTextColor(...colors.primary);
            pdf.setFont('helvetica', 'normal');
            pdf.text(source.salary, 80, yPosition);
            yPosition += 8;
        });

        yPosition += 10;

        // Competitors Section
        if (yPosition > pageHeight - 60) {
            pdf.addPage();
            pdf.setFillColor(...colors.background);
            pdf.rect(0, 0, pageWidth, pageHeight, 'F');
            yPosition = 25;
        }

        pdf.setTextColor(...colors.primary);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Key Competitors', 20, yPosition);
        yPosition += 15;

        insights.competitors.slice(0, 5).forEach((competitor, index) => {
            if (yPosition > pageHeight - 30) {
                pdf.addPage();
                pdf.setFillColor(...colors.background);
                pdf.rect(0, 0, pageWidth, pageHeight, 'F');
                yPosition = 25;
            }

            pdf.setTextColor(...colors.text);
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`${index + 1}. ${competitor.name}`, 25, yPosition);
            yPosition += 8;

            pdf.setTextColor(...colors.accent);
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            const reasonText = pdf.splitTextToSize(competitor.reason, pageWidth - 50);
            pdf.text(reasonText.slice(0, 2), 30, yPosition);
            yPosition += Math.min(reasonText.length, 2) * 6 + 8;
        });

        // Enhanced Footer with branding
        pdf.setTextColor(...colors.accent);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Generated by InsightsGPT - Powered by C2 Intelligence Platform', 20, pageHeight - 15);

        // Add generation timestamp
        pdf.setFontSize(8);
        pdf.text(`Report generated on: ${new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })}`, 20, pageHeight - 8);

        // Save the PDF
        pdf.save(`${insights.companyName}_Intelligence_Report.pdf`);
    };

    const renderStars = (rating: number) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star
                key={i}
                className={`w-4 h-4 ${i < rating
                    ? 'text-primary fill-primary'
                    : 'text-muted-foreground'
                    }`}
            />
        ));
    };

    return (
        <div className="w-full space-y-6 animate-fade-in">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pdf-section">
                <Card className="p-6 gradient-card shadow-card border-slate-300 transition-smooth hover:shadow-elevated">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                            <Building className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Company</p>
                            <p className="font-semibold text-foreground">{insights.companyName}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-6 gradient-card shadow-card border-slate-300 transition-smooth hover:shadow-elevated">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Company Size</p>
                            <p className="font-semibold text-foreground">{insights.companySize}</p>
                        </div>
                    </div>
                </Card>

                {/* Open Positions card removed per user request */}

                <Card className="p-6 gradient-card shadow-card border-slate-300 transition-smooth hover:shadow-elevated">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <div className="flex items-center gap-1">
                                <p className="text-sm text-muted-foreground">Complexity Rating</p>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            className="inline-flex items-center text-muted-foreground hover:text-foreground"
                                            aria-label="Complexity rating info"
                                        >
                                            <Info className="w-3.5 h-3.5" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs text-xs leading-relaxed">
                                        This score estimates how hard it is to hire for this company based on talent scarcity, salary pressure, and competitor demand. Higher scores indicate tougher hiring conditions.
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <div className="flex items-center gap-1">
                                {renderStars(insights.complexityRating)}
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Detailed Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pdf-section">
                {/* Locations */}
                <Card className="p-6 gradient-card shadow-card border-slate-300">
                    <div className="flex items-center gap-2 mb-4">
                        <MapPin className="w-5 h-5 text-primary" />
                        <h3 className="text-lg font-semibold text-foreground">Core Operational Hubs</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {coreOperationalHubs.map((location, index) => (
                            <Badge key={index} variant="secondary" className="bg-surface text-foreground">
                                {location}
                            </Badge>
                        ))}
                    </div>
                </Card>

                {/* Key Products */}
                <Card className="p-6 gradient-card shadow-card border-slate-300">
                    <div className="flex items-center gap-2 mb-4">
                        <Package className="w-5 h-5 text-primary" />
                        <h3 className="text-lg font-semibold text-foreground">Key Products</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {insights.keyProducts.map((product, index) => (
                            <Badge key={index} variant="outline" className="border-primary/30 text-foreground">
                                {product}
                            </Badge>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Talent Sentiment */}
            {insights.talentSentiment && (
                <div className="pdf-section">
                    <Card className="p-6 gradient-card shadow-card border-slate-300">
                        <div className="flex items-center gap-2 mb-6">
                            <Star className="w-5 h-5 text-primary" />
                            <h3 className="text-lg font-semibold text-foreground">Talent Sentiment</h3>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Aggregated</p>
                                <p className="text-xl font-bold text-primary">{insights.talentSentiment.aggregatedScore}/5</p>
                            </div>
                            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Reviews</p>
                                <p className="text-xl font-bold text-foreground">{(insights.talentSentiment.totalReviews || 0).toLocaleString()}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Sentiment</p>
                                <p className="text-xl font-bold text-emerald-600 capitalize">{insights.talentSentiment.sentiment || 'Neutral'}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Work/Life</p>
                                <p className="text-xl font-bold text-blue-600">{insights.talentSentiment.workLifeBalance || 0}/5</p>
                            </div>
                        </div>

                        {Array.isArray(insights.talentSentiment.keyThemes) && insights.talentSentiment.keyThemes.length > 0 && (
                            <div className="mb-5">
                                <p className="text-xs font-medium text-muted-foreground mb-2">Key Themes</p>
                                <div className="flex flex-wrap gap-2">
                                    {insights.talentSentiment.keyThemes.slice(0, 8).map((theme, index) => (
                                        <Badge key={`${theme}-${index}`} variant="secondary" className="bg-slate-100 text-slate-700">
                                            {theme}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {Array.isArray(insights.talentSentiment.sources) && insights.talentSentiment.sources.length > 0 && (
                            <div>
                                <p className="text-xs font-medium text-muted-foreground mb-2">Sources</p>
                                <div className="flex flex-wrap gap-2">
                                    {insights.talentSentiment.sources.slice(0, 4).map((source, index) => (
                                        <Badge key={`${source.name}-${index}`} variant="outline" className="border-primary/30 text-foreground">
                                            {source.name}: {source.score}/5 ({(source.reviewCount || 0).toLocaleString()} reviews)
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {/* Core Capabilities */}
            {(insights.coreCapabilities && insights.coreCapabilities.length > 0) && (
                <div className="pdf-section">
                    <TechStackSection
                        title="Core Capabilities"
                        items={coreCapabilityItems}
                    />
                </div>
            )}

            {/* Technology Stack */}
            <div className="pdf-section">
                <TechStackSection
                    title="Technology Stack"
                    items={techStackItems}
                />
            </div>

            {/* Project Intelligence */}
            <Card className="p-6 gradient-card shadow-card border-slate-300 pdf-section">
                <div className="flex items-center gap-2 mb-6">
                    <Target className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">Key Project Intelligence</h3>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {insights.projectIntelligence.map((project, index) => (
                        <div key={index} className="p-5 rounded-lg bg-surface border border-slate-300 transition-smooth hover:border-primary/30">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <Badge variant="outline" className="text-xs mb-2 border-primary/30">
                                        {project.category}
                                    </Badge>
                                    <h4 className="font-semibold text-foreground text-lg">{project.title}</h4>
                                </div>
                                <Badge
                                    variant={project.status === 'Active' ? 'default' : project.status === 'Completed' ? 'secondary' : 'outline'}
                                    className="text-xs"
                                >
                                    {project.status}
                                </Badge>
                            </div>

                            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                                {project.description}
                            </p>

                            <div className="space-y-3">
                                <div className="grid grid-cols-1 gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-primary">Timeline:</span>
                                        <span className="text-xs text-foreground">{project.timeline}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-primary">Team Size:</span>
                                        <span className="text-xs text-foreground">{project.teamSize}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-primary">Investment:</span>
                                        <span className="text-xs text-foreground">{project.investmentLevel}</span>
                                    </div>
                                </div>

                                <div className="border-t border-border/30 pt-3">
                                    <div className="mb-2">
                                        <span className="text-xs font-medium text-primary block mb-1">Business Impact:</span>
                                        <p className="text-xs text-muted-foreground">{project.businessImpact}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs font-medium text-primary block mb-1">Technical Details:</span>
                                        <p className="text-xs text-muted-foreground">{project.technicalDetails}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>




        </div>
    );
};

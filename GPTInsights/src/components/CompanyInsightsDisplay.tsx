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
  Save
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
import { CompetitiveSalaryChart } from '@/components/CompetitiveSalaryChart';
import { TalentMovementAnalysis } from '@/components/TalentMovementAnalysis';
import { RoleInsightsSection } from '@/components/RoleInsightsSection';
import { BenchmarkScoreCard } from '@/components/BenchmarkScoreCard';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';
import logoImage from '@/assets/C2-logo.jpeg';
import { useState } from 'react';

export interface CompanyInsights {
  companyName: string;
  locations: string[];
  companySize: string;
  keyProducts: string[];
  jobsAdvertised: number;
  complexityRating: number;
  techStack: string[];
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
  roleInsights?: {
    requestedRole: string;
    seniorityLevel: string;
    demandScore: number;
    skillsetBreakdown: Array<{
      skill: string;
      importance: number;
      marketDemand: string;
    }>;
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

      toast({
        title: "Success!",
        description: "Report saved to your library",
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
  const handleDownloadPDF = () => {
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
      pdf.addImage(logoImage, 'JPEG', 20, 8, logoSize, logoSize);
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
    pdf.text('📍 Global Presence', 20, yPosition);
    yPosition += 12;
    
    pdf.setTextColor(...colors.text);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(insights.locations.join(' • '), 20, yPosition);
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
    const techStackText = insights.techStack.join(' • ');
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
      pdf.setFillColor(...colors.secondary);
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
        className={`w-4 h-4 ${
          i < rating 
            ? 'text-primary fill-primary' 
            : 'text-muted-foreground'
        }`}
      />
    ));
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <Card className="p-8 gradient-card shadow-elevated border-border/50">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={onBack}
              variant="outline"
              className="bg-surface hover:bg-surface-hover border-border/50 text-foreground transition-smooth"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {insights.companyName} Intelligence Report
              </h1>
              <p className="text-muted-foreground">
                Comprehensive talent acquisition insights and competitive analysis
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {user && (
              <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="bg-surface hover:bg-surface-hover border-border/50"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Report
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Save Report</DialogTitle>
                    <DialogDescription>
                      Save this report to your library for future reference.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="report-name">Report Name</Label>
                      <Input
                        id="report-name"
                        value={reportName}
                        onChange={(e) => setReportName(e.target.value)}
                        placeholder="Enter report name"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setSaveDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveReport}
                      disabled={saving || !reportName.trim()}
                    >
                      {saving ? 'Saving...' : 'Save Report'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            <Button
              onClick={handleDownloadPDF}
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground transition-smooth"
            >
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 gradient-card shadow-card border-border/50 transition-smooth hover:shadow-elevated">
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

        <Card className="p-6 gradient-card shadow-card border-border/50 transition-smooth hover:shadow-elevated">
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

        <Card className="p-6 gradient-card shadow-card border-border/50 transition-smooth hover:shadow-elevated">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Open Positions</p>
              <p className="font-semibold text-foreground">{insights.jobsAdvertised}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 gradient-card shadow-card border-border/50 transition-smooth hover:shadow-elevated">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Complexity Rating</p>
              <div className="flex items-center gap-1">
                {renderStars(insights.complexityRating)}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Locations */}
        <Card className="p-6 gradient-card shadow-card border-border/50">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Locations</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {insights.locations.map((location, index) => (
              <Badge key={index} variant="secondary" className="bg-surface text-foreground">
                {location}
              </Badge>
            ))}
          </div>
        </Card>

        {/* Key Products */}
        <Card className="p-6 gradient-card shadow-card border-border/50">
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

      {/* Tech Stack */}
      <Card className="p-6 gradient-card shadow-card border-border/50">
        <div className="flex items-center gap-2 mb-4">
          <Code className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Technology Stack</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {insights.techStack.map((tech, index) => (
            <div
              key={index}
              className="p-3 rounded-lg bg-surface border border-border/30 text-center transition-smooth hover:border-primary/30"
            >
              <span className="text-sm font-medium text-foreground">{tech}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Project Intelligence */}
      <Card className="p-6 gradient-card shadow-card border-border/50">
        <div className="flex items-center gap-2 mb-6">
          <Target className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Key Project Intelligence</h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {insights.projectIntelligence.map((project, index) => (
            <div key={index} className="p-5 rounded-lg bg-surface border border-border/30 transition-smooth hover:border-primary/30">
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

      {/* Salary Information */}
      <Card className="p-6 gradient-card shadow-card border-border/50">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Average Salary Information</h3>
        </div>
        <div className="mb-4">
          <div className="text-center p-4 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-sm text-muted-foreground mb-1">Average Salary</p>
            <p className="text-2xl font-bold text-primary">{insights.salaryData.averageSalary}</p>
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-foreground mb-3">Sources:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.salaryData.sources.map((source, index) => (
              <div
                key={index}
                className="p-3 rounded-lg bg-surface border border-border/30 transition-smooth hover:border-primary/30"
              >
                <div className="flex items-center justify-between mb-1">
                  <h5 className="font-medium text-foreground text-sm">{source.name}</h5>
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold text-primary">{source.salary}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Cost of Living */}
      {insights.costOfLiving && (
        <Card className="p-6 gradient-card shadow-card border-border/50">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Cost of Living - {searchParams?.location}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-surface border border-border/30">
                <p className="text-sm text-muted-foreground mb-1">Overall Index</p>
                <p className="text-2xl font-bold text-primary">{insights.costOfLiving.overallIndex}</p>
                <p className="text-xs text-muted-foreground mt-1">{insights.costOfLiving.comparedToAverage}</p>
              </div>
              <div className="p-4 rounded-lg bg-surface border border-border/30">
                <p className="text-sm text-muted-foreground mb-1">Monthly Expenses</p>
                <p className="text-xl font-bold text-foreground">{insights.costOfLiving.monthlyExpenses}</p>
              </div>
              <div className="p-4 rounded-lg bg-surface border border-border/30">
                <p className="text-sm text-muted-foreground mb-1">Quality of Life Index</p>
                <p className="text-2xl font-bold text-primary">{insights.costOfLiving.qualityOfLifeIndex}/100</p>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground mb-3">Cost Breakdown:</h4>
              <div className="space-y-2">
                <div className="p-3 rounded-lg bg-surface border border-border/30">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Housing</span>
                    <span className="text-sm font-semibold text-foreground">{insights.costOfLiving.breakdown.housing}</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-surface border border-border/30">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Food</span>
                    <span className="text-sm font-semibold text-foreground">{insights.costOfLiving.breakdown.food}</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-surface border border-border/30">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Transportation</span>
                    <span className="text-sm font-semibold text-foreground">{insights.costOfLiving.breakdown.transportation}</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-surface border border-border/30">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Healthcare</span>
                    <span className="text-sm font-semibold text-foreground">{insights.costOfLiving.breakdown.healthcare}</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-surface border border-border/30">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Utilities</span>
                    <span className="text-sm font-semibold text-foreground">{insights.costOfLiving.breakdown.utilities}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Cost to Hire */}
      {insights.costToHire && (
        <Card className="p-6 gradient-card shadow-card border-border/50">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Total Cost to Hire</h3>
          </div>
          <div className="mb-6">
            <div className="text-center p-6 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm text-muted-foreground mb-2">Total Annual Cost (All-In)</p>
              <p className="text-3xl font-bold text-primary">{insights.costToHire.totalAnnualCost}</p>
              <p className="text-xs text-muted-foreground mt-2">{insights.costToHire.breakdown}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-surface border border-border/30">
              <p className="text-xs text-muted-foreground mb-1">Base Salary</p>
              <p className="text-lg font-bold text-foreground">{insights.costToHire.baseSalary}</p>
            </div>
            <div className="p-4 rounded-lg bg-surface border border-border/30">
              <p className="text-xs text-muted-foreground mb-1">Employer Taxes</p>
              <p className="text-lg font-bold text-foreground">{insights.costToHire.employerTaxes}</p>
            </div>
            <div className="p-4 rounded-lg bg-surface border border-border/30">
              <p className="text-xs text-muted-foreground mb-1">Benefits Package</p>
              <p className="text-lg font-bold text-foreground">{insights.costToHire.benefits}</p>
            </div>
            <div className="p-4 rounded-lg bg-surface border border-border/30">
              <p className="text-xs text-muted-foreground mb-1">Recruitment Costs</p>
              <p className="text-lg font-bold text-foreground">{insights.costToHire.recruitmentCosts}</p>
            </div>
            <div className="p-4 rounded-lg bg-surface border border-border/30">
              <p className="text-xs text-muted-foreground mb-1">Onboarding & Training</p>
              <p className="text-lg font-bold text-foreground">{insights.costToHire.onboardingCosts}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Competitive Salary Visualization */}
      <CompetitiveSalaryChart
        targetCompany={insights.companyName}
        competitorComparison={insights.salaryData.competitorComparison}
        salaryProgression={insights.salaryData.salaryProgression}
        roleSpecificSalary={insights.salaryData.roleSpecificSalary}
        averageSalary={insights.salaryData.averageSalary}
      />

      {/* Role-Specific Insights */}
      {insights.roleInsights && (
        <RoleInsightsSection 
          roleInsights={insights.roleInsights}
          companyName={insights.companyName}
        />
      )}

      {/* Talent Movement Analysis */}
      {insights.talentMovement && (
        <TalentMovementAnalysis
          talentMovement={insights.talentMovement}
          companyName={insights.companyName}
        />
      )}

      {/* AI Benchmark Score & Talent Sentiment */}
      {insights.benchmarkScore && insights.talentSentiment && (
        <BenchmarkScoreCard
          benchmarkScore={insights.benchmarkScore}
          talentSentiment={insights.talentSentiment}
          companyName={insights.companyName}
        />
      )}

      {/* Competitors */}
      <Card className="p-6 gradient-card shadow-card border-border/50">
        <div className="flex items-center gap-2 mb-4">
          <Building className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Key Competitors</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.competitors.map((competitor, index) => (
            <div
              key={index}
              className="p-4 rounded-lg bg-surface border border-border/30 transition-smooth hover:border-primary/30"
            >
              <h4 className="font-semibold text-foreground mb-2">{competitor.name}</h4>
              <p className="text-sm text-muted-foreground mb-2">{competitor.reason}</p>
              {competitor.salaryComparison && (
                <p className="text-xs text-primary">💰 {competitor.salaryComparison}</p>
              )}
              {competitor.techStackOverlap && (
                <p className="text-xs text-muted-foreground">🔧 Tech overlap: {competitor.techStackOverlap}%</p>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CompanyInsightsForm } from '@/components/CompanyInsightsForm';
import { CompanyInsightsDisplay, CompanyInsights } from '@/components/CompanyInsightsDisplay';
import { InsightsChat } from '@/components/InsightsChat';
import { InsightsService } from '@/services/insightsService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Zap, Target, LogIn, BookOpen, Facebook, Twitter, Linkedin, ArrowRight } from 'lucide-react';
import logoImage from '@/assets/C2-logo.jpeg';
const Index = () => {
  const [insights, setInsights] = useState<CompanyInsights | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const {
    toast
  } = useToast();
  const {
    user,
    loading,
    signOut,
    isAdmin
  } = useAuth();
  const navigate = useNavigate();
  const handleGenerateInsights = async (companyName: string, location: string, jobTitle?: string, seniorityLevel?: string) => {
    setIsLoading(true);
    setInsights(null);
    try {
      const result = await InsightsService.generateCompanyInsights(companyName, location, jobTitle, seniorityLevel);
      setInsights(result);
      toast({
        title: "Success!",
        description: "Company insights generated successfully."
      });
    } catch (error) {
      console.error('Error generating insights:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate insights. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleBackToForm = () => {
    setInsights(null);
  };
  if (insights) {
    return (
      <div className="min-h-screen bg-white">
        <CompanyInsightsDisplay 
          insights={insights} 
          onBack={handleBackToForm} 
          searchParams={{
            companyName: insights.companyName,
            location: insights.locations[0] || '',
            jobTitle: insights.roleInsights?.requestedRole,
            seniorityLevel: insights.roleInsights?.seniorityLevel
          }} 
        />
        <InsightsChat insights={insights} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header Navigation */}
      <header className="border-b border-border/50 bg-white sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img src={logoImage} alt="Chapter 2" className="w-10 h-10 object-contain" />
              <span className="text-xl font-bold text-primary">Chapter 2</span>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-foreground hover:text-primary transition-smooth">
                Features
              </a>
              <a href="#how-it-works" className="text-sm text-foreground hover:text-primary transition-smooth">
                How It Works
              </a>
              <Button 
                onClick={() => navigate('/library')} 
                variant="ghost" 
                className="text-sm"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Library
              </Button>
            </nav>

            {/* Auth Button */}
            <div className="flex items-center gap-3">
              {loading ? null : user ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground hidden md:inline">
                    {user.email}
                  </span>
                  {isAdmin && (
                    <Badge className="bg-primary text-primary-foreground">Admin</Badge>
                  )}
                </div>
              ) : (
                <Button 
                  onClick={() => navigate('/auth')} 
                  className="bg-white hover:bg-muted text-foreground border border-border"
                  variant="outline"
                >
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8 animate-fade-in">
            <div className="space-y-4">
              <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                AI-Powered Intelligence
              </Badge>
              <h1 className="text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                Chapter 2 
                <span className="text-primary block mt-2">Insights Agent</span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Transform your talent acquisition strategy with AI-powered competitive intelligence, 
                salary benchmarking, and market insights in seconds.
              </p>
            </div>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-surface rounded-full border border-border/50">
                <Brain className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">AI Research</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-surface rounded-full border border-border/50">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Market Analysis</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-surface rounded-full border border-border/50">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Real-time Data</span>
              </div>
            </div>

            {/* CTA Button */}
            <div>
              <a href="#get-started">
                <Button 
                  size="lg" 
                  className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-smooth"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </a>
            </div>
          </div>

          {/* Right Content - Form Preview */}
          <div className="animate-fade-in animation-delay-200">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-3xl blur-3xl"></div>
              <div className="relative bg-white rounded-2xl border border-border/50 shadow-elevated p-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold text-foreground mb-2">
                      Generate Your First Report
                    </h3>
                    <p className="text-muted-foreground">
                      Get comprehensive talent insights in minutes
                    </p>
                  </div>
                  
                  {/* Mini stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-surface rounded-lg">
                      <div className="text-2xl font-bold text-primary">50+</div>
                      <div className="text-xs text-muted-foreground">Data Points</div>
                    </div>
                    <div className="text-center p-4 bg-surface rounded-lg">
                      <div className="text-2xl font-bold text-primary">AI</div>
                      <div className="text-xs text-muted-foreground">Powered</div>
                    </div>
                    <div className="text-center p-4 bg-surface rounded-lg">
                      <div className="text-2xl font-bold text-primary">60s</div>
                      <div className="text-xs text-muted-foreground">Generation</div>
                    </div>
                  </div>

                  <div className="h-px bg-border/50"></div>

                  <div className="flex items-center justify-center">
                    <a href="#get-started" className="text-primary font-medium flex items-center gap-2 hover:gap-3 transition-smooth">
                      Start generating reports
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-surface py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Everything You Need for Talent Intelligence
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Comprehensive insights powered by advanced AI and real-time market data
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl border border-border/50 shadow-card hover:shadow-elevated transition-smooth">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Company Intelligence</h3>
              <p className="text-muted-foreground leading-relaxed">
                Deep insights into company size, tech stack, active projects, and organizational structure
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl border border-border/50 shadow-card hover:shadow-elevated transition-smooth">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Salary Benchmarking</h3>
              <p className="text-muted-foreground leading-relaxed">
                Accurate salary data with competitive analysis, cost of living, and total cost to hire calculations
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl border border-border/50 shadow-card hover:shadow-elevated transition-smooth">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Market Trends</h3>
              <p className="text-muted-foreground leading-relaxed">
                Talent movement analysis, competitor comparison, and hiring velocity metrics
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Get Started Section */}
      <section id="get-started" className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-muted-foreground">
              Generate your first intelligence report now
            </p>
          </div>

          <div className="animate-slide-up">
            <CompanyInsightsForm onSubmit={handleGenerateInsights} isLoading={isLoading} />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface border-t border-border/50">
        <div className="container mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <img src={logoImage} alt="Chapter 2" className="w-10 h-10 object-contain" />
                <span className="text-xl font-bold text-primary">Chapter 2</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Your seamless access to digital solutions.
              </p>
              {/* Social Links */}
              <div className="flex gap-3">
                <a href="#" className="w-9 h-9 bg-white border border-border/50 rounded-lg flex items-center justify-center hover:bg-primary hover:text-white transition-smooth">
                  <Facebook className="w-4 h-4" />
                </a>
                <a href="#" className="w-9 h-9 bg-white border border-border/50 rounded-lg flex items-center justify-center hover:bg-primary hover:text-white transition-smooth">
                  <Twitter className="w-4 h-4" />
                </a>
                <a href="#" className="w-9 h-9 bg-white border border-border/50 rounded-lg flex items-center justify-center hover:bg-primary hover:text-white transition-smooth">
                  <Linkedin className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-smooth">
                    About Us
                  </a>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Resources</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-smooth">
                    Support
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-smooth">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-smooth">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-smooth">
                    Cookie Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="pt-8 border-t border-border/50">
            <p className="text-sm text-muted-foreground text-center">
              © 2024 Chapter 2 Talent Solutions Ltd. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default Index;
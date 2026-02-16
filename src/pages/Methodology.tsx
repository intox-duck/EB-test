import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Search, BarChart3, Shield, Sparkles, Globe } from "lucide-react";

const methodologySteps = [
  {
    icon: Search,
    title: "Real-Time Search Grounding",
    description: "We use Google Search grounding via Gemini Pro to gather the most current, factual information about your employer brand from across the web.",
  },
  {
    icon: Globe,
    title: "Multi-Source Analysis",
    description: "Data is collected from job boards, social media, news articles, company reviews, and industry publications to ensure comprehensive coverage.",
  },
  {
    icon: Brain,
    title: "AI-Powered Scoring",
    description: "Our AI analyses sentiment, visibility, and engagement across 6 key dimensions: Search Presence, Social Media, Content Quality, Reviews, Culture, and Leadership.",
  },
  {
    icon: BarChart3,
    title: "Benchmark Comparison",
    description: "Scores are calibrated against industry benchmarks derived from analysing thousands of companies across various sectors.",
  },
  {
    icon: Shield,
    title: "Bias Mitigation",
    description: "Multiple AI providers and cross-referencing techniques are used to reduce bias and ensure balanced, objective insights.",
  },
  {
    icon: Sparkles,
    title: "Actionable Insights",
    description: "Each dimension includes specific, contextual recommendations generated from the analysis to help improve your employer brand.",
  },
];

const Methodology = () => {
  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Methodology</h1>
            <p className="text-muted-foreground">
              How we derive employer branding insights using AI and real-time data.
            </p>
          </div>

          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                Our Approach
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                BrandRadar combines advanced AI models with real-time web search to provide 
                accurate, up-to-date employer branding intelligence. Unlike static surveys or 
                outdated reports, our analysis reflects the current digital footprint of your 
                employer brand as seen by potential candidates.
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {methodologySteps.map((step, index) => (
              <Card key={step.title} className="transition-all hover:shadow-md">
                <CardContent className="flex items-start gap-4 p-6">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <step.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        Step {index + 1}
                      </span>
                      <h3 className="font-semibold text-foreground">{step.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Scoring Dimensions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <h4 className="font-medium text-foreground">Search Presence</h4>
                  <p className="text-muted-foreground">Visibility in search results for employer-related queries</p>
                </div>
                <div className="space-y-1">
                  <h4 className="font-medium text-foreground">Social Media</h4>
                  <p className="text-muted-foreground">Engagement and sentiment across social platforms</p>
                </div>
                <div className="space-y-1">
                  <h4 className="font-medium text-foreground">Content Quality</h4>
                  <p className="text-muted-foreground">Quality and relevance of employer branding content</p>
                </div>
                <div className="space-y-1">
                  <h4 className="font-medium text-foreground">Reviews</h4>
                  <p className="text-muted-foreground">Employee reviews and ratings on major platforms</p>
                </div>
                <div className="space-y-1">
                  <h4 className="font-medium text-foreground">Culture</h4>
                  <p className="text-muted-foreground">Perception of company culture and values</p>
                </div>
                <div className="space-y-1">
                  <h4 className="font-medium text-foreground">Leadership</h4>
                  <p className="text-muted-foreground">Executive visibility and thought leadership</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Methodology;

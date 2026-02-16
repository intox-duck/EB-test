import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  DollarSign, 
  Users, 
  Code, 
  Star,
  TrendingUp,
  Target
} from 'lucide-react';

interface BenchmarkScore {
  overall: number;
  compensation: number;
  hiringVolume: number;
  techModernity: number;
  employeeReviews: number;
  marketSentiment: number;
  breakdown: string;
}

interface TalentSentiment {
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
}

interface BenchmarkScoreCardProps {
  benchmarkScore: BenchmarkScore;
  talentSentiment: TalentSentiment;
  companyName: string;
}

export const BenchmarkScoreCard = ({ 
  benchmarkScore, 
  talentSentiment, 
  companyName 
}: BenchmarkScoreCardProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Average';
    return 'Below Average';
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive': return 'text-green-500';
      case 'negative': return 'text-red-500';
      default: return 'text-yellow-500';
    }
  };

  const scoreCategories = [
    { 
      name: 'Compensation', 
      score: benchmarkScore.compensation, 
      icon: DollarSign,
      description: 'Salary competitiveness vs market'
    },
    { 
      name: 'Hiring Volume', 
      score: benchmarkScore.hiringVolume, 
      icon: Users,
      description: 'Active recruitment intensity'
    },
    { 
      name: 'Tech Modernity', 
      score: benchmarkScore.techModernity, 
      icon: Code,
      description: 'Technology stack advancement'
    },
    { 
      name: 'Employee Reviews', 
      score: benchmarkScore.employeeReviews, 
      icon: Star,
      description: 'Internal satisfaction ratings'
    },
    { 
      name: 'Market Sentiment', 
      score: benchmarkScore.marketSentiment, 
      icon: TrendingUp,
      description: 'External brand perception'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Overall Benchmark Score */}
      <Card className="p-6 gradient-card shadow-card border-border/50">
        <div className="flex items-center gap-2 mb-6">
          <Trophy className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">AI Benchmark Score</h3>
        </div>

        <div className="text-center mb-8">
          <div className="relative inline-block">
            <div className={`text-6xl font-bold ${getScoreColor(benchmarkScore.overall)} mb-2`}>
              {benchmarkScore.overall}
            </div>
            <Badge 
              variant="outline" 
              className={`absolute -top-2 -right-8 ${getScoreColor(benchmarkScore.overall)} border-current`}
            >
              {getScoreBadge(benchmarkScore.overall)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Competitiveness index for {companyName} based on comprehensive talent acquisition metrics
          </p>
        </div>

        {/* Score Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {scoreCategories.map((category, index) => {
            const IconComponent = category.icon;
            return (
              <div key={index} className="p-4 rounded-lg bg-surface border border-border/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <IconComponent className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">{category.name}</span>
                  </div>
                  <span className={`text-sm font-bold ${getScoreColor(category.score)}`}>
                    {category.score}
                  </span>
                </div>
                <Progress value={category.score} className="h-2 mb-2" />
                <p className="text-xs text-muted-foreground">{category.description}</p>
              </div>
            );
          })}
        </div>

        {/* Analysis Breakdown */}
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <h5 className="font-medium text-foreground mb-2 flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Analysis Breakdown
          </h5>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {benchmarkScore.breakdown}
          </p>
        </div>
      </Card>

      {/* Talent Sentiment */}
      <Card className="p-6 gradient-card shadow-card border-border/50">
        <div className="flex items-center gap-2 mb-6">
          <Star className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Talent Sentiment</h3>
        </div>

        {/* Sources Overview */}
        <div className="mb-6">
          <h5 className="font-medium text-foreground mb-3">Review Sources</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {talentSentiment.sources.map((source, index) => (
              <div key={index} className="p-4 rounded-lg bg-surface border border-border/30 hover:border-primary/30 transition-smooth">
                <div className="flex items-center justify-between mb-2">
                  <h6 className="font-medium text-foreground">{source.name}</h6>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${
                          i < source.score 
                            ? 'text-yellow-500 fill-yellow-500' 
                            : 'text-muted-foreground'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-primary font-medium">{source.score}/5</span>
                  <span className="text-xs text-muted-foreground">{source.reviewCount.toLocaleString()} reviews</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Aggregated Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 rounded-lg bg-primary/10 border border-primary/30">
            <div className="flex items-center justify-center gap-1 mb-2">
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < talentSentiment.aggregatedScore 
                      ? 'text-yellow-500 fill-yellow-500' 
                      : 'text-muted-foreground'
                  }`}
                />
              ))}
            </div>
            <p className="text-sm font-medium text-foreground">{talentSentiment.aggregatedScore}/5</p>
            <p className="text-xs text-muted-foreground">Aggregated Score</p>
          </div>

          <div className="text-center p-4 rounded-lg bg-surface border border-border/30">
            <p className="text-lg font-bold text-primary mb-1">{talentSentiment.totalReviews.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Reviews</p>
          </div>

          <div className="text-center p-4 rounded-lg bg-surface border border-border/30">
            <p className={`text-sm font-medium capitalize ${getSentimentColor(talentSentiment.sentiment)}`}>
              {talentSentiment.sentiment}
            </p>
            <p className="text-xs text-muted-foreground">Overall Sentiment</p>
          </div>

          <div className="text-center p-4 rounded-lg bg-surface border border-border/30">
            <p className="text-lg font-bold text-foreground mb-1">{talentSentiment.keyThemes.length}</p>
            <p className="text-xs text-muted-foreground">Key Themes</p>
          </div>
        </div>

        {/* Detailed Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Work-Life Balance</span>
              <span className="text-sm text-primary">{talentSentiment.workLifeBalance}/5</span>
            </div>
            <Progress value={talentSentiment.workLifeBalance * 20} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Career Opportunities</span>
              <span className="text-sm text-primary">{talentSentiment.careerOpportunities}/5</span>
            </div>
            <Progress value={talentSentiment.careerOpportunities * 20} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Compensation Rating</span>
              <span className="text-sm text-primary">{talentSentiment.compensation}/5</span>
            </div>
            <Progress value={talentSentiment.compensation * 20} className="h-2" />
          </div>
        </div>

        {/* Key Themes */}
        <div>
          <h5 className="font-medium text-foreground mb-3">Key Themes from Reviews</h5>
          <div className="flex flex-wrap gap-2">
            {talentSentiment.keyThemes.map((theme, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {theme}
              </Badge>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};
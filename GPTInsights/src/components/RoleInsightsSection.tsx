import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Briefcase, 
  MapPin, 
  TrendingUp, 
  BarChart3, 
  Target,
  Users,
  Clock
} from 'lucide-react';

interface RoleInsights {
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
}

interface RoleInsightsSectionProps {
  roleInsights: RoleInsights;
  companyName: string;
}

export const RoleInsightsSection = ({ roleInsights, companyName }: RoleInsightsSectionProps) => {
  const getDemandColor = (score: number) => {
    if (score >= 8) return 'text-green-500';
    if (score >= 6) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getMarketDemandBadge = (demand: string) => {
    const color = demand.toLowerCase() === 'high' ? 'bg-green-500/20 text-green-500' :
                  demand.toLowerCase() === 'medium' ? 'bg-yellow-500/20 text-yellow-500' :
                  'bg-red-500/20 text-red-500';
    return `${color} border-0`;
  };

  return (
    <Card className="p-6 gradient-card shadow-card border-border/50">
      <div className="flex items-center gap-2 mb-6">
        <Briefcase className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Role-Specific Insights</h3>
      </div>

      {/* Role Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-4 bg-surface border-border/30">
          <div className="text-center">
            <Badge variant="outline" className="mb-2 border-primary/30">Role</Badge>
            <p className="font-semibold text-foreground">{roleInsights.requestedRole}</p>
            <p className="text-sm text-muted-foreground">{roleInsights.seniorityLevel}</p>
          </div>
        </Card>

        <Card className="p-4 bg-surface border-border/30">
          <div className="text-center">
            <Badge variant="outline" className="mb-2 border-primary/30">Demand Score</Badge>
            <p className={`text-2xl font-bold ${getDemandColor(roleInsights.demandScore)}`}>
              {roleInsights.demandScore}/10
            </p>
            <p className="text-sm text-muted-foreground">Market Demand</p>
          </div>
        </Card>

        <Card className="p-4 bg-surface border-border/30">
          <div className="text-center">
            <Badge variant="outline" className="mb-2 border-primary/30">Hiring Trend</Badge>
            <p className="text-lg font-semibold text-foreground">{roleInsights.hiringTrends.monthlyGrowth}</p>
            <p className="text-sm text-muted-foreground">Monthly Growth</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Skills Breakdown */}
        <div>
          <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Key Skills & Market Demand
          </h4>
          <div className="space-y-4">
            {roleInsights.skillsetBreakdown.map((skill, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{skill.skill}</span>
                  <div className="flex items-center gap-2">
                    <Badge className={getMarketDemandBadge(skill.marketDemand)}>
                      {skill.marketDemand}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{skill.importance}/10</span>
                  </div>
                </div>
                <Progress value={skill.importance * 10} className="h-2" />
              </div>
            ))}
          </div>
        </div>

        {/* Geographic Distribution */}
        <div>
          <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Geographic Distribution
          </h4>
          <div className="space-y-4">
            {roleInsights.geographicSpread.map((location, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{location.location}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {location.openRoles} roles
                    </Badge>
                    <span className="text-xs text-muted-foreground">{location.percentage}%</span>
                  </div>
                </div>
                <Progress value={location.percentage} className="h-2" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hiring Trends Summary */}
      <div className="mt-8 p-4 rounded-lg bg-primary/5 border border-primary/20">
        <h5 className="font-medium text-foreground mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          Hiring Trends at {companyName}
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Users className="w-4 h-4 text-primary" />
              <span className="font-semibold text-primary">{roleInsights.hiringTrends.recentHires}</span>
            </div>
            <p className="text-sm text-muted-foreground">Recent Hires (Last 6 months)</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="font-semibold text-primary">{roleInsights.hiringTrends.monthlyGrowth}</span>
            </div>
            <p className="text-sm text-muted-foreground">Monthly Growth Rate</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-primary" />
              <span className="font-semibold text-primary">{roleInsights.hiringTrends.retentionRate}</span>
            </div>
            <p className="text-sm text-muted-foreground">Retention Rate</p>
          </div>
        </div>
      </div>
    </Card>
  );
};
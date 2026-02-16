import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, TrendingDown, Calendar, ArrowRightLeft } from 'lucide-react';

interface TalentMovement {
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
}

interface TalentMovementAnalysisProps {
    talentMovement: TalentMovement;
    companyName: string;
}

export const TalentMovementAnalysis = ({ talentMovement, companyName }: TalentMovementAnalysisProps) => {
    const getTrendIcon = (trend: string) => {
        if (trend.toLowerCase().includes('increasing')) return <TrendingUp className="w-4 h-4 text-green-500" />;
        if (trend.toLowerCase().includes('decreasing')) return <TrendingDown className="w-4 h-4 text-red-500" />;
        return <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />;
    };

    const getDirectionColor = (direction: 'incoming' | 'outgoing') => {
        return direction === 'incoming' ? 'text-green-500' : 'text-red-500';
    };

    return (
        <Card className="p-6 gradient-card shadow-card border-border/50">
            <div className="flex items-center gap-2 mb-6">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Talent Movement & Attrition Analysis</h3>
            </div>

            {talentMovement.dataAvailability === "limited - no individual movement data available" ? (
                <div className="text-center py-12">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-foreground mb-2">Individual Talent Movement Data Unavailable</h4>
                    <p className="text-muted-foreground mb-4">
                        Individual talent movement data is not available from public sources.
                    </p>
                    <p className="text-sm text-muted-foreground">
                        For detailed talent movement insights, consider integrating with LinkedIn Talent Solutions or similar platforms.
                    </p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Recent Joins */}
                        <div className="space-y-4">
                            <h4 className="font-semibold text-foreground flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-green-500" />
                                Recent Joins ({talentMovement.recentJoins.length})
                            </h4>
                            <div className="space-y-3">
                                {talentMovement.recentJoins.length > 0 ? (
                                    talentMovement.recentJoins.slice(0, 5).map((join, index) => (
                                        <div key={index} className="p-3 rounded-lg bg-surface border border-border/30 transition-smooth hover:border-primary/30">
                                            <div className="flex items-start justify-between mb-2">
                                                <h5 className="font-medium text-foreground text-sm">{join.name}</h5>
                                                <Badge variant="outline" className="text-xs border-green-500/30 text-green-500">
                                                    Join
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground mb-1">From: {join.previousCompany}</p>
                                            <p className="text-xs text-foreground mb-1">{join.role}</p>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Calendar className="w-3 h-3" />
                                                {join.joinDate}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <p className="text-sm">No recent join data available</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Recent Exits */}
                        <div className="space-y-4">
                            <h4 className="font-semibold text-foreground flex items-center gap-2">
                                <TrendingDown className="w-4 h-4 text-red-500" />
                                Recent Exits ({talentMovement.recentExits.length})
                            </h4>
                            <div className="space-y-3">
                                {talentMovement.recentExits.length > 0 ? (
                                    talentMovement.recentExits.slice(0, 5).map((exit, index) => (
                                        <div key={index} className="p-3 rounded-lg bg-surface border border-border/30 transition-smooth hover:border-primary/30">
                                            <div className="flex items-start justify-between mb-2">
                                                <h5 className="font-medium text-foreground text-sm">{exit.name}</h5>
                                                <Badge variant="outline" className="text-xs border-red-500/30 text-red-500">
                                                    Exit
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground mb-1">To: {exit.newCompany}</p>
                                            <p className="text-xs text-foreground mb-1">{exit.role}</p>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Calendar className="w-3 h-3" />
                                                {exit.exitDate}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <p className="text-sm">No recent exit data available</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Poaching Patterns */}
                        <div className="space-y-4">
                            <h4 className="font-semibold text-foreground flex items-center gap-2">
                                <ArrowRightLeft className="w-4 h-4 text-primary" />
                                Poaching Patterns
                            </h4>
                            <div className="space-y-3">
                                {talentMovement.poachingPatterns?.length > 0 ? (
                                    talentMovement.poachingPatterns.map((pattern, index) => (
                                        <div key={index} className="p-3 rounded-lg bg-surface border border-border/30 transition-smooth hover:border-primary/30">
                                            <div className="flex items-start justify-between mb-2">
                                                <h5 className="font-medium text-foreground text-sm">{pattern.company}</h5>
                                                <div className="flex items-center gap-1">
                                                    {getTrendIcon(pattern.trend)}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className={`text-xs font-medium ${getDirectionColor(pattern.direction)}`}>
                                                    {pattern.direction === 'incoming' ? '← From' : '→ To'} {companyName}
                                                </span>
                                                <Badge variant="secondary" className="text-xs">
                                                    {pattern.count} moves
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Trend: {pattern.trend}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <p className="text-sm">No poaching pattern data available</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Summary Insights */}
                    <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
                        <h5 className="font-medium text-foreground mb-2">Key Insights</h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="text-center">
                                <p className="font-semibold text-green-500">{talentMovement.recentJoins.length}</p>
                                <p className="text-muted-foreground">Recent Joins</p>
                            </div>
                            <div className="text-center">
                                <p className="font-semibold text-red-500">{talentMovement.recentExits.length}</p>
                                <p className="text-muted-foreground">Recent Exits</p>
                            </div>
                            <div className="text-center">
                                <p className="font-semibold text-primary">
                                    {talentMovement.recentJoins.length - talentMovement.recentExits.length > 0 ? '+' : ''}
                                    {talentMovement.recentJoins.length - talentMovement.recentExits.length}
                                </p>
                                <p className="text-muted-foreground">Net Movement</p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </Card>
    );
};

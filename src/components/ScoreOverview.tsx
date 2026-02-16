import { Gauge, Calendar, Building2 } from "lucide-react";
import { format } from "date-fns";

interface ScoreOverviewProps {
  companyName: string;
  overallScore: number;
  lastUpdated: string;
}

export function ScoreOverview({ companyName, overallScore, lastUpdated }: ScoreOverviewProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-primary";
    if (score >= 60) return "text-yellow-400";
    return "text-secondary";
  };
  
  return (
    <div className="flex flex-wrap items-center gap-6 text-sm">
      <div className="flex items-center gap-2">
        <Building2 className="w-4 h-4 text-primary" />
        <span className="text-muted-foreground">Analysing:</span>
        <span className="font-semibold text-foreground">{companyName}</span>
      </div>
      
      <div className="flex items-center gap-2">
        <Gauge className="w-4 h-4 text-primary" />
        <span className="text-muted-foreground">Overall Score:</span>
        <span className={`font-bold text-lg ${getScoreColor(overallScore)}`}>
          {overallScore}
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <span className="text-muted-foreground">
          Updated: {format(new Date(lastUpdated), "d MMM yyyy 'at' HH:mm")}
        </span>
      </div>
    </div>
  );
}

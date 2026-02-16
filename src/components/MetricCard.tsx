import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  subject: string;
  score: number;
  benchmark: number;
  insight: string;
  index: number;
}

export function MetricCard({ subject, score, benchmark, insight, index }: MetricCardProps) {
  const diff = score - benchmark;
  const trend = diff > 5 ? "up" : diff < -5 ? "down" : "neutral";
  
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  
  return (
    <div 
      className={cn(
        "glass-card rounded-xl p-4 transition-all duration-300",
        "hover:border-primary/30 hover:glow-primary",
        "animate-fade-in"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-foreground text-sm">{subject}</h3>
        <div className={cn(
          "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
          trend === "up" && "bg-primary/20 text-primary",
          trend === "down" && "bg-secondary/20 text-secondary",
          trend === "neutral" && "bg-muted text-muted-foreground"
        )}>
          <TrendIcon className="w-3 h-3" />
          <span>{diff > 0 ? "+" : ""}{diff}</span>
        </div>
      </div>
      
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-3xl font-bold text-primary">{score}</span>
        <span className="text-sm text-muted-foreground">/100</span>
      </div>
      
      <div className="w-full bg-muted rounded-full h-1.5 mb-3">
        <div 
          className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
          style={{ width: `${score}%` }}
        />
      </div>
      
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
        {insight}
      </p>
    </div>
  );
}

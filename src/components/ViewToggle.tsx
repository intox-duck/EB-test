import { cn } from "@/lib/utils";
import { Eye, BarChart3 } from "lucide-react";

interface ViewToggleProps {
  showBenchmark: boolean;
  onToggle: (show: boolean) => void;
}

export function ViewToggle({ showBenchmark, onToggle }: ViewToggleProps) {
  return (
    <div className="inline-flex rounded-lg bg-muted p-1 gap-1">
      <button
        onClick={() => onToggle(false)}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
          !showBenchmark 
            ? "bg-card text-foreground shadow-sm" 
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Eye className="w-4 h-4" />
        Current View
      </button>
      <button
        onClick={() => onToggle(true)}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
          showBenchmark 
            ? "bg-card text-foreground shadow-sm" 
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <BarChart3 className="w-4 h-4" />
        Compare Benchmark
      </button>
    </div>
  );
}

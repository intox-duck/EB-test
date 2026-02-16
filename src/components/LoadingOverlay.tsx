import { Loader2, Radar } from "lucide-react";

export function LoadingOverlay() {
  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
      <div className="text-center">
        <div className="relative inline-flex items-center justify-center mb-4">
          <div className="w-20 h-20 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <Radar className="absolute w-8 h-8 text-primary" />
        </div>
        <p className="text-foreground font-medium mb-1">Analysing Brand Signals</p>
        <p className="text-sm text-muted-foreground">Scanning social, search and experience data...</p>
      </div>
    </div>
  );
}

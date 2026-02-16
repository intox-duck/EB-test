import { ExternalLink, Globe } from "lucide-react";

interface SourcesListProps {
  sources: string[];
}

export function SourcesList({ sources }: SourcesListProps) {
  if (!sources || sources.length === 0) return null;
  
  const formatUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url;
    }
  };
  
  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Globe className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Grounding Sources</h3>
        <span className="text-xs text-muted-foreground">({sources.length} sources)</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {sources.map((source, index) => (
          <a
            key={index}
            href={source}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-full text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="max-w-[150px] truncate">{formatUrl(source)}</span>
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </a>
        ))}
      </div>
    </div>
  );
}

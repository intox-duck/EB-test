import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { AxisData } from "@/lib/api/brandAnalysis";

interface BrandRadarChartProps {
  data: AxisData[];
  showBenchmark: boolean;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border border-border bg-card/95 p-3 shadow-lg backdrop-blur-sm">
        <p className="mb-1 font-semibold text-foreground">{data.subject}</p>
        <p className="text-sm text-chart-teal">
          Score: <span className="font-bold">{data.score}</span>
        </p>
        {payload.length > 1 && (
          <p className="text-sm text-chart-orange">
            Benchmark: <span className="font-bold">{data.benchmark}</span>
          </p>
        )}
      </div>
    );
  }
  return null;
};

export function BrandRadarChart({ data, showBenchmark }: BrandRadarChartProps) {
  const grid = "hsl(var(--chart-grid))";
  const label = "hsl(var(--muted-foreground))";
  const teal = "hsl(var(--chart-teal))";
  const orange = "hsl(var(--chart-orange))";

  return (
    <div className="radar-surface h-[500px] w-full rounded-xl md:h-[600px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="74%" data={data}>
          <PolarGrid stroke={grid} strokeWidth={1} />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: label, fontSize: 11, fontWeight: 500 }}
            tickLine={false}
            axisLine={false}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fill: label, fontSize: 10 }}
            tickCount={6}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />

          {showBenchmark && (
            <Radar
              name="Industry Benchmark"
              dataKey="benchmark"
              stroke={orange}
              fill={orange}
              fillOpacity={0.04}
              strokeWidth={1.5}
              dot={{ fill: orange, r: 2 }}
            />
          )}

          <Radar
            name="Current Score"
            dataKey="score"
            stroke={teal}
            fill={teal}
            fillOpacity={0.07}
            strokeWidth={1.8}
            dot={{ fill: teal, r: 2.5 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DollarSign } from 'lucide-react';

interface CompetitorSalary {
  company: string;
  salary: string;
  source: string;
  percentileRank: number;
}

interface SalaryProgression {
  level: string;
  salary: string;
  yearsExperience: string;
}

interface CompetitiveSalaryChartProps {
  targetCompany: string;
  competitorComparison?: CompetitorSalary[];
  salaryProgression?: SalaryProgression[];
  roleSpecificSalary?: string;
  averageSalary: string;
}

export const CompetitiveSalaryChart = ({
  targetCompany,
  competitorComparison = [],
  salaryProgression = [],
  roleSpecificSalary,
  averageSalary
}: CompetitiveSalaryChartProps) => {
  // Helper function to extract numeric value from salary string
  const extractSalary = (salaryStr: string): number => {
    const matches = salaryStr.match(/\$?([\d,]+)(?:\s*-\s*\$?([\d,]+))?/);
    if (matches) {
      const min = parseInt(matches[1].replace(/,/g, ''));
      const max = matches[2] ? parseInt(matches[2].replace(/,/g, '')) : min;
      return (min + max) / 2;
    }
    return 0;
  };

  // Prepare competitor comparison data for chart
  const competitorData = competitorComparison.map(comp => ({
    company: comp.company,
    salary: extractSalary(comp.salary),
    percentile: comp.percentileRank,
    source: comp.source
  }));

  // Add target company to the chart
  if (roleSpecificSalary || averageSalary) {
    competitorData.unshift({
      company: targetCompany,
      salary: extractSalary(roleSpecificSalary || averageSalary),
      percentile: 50, // Default to 50th percentile for target company
      source: 'Internal'
    });
  }

  // Prepare salary progression data
  const progressionData = salaryProgression.map(prog => ({
    level: prog.level,
    salary: extractSalary(prog.salary),
    years: prog.yearsExperience
  }));

  const getPercentileColor = (percentile: number) => {
    if (percentile >= 75) return 'hsl(var(--primary))';
    if (percentile >= 50) return 'hsl(var(--secondary))';
    if (percentile >= 25) return 'hsl(var(--muted))';
    return 'hsl(var(--destructive))';
  };

  return (
    <div className="space-y-6">
      {/* Competitive Comparison Chart */}
      {competitorData.length > 0 && (
        <Card className="p-6 gradient-card shadow-card border-border/50">
          <div className="flex items-center gap-2 mb-6">
            <DollarSign className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Competitive Salary Comparison</h3>
          </div>
          
          <div className="h-80 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={competitorData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="company" 
                  tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                  formatter={(value: number, name, props) => [
                    `$${value.toLocaleString()}`,
                    `${props.payload.percentile}th percentile`
                  ]}
                  labelFormatter={(label) => `Company: ${label}`}
                />
                <Bar dataKey="salary" radius={[4, 4, 0, 0]}>
                  {competitorData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getPercentileColor(entry.percentile)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Percentile Legend */}
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--primary))' }}></div>
              <span className="text-muted-foreground">75th+ percentile</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--secondary))' }}></div>
              <span className="text-muted-foreground">50-75th percentile</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--muted))' }}></div>
              <span className="text-muted-foreground">25-50th percentile</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--destructive))' }}></div>
              <span className="text-muted-foreground">Below 25th percentile</span>
            </div>
          </div>
        </Card>
      )}

      {/* Salary Progression Chart */}
      {progressionData.length > 0 && (
        <Card className="p-6 gradient-card shadow-card border-border/50">
          <div className="flex items-center gap-2 mb-6">
            <DollarSign className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Salary Progression by Experience</h3>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={progressionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="level" 
                  tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                  formatter={(value: number, name, props) => [
                    `$${value.toLocaleString()}`,
                    `Experience: ${props.payload.years}`
                  ]}
                />
                <Bar dataKey="salary" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Role-Specific Salary Highlight */}
      {roleSpecificSalary && (
        <Card className="p-4 gradient-card shadow-card border-border/50">
          <div className="text-center">
            <Badge variant="outline" className="mb-2 border-primary/30">Role-Specific Salary</Badge>
            <p className="text-2xl font-bold text-primary">{roleSpecificSalary}</p>
            <p className="text-sm text-muted-foreground">For the specified role and seniority level</p>
          </div>
        </Card>
      )}
    </div>
  );
};
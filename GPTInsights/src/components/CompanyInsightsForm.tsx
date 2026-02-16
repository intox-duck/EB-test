import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Building, MapPin, Briefcase, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CompanyInsightsFormProps {
  onSubmit: (companyName: string, location: string, jobTitle?: string, seniorityLevel?: string) => void;
  isLoading: boolean;
}

export const CompanyInsightsForm = ({ onSubmit, isLoading }: CompanyInsightsFormProps) => {
  const [companyName, setCompanyName] = useState('');
  const [location, setLocation] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [seniorityLevel, setSeniorityLevel] = useState('');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!companyName.trim() || !location.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both company name and location.",
        variant: "destructive",
      });
      return;
    }

    onSubmit(companyName, location, jobTitle, seniorityLevel);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto p-8 gradient-card shadow-elevated border-border/50 backdrop-blur-sm">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
          <Search className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Generate Company Insights</h2>
        <p className="text-muted-foreground">
          Get comprehensive talent acquisition intelligence for any organization
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="company" className="text-foreground font-medium flex items-center gap-2">
              <Building className="w-4 h-4" />
              Company Name
            </Label>
            <Input
              id="company"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g., Microsoft, Tesla, Amazon"
              className="bg-surface border-border/50 text-foreground transition-smooth focus:border-primary/50 focus:ring-primary/20"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="text-foreground font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Primary Location
            </Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Seattle, WA"
              className="bg-surface border-border/50 text-foreground transition-smooth focus:border-primary/50 focus:ring-primary/20"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="jobTitle" className="text-foreground font-medium flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Job Title/Family (Optional)
            </Label>
            <Input
              id="jobTitle"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g., Software Engineer, Product Designer"
              className="bg-surface border-border/50 text-foreground transition-smooth focus:border-primary/50 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="seniorityLevel" className="text-foreground font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Seniority Level (Optional)
            </Label>
            <Select value={seniorityLevel} onValueChange={setSeniorityLevel}>
              <SelectTrigger className="bg-surface border-border/50 text-foreground transition-smooth focus:border-primary/50 focus:ring-primary/20">
                <SelectValue placeholder="Select seniority level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="graduate">Graduate</SelectItem>
                <SelectItem value="junior">Junior (0-2 years)</SelectItem>
                <SelectItem value="mid">Mid-level (2-5 years)</SelectItem>
                <SelectItem value="senior">Senior (5-8 years)</SelectItem>
                <SelectItem value="lead">Lead/Principal (8+ years)</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="director">Director</SelectItem>
                <SelectItem value="vp">VP/Executive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-smooth shadow-glow disabled:opacity-50"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
              Generating Insights...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Generate Intelligence Report
            </div>
          )}
        </Button>
      </form>
    </Card>
  );
};
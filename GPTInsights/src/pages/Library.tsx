import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, 
  Building, 
  Calendar, 
  MapPin, 
  Briefcase, 
  Download,
  Trash2,
  Eye
} from 'lucide-react';
import { CompanyInsights, CompanyInsightsDisplay } from '@/components/CompanyInsightsDisplay';
import { InsightsChat } from '@/components/InsightsChat';
import logoImage from '@/assets/C2-logo.jpeg';

interface SavedReport {
  id: string;
  report_name: string;
  company_name: string;
  location: string | null;
  job_title: string | null;
  seniority_level: string | null;
  created_at: string;
  insights_data: CompanyInsights;
}

const Library = () => {
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<SavedReport | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchSavedReports();
  }, [user, navigate]);

  const fetchSavedReports = async () => {
    try {
      const { data, error } = await supabase
        .from('saved_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedReports((data || []).map(report => ({
        ...report,
        insights_data: report.insights_data as unknown as CompanyInsights
      })));
    } catch (error) {
      console.error('Error fetching saved reports:', error);
      toast({
        title: "Error",
        description: "Failed to load saved reports",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteReport = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('saved_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      setSavedReports(prev => prev.filter(report => report.id !== reportId));
      toast({
        title: "Success",
        description: "Report deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting report:', error);
      toast({
        title: "Error",
        description: "Failed to delete report",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (selectedReport) {
    return (
      <div className="min-h-screen p-6">
        <CompanyInsightsDisplay
          insights={selectedReport.insights_data}
          onBack={() => setSelectedReport(null)}
          searchParams={{
            companyName: selectedReport.company_name,
            location: selectedReport.location || '',
            jobTitle: selectedReport.job_title || undefined,
            seniorityLevel: selectedReport.seniority_level || undefined,
          }}
        />
        <InsightsChat insights={selectedReport.insights_data} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Floating background elements */}
      <div className="floating-orb w-64 h-64 top-20 left-10 opacity-30"></div>
      <div className="floating-orb w-48 h-48 top-1/2 right-20 opacity-20 animation-delay-1000"></div>
      <div className="floating-orb w-32 h-32 bottom-32 left-1/3 opacity-25 animation-delay-2000"></div>

      <div className="relative z-10">
        {/* Header */}
        <header className="container mx-auto px-6 pt-12 pb-8">
          <div className="flex items-center justify-between mb-6">
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="bg-surface hover:bg-surface-hover border-border/50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
            <div className="w-16 h-16">
              <img 
                src={logoImage} 
                alt="C2 Logo" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-hero mb-4">Report Library</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Access your saved intelligence reports
            </p>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-6 pb-16">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading your reports...</p>
            </div>
          ) : savedReports.length === 0 ? (
            <Card className="p-12 text-center gradient-card shadow-card border-border/50">
              <Building className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Reports Yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first intelligence report to get started
              </p>
              <Button onClick={() => navigate('/')} className="bg-primary hover:bg-primary/90">
                Create Report
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedReports.map((report) => (
                <Card key={report.id} className="p-6 gradient-card shadow-card border-border/50 transition-smooth hover:shadow-elevated">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Building className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{report.report_name}</h3>
                        <p className="text-sm text-muted-foreground">{report.company_name}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    {report.location && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {report.location}
                      </div>
                    )}
                    {report.job_title && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Briefcase className="w-3 h-3" />
                        {report.job_title}
                        {report.seniority_level && ` (${report.seniority_level})`}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {formatDate(report.created_at)}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => setSelectedReport(report)}
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-surface hover:bg-surface-hover"
                    >
                      <Eye className="w-3 h-3 mr-2" />
                      View
                    </Button>
                    <Button
                      onClick={() => deleteReport(report.id)}
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive border-destructive/50 hover:border-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Library;
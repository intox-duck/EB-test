import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Minus, Calendar, BarChart3 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

const mockHistoricalData = [
  { month: "Aug", score: 62, search: 58, social: 65, content: 60, reviews: 64, culture: 68, leadership: 55 },
  { month: "Sep", score: 65, search: 62, social: 68, content: 63, reviews: 66, culture: 70, leadership: 58 },
  { month: "Oct", score: 68, search: 66, social: 70, content: 67, reviews: 68, culture: 72, leadership: 62 },
  { month: "Nov", score: 71, search: 70, social: 73, content: 69, reviews: 71, culture: 74, leadership: 65 },
  { month: "Dec", score: 73, search: 72, social: 75, content: 71, reviews: 73, culture: 75, leadership: 68 },
  { month: "Jan", score: 76, search: 75, social: 78, content: 74, reviews: 76, culture: 77, leadership: 72 },
];

const dimensionTrends = [
  { name: "Search Presence", current: 75, previous: 72, trend: "up" },
  { name: "Social Media", current: 78, previous: 75, trend: "up" },
  { name: "Content Quality", current: 74, previous: 71, trend: "up" },
  { name: "Reviews", current: 76, previous: 73, trend: "up" },
  { name: "Culture", current: 77, previous: 75, trend: "up" },
  { name: "Leadership", current: 72, previous: 68, trend: "up" },
];

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === "up") return <TrendingUp className="w-4 h-4 text-green-500" />;
  if (trend === "down") return <TrendingDown className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
};

const Analytics = () => {
  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
            <p className="text-muted-foreground">
              Track your employer brand performance over time.
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Score</p>
                    <p className="text-3xl font-bold text-foreground">76</p>
                  </div>
                  <div className="flex items-center gap-1 text-green-500">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm font-medium">+3</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">6-Month Growth</p>
                    <p className="text-3xl font-bold text-foreground">+14</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Best Dimension</p>
                    <p className="text-lg font-bold text-foreground">Social Media</p>
                  </div>
                  <span className="text-2xl font-bold text-primary">78</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Score Trend
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="overall">
                <TabsList className="mb-4">
                  <TabsTrigger value="overall">Overall</TabsTrigger>
                  <TabsTrigger value="dimensions">By Dimension</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overall">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={mockHistoricalData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                        <YAxis domain={[50, 100]} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--card))", 
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px"
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="score" 
                          stroke="hsl(var(--primary))" 
                          fill="hsl(var(--primary) / 0.2)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
                
                <TabsContent value="dimensions">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={mockHistoricalData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                        <YAxis domain={[50, 100]} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--card))", 
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px"
                          }}
                        />
                        <Line type="monotone" dataKey="search" stroke="#10b981" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="social" stroke="#3b82f6" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="content" stroke="#f59e0b" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="reviews" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="culture" stroke="#ec4899" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="leadership" stroke="#06b6d4" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-4 mt-4 justify-center text-sm">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#10b981]" /><span>Search</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#3b82f6]" /><span>Social</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#f59e0b]" /><span>Content</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#8b5cf6]" /><span>Reviews</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#ec4899]" /><span>Culture</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#06b6d4]" /><span>Leadership</span></div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Dimension Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Dimension Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {dimensionTrends.map((dim) => (
                  <div key={dim.name} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium text-foreground">{dim.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {dim.previous} → {dim.current}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-foreground">{dim.current}</span>
                      <TrendIcon trend={dim.trend} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">📊 Historical data will be populated as you run more analyses</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Analytics;

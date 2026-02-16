import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, BookOpen, Video, Mail, ExternalLink, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";


const faqs = [
  {
    question: "How is the employer brand score calculated?",
    answer: "Our AI analyses six key dimensions of your employer brand: Search Presence, Social Media, Content Quality, Reviews, Culture, and Leadership. Each dimension is scored from 0-100 based on real-time data gathered from across the web using Google Search grounding."
  },
  {
    question: "How often should I run an analysis?",
    answer: "We recommend running an analysis at least monthly to track changes in your employer brand. For companies actively working on employer branding initiatives, weekly analyses can help measure the impact of your efforts."
  },
  {
    question: "What sources are used for the analysis?",
    answer: "Our AI pulls data from job boards (Glassdoor, Indeed, LinkedIn), social media platforms, news articles, company websites, industry publications, and employee review sites. All sources are shown in the 'Grounding Sources' section after each analysis."
  },
  {
    question: "Can I compare my brand against competitors?",
    answer: "Yes! Use the Competitors page to add up to 5 competitor companies and see how your employer brand stacks up across all six dimensions with an overlay radar chart."
  },
  {
    question: "What do the benchmark scores represent?",
    answer: "Industry benchmarks are derived from analysing thousands of companies across various sectors. They represent the average score for companies in similar industries, helping you understand where you stand relative to the market."
  },
  {
    question: "How can I improve my employer brand score?",
    answer: "Focus on the dimensions where you score lowest. The AI provides specific, actionable insights for each dimension. Common improvements include: enhancing your careers page, encouraging employee reviews, increasing executive thought leadership, and creating more employer branding content."
  },
  {
    question: "Is my data secure?",
    answer: "Absolutely. We only analyse publicly available information about your company. Your account data is protected with enterprise-grade encryption, and we never share your analysis results with third parties."
  },
  {
    question: "Who has access to my analyses?",
    answer: "Only users with @chapter2.group email addresses can sign up for accounts. Within your organisation, analyses are visible to all team members. Contact support if you need more granular access controls."
  },
];

const Help = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const filteredFaqs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Help & Support</h1>
            <p className="text-muted-foreground">
              Find answers, resources, and contact support.
            </p>
          </div>

          {/* Quick Links */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Card
              className="hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => navigate('/methodology')}
            >
              <CardContent className="p-6 flex flex-col items-center text-center">
                <BookOpen className="w-8 h-8 text-primary mb-3" />
                <h3 className="font-semibold text-foreground">Methodology</h3>
                <p className="text-sm text-muted-foreground mt-1">Learn how insights are derived</p>
              </CardContent>
            </Card>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <MessageCircle className="w-8 h-8 text-primary mb-3" />
                <h3 className="font-semibold text-foreground">AI Assistant</h3>
                <p className="text-sm text-muted-foreground mt-1">Ask questions in the chat</p>
              </CardContent>
            </Card>
          </div>

          {/* FAQ Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search FAQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* FAQs */}
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <CardDescription>Common questions about BrandRadar</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {filteredFaqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              {filteredFaqs.length === 0 && (
                <p className="text-center py-8 text-muted-foreground">
                  No FAQs match your search. Try different keywords or contact support.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Contact Support */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Need More Help?
              </CardTitle>
              <CardDescription>Our team is here to assist you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Can't find what you're looking for? Reach out to our support team and we'll get back to you within 24 hours.
              </p>
              <div className="flex gap-3">
                <Button>
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Support
                </Button>
                <Button variant="outline">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Documentation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Help;

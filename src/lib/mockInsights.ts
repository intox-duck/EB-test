
import { CompanyInsights } from "@/components/CompanyInsightsDisplay";

export const getMockInsights = (companyName: string): CompanyInsights => ({
    companyName: companyName,
    locations: ["London, UK", "New York, USA", "Singapore", "Berlin, Germany"],
    companySize: "10,000+ Employees",
    keyProducts: ["Cloud Platform", "Enterprise Suite", "AI Solutions", "Data Analytics"],
    jobsAdvertised: 145,
    complexityRating: 4.2,
    techStack: [
        { name: "React", importance: 9, marketDemand: "High" },
        { name: "TypeScript", importance: 9, marketDemand: "High" },
        { name: "Node.js", importance: 8, marketDemand: "High" },
        { name: "Python", importance: 7, marketDemand: "Medium" },
        { name: "AWS", importance: 7, marketDemand: "Medium" },
        { name: "Kubernetes", importance: 6, marketDemand: "Medium" },
        { name: "GraphQL", importance: 6, marketDemand: "Medium" },
        { name: "PostgreSQL", importance: 7, marketDemand: "Medium" }
    ],
    projectIntelligence: [
        {
            category: "Digital Transformation",
            title: "Global Cloud Migration",
            description: "migrating legacy on-premise systems to a hybrid cloud infrastructure to improve scalability and reduce operational costs. This initiative involves standardising development environments across 12 global locations.",
            status: "Active",
            timeline: "18-24 months",
            businessImpact: "Expected to reduce infrastructure costs by 30% and improve deployment time by 60%.",
            technicalDetails: "Leveraging AWS and Azure for a multi-cloud strategy with Terraform for IaC.",
            teamSize: "45+ engineers",
            investmentLevel: "High ($20M+)"
        },
        {
            category: "AI/ML",
            title: "Customer Insights Platform",
            description: "Developing a proprietary machine learning platform to analyse customer behaviour patterns and predict churn. The system integrates with existing CRM and support tools.",
            status: "Planning",
            timeline: "12 months",
            businessImpact: "Targeting a 15% reduction in customer churn.",
            technicalDetails: "Python-based ML models with PyTorch, served via FastAPI.",
            teamSize: "12 data scientists",
            investmentLevel: "Medium ($5M-10M)"
        }
    ],
    salaryData: {
        averageSalary: "£125,000",
        roleSpecificSalary: "£145,000",
        sources: [
            { name: "Glassdoor", salary: "£122,000", url: "https://glassdoor.com" },
            { name: "Levels.fyi", salary: "£135,000", url: "https://levels.fyi" },
            { name: "Indeed", salary: "£118,000", url: "https://indeed.com" }
        ],
        competitorComparison: [
            { company: "TechCorp", salary: "£130,000", source: "Levels.fyi", percentileRank: 45 },
            { company: "InnovateInc", salary: "£140,000", source: "Glassdoor", percentileRank: 30 },
            { company: "GlobalSystems", salary: "£115,000", source: "Indeed", percentileRank: 65 }
        ],
        salaryProgression: [
            { level: "Junior", salary: "£85,000", yearsExperience: "0-2 years" },
            { level: "Mid-Level", salary: "£125,000", yearsExperience: "3-5 years" },
            { level: "Senior", salary: "£165,000", yearsExperience: "5-8 years" },
            { level: "Lead/Principal", salary: "£195,000", yearsExperience: "8+ years" }
        ]
    },
    costOfLiving: {
        overallIndex: 78,
        comparedToAverage: "12% higher than national average",
        breakdown: {
            housing: "£2,500/mo",
            food: "£600/mo",
            transportation: "£200/mo",
            healthcare: "£400/mo",
            utilities: "£250/mo"
        },
        monthlyExpenses: "£4,200",
        qualityOfLifeIndex: 85
    },
    costToHire: {
        baseSalary: "£125,000",
        employerTaxes: "£15,000",
        benefits: "£20,000",
        recruitmentCosts: "£18,000",
        onboardingCosts: "£5,000",
        totalAnnualCost: "£183,000",
        breakdown: "Includes agency fees, background checks, and equipment setup."
    },
    competitors: [
        { name: "TechCorp", reason: "Direct product competitor in cloud space.", hiringVelocity: "High" },
        { name: "InnovateInc", reason: "Competing for same senior engineering talent.", hiringVelocity: "Medium" },
        { name: "GlobalSystems", reason: "Similar tech stack overlap.", hiringVelocity: "Low" }
    ],
    coreCapabilities: [
        { name: "Cloud Infrastructure", importance: 9, marketDemand: "High" },
        { name: "Enterprise Loyalty", importance: 8, marketDemand: "Medium" },
        { name: "Data Analytics", importance: 7, marketDemand: "Medium" }
    ],
    roleInsights: {
        requestedRole: "Senior Software Engineer",
        seniorityLevel: "Senior (5+ years)",
        demandScore: 8,
        geographicSpread: [
            { location: "London", percentage: 40, openRoles: 15 },
            { location: "New York", percentage: 30, openRoles: 12 },
            { location: "Remote", percentage: 20, openRoles: 8 },
            { location: "Berlin", percentage: 10, openRoles: 4 }
        ],
        hiringTrends: {
            recentHires: 12,
            monthlyGrowth: "+5%",
            retentionRate: "92%"
        }
    },
    talentMovement: {
        recentJoins: [
            { name: "John D.", previousCompany: "TechCorp", role: "Senior Dev", joinDate: "Oct 2023" },
            { name: "Sarah M.", previousCompany: "StartupX", role: "Product Manager", joinDate: "Sep 2023" }
        ],
        recentExits: [
            { name: "Mike R.", newCompany: "InnovateInc", role: "Lead Engineer", exitDate: "Nov 2023" }
        ],
        poachingPatterns: [
            { company: "TechCorp", direction: "incoming", count: 5, trend: "Increasing" },
            { company: "InnovateInc", direction: "outgoing", count: 3, trend: "Stable" }
        ]
    },
    benchmarkScore: {
        overall: 82,
        compensation: 85,
        hiringVolume: 78,
        techModernity: 88,
        employeeReviews: 75,
        marketSentiment: 80,
        breakdown: "Strong performance in compensation and tech stack modernity. Employee reviews indicate good work-life balance but some growing pains."
    },
    talentSentiment: {
        sources: [
            { name: "Glassdoor", score: 4.2, reviewCount: 1250, url: "https://glassdoor.com" },
            { name: "Indeed", score: 4.0, reviewCount: 850, url: "https://indeed.com" }
        ],
        aggregatedScore: 4.1,
        totalReviews: 2100,
        sentiment: "Positive",
        keyThemes: ["Great Benefits", "Modern Tech Stack", "Good Culture", "Fast Paced"],
        workLifeBalance: 4.0,
        careerOpportunities: 4.3,
        compensation: 4.5
    }
});

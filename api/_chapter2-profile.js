const CHAPTER2_CANONICAL_NAME = 'Chapter 2';
const CHAPTER2_CANONICAL_URL = 'https://www.chapter2.group/';

const CHAPTER2_PROFILE = {
  canonicalName: CHAPTER2_CANONICAL_NAME,
  canonicalUrl: CHAPTER2_CANONICAL_URL,
  industry: 'Talent Acquisition & Recruitment Process Outsourcing (RPO)',
  companySizeApprox: 120,
  coreLocations: [
    'London, UK',
    'Johannesburg, South Africa',
    'Budapest, Hungary',
    'New York, USA',
    'Boston, USA',
    'India'
  ],
  overview:
    'Chapter 2 is a technology-enabled global talent acquisition and Recruitment Process Outsourcing (RPO) agency founded in 2020 by Leo Harrison (former Global COO of OLIVER) and backed by investor Steven Bartlett.',
  operatingModel:
    'Chapter 2 uses an embedded model where talent partners work inside client organisations, combining external agency pace with in-house cultural alignment.',
  servicePillars: [
    {
      name: 'Embedded Talent Teams',
      detail: 'Seasoned recruiters embedded in client teams to run end-to-end hiring.'
    },
    {
      name: 'Employer Branding',
      detail: 'Marketing-led employer brand programmes to attract talent directly and reduce paid database dependency.'
    },
    {
      name: 'Talent Intelligence & Advisory',
      detail: 'Data-led dashboards, competitor benchmarking, regional insights, and AI-in-hiring advisory.'
    }
  ]
};

function normaliseWhitespace(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

export function isChapter2Alias(value = '') {
  const raw = normaliseWhitespace(value).toLowerCase();
  if (!raw) return false;

  const normalized = raw
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '');

  return (
    normalized.includes('chapter2.group') ||
    /^chapter\s*2(\s*group)?$/.test(raw) ||
    /^chapter2(\s*group)?$/.test(raw)
  );
}

export function getChapter2Profile() {
  return CHAPTER2_PROFILE;
}

export function buildChapter2PromptContext() {
  const pillars = CHAPTER2_PROFILE.servicePillars
    .map((pillar) => `- ${pillar.name}: ${pillar.detail}`)
    .join('\n');

  return `
CHAPTER 2 CANONICAL CONTEXT (HIGH PRIORITY FACTS):
- ${CHAPTER2_PROFILE.overview}
- ${CHAPTER2_PROFILE.operatingModel}
- Company size signal: approximately ${CHAPTER2_PROFILE.companySizeApprox} employees.
- Core operational hubs: ${CHAPTER2_PROFILE.coreLocations.join(', ')}.
- Service pillars:
${pillars}
INSTRUCTION: Use this context as the baseline identity for Chapter 2. Keep outputs concise and aligned to each component's existing structure.
`;
}

export function getChapter2DimensionInsights() {
  return {
    Search:
      'Chapter 2 is positioned clearly around embedded talent, RPO, and next-generation recruitment delivery, making intent-led discovery terms more coherent than traditional agency messaging.',
    'Social Presence':
      'Social channels and thought-leadership signals focus on modern hiring, employer brand, and AI-enabled recruitment operations, reinforcing a specialist rather than volume-led market voice.',
    'Social Impact':
      'Chapter 2\'s visible social impact narrative is still maturing publicly, but its delivery model emphasises fairer hiring outcomes through better employer brand and talent process design.',
    'Values & Proposition':
      'The core proposition is explicit: embedded talent partners operating inside client teams, supported by employer branding and talent intelligence to improve quality, speed, and cultural fit.',
    'Employee Experience':
      'Employee Experience for Chapter 2 should be interpreted from Glassdoor signals only, indicating a high-pace scale-up environment centred on ownership, client proximity, and delivery accountability.',
    Content:
      'Content emphasis aligns to practical hiring performance themes such as talent intelligence dashboards, competitor benchmarking, and AI-in-hiring adoption guidance.',
    UX:
      'The digital journey is concise and proposition-led, helping visitors quickly understand Chapter 2\'s embedded model and differentiated service pillars.',
    'Candidate Experience':
      'Candidate journey messaging reflects embedded delivery and brand-led attraction, signalling a consultative process model rather than purely transactional agency funneling.',
    Leadership:
      'Leadership credibility is anchored in the 2020 founding by Leo Harrison and investor backing from Steven Bartlett, supporting a modern, growth-oriented market narrative.'
  };
}

export function getChapter2Summary() {
  return `Chapter 2 is a technology-enabled global talent acquisition and RPO agency founded in 2020 by Leo Harrison and backed by Steven Bartlett. It runs an embedded operating model and delivers three core pillars: Embedded Talent Teams, Employer Branding, and Talent Intelligence & Advisory, with an approximate headcount of ${CHAPTER2_PROFILE.companySizeApprox}.`;
}

export function getChapter2DeepDiveOverride() {
  const companySize = `Approx. ${CHAPTER2_PROFILE.companySizeApprox} employees across a global embedded talent acquisition and RPO delivery model.`;

  const coreCapabilities = CHAPTER2_PROFILE.servicePillars.map((pillar, idx) => ({
    name: pillar.name,
    importance: 9 - idx,
    marketDemand: 'high'
  }));

  const projectIntelligence = [
    {
      category: 'Talent Acquisition Delivery',
      title: 'Embedded Talent Team Deployment Programme',
      description:
        'Scaling client-embedded recruiting squads to run end-to-end hiring workflows with tighter stakeholder alignment and faster decision cycles.',
      status: 'Active',
      timeline: 'Ongoing',
      businessImpact:
        'Improves hiring speed, quality-of-hire consistency, and retention by embedding recruiters into client operating rhythms.',
      technicalDetails:
        'Uses structured hiring workflows, role calibration dashboards, and pipeline health tracking across client delivery pods.',
      teamSize: 'Cross-functional embedded pods',
      investmentLevel: 'Medium'
    },
    {
      category: 'Employer Brand Strategy',
      title: 'Employer Brand Demand Generation Engine',
      description:
        'Designing employer brand campaigns that increase direct applicant quality and reduce over-reliance on paid candidate databases.',
      status: 'Active',
      timeline: 'Quarterly programme cycles',
      businessImpact:
        'Strengthens candidate conversion quality while reducing cost-per-hire pressure in priority hiring markets.',
      technicalDetails:
        'Combines content-led attraction campaigns, audience targeting, and conversion signal tracking by role family and market.',
      teamSize: 'Brand + talent advisory squad',
      investmentLevel: 'Medium'
    },
    {
      category: 'Talent Intelligence',
      title: 'Performance Dashboard & Competitor Benchmark Suite',
      description:
        'Delivering data products that track hiring velocity, market competitiveness, and talent sentiment to guide recruitment strategy.',
      status: 'Active',
      timeline: 'Multi-quarter roadmap',
      businessImpact:
        'Enables evidence-based prioritisation of hiring investments, market expansion sequencing, and role-level resource planning.',
      technicalDetails:
        'Includes dashboarding for funnel performance, competitor comparisons, regional demand analysis, and sentiment trend monitoring.',
      teamSize: 'Talent intelligence analysts',
      investmentLevel: 'Medium'
    },
    {
      category: 'AI Advisory',
      title: 'AI-in-Hiring Integration Advisory',
      description:
        'Advising clients on practical AI integration across sourcing, screening support, and recruiter workflow optimisation.',
      status: 'Active',
      timeline: 'Client-dependent rollout phases',
      businessImpact:
        'Improves recruiter productivity and decision quality while maintaining governance and human-led hiring accountability.',
      technicalDetails:
        'Focuses on process orchestration, evaluation frameworks, and governance guardrails for AI-assisted recruitment workflows.',
      teamSize: 'Advisory specialists',
      investmentLevel: 'Medium'
    }
  ];

  return {
    companyName: CHAPTER2_PROFILE.canonicalName,
    companySize,
    locations: CHAPTER2_PROFILE.coreLocations,
    keyProducts: CHAPTER2_PROFILE.servicePillars.map((pillar) => pillar.name),
    coreCapabilities,
    projectIntelligence
  };
}

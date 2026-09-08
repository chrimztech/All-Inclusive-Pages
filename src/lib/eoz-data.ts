export const ORG = {
  name: "Echo Opportunities Zambia",
  short: "EOZ",
  tagline: "Connecting Talent. Creating Opportunities. Building Futures.",
  country: "Republic of Zambia",
  vision:
    "To become a trusted and leading recruitment, career development, business support and opportunities platform in Zambia and beyond.",
  mission:
    "To connect people and organisations to meaningful opportunities, professional services, skills development and reliable information that support employment, education, entrepreneurship and sustainable growth.",
  location: "Lusaka, Zambia",
  phone: "0771 538 765",
  email: "echoopportunitieszambia@gmail.com",
  social: {
    whatsapp: "https://whatsapp.com/channel/0029Vb6cAbO7z4kmbz8ii90I",
    facebook: "https://www.facebook.com/share/192MkwvvMi/?mibextid=wwXIfr",
    linkedin: "https://www.linkedin.com/company/echo-opportunities-zambia/",
    tiktok: "https://www.tiktok.com/@echo.opportunitie?_r=1&_t=ZS-97uZaCEmAQp",
  },
  whatsappWording: "Follow the Echo Opportunities Zambia channel on WhatsApp",
  disclaimer:
    "Echo Opportunities Zambia is a distribution and curation platform. All applications must be made directly with the employer through their official channel. EOZ does not accept, store, or forward candidate applications.",
  recruitmentRole:
    "EOZ operates as a bridge between employers and potential candidates. Our opportunity-sharing function focuses on making relevant vacancies and opportunities easier to discover, while directing applicants to the employer's stated application process.",
  advertiserDistinction:
    "EOZ distributes and connects people to opportunities; the organisation advertising the vacancy or programme determines the official eligibility requirements, application process, closing date and recruitment/selection decision. EOZ does not create the impression that it is the employer unless EOZ itself is the hiring organisation.",
  serviceContactRule:
    "This service is booked directly with the EOZ services desk. It is never the application channel for a vacancy — if you are applying for a job, scholarship, grant or tender, use the official application route stated on that listing.",
};

export const WHY_CHOOSE_EOZ = [
  "Registered recruitment agency",
  "Professional & reliable service",
  "Timely service delivery",
  "Affordable solutions",
  "Dedicated to connecting talent with opportunities",
  "Trusted by individuals, businesses and organisations",
] as const;

export const CONTENT_SERIES = [
  {
    time: "Morning",
    title: "Devotion, reflection & encouragement",
    description:
      "A thoughtful start to the day for the EOZ community, shared with care and respect.",
  },
  {
    time: "Afternoon",
    title: "HR, career & education",
    description:
      "Practical advice, application guidance, employability information and learning opportunities.",
  },
  {
    time: "Evening",
    title: "Devotional content & community",
    description:
      "An encouraging close to the day alongside useful professional and opportunity updates.",
  },
] as const;

export const PILLARS = [
  {
    title: "Employment & Recruitment",
    description:
      "Connecting job seekers with employers while helping organisations access reliable talent.",
  },
  {
    title: "Education & Scholarships",
    description:
      "Sharing scholarships, training, short courses, internships and learning opportunities.",
  },
  {
    title: "Career Development & Professional Support",
    description:
      "Practical career information, job-search guidance and professional development support.",
  },
  {
    title: "Entrepreneurship & Business Opportunities",
    description:
      "Access to grants, consultancies, networking and opportunities for entrepreneurs and SMEs.",
  },
  {
    title: "Information & Opportunity Access",
    description:
      "Reliable, timely and accessible information that helps people act on useful opportunities.",
  },
] as const;

export const BRAND_VALUES = [
  "Opportunity access",
  "Professionalism",
  "Reliable information",
  "Accessibility",
  "Talent development",
  "Career growth",
  "Entrepreneurship",
  "Connection and networking",
  "National development",
  "Practical support",
] as const;

export const AUDIENCES = [
  "Job seekers and unemployed graduates",
  "Students and young professionals",
  "People seeking internships and work experience",
  "Professionals seeking career advancement",
  "Entrepreneurs and SMEs",
  "Employers and recruiters",
  "People seeking scholarships and training",
  "Organisations seeking grants, consultancies and business opportunities",
] as const;

export const CATEGORIES = [
  "All",
  "Jobs",
  "Internships",
  "Scholarships",
  "NGO Opportunities",
  "Grants",
  "Consultancies",
  "Tenders",
  "Training",
  "Events",
  "Business Opportunities",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const REGIONS = ["Lusaka", "Copperbelt", "Central", "Southern", "National"];

export type Opportunity = {
  id: string;
  title: string;
  category: Exclude<Category, "All">;
  organisation: string;
  region: string;
  mode: string;
  verified: boolean;
  closesInDays: number;
  value: string;
  valueUnit: string;
  source: string;
  applyMethod: string;
  reference: string;
  summary: string;
  requirements: string[];
  postedAgo: string;
};

export const OPPORTUNITIES: Opportunity[] = [
  {
    id: "senior-data-analyst-mfumu",
    title: "Senior Data Analyst",
    category: "Jobs",
    organisation: "Mfumu Analytics",
    region: "Lusaka",
    mode: "Hybrid",
    verified: true,
    closesInDays: 2,
    value: "K 12,500",
    valueUnit: "/month",
    source: "mfumu-analytics.zm/careers",
    applyMethod: "Employer careers portal — mfumu-analytics.zm/careers",
    reference: "MFA-2026-041",
    summary:
      "Lead reporting and analytics for a Lusaka-based data consultancy serving mining, banking and public-sector clients.",
    requirements: [
      "Degree in Statistics, Computer Science, Economics or related field",
      "4+ years working with SQL and a BI tool",
      "Experience presenting insight to non-technical stakeholders",
    ],
    postedAgo: "2 days ago",
  },
  {
    id: "commonwealth-postgraduate-award",
    title: "Commonwealth Postgraduate Award — MSc Engineering",
    category: "Scholarships",
    organisation: "Commonwealth Scholarship Commission",
    region: "National",
    mode: "Full-time",
    verified: true,
    closesInDays: 9,
    value: "Full",
    valueUnit: "funded",
    source: "cscuk.ac.uk",
    applyMethod: "Online application on the Commonwealth Scholarship Commission portal",
    reference: "CSC-MSC-26",
    summary:
      "Fully funded postgraduate study in the United Kingdom for Zambian engineering graduates with a strong development focus.",
    requirements: [
      "First-class or upper second-class undergraduate degree",
      "Zambian citizenship or permanent residency",
      "Development impact statement",
    ],
    postedAgo: "5 days ago",
  },
  {
    id: "women-led-agribusiness-grant",
    title: "Women-Led Agribusiness Seed Grant",
    category: "Grants",
    organisation: "Chobe Foundation",
    region: "National",
    mode: "Remote",
    verified: false,
    closesInDays: 14,
    value: "K 50,000",
    valueUnit: "grant",
    source: "chobefoundation.org",
    applyMethod: "Application pack downloaded from the foundation website",
    reference: "CHF-AGR-12",
    summary:
      "Seed funding and mentorship for women-led agribusinesses processing local produce for regional markets.",
    requirements: [
      "Registered Zambian business with majority female ownership",
      "Trading for at least 12 months",
      "Two-year growth plan",
    ],
    postedAgo: "1 week ago",
  },
  {
    id: "engineering-intern-zambezi",
    title: "Engineering Intern — Civil Structures",
    category: "Internships",
    organisation: "Zambezi Build Co.",
    region: "Copperbelt",
    mode: "On-site",
    verified: true,
    closesInDays: 21,
    value: "K 2,000",
    valueUnit: "/month",
    source: "zambezibuild.co.zm/jobs",
    applyMethod:
      "Email CV and cover letter to the employer recruitment address listed on their site",
    reference: "ZBC-INT-08",
    summary:
      "Six-month structured internship on active civil works in Kitwe, supervised by chartered engineers.",
    requirements: [
      "Final-year or recently graduated civil engineering student",
      "Willing to relocate to Kitwe",
      "Basic AutoCAD competence",
    ],
    postedAgo: "3 days ago",
  },
  {
    id: "solar-units-tender-moh",
    title: "Supply of Solar Units — District Health Posts",
    category: "Tenders",
    organisation: "Ministry of Health",
    region: "National",
    mode: "Public",
    verified: true,
    closesInDays: 5,
    value: "K 1.2M",
    valueUnit: "contract",
    source: "health.gov.zm/tenders",
    applyMethod: "Sealed bid submission per the tender document instructions",
    reference: "MOH-SOL-2026-3",
    summary:
      "Supply and installation of off-grid solar systems across 42 rural health posts in four provinces.",
    requirements: [
      "ZPPA registration in the relevant category",
      "Proof of similar completed contracts",
      "Bid security as specified",
    ],
    postedAgo: "1 day ago",
  },
  {
    id: "digital-skills-training-lusaka",
    title: "Digital Skills Bootcamp — Data & Cloud",
    category: "Training",
    organisation: "Lusaka Skills Institute",
    region: "Lusaka",
    mode: "Evening",
    verified: true,
    closesInDays: 11,
    value: "K 1,800",
    valueUnit: "course fee",
    source: "lusakaskills.zm/programmes",
    applyMethod: "Enrolment form on the institute website",
    reference: "LSI-DSC-14",
    summary:
      "Twelve-week practical bootcamp in spreadsheets, SQL and cloud fundamentals for early-career professionals.",
    requirements: ["Grade 12 certificate", "Own laptop", "Evening availability"],
    postedAgo: "4 days ago",
  },
  {
    id: "programme-officer-ngo",
    title: "Programme Officer — Youth Livelihoods",
    category: "Jobs",
    organisation: "Kalulu Development Trust",
    region: "Central",
    mode: "On-site",
    verified: true,
    closesInDays: 8,
    value: "K 18,000",
    valueUnit: "/month",
    source: "kalulutrust.org/vacancies",
    applyMethod: "Employer online vacancy form",
    reference: "KDT-PO-26",
    summary:
      "Coordinate youth livelihood programming across Central Province, including partner management and reporting.",
    requirements: [
      "Degree in Development Studies or Social Sciences",
      "3+ years NGO programme experience",
      "Valid driving licence",
    ],
    postedAgo: "6 days ago",
  },
  {
    id: "graduate-trainee-bank",
    title: "Graduate Trainee Programme 2026",
    category: "Internships",
    organisation: "Zambezi Commercial Bank",
    region: "Lusaka",
    mode: "Full-time",
    verified: true,
    closesInDays: 17,
    value: "K 6,500",
    valueUnit: "/month",
    source: "zcb.co.zm/graduates",
    applyMethod: "Graduate portal application with academic transcripts",
    reference: "ZCB-GT-26",
    summary:
      "An 18-month rotation across retail, risk and operations for high-performing recent graduates.",
    requirements: [
      "Merit or distinction degree completed within 2 years",
      "Under 27 years of age",
      "Strong numeracy",
    ],
    postedAgo: "2 days ago",
  },
];

export type ServiceItem = {
  slug: string;
  name: string;
  price: string;
  turnaround: string;
  description: string;
  includes: string[];
};

export const SERVICES: ServiceItem[] = [
  {
    slug: "cv-writing",
    name: "Professional CV Writing",
    price: "K 350",
    turnaround: "3 working days",
    description:
      "A recruiter-ready CV rewritten around your target roles, with clear achievements and ATS-friendly structure.",
    includes: ["Consultation call", "Two revisions", "PDF and editable file"],
  },
  {
    slug: "cover-letter",
    name: "Tailored Cover Letter",
    price: "K 180",
    turnaround: "2 working days",
    description:
      "A focused letter written for one specific vacancy, matched to the employer's stated requirements.",
    includes: ["Role analysis", "One revision", "PDF and editable file"],
  },
  {
    slug: "interview-coaching",
    name: "Interview Coaching",
    price: "K 400",
    turnaround: "Scheduled session",
    description:
      "A structured 90-minute mock interview with written feedback on answers, framing and delivery.",
    includes: ["Mock interview", "Written feedback", "Follow-up question bank"],
  },
  {
    slug: "linkedin-profile",
    name: "LinkedIn Profile Optimisation",
    price: "K 300",
    turnaround: "3 working days",
    description:
      "Headline, About section and experience rewritten so recruiters searching your field actually find you.",
    includes: ["Keyword research", "Full profile rewrite", "One revision"],
  },
  {
    slug: "business-profile",
    name: "Company & Business Profile",
    price: "K 900",
    turnaround: "5 working days",
    description:
      "A polished organisational profile for SMEs bidding for contracts, grants and partnerships.",
    includes: ["Discovery session", "Designed document", "Two revisions"],
  },
  {
    slug: "recruitment-support",
    name: "Recruitment Support for Employers",
    price: "On request",
    turnaround: "Agreed per engagement",
    description:
      "Sourcing, screening and shortlisting managed by EOZ for organisations hiring in Zambia.",
    includes: ["Role scoping", "Screened shortlist", "Interview coordination"],
  },
  {
    slug: "career-guidance",
    name: "Career Guidance & Application Support",
    price: "K 250",
    turnaround: "60-minute session",
    description:
      "Practical guidance on role targeting, applications and next steps for students, graduates and professionals.",
    includes: ["Career direction session", "Application review", "Action plan"],
  },
  {
    slug: "marketing-promotion",
    name: "Marketing & Business Promotion",
    price: "From K 600",
    turnaround: "Agreed per campaign",
    description:
      "Promote a business, service or opportunity to relevant EOZ audiences through planned content distribution.",
    includes: ["Campaign scoping", "Channel-ready copy", "Distribution report"],
  },
  {
    slug: "skills-training",
    name: "Capacity Building & Skills Training",
    price: "From K 1,500",
    turnaround: "Agreed per programme",
    description:
      "Practical workshops and training programmes that build employability, workplace and business capability.",
    includes: ["Needs assessment", "Facilitated session", "Participant resources"],
  },
];

export const APPLICATIONS = [
  {
    id: "app-1",
    role: "Senior Data Analyst",
    organisation: "Mfumu Analytics",
    stage: 2,
    status: "In review",
    channel: "mfumu-analytics.zm/careers",
    updated: "Updated 2 days ago",
  },
  {
    id: "app-2",
    role: "Graduate Trainee Programme 2026",
    organisation: "Zambezi Commercial Bank",
    stage: 1,
    status: "Submitted",
    channel: "zcb.co.zm/graduates",
    updated: "Updated today",
  },
  {
    id: "app-3",
    role: "Commonwealth Postgraduate Award",
    organisation: "Commonwealth Scholarship Commission",
    stage: 3,
    status: "Interview",
    channel: "cscuk.ac.uk",
    updated: "Updated 4 days ago",
  },
];

export const APPLICATION_STAGES = ["Drafted", "Submitted", "In review", "Interview", "Decision"];

export const MODERATION_QUEUE = [
  {
    id: "mod-1",
    title: "Women-Led Agribusiness Seed Grant",
    organisation: "Chobe Foundation",
    state: "PENDING_REVIEW",
    submitted: "2 hours ago",
    flag: "Source not yet verified",
  },
  {
    id: "mod-2",
    title: "Warehouse Supervisor — Ndola",
    organisation: "Copper Logistics Ltd",
    state: "PENDING_REVIEW",
    submitted: "5 hours ago",
    flag: "Missing official application method",
  },
  {
    id: "mod-3",
    title: "Teacher — Mathematics (Grade 10-12)",
    organisation: "Chainama Secondary",
    state: "APPROVED",
    submitted: "Yesterday",
    flag: "Scheduled for publication",
  },
  {
    id: "mod-4",
    title: "Consultancy — Baseline Survey",
    organisation: "Kalulu Development Trust",
    state: "DRAFT",
    submitted: "Yesterday",
    flag: "Awaiting deadline confirmation",
  },
];

export const ORGANISATIONS = [
  { id: "org-1", name: "Mfumu Analytics", state: "VERIFIED", posts: 12, contact: "People Office" },
  { id: "org-2", name: "Zambezi Build Co.", state: "VERIFIED", posts: 7, contact: "HR Department" },
  {
    id: "org-3",
    name: "Chobe Foundation",
    state: "UNDER_REVIEW",
    posts: 3,
    contact: "Grants Desk",
  },
  { id: "org-4", name: "Copper Logistics Ltd", state: "PENDING", posts: 1, contact: "Operations" },
  {
    id: "org-5",
    name: "Kalulu Development Trust",
    state: "VERIFIED",
    posts: 9,
    contact: "Programmes",
  },
];

export const USERS = [
  {
    id: "u-1",
    name: "Chanda Mwansa",
    email: "chanda@example.zm",
    role: "CANDIDATE",
    state: "Active",
  },
  {
    id: "u-2",
    name: "Natasha Phiri",
    email: "natasha@mfumu.zm",
    role: "EMPLOYER",
    state: "Active",
  },
  { id: "u-3", name: "Joseph Banda", email: "joseph@eoz.zm", role: "STAFF", state: "Active" },
  { id: "u-4", name: "Mutale Zulu", email: "mutale@eoz.zm", role: "ADMIN", state: "Active" },
  {
    id: "u-5",
    name: "Grace Tembo",
    email: "grace@example.zm",
    role: "CANDIDATE",
    state: "Suspended",
  },
  { id: "u-6", name: "Audit Service", email: "audit@eoz.zm", role: "AUDITOR", state: "Active" },
];

export const AUDIT_EVENTS = [
  {
    id: "a-1",
    actor: "Joseph Banda",
    action: "APPROVED opportunity MFA-2026-041",
    at: "Today 09:12 UTC",
  },
  {
    id: "a-2",
    actor: "Mutale Zulu",
    action: "GRANTED role STAFF to Joseph Banda",
    at: "Yesterday 16:40 UTC",
  },
  {
    id: "a-3",
    actor: "Natasha Phiri",
    action: "SUBMITTED opportunity for review",
    at: "Yesterday 11:05 UTC",
  },
  {
    id: "a-4",
    actor: "System",
    action: "EXPIRED 6 opportunities past deadline",
    at: "Yesterday 00:00 UTC",
  },
];

export function categoryOf(id: string) {
  return OPPORTUNITIES.find((o) => o.id === id);
}

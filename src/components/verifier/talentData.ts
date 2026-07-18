// Monorepo frontend/src/mock/data.js → TALENT_FEED + SKILL_CATEGORIES,
// imported verbatim for the Find Talent tab. Used as the guaranteed-nonempty
// fallback when /v1/talent/search returns nothing (monorepo TalentSearch
// behavior: "the tab is never empty").

export interface TalentProfile {
  id: string;
  name: string;
  country: string;
  flag: string;
  headline: string;
  academicStatus: "in_school" | "nysc" | "graduate" | "professional";
  yearOfStudy: number | null;
  university: string;
  course: string;
  credScore: number;
  highestTier: string;
  globalTrustPass: boolean;
  skillCategories: string[];
  skillTags: string[];
  verified: Array<{
    title: string;
    issuer: string;
    tier: string;
    compositeWeight: number;
    onChain: boolean;
    skillCategory: string;
    skillTags: string[];
  }>;
  sandbox: string[];
  deliveries: number;
  totalEarnedSOL: number;
  ratingAvg?: number;
  ratingCount?: number;
  location: { city: string; country: string };
  discoverable?: boolean;
}

export const TALENT_FEED: TalentProfile[] = [
  {
    id: "stu_amaka",
    name: "Amaka Okeke",
    country: "NG",
    flag: "🇳🇬",
    headline: "Backend engineer building scalable APIs — 300 Level, Univ. of Nsukka",
    academicStatus: "in_school",
    yearOfStudy: 3,
    university: "University of Nigeria, Nsukka",
    course: "Computer Science",
    credScore: 641,
    highestTier: "practitioner",
    globalTrustPass: false,
    skillCategories: ["Backend", "APIs"],
    skillTags: ["Node.js", "PostgreSQL", "REST APIs", "Paystack Integration", "Express"],
    verified: [
      {
        title: "Backend Dev Bootcamp Certificate",
        issuer: "Decagon Institute",
        tier: "practitioner",
        compositeWeight: 0.72,
        onChain: true,
        skillCategory: "Backend",
        skillTags: ["Node.js", "PostgreSQL", "REST APIs"],
      },
      {
        title: "Micro-Bounty — Payments API (Paystack)",
        issuer: "Paystack",
        tier: "practitioner",
        compositeWeight: 0.65,
        onChain: true,
        skillCategory: "Backend",
        skillTags: ["Paystack Integration", "Node.js"],
      },
    ],
    sandbox: ["Rust (self-taught)", "Personal GitHub: ledger-db"],
    deliveries: 3,
    totalEarnedSOL: 1.4,
    location: { city: "Nsukka", country: "NG" },
  },
  {
    id: "stu_tunde",
    name: "Tunde Afolabi",
    country: "NG",
    flag: "🇳🇬",
    headline: "UI/UX Designer who ships in Figma and Framer — 200 Level, LASU",
    academicStatus: "in_school",
    yearOfStudy: 2,
    university: "Lagos State University",
    course: "Industrial Design",
    credScore: 487,
    highestTier: "practitioner",
    globalTrustPass: false,
    skillCategories: ["Design", "UI/UX"],
    skillTags: ["Figma", "Framer Motion", "Prototyping", "User Research", "Design Systems"],
    verified: [
      {
        title: "Google UX Design Certificate",
        issuer: "Google / Coursera",
        tier: "practitioner",
        compositeWeight: 0.68,
        onChain: true,
        skillCategory: "Design",
        skillTags: ["Figma", "Prototyping", "User Research"],
      },
    ],
    sandbox: ["Figma (100+ hrs)", "Framer Motion"],
    deliveries: 1,
    totalEarnedSOL: 0.3,
    location: { city: "Lagos", country: "NG" },
  },
  {
    id: "stu_fatima",
    name: "Fatima Musa",
    country: "NG",
    flag: "🇳🇬",
    headline: "Data analyst · SQL, Python, Power BI · NYSC, Abuja",
    academicStatus: "nysc",
    yearOfStudy: null,
    university: "Ahmadu Bello University",
    course: "Statistics",
    credScore: 712,
    highestTier: "proven_practitioner",
    globalTrustPass: true,
    skillCategories: ["Data", "Analytics"],
    skillTags: ["SQL", "Python", "Power BI", "Tableau", "Data Cleaning", "Statistical Analysis"],
    verified: [
      {
        title: "B.Sc Statistics",
        issuer: "Ahmadu Bello University",
        tier: "proven_practitioner",
        compositeWeight: 0.78,
        onChain: true,
        skillCategory: "Data",
        skillTags: ["Statistical Analysis", "R", "SPSS"],
      },
      {
        title: "Data Analysis Nanodegree",
        issuer: "Udacity",
        tier: "practitioner",
        compositeWeight: 0.65,
        onChain: true,
        skillCategory: "Data",
        skillTags: ["Python", "SQL", "Data Cleaning", "Pandas"],
      },
      {
        title: "Micro-Bounty — SQL Reconciliation (Flutterwave)",
        issuer: "Flutterwave",
        tier: "practitioner",
        compositeWeight: 0.6,
        onChain: true,
        skillCategory: "Data",
        skillTags: ["SQL", "Financial Data"],
      },
    ],
    sandbox: ["Tableau", "Power BI"],
    deliveries: 7,
    totalEarnedSOL: 4.2,
    location: { city: "Abuja", country: "NG" },
  },
  {
    id: "stu_chidi",
    name: "Chidi Nwosu",
    country: "NG",
    flag: "🇳🇬",
    headline: "Full-stack developer · React + Node.js · 400 Level, Covenant University",
    academicStatus: "in_school",
    yearOfStudy: 4,
    university: "Covenant University",
    course: "Computer Science",
    credScore: 763,
    highestTier: "proven_practitioner",
    globalTrustPass: true,
    skillCategories: ["Frontend", "Backend", "Full-stack"],
    skillTags: ["React", "Node.js", "TypeScript", "MongoDB", "Docker", "Web3.js", "REST APIs"],
    verified: [
      {
        title: "HND Computer Science (in progress)",
        issuer: "Covenant University",
        tier: "practitioner",
        compositeWeight: 0.55,
        onChain: true,
        skillCategory: "Full-stack",
        skillTags: ["Algorithms", "Data Structures", "Java"],
      },
      {
        title: "Meta React Developer Certificate",
        issuer: "Meta / Coursera",
        tier: "practitioner",
        compositeWeight: 0.72,
        onChain: true,
        skillCategory: "Frontend",
        skillTags: ["React", "TypeScript", "Jest"],
      },
      {
        title: "Hackathon Winner — Lagos DevFest 2026",
        issuer: "Lagos DevFest",
        tier: "practitioner",
        compositeWeight: 0.65,
        onChain: true,
        skillCategory: "Full-stack",
        skillTags: ["Node.js", "MongoDB", "Docker"],
      },
    ],
    sandbox: ["Docker", "Web3.js"],
    deliveries: 11,
    totalEarnedSOL: 7.8,
    location: { city: "Ota", country: "NG" },
  },
  {
    id: "stu_ngozi",
    name: "Ngozi Eze",
    country: "NG",
    flag: "🇳🇬",
    headline: "Technical writer · API docs, developer guides · 100 Level, OAU",
    academicStatus: "in_school",
    yearOfStudy: 1,
    university: "Obafemi Awolowo University",
    course: "English and Literary Studies",
    credScore: 382,
    highestTier: "learner",
    globalTrustPass: false,
    skillCategories: ["Technical Writing", "Content"],
    skillTags: ["Technical Writing", "API Documentation", "Markdown", "Notion", "Developer Guides"],
    verified: [
      {
        title: "Google Technical Writing Certificate",
        issuer: "Google Developers",
        tier: "learner",
        compositeWeight: 0.3,
        onChain: true,
        skillCategory: "Technical Writing",
        skillTags: ["Technical Writing", "API Documentation", "Markdown"],
      },
    ],
    sandbox: ["Notion", "Obsidian", "Developer blogs"],
    deliveries: 0,
    totalEarnedSOL: 0,
    location: { city: "Ile-Ife", country: "NG" },
  },
  {
    id: "stu_maria",
    name: "Maria Santos",
    country: "PH",
    flag: "🇵🇭",
    headline: "Data engineer · Airflow, dbt, BigQuery · Graduate, Cebu",
    academicStatus: "graduate",
    yearOfStudy: null,
    university: "Cebu Institute of Technology",
    course: "Information Systems",
    credScore: 745,
    highestTier: "proven_practitioner",
    globalTrustPass: true,
    skillCategories: ["Data Engineering", "Data"],
    skillTags: ["Apache Airflow", "dbt", "BigQuery", "Python", "ETL", "SQL"],
    verified: [
      {
        title: "B.Sc Information Systems",
        issuer: "Cebu Institute of Technology",
        tier: "proven_practitioner",
        compositeWeight: 0.8,
        onChain: true,
        skillCategory: "Data Engineering",
        skillTags: ["SQL", "Python", "Database Design"],
      },
      {
        title: "Data Engineering Nanodegree",
        issuer: "Eskwelabs",
        tier: "practitioner",
        compositeWeight: 0.65,
        onChain: true,
        skillCategory: "Data Engineering",
        skillTags: ["Apache Airflow", "dbt", "BigQuery"],
      },
    ],
    sandbox: ["Apache Kafka (self-taught)"],
    deliveries: 8,
    totalEarnedSOL: 5.6,
    location: { city: "Cebu City", country: "PH" },
  },
];

export const SKILL_CATEGORIES = [
  "Backend", "Frontend", "Full-stack", "Mobile", "Data", "Data Engineering",
  "Design", "UI/UX", "Technical Writing", "Product Management", "DevOps",
  "Cybersecurity", "Machine Learning", "Content", "Marketing", "Finance",
];

// Country code → flag emoji for the talent card (monorepo COUNTRY_FLAG).
export const COUNTRY_FLAG: Record<string, string> = {
  NG: "🇳🇬", KE: "🇰🇪", GH: "🇬🇭", ZA: "🇿🇦", US: "🇺🇸", GB: "🇬🇧", PH: "🇵🇭",
};

// Adapt a server StudentProfile (populated userId + verifiedSkills) into the
// flat TalentProfile shape the Find Talent cards render (monorepo adaptProfile).
export function adaptProfile(p: any): TalentProfile {
  const user = p.userId && typeof p.userId === "object" ? p.userId : {};
  return {
    id: String(user._id || p.userId || p._id || p.id || ""),
    name: user.name || "Student",
    country: p.location?.country || "",
    flag: COUNTRY_FLAG[p.location?.country] || "",
    headline: p.headline || "",
    academicStatus: p.academicStatus || "in_school",
    yearOfStudy: p.yearOfStudy ?? null,
    university: p.university || "",
    course: p.course || "",
    credScore: p.credScore?.value ?? 300,
    highestTier: p.highestTier || "learner",
    globalTrustPass: Boolean(p.globalTrustPass),
    skillCategories: p.skillCategories || [],
    skillTags: p.skillTags || [],
    verified: (p.verifiedSkills || []).map((c: any) => ({
      title: c.title,
      issuer: c.issuer || "Verified Issuer",
      tier: c.trustTier || "learner",
      compositeWeight: c.compositeWeight || 0.2,
      onChain: Boolean(c.solanaTxSignature || c.txSignature),
      skillCategory: c.skillCategory || "Other",
      skillTags: c.skillTags || [],
    })),
    sandbox: [],
    deliveries: p.deliveryStats?.completed || 0,
    totalEarnedSOL: p.deliveryStats?.totalEarnedSOL || 0,
    ratingAvg: p.ratingAvg || 0,
    ratingCount: p.ratingCount || 0,
    location: p.location || { city: "", country: "" },
    discoverable: true,
  };
}

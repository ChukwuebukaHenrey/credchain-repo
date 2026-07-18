// lib/institutions.ts
// Ports of monorepo's config/countryModules.js + config/institutionTypes.js —
// the Country Verification Module registry (Section 6) and the Generalized
// Polymorphic Onboarding institution types A–E (Section 4.3).
//
// Every country-specific check (education-regulator ID, business registry,
// national ID format, academic domain suffix) lives HERE as per-country
// config — never hardcoded in component logic. Nigeria is the only FULLY
// automated module; other countries fall back to manual review gracefully.

export interface RegistryMeta {
  type: string;
  idLabel: string;
  placeholder: string;
  apiAvailable: boolean;
}

export interface CountryModule {
  countryCode: string;
  countryName: string;
  flag: string;
  currency: string;
  automated: boolean;
  educationRegistry: RegistryMeta;
  businessRegistry: RegistryMeta;
  professionalRegistry: RegistryMeta;
  nationalId: RegistryMeta;
  domainSuffix: string;
}

export const COUNTRY_MODULES: Record<string, CountryModule> = {
  NG: {
    countryCode: "NG",
    countryName: "Nigeria",
    flag: "🇳🇬",
    currency: "NGN",
    automated: true,
    educationRegistry: { type: "JAMB_NUC_OPEID", idLabel: "NUC / JAMB Institution Code", placeholder: "e.g. 0001 (University of Lagos)", apiAvailable: true },
    businessRegistry: { type: "CAC", idLabel: "CAC RC Number", placeholder: "e.g. RC 1234567", apiAvailable: true },
    professionalRegistry: { type: "COREN_MDCN_NMA", idLabel: "Professional Body Registration No.", placeholder: "e.g. COREN R.12345", apiAvailable: true },
    nationalId: { type: "NIN", idLabel: "National Identity Number (NIN)", placeholder: "11-digit NIN", apiAvailable: true },
    domainSuffix: ".edu.ng",
  },
  US: {
    countryCode: "US",
    countryName: "United States",
    flag: "🇺🇸",
    currency: "USD",
    automated: false,
    educationRegistry: { type: "OPEID", idLabel: "OPE ID", placeholder: "e.g. 00123400", apiAvailable: false },
    businessRegistry: { type: "EIN", idLabel: "EIN / State Reg. No.", placeholder: "e.g. 12-3456789", apiAvailable: false },
    professionalRegistry: { type: "STATE_BOARD", idLabel: "State Board License No.", placeholder: "e.g. PE-123456", apiAvailable: false },
    nationalId: { type: "SSN_LAST4", idLabel: "Govt ID (last 4)", placeholder: "last 4 digits", apiAvailable: false },
    domainSuffix: ".edu",
  },
  GB: {
    countryCode: "GB",
    countryName: "United Kingdom",
    flag: "🇬🇧",
    currency: "GBP",
    automated: false,
    educationRegistry: { type: "OFS", idLabel: "OfS Register Number", placeholder: "e.g. 10007783", apiAvailable: false },
    businessRegistry: { type: "COMPANIES_HOUSE", idLabel: "Companies House Number", placeholder: "e.g. 01234567", apiAvailable: false },
    professionalRegistry: { type: "PRO_BODY", idLabel: "Professional Body Reg. No.", placeholder: "e.g. MEng 12345", apiAvailable: false },
    nationalId: { type: "PASSPORT", idLabel: "Passport Number", placeholder: "passport no.", apiAvailable: false },
    domainSuffix: ".ac.uk",
  },
  KE: {
    countryCode: "KE",
    countryName: "Kenya",
    flag: "🇰🇪",
    currency: "KES",
    automated: false,
    educationRegistry: { type: "CUE", idLabel: "CUE Accreditation No.", placeholder: "e.g. CUE/UNI/2020", apiAvailable: false },
    businessRegistry: { type: "BRS", idLabel: "BRS Registration No.", placeholder: "e.g. PVT-ABC123", apiAvailable: false },
    professionalRegistry: { type: "PRO_BODY", idLabel: "Professional Body Reg. No.", placeholder: "reg. no.", apiAvailable: false },
    nationalId: { type: "HUDUMA", idLabel: "Huduma / National ID", placeholder: "ID number", apiAvailable: false },
    domainSuffix: ".ac.ke",
  },
};

export const FALLBACK_MODULE: Omit<CountryModule, "countryCode" | "countryName" | "flag" | "currency"> = {
  automated: false,
  educationRegistry: { type: "MANUAL", idLabel: "Accreditation / Registry ID (if any)", placeholder: "optional", apiAvailable: false },
  businessRegistry: { type: "MANUAL", idLabel: "Business Registration No. (if any)", placeholder: "optional", apiAvailable: false },
  professionalRegistry: { type: "MANUAL", idLabel: "Professional Body Reg. No. (if any)", placeholder: "optional", apiAvailable: false },
  nationalId: { type: "MANUAL", idLabel: "National ID / Passport No.", placeholder: "id / passport", apiAvailable: false },
  domainSuffix: "",
};

export const SUPPORTED_COUNTRIES = [
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "GH", name: "Ghana", flag: "🇬🇭" },
  { code: "KE", name: "Kenya", flag: "🇰🇪" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "EG", name: "Egypt", flag: "🇪🇬" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "PH", name: "Philippines", flag: "🇵🇭" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "OTHER", name: "Other / Not listed", flag: "🌍" },
];

export function getCountryModule(code?: string): CountryModule {
  const mod = COUNTRY_MODULES[code || ""];
  if (mod) return mod;
  return { ...FALLBACK_MODULE, countryCode: code || "OTHER", countryName: "Unconfigured region", flag: "🌍", currency: "" };
}

// ── Institution types A–E (polymorphic onboarding) ─────────────
export interface InstitutionField {
  name: string;
  label: string;
  type: "text" | "email" | "url" | "number" | "registry" | "file";
  placeholder?: string;
  required?: boolean;
  note?: string;
}

export interface InstitutionType {
  key: string;
  backendType: string;
  title: string;
  blurb: string;
  icon: string;
  verifyPath: "domain" | "github" | "manual";
  kyb?: boolean;
  allowConsumerEmail?: boolean;
  fields: InstitutionField[];
}

export const INSTITUTION_TYPES: InstitutionType[] = [
  {
    key: "A",
    backendType: "university",
    title: "Accredited Educational Institution",
    blurb: "Universities, colleges, polytechnics — at any level, in any country.",
    icon: "🎓",
    verifyPath: "domain",
    fields: [
      { name: "orgName", label: "Institution name", type: "text", placeholder: "e.g. University of Lagos", required: true },
      { name: "domainEmail", label: "Official registrar / administrator email", type: "email", placeholder: "registrar@unilag.edu.ng", required: true, note: "Must be on the institution domain — consumer inboxes (Gmail, Yahoo…) are rejected." },
      { name: "registryId", label: "education", type: "registry", required: true },
    ],
  },
  {
    key: "B",
    backendType: "bootcamp",
    title: "Registered Training Provider / Bootcamp",
    blurb: "Bootcamps, private academies, vocational training providers.",
    icon: "🏫",
    verifyPath: "domain",
    kyb: true,
    fields: [
      { name: "orgName", label: "Business / academy name", type: "text", placeholder: "e.g. Decagon Institute Ltd", required: true },
      { name: "domainEmail", label: "Business domain email", type: "email", placeholder: "admin@decagon.dev", required: true, note: "Consumer inboxes are rejected — use your business domain." },
      { name: "registryId", label: "business", type: "registry", required: true },
      { name: "website", label: "Business website", type: "url", placeholder: "https://…", required: true },
      { name: "directorId", label: "Director / principal full name", type: "text", placeholder: "Full legal name", required: true },
      { name: "incorporationDocs", label: "Incorporation document(s)", type: "file", required: true, note: "Certificate of incorporation / business registration. Renders a KYB review frame." },
    ],
  },
  {
    key: "C",
    backendType: "other",
    title: "Hackathon / Event / Informal Organizing Body",
    blurb: "Real, identifiable organizers without formal registry paperwork. Public domains (Gmail) allowed — verified by footprint + review, not a registry lookup.",
    icon: "⚡",
    verifyPath: "manual",
    allowConsumerEmail: true,
    fields: [
      { name: "orgName", label: "Event / organizer name", type: "text", placeholder: "e.g. Lagos DevFest 2026", required: true },
      { name: "contactEmail", label: "Organizer contact email", type: "email", placeholder: "team@…  (Gmail accepted)", required: true },
      { name: "eventPlatformUrl", label: "Event platform URL", type: "url", placeholder: "Devpost / Luma / Eventbrite / social handle", required: true },
      { name: "footprintUrl", label: "Additional public footprint (optional)", type: "url", placeholder: "Past event page, press, socials…", required: false },
    ],
  },
  {
    key: "D",
    backendType: "other",
    title: "Open-Source Community / DAO",
    blurb: "GitHub orgs and DAOs with real contributors. Verified via repo health + confirmed admin rights.",
    icon: "🐙",
    verifyPath: "github",
    fields: [
      { name: "orgName", label: "Community / DAO name", type: "text", placeholder: "e.g. CHAOSS", required: true },
      { name: "githubOrgUrl", label: "GitHub organization / repo URL", type: "url", placeholder: "https://github.com/your-org", required: true },
      { name: "minContributors", label: "Approx. active contributors", type: "number", placeholder: "e.g. 25", required: true, note: "Communities below the contributor threshold route to manual review." },
    ],
  },
  {
    key: "E",
    backendType: "certifier",
    title: "Professional / Certification Body",
    blurb: "Engineering boards, medical councils, language-proficiency bodies — how many countries gate professions.",
    icon: "🏛️",
    verifyPath: "domain",
    fields: [
      { name: "orgName", label: "Body name", type: "text", placeholder: "e.g. Council for the Regulation of Engineering (COREN)", required: true },
      { name: "domainEmail", label: "Official body domain email", type: "email", placeholder: "registrar@coren.gov.ng", required: true, note: "Consumer inboxes are rejected." },
      { name: "registryId", label: "professional", type: "registry", required: true },
    ],
  },
];

export function getInstitutionType(key: string): InstitutionType {
  return INSTITUTION_TYPES.find((t) => t.key === key) || INSTITUTION_TYPES[0];
}

// New issuers — especially Type B/C/E without an automated registry check —
// start at a lower default trust weight and earn upgrades over a clean track
// record. This is the honest answer to the cold-start problem.
export function startingTrustTier(typeKey: string, countryModule: CountryModule) {
  if (typeKey === "A" && countryModule.automated) return { tier: "T2 · Verified", weight: "standard" };
  if (typeKey === "E" && countryModule.automated) return { tier: "T2 · Verified", weight: "standard" };
  return { tier: "T1 · Provisional", weight: "reduced" };
}

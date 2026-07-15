// services/api.ts
// Dual-mode data layer.
//   • USE_MOCK=true  (DEFAULT) → in-browser fixtures, no backend needed.
//     Anyone without the backend (e.g. design work) gets a fully working app.
//   • USE_MOCK=false → real backend. The presenter sets VITE_USE_MOCK=false in
//     their .env; if the live stack ever hiccups, flip it back for an instant
//     safe fallback — no code change, no redeploy.
// LIVE by default now that the backend is wired end-to-end. Set VITE_USE_MOCK=true
// for backend-less design work.
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

// In dev, calls go to "/api" and Vite proxies them to the backend (same-origin,
// no CORS). In prod, set VITE_API_BASE_URL to the deployed backend, e.g.
// "https://api.credchain.io/api".
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

// ─────────────────────────────────────────────────────────────
// ROLE VOCABULARY — single source of truth (locked decision)
// cc-v2's UI speaks candidate / verifier / issuer.
// The backend (JWT claims + RBAC guards) speaks student / employer / issuer.
// We translate at THIS boundary ONLY — no component renames. Anything leaving
// the app is mapped UI→backend; anything arriving is mapped backend→UI, so the
// rest of cc-v2 never sees a backend role string.
// ─────────────────────────────────────────────────────────────
const UI_TO_BACKEND_ROLE: Record<string, string> = { candidate: "student", verifier: "employer", issuer: "issuer" };
const BACKEND_TO_UI_ROLE: Record<string, string> = { student: "candidate", employer: "verifier", issuer: "issuer" };

// Recursively rewrite any `role` field found in a payload using the given map.
// Handles nested objects and arrays; leaves everything else untouched.
function mapRolesDeep(value: any, table: Record<string, string>): any {
  if (Array.isArray(value)) return value.map((v) => mapRolesDeep(v, table));
  if (value && typeof value === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = k === "role" && typeof v === "string" && table[v] ? table[v] : mapRolesDeep(v, table);
    }
    return out;
  }
  return value;
}

export const toBackendRole = (role: string): string => UI_TO_BACKEND_ROLE[role] || role;
export const toUiRole = (role: string): string => BACKEND_TO_UI_ROLE[role] || role;

const mock = {
  candidate: {
    id: "demo-candidate",
    name: "Emeka Obi",
    email: "emeka@example.com",
    photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
    institution: "FUTO",
    field: "Computer Engineering",
    graduationYear: 2026,
    skills: ["Solidity", "React", "Node.js"],
    // Enriched to match backend seed (StudentProfile): CredScore + trust tier +
    // reputation so score gauges / tier badges / vouch gates render with real data.
    credScore: 720,
    tier: "verified",          // learner | verified | trusted | elite
    reputationScore: 64,       // ≥60 → allowed to vouch (backend VOUCH_THRESHOLD)
    // Two-tier trust portfolio: self-declared (sandbox) vs peer-attested skills.
    sandboxSkills: [
      { name: "Rust", category: "Blockchain", tags: ["Rust", "Solana"] },
      { name: "GraphQL", category: "Backend", tags: ["GraphQL", "API"] },
    ],
    attestedSkills: [
      { name: "React.js", category: "Frontend", tags: ["React", "TypeScript"], voucherName: "Tunde Bello", stakedPoints: 10, vouchedAt: "2026-06-20" },
    ],
  },
  credentials: [
    { id: 1, title: "B.Eng Computer Engineering", issuer: "FUTO", status: "verified", year: 2026, txHash: "5f2a9c1d...e8b3" },
    { id: 2, title: "Cisco CCNA", issuer: "NIIT", status: "pending", year: 2025 },
    // Revoked credential — required to demo the dispute flow (backend only lets a
    // REVOKED credential be disputed). Mirrors the seed's revoked row.
    { id: 3, title: "AWS Cloud Practitioner", issuer: "Amazon Web Services", status: "revoked", year: 2025, txHash: "8c1f4b7a...2d9e", revokedReason: "Issuer flagged a certificate-ID mismatch during audit.", dispute: null },
  ],
  notifications: [
    { id: 1, type: "approved", message: "FUTO approved your B.Eng credential", read: false, date: "2026-06-15" },
    { id: 2, type: "denied", message: "FUTO denied your CCNA request — ID mismatch", read: true, date: "2026-06-14" }
  ],
  requests: [
    { id: 1, issuer: "FUTO", credential: "B.Eng Computer Engineering", status: "pending", date: "2026-06-10" },
    { id: 2, issuer: "NIIT", credential: "Cisco CCNA", status: "approved", date: "2026-06-08" }
  ],
  issuerRequests: [
    { id: 1, candidate: "Emeka Obi", matric: "FUT/2023/001", credential: "B.Eng Computer Engineering", status: "pending", date: "2026-06-10" },
    { id: 2, candidate: "Ada Nwosu", matric: "FUT/2023/042", credential: "B.Eng Electrical Engineering", status: "approved", date: "2026-06-08" }
  ],
  verifier: {
    id: "demo-verifier",
    name: "Tunde Bello",
    company: "Paystack",
    email: "tunde@paystack.com"
  },
  publicProfile: {
    candidateId: "demo-candidate",
    name: "Emeka Obi",
    photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
    credentials: [
      { title: "B.Eng Computer Engineering", issuer: "FUTO", verified: true, year: 2026 }
    ]
  },
  qr: {
    qr_image_url: "https://api.qrserver.com/v1/create-qr-code/?data=credchain/verify/demo-candidate&size=200x200"
  },
  resume: {
    resume_html: "<h2>Emeka Obi</h2><p>Computer Engineering graduate from FUTO with skills in Solidity, React and Node.js.</p>"
  },
  // Bounty fixtures — shaped to the backend publicBounty() contract so the Earn
  // screen renders identically whether USE_MOCK is true or the live /api/v1/bounties
  // response is used. Mirrors backend/src/scripts/seed.js bounties.
  bounties: [
    {
      id: "bounty-001", company: "Paystack", companyLogo: "🟢",
      title: "Build a Solana Pay checkout widget", description: "Embeddable React widget that accepts USDC on Solana and confirms payment on-chain.",
      skill: "Solana Development", skillName: "Solana Development", skillCategory: "Blockchain", skillTags: ["Solana", "React", "Web3"],
      reward: "$1,200", rewardUSD: 1200, rewardSOL: 8, tests: 3, requiredTier: "verified", openTo: "All candidates",
      deadline: "2026-07-25", status: "open", escrowConfirmed: true, escrowState: "held", applicantCount: 12,
      awardedCredentialId: null, bountyType: "global", prizes: [{ place: 1, reward: "$1,200" }], winners: [], submissionCount: 12, sponsorVerified: true, reviewDueAt: null, createdAt: "2026-07-05",
      myApplicationStatus: null, myApplicationId: null,
    },
    {
      id: "bounty-002", company: "Flutterwave", companyLogo: "🟠",
      title: "Fraud-detection dashboard (React + charts)", description: "Real-time dashboard surfacing anomalous transactions with filterable charts.",
      skill: "React.js", skillName: "React.js", skillCategory: "Frontend", skillTags: ["React", "TypeScript", "Charts"],
      reward: "$800", rewardUSD: 800, rewardSOL: 5.3, tests: 2, requiredTier: "trusted", openTo: "Trusted+ candidates",
      deadline: "2026-07-20", status: "in_progress", escrowConfirmed: true, escrowState: "held", applicantCount: 7,
      awardedCredentialId: null, bountyType: "assigned", prizes: [], winners: [], submissionCount: 0, sponsorVerified: true, reviewDueAt: null, createdAt: "2026-07-03",
      myApplicationStatus: "applied", myApplicationId: "app-77",
    },
    {
      id: "bounty-003", company: "Andela", companyLogo: "🔵",
      title: "ML model to rank candidate skill-fit", description: "Train and expose an endpoint that scores candidate-to-role fit from verified credentials.",
      skill: "Machine Learning", skillName: "Machine Learning", skillCategory: "Data", skillTags: ["Python", "ML", "FastAPI"],
      reward: "$1,500", rewardUSD: 1500, rewardSOL: 10, tests: 4, requiredTier: "verified", openTo: "All candidates",
      deadline: "2026-08-01", status: "open", escrowConfirmed: true, escrowState: "held", applicantCount: 21,
      awardedCredentialId: null, bountyType: "global", prizes: [{ place: 1, reward: "$1,000" }, { place: 2, reward: "$500" }], winners: [], submissionCount: 21, sponsorVerified: true, reviewDueAt: null, createdAt: "2026-07-08",
      myApplicationStatus: null, myApplicationId: null,
    },
  ],
  issuerRecords: {
    "FUT/2023/001": {
      name: "Emeka Obi",
      course: "Computer Engineering",
      status: "Graduated",
      graduationYear: 2026,
      photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80"
    },
    "FUT/2023/042": {
      name: "Ada Nwosu",
      course: "Electrical Engineering",
      status: "Graduated",
      graduationYear: 2026,
      photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80"
    }
  }
};

async function get(endpoint: string) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: authHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data?.message || `Request failed (${res.status})`), { status: res.status, data });
  // Incoming: map backend roles (student/employer) back to UI roles (candidate/verifier).
  return mapRolesDeep(data, BACKEND_TO_UI_ROLE);
}

async function post(endpoint: string, body: any) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    // Outgoing: map UI roles (candidate/verifier) to backend roles (student/employer).
    body: JSON.stringify(mapRolesDeep(body, UI_TO_BACKEND_ROLE)),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data?.message || `Request failed (${res.status})`), { status: res.status, data });
  return mapRolesDeep(data, BACKEND_TO_UI_ROLE);
}

// Attach the JWT the backend issued at login, if present. cc-v2 stores it under
// "cc_token"; every /api/v1 route is gated, so this must ride on every call.
function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("cc_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getCandidate(id: string) {
  if (USE_MOCK) {
    const storedUserStr = localStorage.getItem("cc_user");
    if (storedUserStr) {
      try {
        const storedUser = JSON.parse(storedUserStr);
        if (storedUser.role === "candidate" || storedUser.email) {
          return {
            id: "custom-candidate",
            name: storedUser.fullName || storedUser.name || "Custom Candidate",
            email: storedUser.email || "candidate@example.com",
            photo: storedUser.photo || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
            institution: storedUser.institution || "FUTO",
            field: storedUser.fieldOfStudy || storedUser.field || "Computer Engineering",
            graduationYear: Number(storedUser.graduationYear) || 2026,
            skills: storedUser.skills || ["Solidity", "React", "Node.js"]
          };
        }
      } catch (e) {
        console.error(e);
      }
    }
    return mock.candidate;
  }
  // Real backend: GET /api/student/:id → { student: { ...profile, credentials } }.
  return get(`/student/${id}`).then((r: any) => r?.student || r);
}
// ── Live paths aligned to the REAL backend contract (backend/src/routes) ──
// Where a real endpoint exists it is used; the mock branch mirrors its shape.
// Endpoints marked MOCK-ONLY have no backend equivalent yet — they resolve from
// mock in either mode so no screen breaks when USE_MOCK=false.
// NOTE: the live branch is coded against the backend SOURCE (not runtime-tested
// here — no DB on this machine). Smoke-test with VITE_USE_MOCK=false before demo.
export async function getCredentials(id: string)       { return USE_MOCK ? mock.credentials       : get(`/student/${id}`).then((r: any) => r?.student?.credentials || []) }
export async function getNotifications(_id: string)    { return mock.notifications }   // MOCK-ONLY: no backend route
export async function getRequests(_id: string)         { return mock.requests }        // MOCK-ONLY: no backend route
export async function getIssuerRequests(_id: string)   { return mock.issuerRequests }  // MOCK-ONLY: no backend route
export async function getPublicProfile(id: string)     { return USE_MOCK ? mock.publicProfile     : get(`/student/profile/${id}`).then((r: any) => r?.profile || r) }
export async function getQRCode(id: string, scope: string = "all") { return mock.qr }  // MOCK-ONLY: QR is generated client-side
// Backend returns a PDF blob (not JSON) from /v1/ai/generate-verified-cv. On live,
// we download it and return a marker the Resume tab can detect.
export async function buildResume(id: string, prompt: string) {
  if (USE_MOCK) return mock.resume;
  const res = await fetch(`${BASE_URL}/v1/ai/generate-verified-cv`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ userId: id }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw Object.assign(new Error(data?.message || `CV generation failed (${res.status})`), { status: res.status });
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "credchain-verified-cv.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return { downloaded: true, resume_html: "<p>Your verified CV (PDF) has been downloaded.</p>" };
}

// ── Earn / Bounties (backend: GET /api/v1/bounties → { success, bounties }) ──
export async function getBounties() {
  if (USE_MOCK) return mock.bounties;
  const res = await get(`/v1/bounties`);
  return res?.bounties || [];
}

// ── Credential accept → on-chain anchor (backend: POST /api/credential/accept/:id) ──
// Returns { success, credential: { txSignature, explorerUrl, status, ... } }.
export async function acceptCredential(credentialId: string) {
  if (USE_MOCK) {
    return { success: true, credential: { id: credentialId, status: "accepted", txSignature: "4Qy3mockZ…tX9pKf2v", explorerUrl: "https://explorer.solana.com/tx/4Qy3mockZtX9pKf2v?cluster=devnet", mock: true } };
  }
  return post(`/credential/accept/${credentialId}`, {});
}

// ── Dispute a revoked credential (backend: POST /api/v1/credential/:id/dispute) ──
// Only a REVOKED credential can be disputed. Returns { dispute: { status:'under_review', reason } }.
export async function disputeCredential(credentialId: string | number, reason: string) {
  if (USE_MOCK) {
    return { success: true, message: "Dispute filed — under independent review.", dispute: { status: "under_review", reason, filedAt: "2026-07-12" } };
  }
  return post(`/v1/credential/${credentialId}/dispute`, { reason });
}

// ── Vouch for a candidate's sandbox skill (backend: POST /api/v1/student/:studentId/sandbox/:skillIndex/vouch) ──
// Voucher stakes 10 reputation (needs reputationScore ≥ 60) to promote a skill sandbox → attested.
export async function vouchSkill(studentId: string, skillIndex: number, voucherName?: string) {
  if (USE_MOCK) {
    return { success: true, message: "Vouch recorded — skill promoted to attested.", attestedSkill: { name: "Rust", category: "Blockchain", voucherName: voucherName || "You", stakedPoints: 10, vouchedAt: "2026-07-12" } };
  }
  return post(`/v1/student/${studentId}/sandbox/${skillIndex}/vouch`, {});
}

export async function signup(payload: any) {
  if (USE_MOCK) {
    return {
      success: true,
      user: {
        id: "user-" + Date.now(),
        name: payload.fullName || payload.instName || payload.companyName || payload.name || "New User",
        email: payload.email || payload.contactEmail || payload.workEmail,
        role: payload.role || "candidate",
        status: payload.role === "candidate" ? "active" : "pending"
      }
    };
  }
  // Real backend: POST /api/auth/register. Returns { success, user, token }.
  // Capture the JWT so authHeaders() can gate the /api/v1 feature routes.
  const res = await post("/auth/register", payload);
  if (res?.token) localStorage.setItem("cc_token", res.token);
  return res;
}

export async function demoLogin(role: string = 'candidate') {
  if (USE_MOCK) {
    return login(role === 'candidate' ? 'emeka@demo.io' : role === 'issuer' ? 'registrar@futo.ng' : 'audit@acme.com');
  }
  // Real backend: POST /api/v1/auth/demo { role } → { success, user, token }.
  const res = await post("/v1/auth/demo", { role });
  if (res?.token) localStorage.setItem("cc_token", res.token);
  return res;
}

export async function login(email: string, password?: string) {
  if (USE_MOCK) {
    const storedUserStr = localStorage.getItem("cc_user");
    if (storedUserStr) {
      try {
        const storedUser = JSON.parse(storedUserStr);
        if (storedUser.email === email || storedUser.contactEmail === email || storedUser.workEmail === email) {
          return {
            success: true,
            user: {
              id: storedUser.role === "candidate" ? "custom-candidate" : storedUser.role === "issuer" ? "custom-issuer" : "custom-verifier",
              name: storedUser.fullName || storedUser.instName || storedUser.name || "Custom User",
              email,
              role: storedUser.role,
              status: "active"
            }
          };
        }
      } catch (e) {
        console.error(e);
      }
    }

    let role = "candidate";
    let name = "Emeka Obi";
    if (email.includes("issuer") || email.includes("futo")) {
      role = "issuer";
      name = "Federal University of Technology Owerri";
    } else if (email.includes("verifier") || email.includes("paystack") || email.includes("tunde")) {
      role = "verifier";
      name = "Tunde Bello";
    }
    return {
      success: true,
      user: {
        id: role === "candidate" ? "demo-candidate" : role === "issuer" ? "demo-issuer" : "demo-verifier",
        name,
        email,
        role,
        status: "active"
      }
    };
  }
  // Real backend: POST /api/auth/login. Returns { success, user, token }.
  const res = await post("/auth/login", { email, password });
  if (res?.token) localStorage.setItem("cc_token", res.token);
  return res;
}

export async function verifyMatch(candidateData: any, issuerDocId: string) {
  if (USE_MOCK) {
    return { matchScore: 0.97, mismatches: [] };
  }
  return post(`/credentials/verify-match`, { candidateData, issuerDocId });
}

export async function issueCredential(requestId: any, candidateId: any, issuerId: any) {
  if (USE_MOCK) {
    return { success: true, txHash: "5f2a9c1d...e8b3", status: "confirmed" };
  }
  // Real backend: POST /api/issuer/issueCredential { title, issuer, studentId }.
  return post(`/issuer/issueCredential`, { requestId, studentId: candidateId, issuerId });
}

export function getIssuerRecord(matric: string) {
  return (mock.issuerRecords as any)[matric] || null;
}

const WHITELISTED_INSTITUTIONS_MOCK = [
  "Federal University of Technology Owerri (FUTO)",
  "University of Lagos (UNILAG)",
  "University of Nigeria Nsukka (UNN)",
  "Obafemi Awolowo University (OAU)",
  "Ahmadu Bello University (ABU)",
  "University of Ibadan (UI)",
  "Lagos State University (LASU)",
  "Covenant University",
  "Babcock University",
  "Pan-Atlantic University (PAU)"
];

export async function getWhitelistedInstitutions(): Promise<string[]> {
  if (USE_MOCK) return WHITELISTED_INSTITUTIONS_MOCK;
  // Real backend: GET /api/v1/issuers/directory (authed) → { issuers: [{ name, ... }] }.
  const res = await get(`/v1/issuers/directory`);
  const list = res?.issuers || res || [];
  return Array.isArray(list) ? list.map((i: any) => (typeof i === "string" ? i : i.name)) : WHITELISTED_INSTITUTIONS_MOCK;
}

// ═════════════════════════════════════════════════════════════════════════
// FULL BACKEND SURFACE (added for live integration; mirrors monorepo
// frontend/src/services/api.js against backend/src/routes/{api,v1}.js).
// All mock branches keep the app demoable without the backend.
// ═════════════════════════════════════════════════════════════════════════

const ok = (extra: any = {}) => Promise.resolve({ success: true, mock: true, ...extra });

// ── Student portfolio (two-tier ledger: verified + sandbox + attested) ──
export async function getStudentPortfolio(userId: string) {
  if (USE_MOCK) return { success: true, portfolio: { verifiedSkills: mock.credentials, sandboxSkills: mock.candidate.sandboxSkills, attestedSkills: mock.candidate.attestedSkills, credScore: { total: mock.candidate.credScore }, highestTier: mock.candidate.tier } };
  return get(`/v1/student/${userId}/portfolio`);
}
export async function addSandboxSkill(skillName: string, source?: string, link?: string) {
  if (USE_MOCK) return ok({ skill: { skillName, source, link } });
  return post(`/v1/student/sandbox-skill`, { skillName, source, link });
}
export async function rejectCredential(credentialId: string) {
  if (USE_MOCK) return ok({ credential: { id: credentialId, status: "rejected" } });
  return post(`/credential/reject/${credentialId}`, {});
}
export async function disputeAttestation(studentId: string, attestedIndex: number, reason: string) {
  if (USE_MOCK) return ok({ message: "Attestation dispute filed." });
  return post(`/v1/attested/${studentId}/${attestedIndex}/dispute`, { reason });
}
export async function updateStudentProfile(payload: any) {
  if (USE_MOCK) return ok();
  // Real backend: PUT /api/student/profile { id, bio?, skills?, links? }.
  const res = await fetch(`${BASE_URL}/student/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data?.message || `Request failed (${res.status})`), { status: res.status });
  return data;
}
export async function requestInstitution(institutionName: string, website?: string, note?: string) {
  if (USE_MOCK) return ok({ message: "Request logged — we notify you when they join." });
  return post(`/v1/issuers/directory/request`, { institutionName, website, note });
}

// ── Bounty lifecycle (student side) ──
export async function applyToBounty(bountyId: string, message?: string) {
  if (USE_MOCK) return ok({ application: { id: "app-" + bountyId, status: "applied" } });
  return post(`/v1/bounties/${bountyId}/apply`, { message });
}
export async function getMyApplications() {
  if (USE_MOCK) return { success: true, applications: [] };
  return get(`/v1/bounties/applications/mine`);
}
export async function respondToDirectTask(bountyId: string, decision: "accept" | "decline") {
  if (USE_MOCK) return ok();
  return post(`/v1/bounties/${bountyId}/respond`, { decision });
}
export async function submitDelivery(bountyId: string, appId: string, text: string, links: string[] = []) {
  if (USE_MOCK) return ok();
  return post(`/v1/bounties/${bountyId}/applications/${appId}/deliver`, { text, links });
}
export async function rateCounterparty(bountyId: string, appId: string, stars: number, comment?: string) {
  if (USE_MOCK) return ok();
  return post(`/v1/bounties/${bountyId}/applications/${appId}/rate`, { stars, comment });
}
export async function submitToGlobalBounty(bountyId: string, text: string, links: string[] = []) {
  if (USE_MOCK) return ok();
  return post(`/v1/bounties/${bountyId}/submit`, { text, links });
}
export async function listGlobalBounties() {
  if (USE_MOCK) return { success: true, bounties: mock.bounties.filter((b: any) => b.bountyType === "global") };
  return get(`/v1/bounties/global`);
}
export async function getLeaderboard() {
  if (USE_MOCK) return { success: true, leaderboard: [] };
  return get(`/v1/bounties/leaderboard`);
}

// ── Bounty lifecycle (employer/verifier side) ──
export async function createBounty(payload: any) {
  if (USE_MOCK) return ok({ bounty: { id: "bounty-" + Date.now(), ...payload, status: "open" } });
  return post(`/v1/bounties`, payload);
}
export async function getMyBounties() {
  if (USE_MOCK) return { success: true, bounties: mock.bounties };
  return get(`/v1/bounties/mine`);
}
export async function createDirectTask(payload: any) {
  if (USE_MOCK) return ok();
  return post(`/v1/bounties/direct`, payload);
}
export async function createGlobalBounty(payload: any) {
  if (USE_MOCK) return ok();
  return post(`/v1/bounties/global`, payload);
}
export async function getBountyApplicants(bountyId: string) {
  if (USE_MOCK) return { success: true, applications: [] };
  return get(`/v1/bounties/${bountyId}/applications`);
}
export async function acceptApplicant(bountyId: string, appId: string) {
  if (USE_MOCK) return ok();
  return post(`/v1/bounties/${bountyId}/applications/${appId}/accept`, {});
}
export async function confirmDelivery(bountyId: string, appId: string) {
  if (USE_MOCK) return ok();
  return post(`/v1/bounties/${bountyId}/applications/${appId}/confirm`, {});
}
export async function cancelBounty(bountyId: string) {
  if (USE_MOCK) return ok();
  return post(`/v1/bounties/${bountyId}/cancel`, {});
}
export async function getGlobalSubmissions(bountyId: string) {
  if (USE_MOCK) return { success: true, submissions: [] };
  return get(`/v1/bounties/${bountyId}/submissions`);
}
export async function selectWinners(bountyId: string, winners: any[]) {
  if (USE_MOCK) return ok();
  return post(`/v1/bounties/${bountyId}/select-winners`, { winners });
}

// ── Talent (employer/verifier) ──
export async function searchTalent(params: Record<string, any> = {}) {
  if (USE_MOCK) return { success: true, results: [], total: 0 };
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== "") as any).toString();
  return get(`/v1/talent/search${qs ? `?${qs}` : ""}`);
}
export async function getTalentFeed() {
  if (USE_MOCK) return { success: true, students: [], chatCreditsRemaining: 50 };
  return get(`/v1/employer/talent-feed`);
}

// ── Chat (credit-gated, v1) ──
export async function getChatRooms() {
  if (USE_MOCK) return { success: true, rooms: [] };
  return get(`/v1/chat/rooms`);
}
export async function initializeChat(recipientId: string, contextCredentialId?: string, text?: string) {
  if (USE_MOCK) return ok({ room: { id: "room-1", isUnlocked: false } });
  return post(`/v1/chat/initialize`, { recipientId, contextCredentialId, text });
}
export async function sendChatMessageV1(roomId: string, text: string) {
  if (USE_MOCK) return ok();
  return post(`/v1/chat/${roomId}/message`, { text });
}

// ── Issuer funnel + issuance (v1) ──
export async function registerIssuerStepOne(institutionType: string) {
  if (USE_MOCK) return ok({ status: "domain_pending", dnsChallengeToken: "credchain-verify=mock123" });
  return post(`/v1/issuer/register-step-one`, { institutionType });
}
export async function verifyIssuerDomain() {
  if (USE_MOCK) return ok({ status: "kyc_pending" });
  return post(`/v1/issuer/verify-domain`, {});
}
export async function submitIssuerKyc(payload: any = {}) {
  // Backend funnel vocab: applied → domain_verified → identity_checked → active.
  if (USE_MOCK) return ok({ status: "identity_checked" });
  return post(`/v1/issuer/kyc/submit`, payload);
}
export async function issueVerifiedCredential(payload: { title: string; recipientEmail?: string; studentId?: string; requestedTier?: string; skillName?: string; skillCategory?: string; skillTags?: string[] }) {
  if (USE_MOCK) return ok({ credential: { id: "cred-" + Date.now(), ...payload, status: "pending" } });
  return post(`/v1/issuer/credentials`, payload);
}
export async function revokeCredential(credentialId: string) {
  if (USE_MOCK) return ok({ credential: { id: credentialId, status: "revoked" } });
  return post(`/v1/credential/${credentialId}/revoke`, {});
}
export async function bulkUploadCredentials(csv: string) {
  if (USE_MOCK) return ok({ jobId: "job-mock", total: 3 });
  return post(`/v1/issuer/credentials/bulk`, { csv });
}
export async function getBulkJob(jobId: string) {
  if (USE_MOCK) return { success: true, job: { jobId, status: "complete", percent: 100 } };
  return get(`/v1/issuer/bulk/${jobId}`);
}

// ── Fraud / disputes / admin queues ──
export async function reportCredentialFraud(credentialId: string, reason: string) {
  if (USE_MOCK) return ok();
  return post(`/v1/credential/${credentialId}/report-fraud`, { reason });
}
export async function getAdminIssuers() {
  if (USE_MOCK) return { success: true, issuers: [] };
  return get(`/v1/admin/issuers`);
}
export async function registryCrossMatch(userId: string, matched: boolean, notes?: string) {
  if (USE_MOCK) return ok();
  return post(`/v1/issuer/registry-cross-match`, { userId, matched, notes });
}
export async function listDisputes() {
  if (USE_MOCK) return { success: true, disputes: [] };
  return get(`/v1/admin/disputes`);
}
export async function resolveDispute(disputeId: string, decision: string, notes?: string) {
  if (USE_MOCK) return ok();
  return post(`/v1/admin/disputes/${disputeId}/resolve`, { decision, notes });
}
export async function listFraudReports() {
  if (USE_MOCK) return { success: true, reports: [] };
  return get(`/v1/admin/fraud-reports`);
}
export async function resolveFraudReport(reportId: string, decision: string, notes?: string) {
  if (USE_MOCK) return ok();
  return post(`/v1/admin/fraud-reports/${reportId}/resolve`, { decision, notes });
}
export async function getInstitutionRequests() {
  if (USE_MOCK) return { success: true, requests: [] };
  return get(`/v1/admin/institution-requests`);
}
export async function resolveInstitutionRequest(requestId: string, status: string) {
  if (USE_MOCK) return ok();
  return post(`/v1/admin/institution-requests/${requestId}/resolve`, { status });
}

// ── Misc ──
export async function healthCheck() {
  return get(`/v1/health`);
}
export async function syncTelemetry() {
  if (USE_MOCK) return ok();
  return post(`/v1/ai/sync-telemetry`, {});
}
// Public live-status SVG badge for a credential (usable in <img src>).
export function badgeUrl(credentialId: string) {
  return `${BASE_URL}/v1/badge/${credentialId}`;
}
// Google OAuth entry — full-page navigation, not XHR.
export function googleAuthUrl(role: string = "candidate") {
  return `${BASE_URL}/v1/auth/google?role=${encodeURIComponent(toBackendRole(role))}`;
}


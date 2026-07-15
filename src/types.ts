export type Role = 'candidate' | 'verifier' | 'issuer';
export type BackendRole = 'student' | 'employer' | 'issuer';

export interface User {
  id: string;
  role: Role;
  email: string;
  name: string;
  credchainId?: string;
  photo?: string;
  // Optional fields for different roles
  institution?: string;
  field?: string;
  company?: string;
}

export interface Credential {
  id: string;
  candidateName: string;
  institution: string;
  credentialTitle: string;
  gpaOrHonors?: string;
  issueDate: string;
  txHash: string;
  blockNumber: number;
  status: 'VERIFIED' | 'PENDING' | 'REVOKED';
  network: string;
  qrCodeUrl?: string;
}

export interface Stats {
  issuedCount: number;
  institutionsCount: number;
  verificationTime: string;
  fraudRate: string;
}

// ─────────────────────────────────────────────────────────────
// Admin console (backend /api/v1/admin/* — gated by ADMIN_EMAILS
// allowlist, NOT a Role). Shapes mirror backend/src/controllers/
// {issuer,credential,institution}Controller.js admin list payloads.
// ─────────────────────────────────────────────────────────────

/** Issuer funnel: applied → domain_verified → identity_checked → active.
 *  Typed open (string) so unknown/legacy statuses render as plain chips. */
export interface AdminIssuer {
  userId: string;
  _id?: string;
  name: string;
  email: string;
  institutionType?: string;
  lockedDomain?: string | null;
  verificationStatus: string;
  isVerifiedIssuer: boolean;
  riskFlags?: string[];
  domainAgeMonths?: number | null;
  kycStatus?: string;
  domainVerifiedAt?: string;
  createdAt?: string;
}

/** One row of the unified dispute queue — credential revocation disputes
 *  and vouch (attestation) disputes share the same shape. */
export interface Dispute {
  id: string;
  _id?: string;
  type: 'credential' | 'vouch';
  title: string;
  issuer?: string;
  student?: string;
  studentId?: string;
  /** Only on vouch disputes — reputation the voucher staked. */
  stakedPoints?: number;
  reason?: string;
  filedAt?: string;
  revokedAt?: string;
}

export interface FraudReport {
  id: string;
  _id?: string;
  title: string;
  status?: string;
  trustTier?: string;
  issuer?: string;
  issuerId?: string;
  student?: string;
  studentId?: string;
  reporter?: string;
  reporterRole?: string;
  reason?: string;
  filedAt?: string;
}

export interface InstitutionRequest {
  id: string;
  _id?: string;
  displayName: string;
  website?: string | null;
  requestCount: number;
  status: 'pending' | 'reviewing' | 'onboarded' | 'declined';
  lastRequestedAt?: string;
  createdAt?: string;
}

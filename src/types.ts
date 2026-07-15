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

// ─────────────────────────────────────────────────────────────
// CredChain Backend — IssuerProfile model (Anti-Fraud Funnel)
// Backs the 4-Tier Issuer Verification state machine. An organization
// account must climb the funnel before it can mint credentials:
//
//   applied → domain_verified → identity_checked → vetted → active
//
//   L1 Domain WHOIS & match     → applied        (riskFlags set here)
//   L2 Cryptographic DNS proof  → domain_verified
//   L3 Biometric KYC webhook    → identity_checked
//   L4 Registry cross-match     → vetted → active (isVerifiedIssuer=true)
//
// `isVerifiedIssuer` is the single boolean the issuance/revocation guard
// (enforceVerifiedIssuer) checks — it only flips true at the final tier.
// ─────────────────────────────────────────────────────────────

const mongoose = require('mongoose');

const issuerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    institutionType: {
      type: String,
      enum: ['university', 'bootcamp', 'company', 'certifier', 'other'],
      default: 'other',
    },

    // The email domain this issuer is locked to (e.g. "mit.edu"). Indexed +
    // unique (sparse) so two issuers can't both claim the same domain.
    lockedDomain: { type: String, lowercase: true, trim: true, index: true, unique: true, sparse: true },

    verificationStatus: {
      type: String,
      enum: ['applied', 'domain_verified', 'identity_checked', 'vetted', 'active'],
      default: 'applied',
      index: true,
    },

    // L2: the token the issuer must publish as a DNS TXT record to prove
    // control of `lockedDomain`.
    dnsChallengeToken: { type: String },
    domainVerifiedAt: { type: Date },

    // L1: WHOIS findings.
    domainCreatedAt: { type: Date },
    domainAgeMonths: { type: Number },

    // Anti-fraud flags accumulated through the funnel (e.g. 'domain_age_lt_6mo',
    // 'whois_unavailable', 'consumer_email_attempt').
    riskFlags: [{ type: String }],

    // L3: biometric KYC (webhook-synced).
    kyc: {
      status: { type: String, enum: ['none', 'pending', 'passed', 'failed'], default: 'none' },
      reference: { type: String },
      checkedAt: { type: Date },
    },

    // L4: manual admin cross-match against corporate / university registries.
    registry: {
      matched: { type: Boolean, default: false },
      reviewedBy: { type: String },
      reviewedAt: { type: Date },
      notes: { type: String },
    },

    isVerifiedIssuer: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('IssuerProfile', issuerProfileSchema);

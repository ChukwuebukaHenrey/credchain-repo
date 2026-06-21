// ─────────────────────────────────────────────────────────────
// CredChain Backend — Credential model (the "Dynamic Asset")
// A credential issued to a student. `hash` + `txSignature` are filled
// in once the student accepts and the hash is written to Solana.
//
// EXTENDED (advanced backend): added issuer linkage (issuerId),
// recipientEmail (so credentials can be created via bulk upload before
// the student account exists / is linked), the canonical `sha256Hash`
// + `solanaTxSignature` fields used by the new systems, and on-chain
// revocation tracking. The original `studentId` / `hash` / `txSignature`
// fields are kept so the existing /credential/accept|reject routes and
// `publicCredential()` continue to work unchanged. New code writes BOTH
// `sha256Hash` and the legacy `hash` to keep a single source of truth.
// ─────────────────────────────────────────────────────────────

const mongoose = require('mongoose');

const credentialSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },

    // Legacy issuer label (free-text org name) — kept for back-compat.
    issuer: { type: String },
    // New: the verified issuer User who minted this credential.
    issuerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

    // The student who owns the credential. May be linked after creation
    // (bulk upload addresses recipients by email first).
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    recipientEmail: { type: String, lowercase: true, trim: true, index: true },

    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'revoked'],
      default: 'pending',
    },

    // Off-chain "DNA": the deterministic SHA-256 fingerprint of the
    // credential. `hash` is the legacy alias; both are kept in sync.
    sha256Hash: { type: String, index: true },
    hash: { type: String },

    // On-chain proof (SPL Memo tx signature). `txSignature` is the legacy alias.
    solanaTxSignature: { type: String },
    txSignature: { type: String },

    // Revocation trail: a fresh memo carrying `${sha256Hash}:REVOKED`.
    revokedHash: { type: String },
    revokedTxSignature: { type: String },
    revokedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Credential', credentialSchema);

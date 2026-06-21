// ─────────────────────────────────────────────────────────────
// CredChain Backend — StudentProfile model (Two-Tier Trust)
// The advanced student portal segregates skills into two ledgers:
//
//   verifiedSkills → blockchain-verified credentials (accepted + on-chain).
//                    Stored as refs to Credential documents.
//   sandboxSkills  → self-taught / sandbox claims (GitHub repos, courses…).
//                    Plain objects; NEVER treated as verified.
//
// This separation powers the employer-facing "Hide Unverified" toggle.
// `aiTelemetry` caches the latest market analysis from the Insights engine
// (:8002) so the dashboard doesn't re-hit the AI on every render.
// ─────────────────────────────────────────────────────────────

const mongoose = require('mongoose');

const sandboxSkillSchema = new mongoose.Schema(
  {
    skillName: { type: String, required: true, trim: true },
    source: { type: String, trim: true }, // e.g. 'GitHub', 'Coursera', 'Self-taught'
    link: { type: String, trim: true },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const studentProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    // Tier 1 — blockchain-verified credentials.
    verifiedSkills: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Credential' }],

    // Tier 2 — self-asserted, unverified.
    sandboxSkills: [sandboxSkillSchema],

    // Cached market telemetry from the AI Insights engine (:8002).
    aiTelemetry: {
      roleReadinessScore: { type: Number },
      marketEstimatedSalary: { type: String },
      recommendedSkillGaps: [{ type: String }],
      syncedAt: { type: Date },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StudentProfile', studentProfileSchema);

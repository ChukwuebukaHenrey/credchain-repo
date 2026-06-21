// ─────────────────────────────────────────────────────────────
// CredChain Backend — EmployerProfile model (Token-Bucket Chat)
// Employers spend a chat credit to open a conversation with a student.
// The credit is refunded if the student replies (proving the outreach
// wasn't spam) — see the token-bucket logic in chatController.js.
// ─────────────────────────────────────────────────────────────

const mongoose = require('mongoose');

const employerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    companyName: { type: String, trim: true },

    // The anti-spam token bucket. Starts at 50; -1 to open a room,
    // +1 refunded when the recipient replies.
    chatCreditsRemaining: { type: Number, default: 50, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EmployerProfile', employerProfileSchema);

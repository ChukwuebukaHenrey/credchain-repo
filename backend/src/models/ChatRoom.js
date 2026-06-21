// ─────────────────────────────────────────────────────────────
// CredChain Backend — ChatRoom model (Token-Bucket Anti-Spam Chat)
// A 1:1 conversation, optionally anchored to a specific credential the
// employer is enquiring about. A room opens "locked" (employer spent a
// credit); it flips to unlocked the moment the recipient replies, which
// also refunds the employer's credit.
// ─────────────────────────────────────────────────────────────

const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true },
    sentAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const chatRoomSchema = new mongoose.Schema(
  {
    // Exactly two participants.
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],

    // The employer who opened the room (and who gets the credit refund).
    initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Optional: the credential this outreach is about.
    contextCredentialId: { type: mongoose.Schema.Types.ObjectId, ref: 'Credential' },

    // false until the recipient replies (anti-spam unlock).
    isUnlocked: { type: Boolean, default: false },

    // Whether the refund has already been issued (idempotency guard so a
    // chatty recipient can't refund the employer more than once).
    creditRefunded: { type: Boolean, default: false },

    messages: [chatMessageSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChatRoom', chatRoomSchema);

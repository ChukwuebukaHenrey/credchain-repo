// ─────────────────────────────────────────────────────────────
// CredChain Backend — Message model
// A direct chat message between two users (relayed live via Socket.io).
// ─────────────────────────────────────────────────────────────

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);

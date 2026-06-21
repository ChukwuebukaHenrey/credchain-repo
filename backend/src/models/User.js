// ─────────────────────────────────────────────────────────────
// CredChain Backend — User model
// The shape of a user document in MongoDB. Stores the bcrypt password
// HASH only (never the plaintext password). credchainId is the public
// identifier shared on profiles / QR links.
// ─────────────────────────────────────────────────────────────

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['student', 'issuer', 'employer'],
      default: 'student',
    },
    credchainId: { type: String, unique: true },
    bio: { type: String },
    skills: [{ type: String }],
    links: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);

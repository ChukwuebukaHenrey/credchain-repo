// ─────────────────────────────────────────────────────────────
// CredChain Backend — Two-Tier Trust Portfolio (System 1)
// Splits a student's portfolio into two explicit ledgers so the employer
// UI can offer a "Hide Unverified" toggle:
//   verifiedLedger → accepted, on-chain credentials (Tier 1).
//   sandboxLedger  → self-taught / sandbox claims (Tier 2).
// ─────────────────────────────────────────────────────────────

const User = require('../models/User');
const Credential = require('../models/Credential');
const StudentProfile = require('../models/StudentProfile');
const { getMemoExplorerUrl } = require('../config/solana');

/** Lazily create-or-fetch a student's profile document. */
async function ensureStudentProfile(userId) {
  let profile = await StudentProfile.findOne({ userId });
  if (!profile) {
    profile = await StudentProfile.create({ userId });
  }
  return profile;
}

// GET /api/v1/student/:userId/portfolio
async function getStudentPortfolio(req, res) {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('name credchainId role');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const profile = await ensureStudentProfile(userId);

    // Tier 1 — pull the student's accepted credentials straight from the
    // ledger (authoritative), not just the cached refs, so revocations and
    // newly-accepted credentials are always reflected.
    const accepted = await Credential.find({
      studentId: userId,
      status: 'accepted',
    }).sort({ createdAt: -1 });

    const verifiedLedger = accepted.map((c) => ({
      id: c._id,
      title: c.title,
      issuer: c.issuer || 'Verified Issuer',
      sha256Hash: c.sha256Hash || c.hash,
      solanaTxSignature: c.solanaTxSignature || c.txSignature || null,
      explorerUrl: (c.solanaTxSignature || c.txSignature)
        ? getMemoExplorerUrl(c.solanaTxSignature || c.txSignature)
        : null,
      badgeUrl: `/api/v1/badge/${c._id}`,
      verified: true,
      issuedAt: c.createdAt,
    }));

    // Tier 2 — self-asserted, never trusted.
    const sandboxLedger = (profile.sandboxSkills || []).map((s) => ({
      skillName: s.skillName,
      source: s.source || 'Self-taught',
      link: s.link || null,
      verified: false,
      addedAt: s.addedAt,
    }));

    return res.status(200).json({
      success: true,
      message: 'Portfolio fetched.',
      student: { id: user._id, name: user.name, credchainId: user.credchainId },
      counts: { verified: verifiedLedger.length, sandbox: sandboxLedger.length },
      verifiedLedger,
      sandboxLedger,
      aiTelemetry: profile.aiTelemetry || null,
    });
  } catch (err) {
    console.error('[student:portfolio]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch portfolio.' });
  }
}

// POST /api/v1/student/sandbox-skill
async function addSandboxSkill(req, res) {
  try {
    const { skillName, source, link } = req.body || {};
    if (!skillName) {
      return res.status(400).json({ success: false, message: 'skillName is required.' });
    }

    const profile = await ensureStudentProfile(req.user.id);
    profile.sandboxSkills.push({ skillName, source: source || 'Self-taught', link: link || '' });
    await profile.save();

    return res.status(201).json({
      success: true,
      message: 'Sandbox skill added to your unverified ledger.',
      sandboxSkills: profile.sandboxSkills,
    });
  } catch (err) {
    console.error('[student:addSandboxSkill]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to add sandbox skill.' });
  }
}

module.exports = { getStudentPortfolio, addSandboxSkill, ensureStudentProfile };

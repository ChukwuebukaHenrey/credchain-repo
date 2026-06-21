// ─────────────────────────────────────────────────────────────
// CredChain Backend — AI Gateway Proxies (System 4)
// The Python microservices have NO DB access. The Express core queries
// MongoDB, STRIPS PII (services/pii.js), and forwards clean JSON over
// internal HTTP:
//   generateVerifiedCV    → only VERIFIED (on-chain) credentials → :8001 → stream PDF.
//   syncCareerTelemetry   → anonymised skills only → :8002 → cache to StudentProfile.
// ─────────────────────────────────────────────────────────────

const axios = require('axios');

const User = require('../models/User');
const Credential = require('../models/Credential');
const StudentProfile = require('../models/StudentProfile');
const { ensureStudentProfile } = require('./studentController');
const { skillsOnly, cvPayloadFromCredentials } = require('../services/pii');

const AI_CV_ENGINE_URL = process.env.AI_CV_ENGINE_URL || 'http://localhost:8001';
const AI_INSIGHTS_ENGINE_URL = process.env.AI_INSIGHTS_ENGINE_URL || 'http://localhost:8002';

/** Fetch a student's verified, on-chain credentials (the verifiedLedger). */
async function fetchVerifiedCredentials(userId) {
  return Credential.find({
    studentId: userId,
    status: 'accepted',
  }).sort({ createdAt: -1 });
}

// POST /api/v1/ai/generate-verified-cv   (requireAuth)
// Body: { userId? }  — defaults to the caller. Streams a PDF back.
async function generateVerifiedCV(req, res) {
  try {
    const userId = req.body?.userId || req.user.id;
    const user = await User.findById(userId).select('name email');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Only credentials that are BOTH accepted and carry a Solana signature
    // count as "verified" for a verified CV.
    const all = await fetchVerifiedCredentials(userId);
    const verified = all.filter((c) => c.solanaTxSignature || c.txSignature);

    if (verified.length === 0) {
      return res.status(409).json({
        success: false,
        message: 'No blockchain-verified credentials yet — cannot generate a verified CV.',
      });
    }

    const profile = await StudentProfile.findOne({ userId });
    const payload = cvPayloadFromCredentials(user, verified, profile || {});

    // Proxy to the CV engine and stream the PDF straight through.
    const engineRes = await axios.post(
      `${AI_CV_ENGINE_URL}/generate-cv?format=pdf`,
      payload,
      { responseType: 'stream', timeout: 30000 }
    );

    const safeName = (user.name || 'credchain').trim().replace(/\s+/g, '-');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}-verified-cv.pdf"`);
    engineRes.data.pipe(res);
  } catch (err) {
    const status = err.response?.status || 502;
    console.error('[ai:generateVerifiedCV]', err.message);
    // If headers were already flushed (stream started) we can't send JSON.
    if (res.headersSent) return res.end();
    return res.status(status).json({
      success: false,
      message: 'Failed to reach the CV engine (:8001).',
      error: err.message,
    });
  }
}

// POST /api/v1/ai/sync-telemetry   (requireAuth)
async function syncCareerTelemetry(req, res) {
  try {
    const userId = req.body?.userId || req.user.id;

    const verified = await fetchVerifiedCredentials(userId);
    // Anonymised payload — skills only, no name/email/ids leave the boundary.
    const payload = skillsOnly(verified, {
      bio: typeof req.body?.bio === 'string' ? req.body.bio : '',
      goals: typeof req.body?.goals === 'string' ? req.body.goals : '',
    });

    const { data } = await axios.post(
      `${AI_INSIGHTS_ENGINE_URL}/analyze-skills`,
      payload,
      { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
    );

    // Map the insights response into the cached telemetry shape.
    const profile = await ensureStudentProfile(userId);
    profile.aiTelemetry = {
      roleReadinessScore: data.roleReadinessScore ?? data.role_readiness_score ?? null,
      marketEstimatedSalary: data.marketEstimatedSalary ?? data.estimated_salary ?? null,
      recommendedSkillGaps: data.recommendedSkillGaps ?? data.next_steps ?? data.recommended_skill_gaps ?? [],
      syncedAt: new Date(),
    };
    await profile.save();

    return res.status(200).json({
      success: true,
      message: 'Career telemetry synced from the Insights engine.',
      source: 'ai-insights-engine',
      aiTelemetry: profile.aiTelemetry,
      raw: data,
    });
  } catch (err) {
    const status = err.response?.status || 502;
    console.error('[ai:syncTelemetry]', err.message);
    return res.status(status).json({
      success: false,
      message: 'Failed to reach the Insights engine (:8002).',
      error: err.response?.data || err.message,
    });
  }
}

module.exports = { generateVerifiedCV, syncCareerTelemetry };

// ─────────────────────────────────────────────────────────────
// CredChain Backend — PII gateway boundary (Architecture rule #1)
// The Python microservices (:8001 CV, :8002 Insights) have NO database
// access. The Express core is the only tier that touches MongoDB; it must
// strip sensitive fields before forwarding clean JSON over internal HTTP.
//
// Boundary policy:
//   • Insights (:8002)  → skills ONLY. No name, no email, no ids.
//   • CV (:8001)        → a CV inherently bears the OWNER's identity, which
//                         the owner consents to publish. So we forward the
//                         owner's own name/email + their verified credential
//                         titles — and nothing about any OTHER user.
// ─────────────────────────────────────────────────────────────

/**
 * Build the anonymised payload for the Insights engine (:8002).
 * Strips all identity; sends only the skill/credential titles.
 * @param {Array} verifiedCreds  accepted, on-chain Credential docs
 * @param {Object} [extra]       optional non-PII context (bio/goals already sanitised by caller)
 */
function skillsOnly(verifiedCreds, extra = {}) {
  const skills = (verifiedCreds || [])
    .map((c) => c.title)
    .filter(Boolean);
  return {
    skills,
    // Caller may pass already-sanitised free-text; default to empty.
    bio: extra.bio || '',
    goals: extra.goals || '',
  };
}

/**
 * Build the CV payload for the CV engine (:8001) from the OWNER's own data.
 * Only the owner's consented identity + their VERIFIED credentials are sent.
 * @param {Object} user           the owning User doc (name/email)
 * @param {Array}  verifiedCreds  accepted, on-chain Credential docs
 * @param {Object} [profile]      optional StudentProfile for summary/skills
 */
function cvPayloadFromCredentials(user, verifiedCreds, profile = {}) {
  const creds = verifiedCreds || [];
  return {
    name: user?.name || 'CredChain Member',
    email: user?.email || '',
    summary:
      profile?.summary ||
      'Verified professional. All listed credentials are blockchain-attested on CredChain.',
    // Verified credential titles double as the headline skills list.
    skills: creds.map((c) => c.title).filter(Boolean),
    // Each verified credential becomes an "experience" entry carrying its issuer + proof.
    experience: creds.map((c) => ({
      role: c.title,
      company: c.issuer || 'Verified Issuer',
      description: c.solanaTxSignature
        ? `Blockchain-verified credential (tx: ${c.solanaTxSignature.slice(0, 12)}…).`
        : 'Verified credential.',
    })),
    education: [],
  };
}

module.exports = { skillsOnly, cvPayloadFromCredentials };

// ─────────────────────────────────────────────────────────────
// CredChain Backend — email / domain helpers (Anti-Fraud L1)
// Used by the issuer funnel to reject consumer mailboxes and to extract
// the corporate domain that gets WHOIS-checked and DNS-locked.
// ─────────────────────────────────────────────────────────────

// Common free/consumer providers. An organisation proving it controls one
// of these proves nothing — so registering an issuer with one is rejected.
const CONSUMER_DOMAINS = new Set([
  'gmail.com', 'googlemail.com',
  'yahoo.com', 'yahoo.co.uk', 'ymail.com',
  'hotmail.com', 'outlook.com', 'live.com', 'msn.com',
  'icloud.com', 'me.com', 'mac.com',
  'aol.com', 'gmx.com', 'mail.com',
  'proton.me', 'protonmail.com', 'pm.me',
  'zoho.com', 'yandex.com', 'tutanota.com',
]);

/** Extract the lower-cased domain from an email address, or '' if invalid. */
function extractDomain(email) {
  if (!email || typeof email !== 'string') return '';
  const at = email.lastIndexOf('@');
  if (at === -1) return '';
  return email.slice(at + 1).trim().toLowerCase();
}

/** True if the email belongs to a known consumer provider. */
function isConsumerEmail(email) {
  return CONSUMER_DOMAINS.has(extractDomain(email));
}

module.exports = { extractDomain, isConsumerEmail, CONSUMER_DOMAINS };

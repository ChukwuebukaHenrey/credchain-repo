// ─────────────────────────────────────────────────────────────
// CredChain Backend — WHOIS service (Anti-Fraud L1, zero-dependency)
// Determines a domain's registration age over the raw WHOIS protocol
// (TCP port 43). Two hops:
//   1. Ask whois.iana.org which WHOIS server is authoritative for the TLD.
//   2. Query that server for the domain and parse its "Creation Date".
//
// Networks sometimes block outbound :43 or a registry hides the date —
// so this NEVER throws to the caller. It returns { ok:false } and the
// funnel treats "unknown age" as a manual-review risk flag rather than a
// hard rejection.
// ─────────────────────────────────────────────────────────────

const net = require('net');

const IANA_WHOIS = 'whois.iana.org';
const WHOIS_PORT = 43;
const SOCKET_TIMEOUT_MS = 6000;

/** Low-level: send one WHOIS query to `host` and resolve the full text reply. */
function whoisQuery(host, query) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(WHOIS_PORT, host);
    let data = '';
    let settled = false;

    const done = (err, result) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (err) reject(err);
      else resolve(result);
    };

    socket.setTimeout(SOCKET_TIMEOUT_MS);
    socket.on('connect', () => socket.write(`${query}\r\n`));
    socket.on('data', (chunk) => { data += chunk.toString('utf8'); });
    socket.on('end', () => done(null, data));
    socket.on('timeout', () => done(new Error('whois timeout')));
    socket.on('error', (err) => done(err));
  });
}

/** Find the authoritative WHOIS server for a domain's TLD via IANA. */
async function findTldWhoisServer(domain) {
  const tld = domain.split('.').pop();
  const text = await whoisQuery(IANA_WHOIS, tld);
  const match = text.match(/whois:\s*(\S+)/i);
  return match ? match[1].trim() : null;
}

/** Pull the earliest creation/registration date out of a WHOIS reply. */
function parseCreationDate(text) {
  const patterns = [
    /Creation Date:\s*(.+)/i,
    /Created On:\s*(.+)/i,
    /Created:\s*(.+)/i,
    /Registered On:\s*(.+)/i,
    /Registration Time:\s*(.+)/i,
    /Domain Registration Date:\s*(.+)/i,
    /created:\s*(.+)/i, // many ccTLD registries use lowercase
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const d = new Date(m[1].trim());
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  return null;
}

/**
 * Look up a domain's registration age.
 * @param {string} domain  e.g. "mit.edu"
 * @returns {Promise<{ok:boolean, createdAt?:Date, ageMonths?:number, reason?:string}>}
 */
async function lookupDomainAge(domain) {
  if (!domain || typeof domain !== 'string') {
    return { ok: false, reason: 'invalid_domain' };
  }
  try {
    const server = await findTldWhoisServer(domain);
    if (!server) return { ok: false, reason: 'no_whois_server' };

    const reply = await whoisQuery(server, domain);
    const createdAt = parseCreationDate(reply);
    if (!createdAt) return { ok: false, reason: 'no_creation_date' };

    const ageMonths = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    return { ok: true, createdAt, ageMonths };
  } catch (err) {
    return { ok: false, reason: err.message || 'whois_error' };
  }
}

module.exports = { lookupDomainAge };

// ─────────────────────────────────────────────────────────────
// CredChain Backend — Solana fee-payer wallet loader
// Loads the Devnet keypair that pays for Memo transactions from the
// path in process.env.SOLANA_WALLET_PATH. If it's missing or invalid,
// we log a clear warning and return null so callers can gracefully
// SKIP the on-chain write instead of crashing the server.
// ─────────────────────────────────────────────────────────────

const fs = require('fs');
const { Keypair } = require('@solana/web3.js');

let cachedKeypair;
let warned = false;

function loadFeePayer() {
  // Cache the result (including a null "no wallet" result) after first load.
  if (cachedKeypair !== undefined) {
    return cachedKeypair;
  }

  const walletPath = process.env.SOLANA_WALLET_PATH;
  if (!walletPath) {
    if (!warned) {
      console.warn('[solana] SOLANA_WALLET_PATH not set — on-chain Memo writes will be skipped.');
      warned = true;
    }
    cachedKeypair = null;
    return cachedKeypair;
  }

  try {
    const raw = fs.readFileSync(walletPath, 'utf8');
    const secret = Uint8Array.from(JSON.parse(raw));
    cachedKeypair = Keypair.fromSecretKey(secret);
    console.log('[solana] fee-payer wallet loaded:', cachedKeypair.publicKey.toBase58());
    return cachedKeypair;
  } catch (err) {
    console.warn(`[solana] failed to load wallet from ${walletPath}: ${err.message} — on-chain writes will be skipped.`);
    cachedKeypair = null;
    return cachedKeypair;
  }
}

module.exports = { loadFeePayer };

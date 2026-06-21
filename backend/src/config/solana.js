// ─────────────────────────────────────────────────────────────
// CredChain Backend — Solana service
// Writes 64-char credential hashes to Solana Devnet using the
// built-in SPL Memo Program. No custom smart contract required.
// ─────────────────────────────────────────────────────────────

const {
  Connection,
  Transaction,
  TransactionInstruction,
  PublicKey,
  sendAndConfirmTransaction,
  clusterApiUrl,
} = require('@solana/web3.js');

// Solana Devnet RPC endpoint (free practice network).
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

// The official SPL Memo Program ID (canonical Devnet/Mainnet address).
// NOTE: the original placeholder here was not valid base58 ("Mem0X…" — base58
// has no "0"), which crashed `new PublicKey()` at module load as soon as any
// route imported this file. Corrected to the real SPL Memo program address.
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

// A single, stable Connection instance reused across the app.
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

/**
 * sendCredentialMemo
 * Builds a Solana transaction whose only instruction is a Memo
 * carrying the supplied SHA-256 hash string, signs it with the
 * provided fee-payer keypair, sends it to Devnet, waits for
 * confirmation, and returns the confirmed transaction signature.
 *
 * @param {string} hashString      The 64-char SHA-256 credential fingerprint.
 * @param {import('@solana/web3.js').Keypair} feePayerKeypair  Signer / fee payer.
 * @returns {Promise<string>}      The confirmed transaction signature.
 */
async function sendCredentialMemo(hashString, feePayerKeypair) {
  if (!hashString || typeof hashString !== 'string') {
    throw new Error('sendCredentialMemo: "hashString" must be a non-empty string.');
  }
  if (!feePayerKeypair || !feePayerKeypair.publicKey) {
    throw new Error('sendCredentialMemo: "feePayerKeypair" must be a valid Solana Keypair.');
  }

  // 1. Build the Memo instruction carrying the hash as UTF-8 data.
  const memoInstruction = new TransactionInstruction({
    keys: [],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(hashString, 'utf8'),
  });

  // 2. Assemble the transaction.
  const transaction = new Transaction().add(memoInstruction);
  transaction.feePayer = feePayerKeypair.publicKey;

  // Attach a recent blockhash so the transaction is valid for submission.
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;

  // 3. Sign, send, and confirm in one step. Returns the signature string.
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [feePayerKeypair],
    {
      commitment: 'confirmed',
      skipPreflight: false,
    }
  );

  return signature;
}

/**
 * getMemoExplorerUrl
 * Convenience helper — builds the Solana Explorer (Devnet) URL for a
 * given transaction signature so anyone can verify the on-chain record.
 *
 * @param {string} signature
 * @returns {string}
 */
function getMemoExplorerUrl(signature) {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

module.exports = {
  connection,
  MEMO_PROGRAM_ID,
  SOLANA_RPC_URL,
  sendCredentialMemo,
  getMemoExplorerUrl,
  clusterApiUrl,
};

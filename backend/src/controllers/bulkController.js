// ─────────────────────────────────────────────────────────────
// CredChain Backend — Bulk-Upload Controller (System 2)
// Accepts a CSV of credentials, responds INSTANTLY with 202 Accepted +
// a jobId, and hands the work to the background worker which streams
// progress over Socket.io. A poll endpoint exposes the same job state.
// ─────────────────────────────────────────────────────────────

const crypto = require('crypto');

const { parseCsv } = require('../utils/csv');
const { processBulkJob, createJob, getJob } = require('../workers/bulkWorker');

// POST /api/v1/issuer/credentials/bulk   (requireAuth + enforceVerifiedIssuer)
async function bulkUploadCredentials(req, res) {
  try {
    const csvText = req.body?.csv;
    if (!csvText || typeof csvText !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Provide the CSV as a string in the "csv" field. Header row required (e.g. "title,recipientEmail").',
      });
    }

    const rows = parseCsv(csvText);
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No data rows found in the CSV.' });
    }

    const jobId = crypto.randomUUID();
    createJob(jobId, req.user.id, rows.length);

    // Fire-and-forget: the worker runs after we respond. Errors are captured
    // on the job record, never thrown into the (already-sent) response.
    const io = req.app.get('io');
    setImmediate(() => {
      processBulkJob(io, jobId, req.user.id, rows).catch((err) =>
        console.error('[bulk:worker]', jobId, err.message)
      );
    });

    // 202 Accepted — work is queued, not finished.
    return res.status(202).json({
      success: true,
      message: 'Bulk upload accepted. Subscribe to Socket.io "bulk:progress" or poll the status endpoint.',
      jobId,
      total: rows.length,
      socketRoom: String(req.user.id),
      statusUrl: `/api/v1/issuer/bulk/${jobId}`,
    });
  } catch (err) {
    console.error('[bulk:upload]', err.message);
    return res.status(500).json({ success: false, message: 'Bulk upload failed to start.' });
  }
}

// GET /api/v1/issuer/bulk/:jobId   (requireAuth) — poll fallback for the socket stream.
async function getBulkJobStatus(req, res) {
  const job = getJob(req.params.jobId);
  if (!job) {
    return res.status(404).json({ success: false, message: 'Job not found (it may have expired on restart).' });
  }
  // Only the issuer who started the job may read it.
  if (job.issuerId !== String(req.user.id)) {
    return res.status(403).json({ success: false, message: 'Not your job.' });
  }
  return res.status(200).json({ success: true, job });
}

module.exports = { bulkUploadCredentials, getBulkJobStatus };

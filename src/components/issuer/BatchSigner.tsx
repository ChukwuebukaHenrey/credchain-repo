// components/issuer/BatchSigner.tsx
// Live batch-issuance wiring for the issuer's "Batch Signer" tab.
// CSV (title,recipientEmail) → POST /api/v1/issuer/credentials/bulk → 202 { jobId },
// then progress streams over socket events bulk:start / bulk:progress / bulk:complete
// (filtered by jobId). getBulkJob(jobId) polling is kept as a fallback in case the
// socket connection drops mid-job.
import { useEffect, useRef, useState } from "react";
import { UploadCloud, Copy, Check, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { bulkUploadCredentials, getBulkJob } from "../../services/api";
import { getSocket } from "../../services/socket";
import FileUpload from "../motion/FileUpload";

const SAMPLE_CSV = `title,recipientEmail
B.Eng Computer Engineering,emeka@example.com
B.Eng Electrical Engineering,ada.nwosu@example.com
B.Sc Information Technology,chidi.okafor@example.com`;

interface BulkProgress {
  total: number;
  processed: number;
  failed: number;
  status: string;
  percent: number;
}

export default function BatchSigner({
  onNotify,
}: {
  onNotify?: (message: string, variant: "success" | "danger") => void;
}) {
  const [csvText, setCsvText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<BulkProgress | null>(null);
  const [jobErrors, setJobErrors] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

  const jobIdRef = useRef<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const stopPolling = () => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  // Apply a progress snapshot (from socket event or poll fallback) to local state.
  const applyProgress = (evt: any) => {
    if (!evt) return;
    setProgress({
      total: Number(evt.total) || 0,
      processed: Number(evt.processed) || 0,
      failed: Number(evt.failed) || 0,
      status: evt.status || "processing",
      percent: Math.max(0, Math.min(100, Number(evt.percent) || 0)),
    });
    if (Array.isArray(evt.errors) && evt.errors.length > 0) setJobErrors(evt.errors);
    if (evt.status === "complete" || evt.status === "failed") {
      stopPolling();
      onNotify?.(
        evt.status === "complete"
          ? `Batch complete — ${evt.processed ?? 0} processed, ${evt.failed ?? 0} failed.`
          : "Batch job failed — see errors below.",
        evt.status === "complete" && !evt.failed ? "success" : "danger"
      );
    }
  };

  // Subscribe once; filter every event by the jobId we started. AuthContext has
  // already connected the socket and joined the per-user room.
  useEffect(() => {
    let socket: ReturnType<typeof getSocket> | null = null;
    try {
      socket = getSocket();
    } catch {
      return; // socket is best-effort; poll fallback still covers progress
    }
    const onBulkEvent = (evt: any) => {
      if (!evt || evt.jobId !== jobIdRef.current) return;
      applyProgress(evt);
    };
    socket.on("bulk:start", onBulkEvent);
    socket.on("bulk:progress", onBulkEvent);
    socket.on("bulk:complete", onBulkEvent);
    return () => {
      socket?.off("bulk:start", onBulkEvent);
      socket?.off("bulk:progress", onBulkEvent);
      socket?.off("bulk:complete", onBulkEvent);
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // FileUpload hands us the validated File once its progress animation completes.
  // We read it into csvText — the existing submit flow (Sign & submit batch) is
  // unchanged, so the file picker and the paste box remain interchangeable.
  const handleFileUpload = async (file: File) => {
    try {
      const text = await file.text();
      setCsvText(text);
      setUploadError(null);
    } catch {
      setUploadError("Could not read that file — paste the CSV contents instead.");
    }
  };

  const handleCopySample = async () => {
    try {
      await navigator.clipboard.writeText(SAMPLE_CSV);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      onNotify?.("Clipboard unavailable — select the sample text manually.", "danger");
    }
  };

  const handleUpload = async () => {
    if (!csvText.trim() || uploading) return;
    setUploading(true);
    setUploadError(null);
    setProgress(null);
    setJobErrors([]);
    setJobId(null);
    jobIdRef.current = null;
    try {
      const res = await bulkUploadCredentials(csvText.trim());
      const newJobId = res?.jobId;
      if (!newJobId) throw new Error(res?.message || "Backend did not return a job id.");
      jobIdRef.current = newJobId;
      setJobId(newJobId);
      setProgress({ total: Number(res?.total) || 0, processed: 0, failed: 0, status: "queued", percent: 0 });
      // Poll fallback — harmless duplication with socket events (same snapshot shape).
      stopPolling();
      pollRef.current = window.setInterval(async () => {
        const current = jobIdRef.current;
        if (!current) return stopPolling();
        try {
          const pollRes = await getBulkJob(current);
          const job = pollRes?.job || pollRes;
          if (job && (job.status || job.percent !== undefined)) applyProgress({ jobId: current, ...job });
        } catch {
          /* transient poll failure — socket events may still arrive */
        }
      }, 4000);
    } catch (e: any) {
      setUploadError(e?.message || "Bulk upload failed — check the CSV format and try again.");
    } finally {
      setUploading(false);
    }
  };

  const isRunning = !!progress && progress.status !== "complete" && progress.status !== "failed";

  return (
    <div className="space-y-4">
      {/* CSV input card */}
      <div className="bg-bg-surface border border-border-main rounded-lg p-6 space-y-4">
        <FileUpload
          acceptedFileTypes={["text/csv", "application/vnd.ms-excel", ".csv"]}
          maxFileSize={2 * 1024 * 1024}
          uploadDelay={900}
          hint="columns: title,recipientEmail · up to 500 rows per batch"
          onUploadSuccess={handleFileUpload}
          onUploadError={(err) => setUploadError(err.message)}
        />
        <div className="text-center text-[11px] font-mono text-txt-muted -mt-1">
          Drop a roster CSV to load it below — review, then sign &amp; submit.
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-mono text-txt-muted uppercase tracking-wider">Or paste CSV</label>
            <button
              type="button"
              onClick={handleCopySample}
              className="inline-flex items-center gap-1.5 text-[11px] font-mono text-txt-secondary hover:text-role-issuer cursor-pointer transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-hash-green" strokeWidth={2.5} /> : <Copy className="w-3 h-3" strokeWidth={2} />}
              {copied ? "Copied" : "Copy sample CSV"}
            </button>
          </div>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={SAMPLE_CSV}
            rows={6}
            spellCheck={false}
            className="w-full bg-bg-sunken border border-border-main focus:border-role-issuer rounded-md px-3 py-2.5 text-xs font-mono text-txt-primary outline-none transition-colors resize-y"
          />
        </div>

        {uploadError && (
          <div className="border border-hash-red/30 bg-hash-red/5 rounded-md p-3 flex items-start gap-2.5 text-hash-red">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
            <p className="text-xs leading-relaxed">{uploadError}</p>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!csvText.trim() || uploading || isRunning}
          className="w-full sm:w-auto px-5 py-2.5 rounded-md bg-brand-purple hover:bg-brand-purple-dim disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
        >
          {uploading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} /> Submitting batch…
            </>
          ) : (
            <>
              <UploadCloud className="w-3.5 h-3.5" strokeWidth={2} /> Sign & submit batch
            </>
          )}
        </button>
      </div>

      {/* Live job progress */}
      {progress && (
        <div className="bg-bg-surface border border-border-main rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="font-mono text-[10px] uppercase tracking-wider text-txt-muted">
              BULK JOB {jobId ? `· ${jobId}` : ""}
            </div>
            <span
              className={`inline-flex items-center gap-1.5 text-[10px] font-mono uppercase font-semibold px-2 py-1 rounded-sm border ${
                progress.status === "complete"
                  ? "border-hash-green/30 text-hash-green"
                  : progress.status === "failed"
                  ? "border-hash-red/30 text-hash-red"
                  : "border-border-main text-role-issuer"
              }`}
            >
              {progress.status === "complete" ? (
                <CheckCircle2 className="w-3 h-3" strokeWidth={2.5} />
              ) : progress.status === "failed" ? (
                <AlertTriangle className="w-3 h-3" strokeWidth={2.5} />
              ) : (
                <Loader2 className="w-3 h-3 animate-spin" strokeWidth={2.5} />
              )}
              {progress.status}
            </span>
          </div>

          <div className="h-2 bg-bg-sunken border border-border-subtle rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${progress.status === "failed" ? "bg-hash-red" : "bg-role-issuer"}`}
              style={{ width: `${progress.percent}%` }}
            />
          </div>

          <div className="flex items-center gap-5 font-mono text-[11px] text-txt-secondary flex-wrap">
            <span>
              <span className="text-txt-primary font-semibold">{progress.processed}</span> / {progress.total || "?"} processed
            </span>
            <span className={progress.failed > 0 ? "text-hash-red" : ""}>{progress.failed} failed</span>
            <span className="text-role-issuer">{progress.percent}%</span>
          </div>

          {jobErrors.length > 0 && (
            <div className="border border-hash-red/30 bg-hash-red/5 rounded-md p-4 space-y-2">
              <div className="font-mono text-[10px] uppercase tracking-wider text-hash-red font-semibold">
                ROW ERRORS ({jobErrors.length})
              </div>
              <ul className="space-y-1 text-xs text-txt-secondary list-none">
                {jobErrors.map((err, i) => (
                  <li key={i} className="font-mono break-all">
                    · {typeof err === "string" ? err : err?.message || err?.error || JSON.stringify(err)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

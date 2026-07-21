"use client";

/**
 * Drag-and-drop file upload with animated illustration + progress ring.
 * Adapted from kokonutui FileUpload (MIT, @dorianbaffier) to CredChain's
 * token theme: brand-purple accent instead of blue, [data-theme] token
 * surfaces instead of dark: variants, no external cn deps.
 */

import { UploadCloud } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  type DragEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "../../lib/utils";

type FileStatus = "idle" | "dragging" | "uploading" | "error";

interface FileError {
  message: string;
  code: string;
}

interface FileUploadProps {
  onUploadSuccess?: (file: File) => void;
  onUploadError?: (error: FileError) => void;
  acceptedFileTypes?: string[];
  maxFileSize?: number;
  currentFile?: File | null;
  onFileRemove?: () => void;
  /** Duration in ms for the upload simulation. 0 disables it (caller drives progress). */
  uploadDelay?: number;
  validateFile?: (file: File) => FileError | null;
  className?: string;
  /** Overrides the sub-label under "Drag and drop or" (defaults to a type/size hint). */
  hint?: string;
}

const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const UPLOAD_STEP_SIZE = 5;
const FILE_SIZES = ["Bytes", "KB", "MB", "GB", "TB"] as const;

const formatBytes = (bytes: number, decimals = 2): string => {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const unit = FILE_SIZES[i] || FILE_SIZES[FILE_SIZES.length - 1];
  return `${Number.parseFloat((bytes / k ** i).toFixed(dm))} ${unit}`;
};

const UploadIllustration = () => (
  <div className="relative h-16 w-16">
    <svg
      aria-label="Upload illustration"
      className="h-full w-full"
      fill="none"
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Upload File Illustration</title>
      <circle
        cx="50"
        cy="50"
        r="45"
        strokeDasharray="4 4"
        strokeWidth="2"
        stroke="var(--border-strong)"
      >
        <animateTransform
          attributeName="transform"
          dur="60s"
          from="0 50 50"
          repeatCount="indefinite"
          to="360 50 50"
          type="rotate"
        />
      </circle>
      <path
        d="M30 35H70C75 35 75 40 75 40V65C75 70 70 70 70 70H30C25 70 25 65 25 65V40C25 35 30 35 30 35Z"
        strokeWidth="2"
        stroke="var(--brand-purple)"
        fill="var(--brand-purple-soft)"
      >
        <animate
          attributeName="d"
          dur="2s"
          repeatCount="indefinite"
          values="
            M30 35H70C75 35 75 40 75 40V65C75 70 70 70 70 70H30C25 70 25 65 25 65V40C25 35 30 35 30 35Z;
            M30 38H70C75 38 75 43 75 43V68C75 73 70 73 70 73H30C25 73 25 68 25 68V43C25 38 30 38 30 38Z;
            M30 35H70C75 35 75 40 75 40V65C75 70 70 70 70 70H30C25 70 25 65 25 65V40C25 35 30 35 30 35Z"
        />
      </path>
      <path
        d="M30 35C30 35 35 35 40 35C45 35 45 30 50 30C55 30 55 35 60 35C65 35 70 35 70 35"
        fill="none"
        strokeWidth="2"
        stroke="var(--brand-purple)"
      />
      <g className="translate-y-2 transform">
        <line
          strokeLinecap="round"
          strokeWidth="2"
          x1="50"
          x2="50"
          y1="45"
          y2="60"
          stroke="var(--brand-purple)"
        >
          <animate attributeName="y2" dur="2s" repeatCount="indefinite" values="60;55;60" />
        </line>
        <polyline
          fill="none"
          points="42,52 50,45 58,52"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          stroke="var(--brand-purple)"
        >
          <animate
            attributeName="points"
            dur="2s"
            repeatCount="indefinite"
            values="42,52 50,45 58,52;42,47 50,40 58,47;42,52 50,45 58,52"
          />
        </polyline>
      </g>
    </svg>
  </div>
);

const UploadingAnimation = ({ progress }: { progress: number }) => (
  <div className="relative h-16 w-16">
    <svg
      aria-label={`Upload progress: ${Math.round(progress)}%`}
      className="h-full w-full -rotate-90"
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Upload Progress Indicator</title>
      <circle
        cx="60"
        cy="60"
        r="52"
        fill="none"
        strokeWidth="8"
        stroke="var(--border-main)"
      />
      <circle
        cx="60"
        cy="60"
        r="52"
        fill="none"
        strokeWidth="8"
        strokeLinecap="round"
        stroke="var(--brand-purple)"
        strokeDasharray={2 * Math.PI * 52}
        strokeDashoffset={(1 - progress / 100) * 2 * Math.PI * 52}
        style={{ transition: "stroke-dashoffset 0.2s linear" }}
      />
    </svg>
  </div>
);

export default function FileUpload({
  onUploadSuccess = () => {},
  onUploadError = () => {},
  acceptedFileTypes = [],
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  currentFile: initialFile = null,
  onFileRemove = () => {},
  uploadDelay = 2000,
  validateFile = () => null,
  hint,
  className,
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(initialFile);
  const [status, setStatus] = useState<FileStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<FileError | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (uploadIntervalRef.current) clearInterval(uploadIntervalRef.current);
    },
    []
  );

  const validateFileSize = useCallback(
    (f: File): FileError | null =>
      f.size > maxFileSize
        ? { message: `File size exceeds ${formatBytes(maxFileSize)}`, code: "FILE_TOO_LARGE" }
        : null,
    [maxFileSize]
  );

  const validateFileType = useCallback(
    (f: File): FileError | null => {
      if (!acceptedFileTypes?.length) return null;
      const fileType = f.type.toLowerCase();
      const nameExt = "." + (f.name.split(".").pop() || "").toLowerCase();
      const ok = acceptedFileTypes.some((type) => {
        const t = type.toLowerCase();
        return fileType.includes(t) || t === nameExt || fileType.match(t);
      });
      return ok
        ? null
        : { message: `File type must be ${acceptedFileTypes.join(", ")}`, code: "INVALID_FILE_TYPE" };
    },
    [acceptedFileTypes]
  );

  const handleError = useCallback(
    (err: FileError) => {
      setError(err);
      setStatus("error");
      onUploadError?.(err);
      setTimeout(() => {
        setError(null);
        setStatus("idle");
      }, 3000);
    },
    [onUploadError]
  );

  const simulateUpload = useCallback(
    (uploadingFile: File) => {
      let currentProgress = 0;
      if (uploadIntervalRef.current) clearInterval(uploadIntervalRef.current);
      uploadIntervalRef.current = setInterval(
        () => {
          currentProgress += UPLOAD_STEP_SIZE;
          if (currentProgress >= 100) {
            if (uploadIntervalRef.current) clearInterval(uploadIntervalRef.current);
            setProgress(100);
            setStatus("idle");
            setFile(null);
            setProgress(0);
            onUploadSuccess?.(uploadingFile);
          } else {
            setProgress(currentProgress);
          }
        },
        uploadDelay / (100 / UPLOAD_STEP_SIZE)
      );
    },
    [onUploadSuccess, uploadDelay]
  );

  const handleFileSelect = useCallback(
    (selectedFile: File | null) => {
      if (!selectedFile) return;
      setError(null);
      const sizeError = validateFileSize(selectedFile);
      if (sizeError) return handleError(sizeError);
      const typeError = validateFileType(selectedFile);
      if (typeError) return handleError(typeError);
      const customError = validateFile?.(selectedFile);
      if (customError) return handleError(customError);

      setFile(selectedFile);
      if (uploadDelay > 0) {
        setStatus("uploading");
        setProgress(0);
        simulateUpload(selectedFile);
      } else {
        // No simulation — hand the file straight to the caller.
        setFile(null);
        setStatus("idle");
        onUploadSuccess?.(selectedFile);
      }
    },
    [simulateUpload, validateFileSize, validateFileType, validateFile, handleError, uploadDelay, onUploadSuccess]
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setStatus((prev) => (prev !== "uploading" ? "dragging" : prev));
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setStatus((prev) => (prev === "dragging" ? "idle" : prev));
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (status === "uploading") return;
      setStatus("idle");
      const droppedFile = e.dataTransfer.files?.[0];
      if (droppedFile) handleFileSelect(droppedFile);
    },
    [status, handleFileSelect]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      handleFileSelect(selectedFile || null);
      if (e.target) e.target.value = "";
    },
    [handleFileSelect]
  );

  const triggerFileInput = useCallback(() => {
    if (status === "uploading") return;
    fileInputRef.current?.click();
  }, [status]);

  const resetState = useCallback(() => {
    if (uploadIntervalRef.current) clearInterval(uploadIntervalRef.current);
    setFile(null);
    setStatus("idle");
    setProgress(0);
    onFileRemove?.();
  }, [onFileRemove]);

  const acceptLabel = acceptedFileTypes?.length
    ? acceptedFileTypes.map((t) => t.replace(/^\./, "").split("/").pop()).join(", ").toUpperCase()
    : "SVG, PNG, JPG or GIF";

  return (
    <div
      aria-label="File upload"
      className={cn("relative mx-auto w-full max-w-md", className || "")}
      role="complementary"
    >
      <div
        className={cn(
          "group relative w-full rounded-xl bg-bg-surface p-0.5 ring-1 ring-border-main transition-colors",
          status === "dragging" && "ring-brand-purple"
        )}
      >
        <div className="absolute inset-x-0 -top-px h-px w-full bg-gradient-to-r from-transparent via-brand-purple/40 to-transparent" />

        <div className="relative w-full rounded-[10px] bg-bg-sunken/40 p-1.5">
          <div
            className={cn(
              "relative mx-auto min-h-[260px] w-full overflow-hidden rounded-lg border border-border-subtle bg-bg-base/50",
              error ? "border-hash-red/50" : ""
            )}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div
              className={cn(
                "absolute inset-0 transition-opacity duration-300",
                status === "dragging" ? "opacity-100" : "opacity-0"
              )}
            >
              <div className="absolute inset-x-0 top-0 h-[20%] bg-gradient-to-b from-brand-purple/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-[20%] bg-gradient-to-t from-brand-purple/10 to-transparent" />
            </div>

            <AnimatePresence mode="wait">
              {status === "idle" || status === "dragging" || status === "error" ? (
                <motion.div
                  animate={{ opacity: 1, y: 0, scale: status === "dragging" ? 0.98 : 1 }}
                  className="absolute inset-0 flex flex-col items-center justify-center p-6"
                  exit={{ opacity: 0, y: -10 }}
                  initial={{ opacity: 0, y: 10 }}
                  key="dropzone"
                  transition={{ duration: 0.2 }}
                >
                  <div className="mb-4">
                    <UploadIllustration />
                  </div>
                  <div className="mb-4 space-y-1.5 text-center">
                    <h3 className="font-display font-semibold text-txt-primary text-lg tracking-tight">
                      Drag and drop or
                    </h3>
                    <p className="font-mono text-txt-muted text-xs uppercase tracking-wider">
                      {hint || `${acceptLabel} ${maxFileSize ? `up to ${formatBytes(maxFileSize)}` : ""}`}
                    </p>
                  </div>
                  <button
                    className="group/btn flex w-4/5 items-center justify-center gap-2 rounded-lg bg-brand-purple px-4 py-2.5 font-semibold text-white text-sm transition-colors duration-200 hover:bg-brand-purple-dim cursor-pointer"
                    onClick={triggerFileInput}
                    type="button"
                  >
                    <span>Upload File</span>
                    <UploadCloud className="h-4 w-4 transition-transform duration-200 group-hover/btn:scale-110" />
                  </button>
                  <input
                    accept={acceptedFileTypes?.join(",")}
                    aria-label="File input"
                    className="sr-only"
                    onChange={handleFileInputChange}
                    ref={fileInputRef}
                    type="file"
                  />
                </motion.div>
              ) : status === "uploading" ? (
                <motion.div
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-0 flex flex-col items-center justify-center p-6"
                  exit={{ opacity: 0, scale: 0.95 }}
                  initial={{ opacity: 0, scale: 0.95 }}
                  key="uploading"
                >
                  <div className="mb-4">
                    <UploadingAnimation progress={progress} />
                  </div>
                  <div className="mb-4 space-y-1.5 text-center">
                    <h3 className="truncate font-semibold text-txt-primary text-sm max-w-[240px]">
                      {file?.name}
                    </h3>
                    <div className="flex items-center justify-center gap-2 text-xs">
                      <span className="text-txt-muted font-mono">{formatBytes(file?.size || 0)}</span>
                      <span className="font-medium text-brand-purple">{Math.round(progress)}%</span>
                    </div>
                  </div>
                  <button
                    className="flex w-4/5 items-center justify-center gap-2 rounded-lg border border-border-main px-4 py-2.5 font-semibold text-txt-secondary text-sm transition-colors duration-200 hover:text-txt-primary hover:border-border-strong cursor-pointer"
                    onClick={resetState}
                    type="button"
                  >
                    Cancel
                  </button>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence>
              {error && (
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 transform rounded-lg border border-hash-red/20 bg-hash-red/10 px-4 py-2"
                  exit={{ opacity: 0, y: -10 }}
                  initial={{ opacity: 0, y: 10 }}
                >
                  <p className="text-hash-red text-sm">{error.message}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

FileUpload.displayName = "FileUpload";

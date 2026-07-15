import { Link } from "react-router-dom";
import { ExternalLink, GraduationCap, MapPin, MessageSquare, Package, Star } from "lucide-react";
import { TalentEntry, tierBadgeClass } from "./talent";

// One talent result card — used by both the Search & Verify results grid and the
// "Discover talent" feed. Actions: star (client-side shortlist), message
// (credit-gated chat), view profile (only when the candidate has a credchainId,
// since /verify/:candidateId resolves profiles by credchainId).

function getInitials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]?.slice(0, 2).toUpperCase() || "";
  return ((parts[0]?.[0] || "") + (parts[parts.length - 1]?.[0] || "")).toUpperCase();
}

export default function TalentCard({
  entry,
  shortlisted,
  onToggleShortlist,
  onMessage,
  messaging,
}: {
  entry: TalentEntry;
  shortlisted: boolean;
  onToggleShortlist: (entry: TalentEntry) => void;
  onMessage: (entry: TalentEntry) => void;
  /** userId of the candidate currently being messaged (disables that button). */
  messaging?: string | null;
}) {
  const isMessaging = messaging === entry.userId;
  return (
    <div className="bg-bg-surface border border-border-main hover:border-border-strong rounded-lg p-5 flex flex-col gap-4 transition-colors text-left">
      {/* Head: avatar + name + score */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-md bg-role-verifier-soft text-role-verifier border border-border-main font-mono font-bold text-sm flex items-center justify-center flex-shrink-0">
            {getInitials(entry.name)}
          </div>
          <div className="min-w-0">
            <div className="font-display font-semibold text-[15px] text-txt-primary truncate">{entry.name}</div>
            {entry.headline && <div className="text-xs text-txt-secondary truncate mt-0.5">{entry.headline}</div>}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="font-display font-bold text-lg text-txt-primary leading-none">
            {typeof entry.credScore === "number" ? entry.credScore : "—"}
          </div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-txt-muted mt-1">CredScore</div>
        </div>
      </div>

      {/* Tier + delivery stats */}
      <div className="flex flex-wrap items-center gap-2">
        {entry.highestTier && (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-sm border text-[10px] font-mono uppercase font-semibold ${tierBadgeClass(entry.highestTier)}`}>
            {entry.highestTier}
          </span>
        )}
        {typeof entry.deliveriesCompleted === "number" && (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-txt-muted">
            <Package className="w-3 h-3" /> {entry.deliveriesCompleted} deliveries
          </span>
        )}
      </div>

      {/* Skills */}
      {entry.skillTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {entry.skillTags.slice(0, 5).map((t) => (
            <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded-sm bg-brand-purple-soft text-txt-secondary border border-border-subtle">
              {t}
            </span>
          ))}
        </div>
      )}

      {/* University / location */}
      {(entry.university || entry.location) && (
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-txt-muted">
          {entry.university && (
            <span className="inline-flex items-center gap-1 min-w-0">
              <GraduationCap className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{entry.university}</span>
            </span>
          )}
          {entry.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {entry.location}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-border-main mt-auto">
        <button
          type="button"
          onClick={() => onMessage(entry)}
          disabled={isMessaging}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-md bg-brand-purple hover:bg-brand-purple-dim text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          {isMessaging ? "Opening…" : "Message"}
        </button>
        {entry.credchainId ? (
          <Link
            to={`/verify/${encodeURIComponent(entry.credchainId)}`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-md border border-border-main hover:border-role-verifier text-txt-primary text-xs font-semibold transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View profile
          </Link>
        ) : (
          <button
            type="button"
            disabled
            title="No public CredChain ID on file"
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-md border border-border-main text-txt-muted text-xs font-semibold opacity-50 cursor-not-allowed"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View profile
          </button>
        )}
        <button
          type="button"
          onClick={() => onToggleShortlist(entry)}
          aria-label={shortlisted ? "Remove from shortlist" : "Save to shortlist"}
          title={shortlisted ? "Remove from shortlist" : "Save to shortlist"}
          className={`inline-flex items-center justify-center w-8 h-8 rounded-md border transition-colors cursor-pointer ${
            shortlisted
              ? "border-role-verifier text-role-verifier bg-role-verifier-soft"
              : "border-border-main text-txt-muted hover:text-role-verifier hover:border-role-verifier"
          }`}
        >
          <Star className="w-3.5 h-3.5" fill={shortlisted ? "currentColor" : "none"} />
        </button>
      </div>
    </div>
  );
}

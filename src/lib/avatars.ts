// Client-side avatar store.
//
// Avatars are persisted per-browser: FileReader → data-URL → localStorage
// under `cc_avatar_<userId>`. localStorage stays the source of truth for
// instant UI; student avatars are additionally synced best-effort to the
// backend (User.avatar) so shared public portfolio links can show them.
// Seeded demo identities (Amara, Emeka, FUTO) fall back to bundled images
// when no upload exists.

import amaraAvatar from "../assets/avatars/amara.jpg";
import emekaAvatar from "../assets/avatars/emeka.jpg";
import futoLogo from "../assets/logos/futo.png";
import { updateStudentProfile } from "../services/api";

const KEY_PREFIX = "cc_avatar_";

/** Max upload size — data-URLs live in localStorage, so keep them small. */
export const MAX_AVATAR_BYTES = 300 * 1024;

export const ACCEPTED_AVATAR_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
];

export function saveAvatar(userId: string, dataUrl: string): void {
  try {
    localStorage.setItem(`${KEY_PREFIX}${userId}`, dataUrl);
  } catch {
    // Quota exceeded — the 300KB cap makes this unlikely; fail quietly.
  }
}

export function loadAvatar(userId: string): string | null {
  try {
    return localStorage.getItem(`${KEY_PREFIX}${userId}`);
  } catch {
    return null;
  }
}

export function clearAvatar(userId: string): void {
  try {
    localStorage.removeItem(`${KEY_PREFIX}${userId}`);
  } catch {
    // ignore
  }
}

/**
 * Best-effort sync of a student's avatar to the backend so shared public
 * portfolio links (/verify/:credchainId) can render it. localStorage remains
 * the source of truth for instant UI — failures here are swallowed.
 */
export async function syncAvatarToBackend(userId: string, dataUrl: string): Promise<void> {
  try {
    await updateStudentProfile({ id: userId, avatar: dataUrl });
  } catch {
    // Offline / mock mode / validation failure — local avatar still works.
  }
}

/**
 * Validate a picked file for avatar use. Returns an error message, or null
 * when the file is acceptable.
 */
export function validateAvatarFile(file: File): string | null {
  if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
    return "Please choose a PNG, JPEG, WebP, or SVG image.";
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return `That image is ${Math.round(file.size / 1024)}KB — please pick one under 300KB.`;
  }
  return null;
}

/** Read a validated file into a data-URL. */
export function readAvatarFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the selected image."));
    reader.readAsDataURL(file);
  });
}

export interface AvatarUser {
  id?: string | null;
  email?: string | null;
  name?: string | null;
}

// Seeded demo identities → bundled images.
const SEEDED_BY_EMAIL: Record<string, string> = {
  "demo-student@credchain.demo": amaraAvatar,
};

/**
 * Resolve the avatar for a user. Precedence:
 *   1. per-browser uploaded avatar (localStorage)
 *   2. seeded demo map (email / name / issuer heuristics)
 *   3. null → caller renders initials
 */
export function getAvatarFor(user: AvatarUser | null | undefined): string | null {
  if (!user) return null;

  if (user.id) {
    const uploaded = loadAvatar(String(user.id));
    if (uploaded) return uploaded;
  }

  const email = (user.email || "").toLowerCase().trim();
  if (email && SEEDED_BY_EMAIL[email]) return SEEDED_BY_EMAIL[email];

  const name = (user.name || "").toLowerCase();
  if (name.includes("amara")) return amaraAvatar;
  if (name.includes("emeka")) return emekaAvatar;
  if (name.includes("futo") || name.includes("federal university of technology owerri")) {
    return futoLogo;
  }

  return null;
}

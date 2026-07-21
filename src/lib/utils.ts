// Class-name join helper used by the kokonutui-derived components
// (FileUpload, Loader, SpotlightCards). Dependency-free: flattens truthy
// class values into a single space-joined string. We deliberately avoid
// clsx/tailwind-merge here so these components add no runtime dependency —
// callers just shouldn't pass directly-conflicting Tailwind utilities.
export type ClassValue =
  | string
  | number
  | null
  | false
  | undefined
  | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  const walk = (v: ClassValue) => {
    if (!v && v !== 0) return;
    if (Array.isArray(v)) {
      v.forEach(walk);
    } else if (typeof v === "string" || typeof v === "number") {
      out.push(String(v));
    }
  };
  inputs.forEach(walk);
  return out.join(" ");
}

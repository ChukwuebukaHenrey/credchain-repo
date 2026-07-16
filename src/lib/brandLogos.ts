// Brand / institution logo lookup — case-insensitive substring match on the
// company or institution name. Returns a bundled asset URL or null (caller
// falls back to its existing emoji / icon rendering).

import paystackLogo from "../assets/logos/paystack.svg";
import flutterwaveLogo from "../assets/logos/flutterwave.svg";
import andelaLogo from "../assets/logos/andela.svg";
import cowrywiseLogo from "../assets/logos/cowrywise.svg";
import monoLogo from "../assets/logos/mono.svg";
import futoLogo from "../assets/logos/futo.png";

const BRAND_LOGOS: Array<{ match: string; src: string }> = [
  { match: "paystack", src: paystackLogo },
  { match: "flutterwave", src: flutterwaveLogo },
  { match: "andela", src: andelaLogo },
  { match: "cowrywise", src: cowrywiseLogo },
  { match: "federal university of technology owerri", src: futoLogo },
  { match: "futo", src: futoLogo },
  // "mono" is a common substring — keep it last and require a word boundary.
  { match: "mono", src: monoLogo },
];

export function getBrandLogo(name?: string | null): string | null {
  if (!name) return null;
  const n = name.toLowerCase();
  for (const { match, src } of BRAND_LOGOS) {
    if (match === "mono") {
      if (new RegExp(`\\bmono\\b`).test(n)) return src;
    } else if (n.includes(match)) {
      return src;
    }
  }
  return null;
}

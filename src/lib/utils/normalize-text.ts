/**
 * Unicode text normalisation utility.
 *
 * Converts "fancy" Unicode characters back to their plain Latin equivalents
 * so that CSS `text-transform: lowercase` works reliably.
 *
 * Handles:
 * - Mathematical Alphanumeric Symbols (bold, italic, script, fraktur, etc.)
 * - Fullwidth Latin letters
 * - Enclosed / circled letters
 * - Small caps (ᴀʙᴄ…)
 * - Turned / upside-down characters (ɐɹɥ…)
 * - Zalgo / combining diacritical marks (excessive stacking)
 * - Other common "fancy text generator" substitutions
 */

// Characters that NFKD normalisation does not decompose.
// Maps Unicode code-point → plain ASCII equivalent.
const CHAR_MAP: Record<string, string> = {
  // ── Small Caps ────────────────────────────────────────
  "\u1D00": "a", // ᴀ
  "\u0299": "b", // ʙ
  "\u1D04": "c", // ᴄ
  "\u1D05": "d", // ᴅ
  "\u1D07": "e", // ᴇ
  "\uA730": "f", // ꜰ
  "\u0262": "g", // ɢ
  "\u029C": "h", // ʜ
  "\u026A": "i", // ɪ
  "\u1D0A": "j", // ᴊ
  "\u1D0B": "k", // ᴋ
  "\u029F": "l", // ʟ
  "\u1D0D": "m", // ᴍ
  "\u0274": "n", // ɴ
  "\u1D0F": "o", // ᴏ
  "\u1D18": "p", // ᴘ
  "\u0280": "r", // ʀ
  "\uA731": "s", // ꜱ
  "\u1D1B": "t", // ᴛ
  "\u1D1C": "u", // ᴜ
  "\u1D20": "v", // ᴠ
  "\u1D21": "w", // ᴡ
  "\u028F": "y", // ʏ
  "\u1D22": "z", // ᴢ

  // ── Turned / Upside-down ──────────────────────────────
  "\u0250": "a", // ɐ (turned a)
  "\u0279": "r", // ɹ (turned r)
  "\u0265": "h", // ɥ (turned h)
  "\u028D": "w", // ʍ (turned w)
  "\u0287": "t", // ʇ (turned t)
  "\u025F": "f", // ɟ (turned f / barred dotless j)
  "\u029E": "k", // ʞ (turned k)
  "\u01DD": "e", // ǝ (turned e)
  "\u1D09": "i", // ᴉ (turned i)
  "\u026F": "m", // ɯ (turned m)
  "\u028E": "y", // ʎ (turned y)
  "\u028C": "v", // ʌ (turned v)
  "\u0252": "a", // ɒ (turned alpha)
  "\u0254": "c", // ɔ (open o, used as turned c)
  "\u025E": "e", // ɞ (closed reversed open e)
  "\u1D02": "ae", // ᴂ (turned ae)

  // ── Modifier / Subscript / Superscript letters ────────
  "\u1D43": "a", // ᵃ
  "\u1D47": "b", // ᵇ
  "\u1D9C": "c", // ᶜ
  "\u1D48": "d", // ᵈ
  "\u1D49": "e", // ᵉ
  "\u1DA0": "f", // ᶠ
  "\u1D4D": "g", // ᵍ
  "\u02B0": "h", // ʰ
  "\u2071": "i", // ⁱ
  "\u02B2": "j", // ʲ
  "\u1D4F": "k", // ᵏ
  "\u02E1": "l", // ˡ
  "\u1D50": "m", // ᵐ
  "\u207F": "n", // ⁿ
  "\u1D52": "o", // ᵒ
  "\u1D56": "p", // ᵖ
  "\u02B3": "r", // ʳ
  "\u02E2": "s", // ˢ
  "\u1D57": "t", // ᵗ
  "\u1D58": "u", // ᵘ
  "\u1D5B": "v", // ᵛ
  "\u02B7": "w", // ʷ
  "\u02E3": "x", // ˣ
  "\u02B8": "y", // ʸ
  "\u1DBB": "z", // ᶻ
};

// Build a single regex that matches any character in the map.
const CHAR_MAP_REGEX = new RegExp(
  "[" + Object.keys(CHAR_MAP).join("") + "]",
  "g",
);

const URL_REGEX = /https?:\/\/[^\s<>)"]+/gi;
// Combining marks commonly used in European languages (diacritics).
// Only these are preserved; everything else (zalgo stacking) is stripped.
const ALLOWED_COMBINING_MARKS = new Set([
  0x0300, // Combining Grave Accent        (è, à)
  0x0301, // Combining Acute Accent         (é, á)
  0x0302, // Combining Circumflex Accent    (ê, â)
  0x0303, // Combining Tilde                (ñ, ã)
  0x0304, // Combining Macron               (ā)
  0x0306, // Combining Breve                (ă)
  0x0307, // Combining Dot Above            (ė)
  0x0308, // Combining Diaeresis            (ä, ö, ü)
  0x0309, // Combining Hook Above           (ả — Vietnamese)
  0x030A, // Combining Ring Above           (å — Scandinavian)
  0x030B, // Combining Double Acute Accent  (ő, ű — Hungarian)
  0x030C, // Combining Caron                (č, š, ž)
  0x0323, // Combining Dot Below            (ệ — Vietnamese)
  0x0327, // Combining Cedilla              (ç)
  0x0328, // Combining Ogonek               (ą, ę — Polish)
]);

// Combining marks that are valid and commonly used after non-letter bases
// in emoji/symbol sequences. Keep these so we do not mangle inputs like:
// ❤️, 1️⃣, *️⃣, 🏳️‍🌈
const ALLOWED_NON_LETTER_MARKS = new Set([
  0xFE0E, // Variation Selector-15 (text presentation)
  0xFE0F, // Variation Selector-16 (emoji presentation)
  0x20E3, // Combining Enclosing Keycap
]);

// Max allowed combining marks per base letter (covers Vietnamese ệ = e + ̣ + ̂).
const MAX_COMBINING_MARKS_PER_LETTER = 2;

// Matches a non-combining character followed by one or more combining marks.
const COMBINING_CLUSTER_REGEX = /(\P{M})(\p{M}+)/gu;

// If a base character carries more total marks than this, it is zalgo
// and ALL marks are stripped (even individually whitelisted ones).
const ZALGO_THRESHOLD = 2;

/**
 * Strip combining marks that are not standard European diacritics.
 * - Non-letter bases (digits, punctuation): all marks removed.
 * - Letter bases with excessive marks (> {@link ZALGO_THRESHOLD}): all removed (zalgo).
 * - Letter bases with few marks: only whitelisted marks kept,
 *   up to {@link MAX_COMBINING_MARKS_PER_LETTER}.
 */
function cleanCombiningMarks(text: string): string {
  return text.replace(
    COMBINING_CLUSTER_REGEX,
    (_match, base: string, marks: string) => {
      // Preserve emoji/symbol presentation marks on non-letter bases,
      // but strip unrelated combining marks such as punctuation zalgo.
      if (!/\p{L}/u.test(base)) {
        let kept = "";
        for (const mark of marks) {
          const cp = mark.codePointAt(0)!;
          if (ALLOWED_NON_LETTER_MARKS.has(cp)) {
            kept += mark;
          }
        }
        return base + kept;
      }

      // Too many marks → zalgo: strip everything.
      const totalMarks = [...marks].length;
      if (totalMarks > ZALGO_THRESHOLD) return base;

      // Keep only whitelisted marks, up to the per-letter limit.
      let kept = "";
      let count = 0;
      for (const mark of marks) {
        if (count >= MAX_COMBINING_MARKS_PER_LETTER) break;
        const cp = mark.codePointAt(0)!;
        if (ALLOWED_COMBINING_MARKS.has(cp)) {
          kept += mark;
          count++;
        }
      }
      return base + kept;
    },
  );
}

/**
 * Normalise user-supplied text to plain Latin characters.
 *
 * 1. NFKD decomposition — resolves mathematical alphanumerics, fullwidth
 *    forms, enclosed letters, and many other compatibility mappings.
 * 2. Manual character map — replaces small-caps, turned / upside-down,
 *    and modifier letters that NFKD does not cover.
 * 3. Combining-mark cleaning — removes non-standard combining marks
 *    (zalgo stacking) while preserving legitimate diacritics (ä, ö, ü, é…).
 * 4. NFC re-composition — recombines base + diacritic into proper
 *    composed characters (e.g. a + ̈ → ä).
 * 5. Lowercase conversion — final safety net.
 */
export function normalizeText(text: string): string {
  const matches = Array.from(text.matchAll(URL_REGEX));
  if (matches.length === 0) {
    return normalizeTextSegment(text);
  }

  let result = "";
  let lastIndex = 0;

  for (const match of matches) {
    const index = match.index!;
    const url = match[0];

    if (index > lastIndex) {
      result += normalizeTextSegment(text.slice(lastIndex, index));
    }

    result += url;
    lastIndex = index + url.length;
  }

  if (lastIndex < text.length) {
    result += normalizeTextSegment(text.slice(lastIndex));
  }

  return result;
}

function normalizeTextSegment(text: string): string {
  let result = text;

  // Step 1 — NFKD decomposition
  result = result.normalize("NFKD");

  // Step 2 — manual replacements for chars NFKD misses
  result = result.replace(CHAR_MAP_REGEX, (ch) => CHAR_MAP[ch] ?? ch);

  // Step 3 — clean combining marks (whitelist + limit per base char)
  result = cleanCombiningMarks(result);

  // Step 4 — NFC re-composition (a + ̈ → ä)
  result = result.normalize("NFC");

  // Step 5 — lowercase
  result = result.toLowerCase();

  return result;
}

import { describe, it, expect } from "vitest";
import { normalizeText } from "./normalize-text";

describe("normalizeText", () => {
  // ── Mathematical Alphanumeric Symbols ───────────────────────────

  it("normalises mathematical bold italic to plain lowercase", () => {
    const input =
      "𝑩𝒆𝒔𝒕𝒆𝒔 𝑭𝒆𝒂𝒕𝒖𝒓𝒆 𝒎𝒊𝒕 𝒅𝒆𝒏 𝒏𝒆𝒖𝒆𝒏 𝑺𝒄𝒉𝒓𝒊𝒇𝒕𝒂𝒓𝒕𝒆𝒏. 𝑺𝒖𝒑𝒆𝒓 𝒆𝒊𝒏𝒇𝒂𝒄𝒉 𝒛𝒖 𝒂𝒌𝒕𝒊𝒗𝒊𝒆𝒓𝒆𝒏";
    expect(normalizeText(input)).toBe(
      "bestes feature mit den neuen schriftarten. super einfach zu aktivieren",
    );
  });

  it("normalises mathematical bold to plain lowercase", () => {
    expect(normalizeText("𝐇𝐞𝐥𝐥𝐨")).toBe("hello");
  });

  it("normalises mathematical italic to plain lowercase", () => {
    expect(normalizeText("𝐻𝑒𝑙𝑙𝑜")).toBe("hello");
  });

  it("normalises mathematical script to plain lowercase", () => {
    expect(normalizeText("𝒽ℯ𝓁𝓁ℴ")).toBe("hello");
  });

  it("normalises mathematical fraktur to plain lowercase", () => {
    expect(normalizeText("𝔥𝔢𝔩𝔩𝔬")).toBe("hello");
  });

  it("normalises mathematical double-struck to plain lowercase", () => {
    expect(normalizeText("𝕙𝕖𝕝𝕝𝕠")).toBe("hello");
  });

  it("normalises mathematical sans-serif to plain lowercase", () => {
    expect(normalizeText("𝖧𝖾𝗅𝗅𝗈")).toBe("hello");
  });

  it("normalises mathematical monospace to plain lowercase", () => {
    expect(normalizeText("𝙷𝚎𝚕𝚕𝚘")).toBe("hello");
  });

  // ── Upside-down / Turned characters ─────────────────────────────

  it("normalises upside-down text", () => {
    const input = "sɹɥoʍʇ ɟnɐ ɟdoʞ ʇlǝʍ ǝᴉp ʇɥǝʇs ǝʇnǝɥ";
    expect(normalizeText(input)).toBe(
      "srhowt fna fdok tlew eip thets etneh",
    );
  });

  it("normalises individual turned characters", () => {
    expect(normalizeText("ɐɹɥʍʇɟʞǝᴉɯʎʌ")).toBe("arhwtfkeimyv");
  });

  // ── Small Caps ──────────────────────────────────────────────────

  it("normalises small caps to plain lowercase", () => {
    const input = "ᴡᴇɴɴ ʟᴏʀɪꜱ ᴠᴇʀꜱᴜᴄʜᴛ ɢʀᴏßʙᴜᴄʜꜱᴛᴀʙᴇɴ ᴢᴜ ʙʟᴏᴄᴋᴇɴ";
    expect(normalizeText(input)).toBe(
      "wenn loris versucht großbuchstaben zu blocken",
    );
  });

  it("normalises all small cap letters", () => {
    expect(normalizeText("ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘʀꜱᴛᴜᴠᴡʏᴢ")).toBe(
      "abcdefghijklmnoprstuvwyz",
    );
  });

  // ── Zalgo / Combining marks ─────────────────────────────────────

  it("strips zalgo combining marks", () => {
    const input =
      "Ṱ̺̺̕o͞ ̷i̲̬͇̪͙n̝̗͕v̟̜̘̦͟o̶̙̰̠kè͚̮̺̪̹̱̤ ̖t̝͕̳̣̻̪͞h̼͓̲̦̳̘̲e͇̣̰̦̬͎ ̢̼̻̱̘h͚͎͙̜̣̲ͅi̦̲̣̰̤v̻͍e̺̭̳̪̰-m̢iͅn̖̺̞̲̯̰d̵̼̟͙̩̼̘̳ ̞̥̱̳̭r̛̗̘e͙p͠r̼̞̻̭̗e̺̠̣͟s̘͇̳͍̝͉e͉̥̯̞̲͚̬͜ǹ̬͎͎̟̖͇̤t͍̬̤͓̼̭͘ͅi̪̱n͠g̴͉ ͏͉ͅc̬̟h͡a̫̻̯͘o̫̟̖͍̙̝͉s̗̦̲.̨̹͈̣";
    const result = normalizeText(input);
    expect(result).toBe("to invoke the hive-mind representing chaos.");
  });

  it("strips moderate zalgo (3+ marks per character)", () => {
    // h with 3 combining marks → should strip all
    expect(normalizeText("h\u0300\u0301\u0302")).toBe("h");
  });

  // ── Fullwidth ───────────────────────────────────────────────────

  it("normalises fullwidth Latin to plain lowercase", () => {
    expect(normalizeText("Ｈｅｌｌｏ Ｗｏｒｌｄ")).toBe("hello world");
  });

  // ── Enclosed / Circled ──────────────────────────────────────────

  it("normalises circled letters to plain lowercase", () => {
    expect(normalizeText("Ⓗⓔⓛⓛⓞ")).toBe("hello");
  });

  // ── Modifier / Superscript letters ──────────────────────────────

  it("normalises modifier/superscript letters", () => {
    expect(normalizeText("ᵃᵇᶜᵈᵉ")).toBe("abcde");
  });

  // ── German text preservation ────────────────────────────────────

  it("preserves German umlauts", () => {
    expect(normalizeText("Größe")).toBe("größe");
    expect(normalizeText("Übung")).toBe("übung");
    expect(normalizeText("Ärger")).toBe("ärger");
  });

  it("preserves ß", () => {
    expect(normalizeText("Straße")).toBe("straße");
  });

  it("preserves common European diacritics", () => {
    expect(normalizeText("café")).toBe("café");
    expect(normalizeText("naïve")).toBe("naïve");
    expect(normalizeText("señor")).toBe("señor");
  });

  // ── Passthrough ─────────────────────────────────────────────────

  it("returns empty string unchanged", () => {
    expect(normalizeText("")).toBe("");
  });

  it("does not alter plain ASCII text", () => {
    expect(normalizeText("hello world! 123")).toBe("hello world! 123");
  });

  it("lowercases normal uppercase text", () => {
    expect(normalizeText("HELLO WORLD")).toBe("hello world");
  });

  it("preserves @mentions", () => {
    expect(normalizeText("hey @loris check this")).toBe(
      "hey @loris check this",
    );
  });

  it("preserves #hashtags", () => {
    expect(normalizeText("love #memes")).toBe("love #memes");
  });

  it("preserves URLs", () => {
    expect(normalizeText("check https://example.com/path?q=1")).toBe(
      "check https://example.com/path?q=1",
    );
  });

  it("preserves emoji", () => {
    expect(normalizeText("hello 🎉🔥")).toBe("hello 🎉🔥");
  });

  // ── Mixed content ───────────────────────────────────────────────

  it("normalises mixed fancy + normal text", () => {
    expect(normalizeText("ᴡᴏᴡ that is 𝒄𝒐𝒐𝒍")).toBe("wow that is cool");
  });

  it("normalises fancy text with @mentions and #hashtags", () => {
    expect(normalizeText("ʜᴇʏ @loris #ᴛᴇꜱᴛ")).toBe("hey @loris #test");
  });

  // ── Edge cases ──────────────────────────────────────────────────

  it("handles legitimate single combining mark (accented chars)", () => {
    // è = e + combining grave (1 mark, whitelisted)
    expect(normalizeText("e\u0300")).toBe("è");
  });

  it("handles legitimate double combining marks", () => {
    // Vietnamese ệ = e + combining dot below + combining circumflex (2 marks)
    expect(normalizeText("e\u0323\u0302")).toBe("ệ");
  });

  it("strips non-whitelisted single combining mark", () => {
    // e + combining bridge below (not in whitelist) → e
    expect(normalizeText("e\u033A")).toBe("e");
  });

  it("strips combining marks from non-letter base", () => {
    // period + combining diaeresis → period (no marks on non-letters)
    expect(normalizeText(".\u0308")).toBe(".");
  });
});

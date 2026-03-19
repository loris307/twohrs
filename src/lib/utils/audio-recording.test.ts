import { describe, it, expect, afterEach } from "vitest";
import {
  normaliseRecordedAudioMimeType,
  getAudioExtensionFromMime,
  isValidRecordedDuration,
  selectSupportedAudioRecorderConfig,
} from "./audio-recording";
import { detectAudioMime } from "./audio-magic-bytes";

// ── MIME normalisation ──────────────────────────────────────────

describe("normaliseRecordedAudioMimeType", () => {
  it("strips codecs param from audio/webm;codecs=opus", () => {
    expect(normaliseRecordedAudioMimeType("audio/webm;codecs=opus")).toBe("audio/webm");
  });

  it("strips codecs param from audio/ogg;codecs=opus", () => {
    expect(normaliseRecordedAudioMimeType("audio/ogg;codecs=opus")).toBe("audio/ogg");
  });

  it("strips codecs param from audio/mp4;codecs=mp4a.40.2", () => {
    expect(normaliseRecordedAudioMimeType("audio/mp4;codecs=mp4a.40.2")).toBe("audio/mp4");
  });

  it("returns base MIME unchanged if no codecs param", () => {
    expect(normaliseRecordedAudioMimeType("audio/webm")).toBe("audio/webm");
    expect(normaliseRecordedAudioMimeType("audio/mp4")).toBe("audio/mp4");
  });

  it("handles whitespace around the type", () => {
    expect(normaliseRecordedAudioMimeType(" audio/webm ; codecs=opus ")).toBe("audio/webm");
  });

  it("falls back to audio/webm for unknown types", () => {
    expect(normaliseRecordedAudioMimeType("audio/flac")).toBe("audio/webm");
  });
});

// ── Extension mapping ───────────────────────────────────────────

describe("getAudioExtensionFromMime", () => {
  it("maps audio/webm to webm", () => {
    expect(getAudioExtensionFromMime("audio/webm")).toBe("webm");
  });

  it("maps audio/ogg to ogg", () => {
    expect(getAudioExtensionFromMime("audio/ogg")).toBe("ogg");
  });

  it("maps audio/mp4 to m4a", () => {
    expect(getAudioExtensionFromMime("audio/mp4")).toBe("m4a");
  });

  it("falls back to webm for unknown", () => {
    expect(getAudioExtensionFromMime("audio/flac")).toBe("webm");
  });
});

// ── Duration validation ─────────────────────────────────────────

describe("isValidRecordedDuration", () => {
  it("accepts 1 ms", () => {
    expect(isValidRecordedDuration(1)).toBe(true);
  });

  it("accepts exactly 10_000 ms", () => {
    expect(isValidRecordedDuration(10_000)).toBe(true);
  });

  it("accepts 5_000 ms", () => {
    expect(isValidRecordedDuration(5_000)).toBe(true);
  });

  it("rejects 0 ms", () => {
    expect(isValidRecordedDuration(0)).toBe(false);
  });

  it("rejects negative duration", () => {
    expect(isValidRecordedDuration(-100)).toBe(false);
  });

  it("rejects 10_001 ms (over limit)", () => {
    expect(isValidRecordedDuration(10_001)).toBe(false);
  });
});

// ── Magic bytes detection ───────────────────────────────────────

describe("detectAudioMime", () => {
  it("detects OGG from OggS header", () => {
    const buf = new Uint8Array([0x4f, 0x67, 0x67, 0x53, 0, 0, 0, 0, 0, 0, 0, 0]).buffer;
    expect(detectAudioMime(buf)).toBe("audio/ogg");
  });

  it("detects WebM from EBML header", () => {
    const buf = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0, 0, 0, 0, 0]).buffer;
    expect(detectAudioMime(buf)).toBe("audio/webm");
  });

  it("detects MP4 from ftyp box", () => {
    // ftyp at offset 4: [size_bytes(4)] [f][t][y][p] [brand...]
    const buf = new Uint8Array([0, 0, 0, 0x1c, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]).buffer;
    expect(detectAudioMime(buf)).toBe("audio/mp4");
  });

  it("returns null for too-short buffer", () => {
    const buf = new Uint8Array([0x4f, 0x67]).buffer;
    expect(detectAudioMime(buf)).toBeNull();
  });

  it("returns null for unknown format", () => {
    const buf = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]).buffer;
    expect(detectAudioMime(buf)).toBeNull();
  });

  it("returns null for JPEG magic bytes (not audio)", () => {
    const buf = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]).buffer;
    expect(detectAudioMime(buf)).toBeNull();
  });
});

// ── selectSupportedAudioRecorderConfig ──────────────────────────

describe("selectSupportedAudioRecorderConfig", () => {
  const originalMediaRecorder = globalThis.MediaRecorder;

  afterEach(() => {
    if (originalMediaRecorder) {
      globalThis.MediaRecorder = originalMediaRecorder;
    } else {
      // @ts-expect-error — restoring undefined
      delete globalThis.MediaRecorder;
    }
  });

  it("returns null when MediaRecorder is undefined", () => {
    // @ts-expect-error — simulating absence
    delete globalThis.MediaRecorder;
    expect(selectSupportedAudioRecorderConfig()).toBeNull();
  });

  it("selects webm+opus when supported (Chrome)", () => {
    globalThis.MediaRecorder = {
      isTypeSupported: (type: string) => type === "audio/webm;codecs=opus",
    } as unknown as typeof MediaRecorder;

    const config = selectSupportedAudioRecorderConfig();
    expect(config).toEqual({
      mimeType: "audio/webm;codecs=opus",
      baseMime: "audio/webm",
      extension: "webm",
    });
  });

  it("selects ogg+opus when webm is not supported (Firefox fallback)", () => {
    globalThis.MediaRecorder = {
      isTypeSupported: (type: string) => type === "audio/ogg;codecs=opus",
    } as unknown as typeof MediaRecorder;

    const config = selectSupportedAudioRecorderConfig();
    expect(config).toEqual({
      mimeType: "audio/ogg;codecs=opus",
      baseMime: "audio/ogg",
      extension: "ogg",
    });
  });

  it("selects mp4+aac when only mp4 is supported (Safari)", () => {
    globalThis.MediaRecorder = {
      isTypeSupported: (type: string) => type === "audio/mp4;codecs=mp4a.40.2",
    } as unknown as typeof MediaRecorder;

    const config = selectSupportedAudioRecorderConfig();
    expect(config).toEqual({
      mimeType: "audio/mp4;codecs=mp4a.40.2",
      baseMime: "audio/mp4",
      extension: "m4a",
    });
  });

  it("selects bare mp4 as Safari fallback", () => {
    globalThis.MediaRecorder = {
      isTypeSupported: (type: string) => type === "audio/mp4",
    } as unknown as typeof MediaRecorder;

    const config = selectSupportedAudioRecorderConfig();
    expect(config).toEqual({
      mimeType: "audio/mp4",
      baseMime: "audio/mp4",
      extension: "m4a",
    });
  });

  it("returns null when no candidate is supported", () => {
    globalThis.MediaRecorder = {
      isTypeSupported: () => false,
    } as unknown as typeof MediaRecorder;

    expect(selectSupportedAudioRecorderConfig()).toBeNull();
  });
});

import { MAX_AUDIO_DURATION_MS, ALLOWED_RECORDED_AUDIO_TYPES } from "@/lib/constants";

/**
 * MIME candidates in preference order for MediaRecorder.
 * - WebM+Opus: Chrome, Edge, modern Firefox
 * - OGG+Opus: Firefox fallback (Firefox historically prefers OGG over WebM for Opus)
 * - MP4+AAC: Safari / WebKit
 * - MP4 bare: Safari fallback
 */
const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/ogg;codecs=opus",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
] as const;

/** Map from base MIME to deterministic file extension. */
const MIME_TO_EXTENSION: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
};

export type AudioRecorderConfig = {
  mimeType: string;
  baseMime: (typeof ALLOWED_RECORDED_AUDIO_TYPES)[number];
  extension: string;
};

/**
 * Select the first supported MIME type for MediaRecorder.
 * Returns null if no candidate is supported (audio recording unavailable).
 */
export function selectSupportedAudioRecorderConfig(): AudioRecorderConfig | null {
  if (typeof MediaRecorder === "undefined") return null;

  for (const candidate of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      const baseMime = normaliseRecordedAudioMimeType(candidate);
      return {
        mimeType: candidate,
        baseMime,
        extension: getAudioExtensionFromMime(baseMime),
      };
    }
  }

  return null;
}

/**
 * Normalize a recorded MIME type (possibly with codecs param) to its storage-safe base.
 * E.g. "audio/webm;codecs=opus" → "audio/webm"
 */
export function normaliseRecordedAudioMimeType(
  mimeType: string
): (typeof ALLOWED_RECORDED_AUDIO_TYPES)[number] {
  const base = mimeType.split(";")[0].trim().toLowerCase();

  if (ALLOWED_RECORDED_AUDIO_TYPES.includes(base as (typeof ALLOWED_RECORDED_AUDIO_TYPES)[number])) {
    return base as (typeof ALLOWED_RECORDED_AUDIO_TYPES)[number];
  }

  // Fallback: shouldn't happen if called with a candidate from MIME_CANDIDATES
  return "audio/webm";
}

/**
 * Get deterministic file extension from a base audio MIME type.
 */
export function getAudioExtensionFromMime(mime: string): string {
  return MIME_TO_EXTENSION[mime] ?? "webm";
}

/**
 * Check whether a recording duration (in ms) is within the allowed limit.
 */
export function isValidRecordedDuration(durationMs: number): boolean {
  return durationMs > 0 && durationMs <= MAX_AUDIO_DURATION_MS;
}

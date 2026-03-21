export type VisualUploadWord = "hochladen" | "angucken" | "checken" | "lachen";

const MAX_DISPLAY_PROGRESS_DURING_UPLOAD = 78;
const CHECKEN_START_PROGRESS = 90;
const MAX_DISPLAY_PROGRESS_BEFORE_COMPLETE = 97;

function clampProgress(progress: number): number {
  return Math.min(Math.max(progress, 0), 100);
}

export function mapActualUploadProgressToDisplay(progress: number): number {
  const normalized = clampProgress(progress);
  return Math.round((normalized / 100) * MAX_DISPLAY_PROGRESS_DURING_UPLOAD);
}

export function getVisualUploadWord(
  displayProgress: number,
  uploadComplete: boolean,
  isCompleting: boolean
): VisualUploadWord {
  if (!uploadComplete) return "hochladen";
  if (isCompleting) return "lachen";
  if (displayProgress < CHECKEN_START_PROGRESS) return "angucken";
  return "checken";
}

export function advanceVisualUploadProgress(progress: number): number {
  const normalized = clampProgress(progress);

  if (normalized < CHECKEN_START_PROGRESS) {
    return Math.min(normalized + 2, CHECKEN_START_PROGRESS);
  }

  if (normalized < MAX_DISPLAY_PROGRESS_BEFORE_COMPLETE) {
    return Math.min(normalized + 1, MAX_DISPLAY_PROGRESS_BEFORE_COMPLETE);
  }

  return MAX_DISPLAY_PROGRESS_BEFORE_COMPLETE;
}

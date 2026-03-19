"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, RotateCcw, Play, Pause } from "lucide-react";
import { toast } from "sonner";
import { selectSupportedAudioRecorderConfig } from "@/lib/utils/audio-recording";
import { MAX_AUDIO_DURATION_MS } from "@/lib/constants";
import type { AudioRecorderConfig } from "@/lib/utils/audio-recording";

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob, durationMs: number, mimeType: string) => void;
  onRecordingClear: () => void;
  disabled?: boolean;
}

export function AudioRecorder({ onRecordingComplete, onRecordingClear, disabled }: AudioRecorderProps) {
  const [state, setState] = useState<"idle" | "recording" | "recorded">("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const configRef = useRef<AudioRecorderConfig | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const recordedBlobRef = useRef<Blob | null>(null);

  // Cleanup on unmount: stop tracks, revoke blob URLs
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  const stopAllTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
  }, []);

  async function startRecording() {
    // Check config support
    const config = selectSupportedAudioRecorderConfig();
    if (!config) {
      toast.error("Dein Browser unterstützt keine Audio-Aufnahme");
      return;
    }
    configRef.current = config;

    // Request microphone
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const name = (err as DOMException).name;
      if (name === "NotAllowedError") {
        toast.error("Mikrofonzugriff wird benötigt");
      } else if (name === "NotFoundError") {
        toast.error("Kein Mikrofon gefunden");
      } else {
        toast.error("Mikrofon konnte nicht gestartet werden");
      }
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];

    const recorder = new MediaRecorder(stream, { mimeType: config.mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      clearTimers();
      stopAllTracks();

      const actualDuration = Date.now() - startTimeRef.current;
      const blob = new Blob(chunksRef.current, { type: config.baseMime });

      // Create preview URL
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = URL.createObjectURL(blob);
      recordedBlobRef.current = blob;

      setState("recorded");
      onRecordingComplete(blob, Math.min(actualDuration, MAX_AUDIO_DURATION_MS), config.baseMime);
    };

    recorder.onerror = () => {
      clearTimers();
      stopAllTracks();
      setState("idle");
      toast.error("Aufnahme fehlgeschlagen");
    };

    // Start recording
    startTimeRef.current = Date.now();
    recorder.start();
    setState("recording");
    setElapsedMs(0);

    // Live timer (UI only)
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      setElapsedMs(Math.min(elapsed, MAX_AUDIO_DURATION_MS));
    }, 100);

    // Auto-stop at 10 seconds (wall-clock check for mobile timer drift)
    autoStopRef.current = setTimeout(() => {
      if (Date.now() - startTimeRef.current >= MAX_AUDIO_DURATION_MS) {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      }
    }, MAX_AUDIO_DURATION_MS);
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }

  function retake() {
    setIsPlaying(false);
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current.currentTime = 0;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    recordedBlobRef.current = null;
    chunksRef.current = [];
    setElapsedMs(0);
    setState("idle");
    onRecordingClear();
  }

  function togglePreview() {
    const audio = audioPreviewRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  }

  const seconds = Math.floor(elapsedMs / 1000);
  const tenths = Math.floor((elapsedMs % 1000) / 100);
  const remainingMs = MAX_AUDIO_DURATION_MS - elapsedMs;
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const progress = (elapsedMs / MAX_AUDIO_DURATION_MS) * 100;

  return (
    <div className="space-y-4">
      {/* Recording / Preview area */}
      <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-muted/30 p-6">
        {state === "idle" && (
          <>
            <button
              type="button"
              onClick={startRecording}
              disabled={disabled}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600 disabled:opacity-50"
            >
              <Mic className="h-7 w-7" />
            </button>
            <p className="text-sm text-muted-foreground">
              Zum Aufnehmen tippen (max {MAX_AUDIO_DURATION_MS / 1000}s)
            </p>
          </>
        )}

        {state === "recording" && (
          <>
            {/* Progress bar */}
            <div className="w-full">
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-red-500 transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={stopRecording}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600"
              >
                <Square className="h-6 w-6 fill-white" />
              </button>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
              <span className="tabular-nums font-medium">
                {seconds}.{tenths}s
              </span>
              <span className="text-muted-foreground">
                / {MAX_AUDIO_DURATION_MS / 1000}s
              </span>
              {remainingSeconds <= 3 && (
                <span className="text-xs text-red-400">
                  noch {remainingSeconds}s
                </span>
              )}
            </div>
          </>
        )}

        {state === "recorded" && blobUrlRef.current && (
          <>
            {/* Hidden audio element for preview */}
            <audio
              ref={audioPreviewRef}
              src={blobUrlRef.current}
              onEnded={() => setIsPlaying(false)}
              preload="auto"
            />

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePreview}
                disabled={disabled}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5 ml-0.5" />
                )}
              </button>

              <div className="text-sm">
                <p className="font-medium">Aufnahme fertig</p>
                <p className="text-muted-foreground tabular-nums">
                  {seconds}.{tenths}s
                </p>
              </div>

              <button
                type="button"
                onClick={retake}
                disabled={disabled}
                className="ml-auto flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Neu aufnehmen
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

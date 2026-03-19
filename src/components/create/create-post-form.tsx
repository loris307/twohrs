"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Send, ImageIcon, Mic } from "lucide-react";
import { toast } from "sonner";
import { ImageUpload } from "./image-upload";
import { AudioRecorder } from "./audio-recorder";
import { OgPreview } from "./og-preview";
import { MentionAutocomplete } from "@/components/shared/mention-autocomplete";
import { createPostRecord, createAudioPostRecord } from "@/lib/actions/posts";
import { uploadImageWithProgress } from "@/lib/utils/upload";
import { uploadAudioWithProgress } from "@/lib/utils/upload-audio";
import { MAX_CAPTION_LENGTH } from "@/lib/constants";

type OgData = {
  title: string | null;
  description: string | null;
  image: string | null;
  url: string;
};

type CreateMode = "visual" | "audio";

const URL_REGEX = /https?:\/\/[^\s]+/;

export function CreatePostForm() {
  const [mode, setMode] = useState<CreateMode>("visual");
  const [image, setImage] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [ogData, setOgData] = useState<OgData | null>(null);
  const [ogLoading, setOgLoading] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedDurationMs, setRecordedDurationMs] = useState<number | null>(null);
  const [recordedMimeType, setRecordedMimeType] = useState<string | null>(null);
  const lastFetchedUrl = useRef<string | null>(null);
  const ogAbortRef = useRef<AbortController | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  function handleMentionSelect(username: string, startIndex: number, endIndex: number) {
    const newCaption = caption.slice(0, startIndex) + `@${username} ` + caption.slice(endIndex);
    setCaption(newCaption);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        const pos = startIndex + username.length + 2;
        el.setSelectionRange(pos, pos);
      }
    });
  }

  const fetchOgData = useCallback(async (url: string) => {
    if (lastFetchedUrl.current === url) return;
    lastFetchedUrl.current = url;

    ogAbortRef.current?.abort();
    const controller = new AbortController();
    ogAbortRef.current = controller;

    setOgLoading(true);
    try {
      const res = await fetch(`/api/og?url=${encodeURIComponent(url)}`, {
        signal: controller.signal,
      });
      if (!res.ok) {
        setOgData(null);
        return;
      }
      const data = await res.json();
      setOgData({ ...data, url });
    } catch {
      if (!controller.signal.aborted) {
        setOgData(null);
      }
    } finally {
      if (!controller.signal.aborted) {
        setOgLoading(false);
      }
    }
  }, []);

  // Detect URLs in caption with debounce (visual mode only)
  useEffect(() => {
    if (mode !== "visual") return;

    const match = caption.match(URL_REGEX);
    if (!match) {
      if (ogData) {
        setOgData(null);
        lastFetchedUrl.current = null;
      }
      return;
    }

    const url = match[0];
    if (lastFetchedUrl.current === url) return;

    const timer = setTimeout(() => fetchOgData(url), 600);
    return () => clearTimeout(timer);
  }, [caption, fetchOgData, ogData, mode]);

  function switchMode(newMode: CreateMode) {
    if (newMode === mode || isSubmitting) return;

    if (mode === "audio" && recordedBlob) {
      if (!confirm("Aufnahme verwerfen?")) return;
    }

    if (mode === "audio") {
      // Switching to visual: clear audio state (AudioRecorder unmounts, cleanup fires)
      setRecordedBlob(null);
      setRecordedDurationMs(null);
      setRecordedMimeType(null);
    } else {
      // Switching to audio: clear visual state
      ogAbortRef.current?.abort();
      setOgData(null);
      lastFetchedUrl.current = null;
      setImage(null);
    }

    setMode(newMode);
  }

  const canSubmit =
    mode === "visual"
      ? image || caption.trim()
      : caption.trim() && recordedBlob;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!canSubmit) {
      toast.error(
        mode === "visual"
          ? "Bitte füge ein Bild oder Text hinzu"
          : "Caption und Aufnahme sind erforderlich"
      );
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      if (mode === "audio" && recordedBlob && recordedDurationMs && recordedMimeType) {
        // Audio submit path
        const uploaded = await uploadAudioWithProgress(
          recordedBlob,
          recordedMimeType,
          setUploadProgress
        );

        const result = await createAudioPostRecord(
          uploaded.audioPath,
          uploaded.audioUrl,
          uploaded.audioMimeType,
          recordedDurationMs,
          caption
        );

        if (result.success) {
          document.dispatchEvent(new Event("navigation-start"));
          router.push("/feed");
          return;
        }
        toast.error(result.error);
      } else {
        // Visual submit path (unchanged)
        let imagePath: string | null = null;

        if (image) {
          const uploaded = await uploadImageWithProgress(
            image,
            setUploadProgress
          );
          imagePath = uploaded.imagePath;
        }

        const result = await createPostRecord(
          imagePath,
          caption || null,
          ogData
            ? {
                ogTitle: ogData.title || undefined,
                ogDescription: ogData.description || undefined,
                ogImage: ogData.image || undefined,
                ogUrl: ogData.url,
              }
            : undefined
        );

        if (result.success) {
          document.dispatchEvent(new Event("navigation-start"));
          router.push("/feed");
          return;
        }
        toast.error(result.error);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Upload fehlgeschlagen"
      );
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      {/* Mode switch tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1">
        <button
          type="button"
          onClick={() => switchMode("visual")}
          disabled={isSubmitting}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            mode === "visual"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          } disabled:opacity-50`}
        >
          <ImageIcon className="h-4 w-4" />
          Bild / Text
        </button>
        <button
          type="button"
          onClick={() => switchMode("audio")}
          disabled={isSubmitting}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            mode === "audio"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          } disabled:opacity-50`}
        >
          <Mic className="h-4 w-4" />
          Audio
        </button>
      </div>

      {/* Visual mode: image upload */}
      {mode === "visual" && <ImageUpload onImageSelect={setImage} />}

      {/* Audio mode: recorder */}
      {mode === "audio" && (
        <AudioRecorder
          onRecordingComplete={(blob, durationMs, mimeType) => {
            setRecordedBlob(blob);
            setRecordedDurationMs(durationMs);
            setRecordedMimeType(mimeType);
          }}
          onRecordingClear={() => {
            setRecordedBlob(null);
            setRecordedDurationMs(null);
            setRecordedMimeType(null);
          }}
          disabled={isSubmitting}
        />
      )}

      {/* Caption */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="caption" className="text-sm font-medium">
            Text
          </label>
          <span
            className={`text-xs tabular-nums ${
              caption.length > MAX_CAPTION_LENGTH
                ? "text-destructive"
                : "text-muted-foreground"
            }`}
          >
            {caption.length}/{MAX_CAPTION_LENGTH}
          </span>
        </div>
        <div className="relative">
          <textarea
            ref={textareaRef}
            id="caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={MAX_CAPTION_LENGTH}
            rows={3}
            placeholder={
              mode === "audio"
                ? "Caption hinzufügen (pflicht)"
                : image
                  ? "Caption hinzufügen (optional)"
                  : "Was gibt's zu lachen?"
            }
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <MentionAutocomplete
            inputRef={textareaRef}
            value={caption}
            onSelect={handleMentionSelect}
          />
        </div>
      </div>

      {/* OG preview (visual mode only) */}
      {mode === "visual" && ogLoading && (
        <p className="text-xs text-muted-foreground">Link-Vorschau wird geladen...</p>
      )}

      {mode === "visual" && ogData && !ogLoading && (
        <OgPreview
          title={ogData.title}
          description={ogData.description}
          image={ogData.image}
          url={ogData.url}
          onRemove={() => {
            setOgData(null);
            lastFetchedUrl.current = null;
          }}
        />
      )}

      {/* Upload progress */}
      {isSubmitting && (mode === "visual" ? image : recordedBlob) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {uploadProgress < 100 ? "Wird hochgeladen..." : "Wird gespeichert..."}
            </span>
            <span className="tabular-nums font-medium">{uploadProgress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit || isSubmitting}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
      >
        {isSubmitting ? (
          "Wird gepostet..."
        ) : (
          <>
            <Send className="h-4 w-4" />
            Posten
          </>
        )}
      </button>
    </form>
  );
}

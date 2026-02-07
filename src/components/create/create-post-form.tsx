"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { ImageUpload } from "./image-upload";
import { OgPreview } from "./og-preview";
import { createPostRecord } from "@/lib/actions/posts";
import { uploadImageWithProgress } from "@/lib/utils/upload";
import { MAX_CAPTION_LENGTH } from "@/lib/constants";

type OgData = {
  title: string | null;
  description: string | null;
  image: string | null;
  url: string;
};

const URL_REGEX = /https?:\/\/[^\s]+/;

export function CreatePostForm() {
  const [image, setImage] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [ogData, setOgData] = useState<OgData | null>(null);
  const [ogLoading, setOgLoading] = useState(false);
  const lastFetchedUrl = useRef<string | null>(null);
  const ogAbortRef = useRef<AbortController | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

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

  // Detect URLs in caption with debounce
  useEffect(() => {
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
  }, [caption, fetchOgData, ogData]);

  const canSubmit = image || caption.trim();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!canSubmit) {
      toast.error("Bitte füge ein Bild oder Text hinzu");
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      let imageUrl: string | null = null;
      let imagePath: string | null = null;

      // Upload image if present
      if (image) {
        const uploaded = await uploadImageWithProgress(
          image,
          setUploadProgress
        );
        imageUrl = uploaded.imageUrl;
        imagePath = uploaded.imagePath;
      }

      // Create post record in database
      const result = await createPostRecord(
        imageUrl,
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
        router.push("/feed");
        return;
      }
      toast.error(result.error);
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
      <ImageUpload onImageSelect={setImage} />

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
        <textarea
          id="caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={MAX_CAPTION_LENGTH}
          rows={3}
          placeholder={image ? "Caption hinzufügen (optional)" : "Was gibt's zu lachen?"}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {ogLoading && (
        <p className="text-xs text-muted-foreground">Link-Vorschau wird geladen...</p>
      )}

      {ogData && !ogLoading && (
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

      {isSubmitting && image && (
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

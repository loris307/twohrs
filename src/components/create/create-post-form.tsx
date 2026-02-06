"use client";

import { useState, useRef } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { ImageUpload } from "./image-upload";
import { createPost } from "@/lib/actions/posts";
import { MAX_CAPTION_LENGTH } from "@/lib/constants";

export function CreatePostForm() {
  const [image, setImage] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!image) {
      toast.error("Bitte wähle ein Bild aus");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("image", image);
      formData.append("caption", caption);

      const result = await createPost(formData);
      if (result && !result.success) {
        toast.error(result.error);
      }
    } catch {
      // createPost redirects on success
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      <ImageUpload onImageSelect={setImage} />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="caption" className="text-sm font-medium">
            Caption
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
          placeholder="Was gibt's zu lachen? (optional)"
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <button
        type="submit"
        disabled={!image || isSubmitting}
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

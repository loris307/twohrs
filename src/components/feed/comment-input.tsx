"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { Send, Loader2, X, ImageIcon } from "lucide-react";
import { createComment } from "@/lib/actions/comments";
import { MentionAutocomplete } from "@/components/shared/mention-autocomplete";
import { MAX_COMMENT_LENGTH } from "@/lib/constants";
import { validateImageFile } from "@/lib/validations";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";

interface CommentInputProps {
  postId: string;
  onCommentCreated: () => void;
  replyingTo?: { commentId: string; username: string } | null;
  onCancelReply?: () => void;
}

export function CommentInput({
  postId,
  onCommentCreated,
  replyingTo,
  onCancelReply,
}: CommentInputProps) {
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const clearImage = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [previewUrl]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      toast.error(validationError);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    // Clear previous preview
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function handleMentionSelect(username: string, startIndex: number, endIndex: number) {
    const newText = text.slice(0, startIndex) + `@${username} ` + text.slice(endIndex);
    setText(newText);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (el) {
        el.focus();
        const pos = startIndex + username.length + 2;
        el.setSelectionRange(pos, pos);
      }
    });
  }

  // Auto-focus when replying
  useEffect(() => {
    if (replyingTo) {
      inputRef.current?.focus();
    }
  }, [replyingTo]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed && !selectedFile) return;

    startTransition(async () => {
      let imagePath: string | undefined;

      // Upload image first if selected
      if (selectedFile) {
        setIsUploading(true);
        try {
          const formData = new FormData();
          formData.append("file", selectedFile);

          const res = await fetch("/api/uploads/comment-image", {
            method: "POST",
            body: formData,
          });

          const data = await res.json();

          if (!res.ok) {
            toast.error(data.error || "Bild-Upload fehlgeschlagen");
            setIsUploading(false);
            return;
          }

          imagePath = data.imagePath;
        } catch {
          toast.error("Bild-Upload fehlgeschlagen");
          setIsUploading(false);
          return;
        }
        setIsUploading(false);
      }

      const result = await createComment(
        postId,
        trimmed || null,
        replyingTo?.commentId,
        imagePath
      );

      if (result.success) {
        setText("");
        clearImage();
        onCancelReply?.();
        onCommentCreated();
      } else {
        toast.error(result.error);
      }
    });
  }

  const hasContent = !!text.trim() || !!selectedFile;

  return (
    <div>
      {replyingTo && (
        <div className="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            Antwort an{" "}
            <span className="font-medium text-foreground">
              @{replyingTo.username}
            </span>
          </span>
          <button
            onClick={onCancelReply}
            className="rounded-full p-0.5 hover:bg-muted"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Image preview */}
      {previewUrl && (
        <div className="mb-2 inline-flex items-start gap-1">
          <div className="relative h-[60px] w-[60px] overflow-hidden rounded-lg border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Vorschau"
              className="h-full w-full object-cover"
            />
          </div>
          <button
            type="button"
            onClick={clearImage}
            className="rounded-full bg-background/80 p-0.5 hover:bg-muted"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="relative">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              replyingTo
                ? `Antwort an @${replyingTo.username}...`
                : "Kommentar schreiben..."
            }
            maxLength={MAX_COMMENT_LENGTH}
            className="w-full rounded-full border border-border bg-muted/50 py-2 pl-4 pr-20 text-base placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!text.trim() && !selectedFile) return;
                handleSubmit(e);
              }
            }}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full p-1 text-muted-foreground/60 transition-colors hover:text-muted-foreground"
            >
              <ImageIcon className="h-4 w-4" />
            </button>
            <button
              type="submit"
              disabled={isPending || isUploading || !hasContent}
              className={cn(
                "rounded-full p-1 transition-colors",
                hasContent
                  ? "text-primary hover:text-primary/80"
                  : "text-muted-foreground/40"
              )}
            >
              {isPending || isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
          <MentionAutocomplete
            inputRef={inputRef}
            value={text}
            onSelect={handleMentionSelect}
          />
        </div>
      </form>
    </div>
  );
}

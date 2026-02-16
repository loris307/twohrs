"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Send, Loader2, X } from "lucide-react";
import { createComment } from "@/lib/actions/comments";
import { MentionAutocomplete } from "@/components/shared/mention-autocomplete";
import { MAX_COMMENT_LENGTH } from "@/lib/constants";
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
    if (!trimmed) return;

    startTransition(async () => {
      const result = await createComment(
        postId,
        trimmed,
        replyingTo?.commentId
      );
      if (result.success) {
        setText("");
        onCancelReply?.();
        onCommentCreated();
      } else {
        toast.error(result.error);
      }
    });
  }

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
      <form onSubmit={handleSubmit} className="relative">
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
            className="w-full rounded-full border border-border bg-muted/50 py-2 pl-4 pr-10 text-base placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={isPending || !text.trim()}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 transition-colors",
              text.trim()
                ? "text-primary hover:text-primary/80"
                : "text-muted-foreground/40"
            )}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
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

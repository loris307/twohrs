"use client";

import { useState, useTransition } from "react";
import { Send, Loader2 } from "lucide-react";
import { createComment } from "@/lib/actions/comments";
import { MAX_COMMENT_LENGTH } from "@/lib/constants";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";

interface CommentInputProps {
  postId: string;
  onCommentCreated: () => void;
}

export function CommentInput({ postId, onCommentCreated }: CommentInputProps) {
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    startTransition(async () => {
      const result = await createComment(postId, trimmed);
      if (result.success) {
        setText("");
        onCommentCreated();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Kommentar schreiben..."
        maxLength={MAX_COMMENT_LENGTH}
        className="w-full rounded-full border border-border bg-muted/50 py-2 pl-4 pr-10 text-sm placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
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
    </form>
  );
}

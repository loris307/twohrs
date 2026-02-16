"use client";

import { useState, useTransition } from "react";
import { Shield } from "lucide-react";
import { adminDeletePost } from "@/lib/actions/moderation";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface AdminDeleteButtonProps {
  postId: string;
}

export function AdminDeleteButton({ postId }: AdminDeleteButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    startTransition(async () => {
      const result = await adminDeletePost(postId);
      if (result.success && result.data) {
        const { strikes, accountDeleted, username } = result.data;
        if (accountDeleted) {
          toast.success(`Strike ${strikes}/3 — Account von @${username} gelöscht`);
        } else if (strikes >= 2) {
          toast.success(`Strike ${strikes}/3 für @${username} — Warnung wird angezeigt`);
        } else {
          toast.success(`Strike ${strikes}/3 für @${username} — Post gelöscht`);
        }
        setShowConfirm(false);
        router.refresh();
      } else {
        toast.error(result.error);
        setShowConfirm(false);
      }
    });
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="rounded bg-destructive px-2 py-0.5 text-xs font-medium text-destructive-foreground"
        >
          {isPending ? "..." : "Löschen"}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground"
        >
          Nein
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        setShowConfirm(true);
      }}
      className="text-muted-foreground hover:text-destructive transition-colors"
      title="Admin: Post löschen"
    >
      <Shield className="h-4 w-4" />
    </button>
  );
}

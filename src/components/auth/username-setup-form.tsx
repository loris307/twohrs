"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AtSign } from "lucide-react";
import { toast } from "sonner";
import { completeOAuthUsername } from "@/lib/actions/auth";

interface UsernameSetupFormProps {
  initialUsername: string;
  next: string;
}

export function UsernameSetupForm({
  initialUsername,
  next,
}: UsernameSetupFormProps) {
  const [username, setUsername] = useState(initialUsername);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await completeOAuthUsername(formData);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      router.push(result.data?.next ?? "/feed");
      router.refresh();
    } catch {
      toast.error("Ein Fehler ist aufgetreten");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="username" className="text-sm font-medium">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          autoComplete="username"
          autoCapitalize="none"
          autoFocus
          minLength={3}
          maxLength={20}
          pattern="^[a-z0-9_]+$"
          placeholder="dein_username"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="text-xs text-muted-foreground">
          Nur Kleinbuchstaben, Zahlen und Unterstriche. Das kannst du später nicht mehr ändern.
        </p>
      </div>

      <input type="hidden" name="next" value={next} />

      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
      >
        {isLoading ? (
          "Username wird gespeichert..."
        ) : (
          <>
            <AtSign className="h-4 w-4" />
            Username festlegen
          </>
        )}
      </button>
    </form>
  );
}

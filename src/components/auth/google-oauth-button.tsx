"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface GoogleOAuthButtonProps {
  mode: "signin" | "signup";
  disabled?: boolean;
  next?: string;
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
      <path
        d="M21.805 10.023h-9.61v3.954h5.518c-.238 1.272-.954 2.35-2.027 3.07v2.548h3.284c1.922-1.77 3.03-4.376 3.03-7.477 0-.704-.064-1.381-.195-2.095z"
        fill="#4285F4"
      />
      <path
        d="M12.195 22c2.745 0 5.046-.9 6.728-2.405l-3.284-2.548c-.913.613-2.08.977-3.444.977-2.64 0-4.879-1.782-5.676-4.178H3.13v2.628A10.162 10.162 0 0 0 12.195 22z"
        fill="#34A853"
      />
      <path
        d="M6.519 13.846a6.11 6.11 0 0 1-.317-1.846c0-.642.11-1.264.317-1.846V7.526H3.13A10.13 10.13 0 0 0 2 12c0 1.626.39 3.168 1.13 4.474l3.389-2.628z"
        fill="#FBBC05"
      />
      <path
        d="M12.195 5.976c1.493 0 2.832.513 3.888 1.521l2.914-2.914C17.236 2.938 14.94 2 12.195 2A10.162 10.162 0 0 0 3.13 7.526l3.389 2.628c.797-2.396 3.036-4.178 5.676-4.178z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function GoogleOAuthButton({
  mode,
  disabled = false,
  next = "/feed",
}: GoogleOAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setIsLoading(true);

    try {
      const supabase = createClient();
      const redirectTo = new URL("/auth/callback", window.location.origin);
      redirectTo.searchParams.set("next", next);
      redirectTo.searchParams.set("mode", mode);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectTo.toString(),
        },
      });

      if (error) {
        toast.error("Google-Anmeldung fehlgeschlagen");
        setIsLoading(false);
        return;
      }

      if (data?.url) {
        window.location.assign(data.url);
        return;
      }

      toast.error("Google-Anmeldung konnte nicht gestartet werden");
    } catch {
      toast.error("Ein Fehler ist aufgetreten");
    }

    setIsLoading(false);
  }

  const label =
    mode === "signup" ? "Mit Google registrieren" : "Mit Google anmelden";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isLoading}
      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
    >
      <GoogleIcon />
      {isLoading ? "Weiterleitung..." : label}
    </button>
  );
}

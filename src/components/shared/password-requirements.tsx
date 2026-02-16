"use client";

import { Check, X } from "lucide-react";
import { checkPasswordStrength } from "@/lib/validations";

interface PasswordRequirementsProps {
  password: string;
}

export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  const results = checkPasswordStrength(password);
  const started = password.length > 0;

  if (!started) return null;

  return (
    <ul className="space-y-1 pt-1">
      {results.map((rule) => (
        <li
          key={rule.key}
          className={`flex items-center gap-1.5 text-xs transition-colors ${
            rule.passed ? "text-green-500" : "text-muted-foreground"
          }`}
        >
          {rule.passed ? (
            <Check className="h-3 w-3 shrink-0" />
          ) : (
            <X className="h-3 w-3 shrink-0" />
          )}
          {rule.label}
        </li>
      ))}
    </ul>
  );
}

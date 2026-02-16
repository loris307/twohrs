import { z } from "zod";
import {
  MAX_CAPTION_LENGTH,
  MAX_COMMENT_LENGTH,
  MAX_IMAGE_SIZE_BYTES,
  ALLOWED_IMAGE_TYPES,
} from "./constants";

export const usernameSchema = z
  .string()
  .min(3, "Username muss mindestens 3 Zeichen haben")
  .max(20, "Username darf maximal 20 Zeichen haben")
  .regex(
    /^[a-z0-9_]+$/,
    "Nur Kleinbuchstaben, Zahlen und Unterstriche erlaubt"
  );

export const passwordRules = [
  { key: "length", label: "Mindestens 8 Zeichen", test: (pw: string) => pw.length >= 8 },
  { key: "lowercase", label: "Ein Kleinbuchstabe", test: (pw: string) => /[a-z]/.test(pw) },
  { key: "uppercase", label: "Ein Großbuchstabe", test: (pw: string) => /[A-Z]/.test(pw) },
  { key: "number", label: "Eine Zahl", test: (pw: string) => /[0-9]/.test(pw) },
  { key: "special", label: "Ein Sonderzeichen (!@#$...)", test: (pw: string) => /[^a-zA-Z0-9]/.test(pw) },
] as const;

export function checkPasswordStrength(pw: string) {
  return passwordRules.map((rule) => ({ ...rule, passed: rule.test(pw) }));
}

const passwordSchema = z
  .string()
  .min(8, "Passwort muss mindestens 8 Zeichen haben")
  .max(72, "Passwort darf maximal 72 Zeichen haben")
  .regex(/[a-z]/, "Passwort muss mindestens einen Kleinbuchstaben enthalten")
  .regex(/[A-Z]/, "Passwort muss mindestens einen Großbuchstaben enthalten")
  .regex(/[0-9]/, "Passwort muss mindestens eine Zahl enthalten")
  .regex(/[^a-zA-Z0-9]/, "Passwort muss mindestens ein Sonderzeichen enthalten");

export const signUpSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: passwordSchema,
  username: usernameSchema,
  displayName: z
    .string()
    .max(50, "Anzeigename darf maximal 50 Zeichen haben")
    .optional(),
});

export const signInSchema = z.object({
  identifier: z.string().min(1, "E-Mail oder Benutzername ist erforderlich"),
  password: z.string().min(1, "Passwort ist erforderlich"),
});

export const createPostSchema = z.object({
  caption: z
    .string()
    .max(MAX_CAPTION_LENGTH, `Caption darf maximal ${MAX_CAPTION_LENGTH} Zeichen haben`)
    .optional(),
});

export const createCommentSchema = z.object({
  text: z
    .string()
    .min(1, "Kommentar darf nicht leer sein")
    .max(MAX_COMMENT_LENGTH, `Kommentar darf maximal ${MAX_COMMENT_LENGTH} Zeichen haben`),
});

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .max(50, "Anzeigename darf maximal 50 Zeichen haben")
    .optional(),
  bio: z
    .string()
    .max(160, "Bio darf maximal 160 Zeichen haben")
    .optional(),
});

export const changeEmailSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Aktuelles Passwort ist erforderlich"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwörter stimmen nicht überein",
    path: ["confirmPassword"],
  });

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return "Nur JPEG, PNG, GIF und WebP Bilder sind erlaubt";
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return `Bild darf maximal ${MAX_IMAGE_SIZE_BYTES / 1024 / 1024} MB groß sein`;
  }
  return null;
}

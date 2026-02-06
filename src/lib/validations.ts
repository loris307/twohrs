import { z } from "zod";
import {
  MAX_CAPTION_LENGTH,
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

export const signUpSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z
    .string()
    .min(6, "Passwort muss mindestens 6 Zeichen haben")
    .max(72, "Passwort darf maximal 72 Zeichen haben"),
  username: usernameSchema,
  displayName: z
    .string()
    .max(50, "Anzeigename darf maximal 50 Zeichen haben")
    .optional(),
});

export const signInSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(1, "Passwort ist erforderlich"),
});

export const createPostSchema = z.object({
  caption: z
    .string()
    .max(MAX_CAPTION_LENGTH, `Caption darf maximal ${MAX_CAPTION_LENGTH} Zeichen haben`)
    .optional(),
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

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return "Nur JPEG, PNG, GIF und WebP Bilder sind erlaubt";
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return `Bild darf maximal ${MAX_IMAGE_SIZE_BYTES / 1024 / 1024} MB groß sein`;
  }
  return null;
}

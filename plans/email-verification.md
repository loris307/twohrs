# Plan: Email-Verifizierung (ohne Login-Blockade)

## Context

Neue User sollen nach der Registrierung eine professionell aussehende Bestätigungs-Email erhalten. Sie können sich sofort einloggen und die App nutzen (Feed browsen, voten, folgen). Aber zum **Posten und Kommentieren** muss die Email bestätigt sein. Bestehende User werden nicht betroffen — sie gelten automatisch als verifiziert.

## Ansatz: Supabase "Confirm email" + Auto-Confirm via Admin API

- **Supabase sendet die Email** automatisch (kein 3rd-party Service nötig)
- **Auto-Confirm via Admin API** nach Signup, damit der User sofort eingeloggt wird
- **`email_verified` Spalte** in `profiles` trackt die echte Verifizierung
- **Auth Callback** setzt `email_verified = true` wenn User den Link in der Email klickt

---

## Schritt 1: Database Migration (`supabase/migrations/021_email_verification.sql`)

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;

-- Alle bestehenden User sind automatisch verifiziert
UPDATE public.profiles SET email_verified = true;
```

Dann via psql ausführen.

## Schritt 2: TypeScript Type updaten

**`src/lib/types.ts`** — `email_verified: boolean` zu `Profile` Type hinzufügen

## Schritt 3: Signup Action anpassen (`src/lib/actions/auth.ts`)

Aktuell: `signUp()` → session wird automatisch erstellt (Confirmation OFF)

Neu (mit Confirmation ON):
1. `signUp()` → sendet Bestätigungs-Email, gibt User zurück aber KEINE Session
2. `adminClient.auth.admin.updateUserById(user.id, { email_confirm: true })` → Auto-Confirm für Login
3. `signInWithPassword({ email, password })` → Session erstellen
4. Return success

```typescript
const { data: signUpData, error } = await supabase.auth.signUp({...});
if (error || !signUpData.user) return { success: false, error: ... };

// Auto-confirm so user can sign in immediately
const admin = createAdminClient();
await admin.auth.admin.updateUserById(signUpData.user.id, { email_confirm: true });

// Create session (signUp doesn't return one when confirmation is enabled)
await supabase.auth.signInWithPassword({ email, password });
```

## Schritt 4: Auth Callback erweitern (`src/app/(auth)/auth/callback/route.ts`)

Nach `exchangeCodeForSession` → `email_verified = true` setzen:

```typescript
if (!error) {
  // Set email_verified on successful callback (user clicked email link)
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const admin = createAdminClient();
    await admin.from('profiles').update({ email_verified: true }).eq('id', user.id);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
```

## Schritt 5: Server Action Guards

**`src/lib/actions/posts.ts`** — In `createPost()` und `createPostRecord()`:

```typescript
// Nach Auth-Check
const { data: profile } = await supabase
  .from('profiles')
  .select('email_verified')
  .eq('id', user.id)
  .single();

if (!profile?.email_verified) {
  return { success: false, error: "EMAIL_NOT_VERIFIED" };
}
```

**`src/lib/actions/comments.ts`** — In `createComment()`: gleicher Check.

## Schritt 6: Helper-Funktion für Email-Verified Check

**`src/lib/actions/posts.ts` / `comments.ts`** — Wiederverwendbare Prüfung (inline, kein Extra-File):

```typescript
async function checkEmailVerified(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase.from('profiles').select('email_verified').eq('id', userId).single();
  return data?.email_verified ?? false;
}
```

Oder einfach inline in beiden Actions.

## Schritt 7: Resend-Verification Server Action (`src/lib/actions/auth.ts`)

```typescript
export async function resendVerificationEmail(): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { success: false, error: "Nicht eingeloggt" };

  // Check if already verified
  const { data: profile } = await supabase
    .from('profiles').select('email_verified').eq('id', user.id).single();
  if (profile?.email_verified) return { success: false, error: "Email bereits bestätigt" };

  const admin = createAdminClient();
  // Temporarily un-confirm to allow resend
  await admin.auth.admin.updateUserById(user.id, { email_confirm: false });

  // Resend confirmation email
  const { error } = await supabase.auth.resend({ type: 'signup', email: user.email });

  // Re-confirm so user stays logged in
  await admin.auth.admin.updateUserById(user.id, { email_confirm: true });

  if (error) return { success: false, error: "Email konnte nicht gesendet werden" };
  return { success: true };
}
```

## Schritt 8: Client UI — Verification Modal/Banner

**Neuer Component: `src/components/shared/email-verification-modal.tsx`**

Ein Modal das erscheint wenn `createPost` oder `createComment` den Error `EMAIL_NOT_VERIFIED` zurückgibt:

- Titel: "E-Mail bestätigen"
- Text: "Bitte bestätige deine E-Mail-Adresse, um posten und kommentieren zu können. Wir haben dir eine E-Mail an [email] gesendet."
- Button: "Erneut senden" (ruft `resendVerificationEmail()` auf)
- Button: "Verstanden" (schließt Modal)

**Einbinden in:**
- `src/components/create/create-post-form.tsx` — Bei `EMAIL_NOT_VERIFIED` Error das Modal statt Toast zeigen
- `src/components/feed/comment-input.tsx` — Gleich

## Schritt 9: Supabase Dashboard (manuell)

1. Authentication → Email → **"Enable email confirmations"** aktivieren
2. Email Template anpassen:
   - Subject: "Bestätige deine E-Mail — 2Hours"
   - Body: Professionelles Design mit 2Hours-Branding
   - Bestätigungs-Link mit `{{ .ConfirmationURL }}`
3. Redirect URLs prüfen: `twohrs.com` und `socialnetwork-dev.vercel.app` müssen eingetragen sein

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `supabase/migrations/021_email_verification.sql` | NEU — Migration |
| `src/lib/types.ts` | `email_verified` zu Profile |
| `src/lib/actions/auth.ts` | Signup-Flow + Resend-Action |
| `src/app/(auth)/auth/callback/route.ts` | email_verified setzen |
| `src/lib/actions/posts.ts` | Guard in createPost/createPostRecord |
| `src/lib/actions/comments.ts` | Guard in createComment |
| `src/components/shared/email-verification-modal.tsx` | NEU — Modal Component |
| `src/components/create/create-post-form.tsx` | Modal bei EMAIL_NOT_VERIFIED |
| `src/components/feed/comment-input.tsx` | Modal bei EMAIL_NOT_VERIFIED |

## Verifizierung / Testen

1. `pnpm tsc --noEmit` — TypeScript-Fehlerfreiheit
2. Neuen Account erstellen → Bestätigungs-Email sollte ankommen
3. Ohne Bestätigung: Feed browsen, voten, folgen → funktioniert
4. Ohne Bestätigung: Posten/Kommentieren → Modal erscheint
5. "Erneut senden" → Neue Email kommt
6. Link in Email klicken → `email_verified = true`, Posten funktioniert
7. Bestehenden Account testen → alles funktioniert wie bisher

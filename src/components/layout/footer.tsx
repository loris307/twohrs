import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
      <div className="mx-auto max-w-4xl px-4">
        <p>
          twohrs —{" "}
          <Link href="/about" className="underline underline-offset-4 hover:text-foreground">
            Anti-Attention-Economy
          </Link>
        </p>
        <div className="mt-2 flex items-center justify-center gap-4">
          <Link href="/impressum" className="underline underline-offset-4 hover:text-foreground">
            Impressum
          </Link>
          <Link href="/datenschutz" className="underline underline-offset-4 hover:text-foreground">
            Datenschutz
          </Link>
          <Link href="/agb" className="underline underline-offset-4 hover:text-foreground">
            AGB
          </Link>
        </div>
      </div>
    </footer>
  );
}

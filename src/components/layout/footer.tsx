import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
      <div className="mx-auto max-w-4xl px-4">
        <p>
          2Hours —{" "}
          <Link href="/about" className="underline underline-offset-4 hover:text-foreground">
            Anti-Attention-Economy
          </Link>
        </p>
      </div>
    </footer>
  );
}

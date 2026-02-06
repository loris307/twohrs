"use client";

import { Navbar } from "@/components/layout/navbar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { TimeBanner } from "@/components/layout/time-banner";
import { SessionEndedModal } from "@/components/countdown/session-ended-modal";
import { Footer } from "@/components/layout/footer";

export function AppShell({
  children,
  username,
}: {
  children: React.ReactNode;
  username?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar username={username} />
      <TimeBanner />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 pb-20 md:pb-6">
        {children}
      </main>
      <Footer />
      <BottomNav username={username} />
      <SessionEndedModal />
    </div>
  );
}

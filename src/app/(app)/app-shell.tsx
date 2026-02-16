"use client";

import { Navbar } from "@/components/layout/navbar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { TimeBanner } from "@/components/layout/time-banner";
import { ModerationWarning } from "@/components/layout/moderation-warning";
import { SessionEndedModal } from "@/components/countdown/session-ended-modal";
import { Footer } from "@/components/layout/footer";

export function AppShell({
  children,
  username,
  unreadMentionCount = 0,
  moderationStrikes = 0,
}: {
  children: React.ReactNode;
  username?: string;
  unreadMentionCount?: number;
  moderationStrikes?: number;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar username={username} unreadMentionCount={unreadMentionCount} />
      <TimeBanner />
      {moderationStrikes >= 2 && <ModerationWarning strikes={moderationStrikes} />}
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 pb-20 md:pb-6">
        {children}
      </main>
      <Footer />
      <BottomNav username={username} unreadMentionCount={unreadMentionCount} />
      <SessionEndedModal />
    </div>
  );
}

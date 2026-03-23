import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLatestTopPost } from "@/lib/queries/leaderboard";
import type { TopPostAllTime } from "@/lib/types";

export interface LandingSnapshot {
  yesterdayTopPost: TopPostAllTime | null;
  userCount: number;
}

async function getLandingSnapshotUncached(): Promise<LandingSnapshot> {
  const [{ count }, yesterdayTopPost] = await Promise.all([
    createAdminClient().from("profiles").select("*", { count: "exact", head: true }),
    getLatestTopPost(),
  ]);

  return {
    yesterdayTopPost,
    userCount: count ?? 0,
  };
}

// Cache key includes "v1" so stale data is not served across deploys
// when the snapshot shape changes. Bump the version on schema changes.
export const getCachedLandingSnapshot = unstable_cache(
  getLandingSnapshotUncached,
  ["landing-page-snapshot", "v1"],
  { revalidate: 60 }
);

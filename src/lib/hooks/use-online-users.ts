"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useUserCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();

    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .then(({ count }) => {
        if (count !== null) setCount(count);
      });
  }, []);

  return count;
}

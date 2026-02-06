// Supabase Edge Function: Clean up all files in the memes storage bucket
// Deploy with: supabase functions deploy cleanup-storage

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // List all folders (user IDs) in the memes bucket
    const { data: folders, error: listError } = await supabase.storage
      .from("memes")
      .list("", { limit: 1000 });

    if (listError) {
      return new Response(JSON.stringify({ error: listError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    let deletedCount = 0;

    for (const folder of folders || []) {
      // List files in each user folder
      const { data: files } = await supabase.storage
        .from("memes")
        .list(folder.name, { limit: 1000 });

      if (files && files.length > 0) {
        const filePaths = files.map((f) => `${folder.name}/${f.name}`);
        const { error: deleteError } = await supabase.storage
          .from("memes")
          .remove(filePaths);

        if (!deleteError) {
          deletedCount += filePaths.length;
        }
      }
    }

    return new Response(
      JSON.stringify({ message: `Deleted ${deletedCount} files` }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

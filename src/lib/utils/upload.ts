import { createClient } from "@/lib/supabase/client";

export async function uploadImageWithProgress(
  file: File,
  onProgress: (percent: number) => void
): Promise<{ imageUrl: string; imagePath: string }> {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Nicht eingeloggt");
  }

  const fileExt = file.name.split(".").pop() || "jpg";
  const fileName = `${session.user.id}/${crypto.randomUUID()}.${fileExt}`;

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/memes/${fileName}`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const {
          data: { publicUrl },
        } = supabase.storage.from("memes").getPublicUrl(fileName);

        resolve({ imageUrl: publicUrl, imagePath: fileName });
      } else {
        let message = "Upload fehlgeschlagen";
        try {
          const body = JSON.parse(xhr.responseText);
          if (body.message) message = body.message;
        } catch {
          // ignore parse error
        }
        reject(new Error(message));
      }
    };

    xhr.onerror = () => reject(new Error("Netzwerkfehler beim Upload"));

    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.send(file);
  });
}

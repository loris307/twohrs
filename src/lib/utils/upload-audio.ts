import { createClient } from "@/lib/supabase/client";
import { getSupabaseUrl } from "@/lib/supabase/public-env";

const MIME_TO_EXTENSION: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
};

export async function uploadAudioWithProgress(
  blob: Blob,
  mimeType: string,
  onProgress: (percent: number) => void
): Promise<{ audioUrl: string; audioPath: string; audioMimeType: string }> {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Nicht eingeloggt");
  }

  const ext = MIME_TO_EXTENSION[mimeType] ?? "webm";
  const fileName = `${session.user.id}/${crypto.randomUUID()}.${ext}`;
  const url = `${getSupabaseUrl()}/storage/v1/object/audio-posts/${fileName}`;

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
        } = supabase.storage.from("audio-posts").getPublicUrl(fileName);

        resolve({ audioUrl: publicUrl, audioPath: fileName, audioMimeType: mimeType });
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
    xhr.setRequestHeader("Content-Type", mimeType);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.send(blob);
  });
}

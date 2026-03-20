export async function uploadImageWithProgress(
  file: File,
  onProgress: (percent: number) => void
): Promise<{ imagePath: string }> {
  const formData = new FormData();
  formData.append("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const body = JSON.parse(xhr.responseText);
          resolve({ imagePath: body.imagePath });
        } catch {
          reject(new Error("Ungültige Server-Antwort"));
        }
      } else {
        let message = "Upload fehlgeschlagen";
        try {
          const body = JSON.parse(xhr.responseText);
          if (body.error) message = body.error;
        } catch {
          // ignore
        }
        reject(new Error(message));
      }
    };

    xhr.onerror = () => reject(new Error("Netzwerkfehler beim Upload"));

    xhr.open("POST", "/api/uploads/image");
    xhr.send(formData);
  });
}

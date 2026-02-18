import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "twohrs",
    short_name: "twohrs",
    description: "Social Media. 2 Stunden. Dann leb dein Leben.",
    start_url: "/",
    display: "standalone",
    background_color: "#1b1b1b",
    theme_color: "#1b1b1b",
    lang: "de",
    orientation: "portrait",
    categories: ["social", "entertainment"],
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

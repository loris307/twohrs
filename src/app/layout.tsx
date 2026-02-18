import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { NavigationProgress } from "@/components/layout/navigation-progress";
import { ServiceWorkerRegister } from "@/components/layout/service-worker-register";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1b1b1b",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://twohrs.com"),
  title: "twohrs — Social Media. 2 Stunden. Dann leb dein Leben.",
  description:
    "Ein soziales Netzwerk, das nur 2 Stunden am Tag geöffnet hat. Poste Memes, sammle Upvotes, werde lustigste Person des Tages. Um Mitternacht wird alles gelöscht.",
  openGraph: {
    title: "twohrs",
    description: "Social Media. 2 Stunden. Dann leb dein Leben.",
    type: "website",
    images: [
      {
        url: "/image.webp",
        width: 1200,
        height: 1200,
        alt: "twohrs Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/image.webp"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "twohrs",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="dark">
      <body className={`${inter.variable} font-sans antialiased lowercase`}>
        <NavigationProgress />
        <ServiceWorkerRegister />
        {children}
        <Toaster
          theme="dark"
          position="top-center"
          richColors
          closeButton
        />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "2Hours — Social Media. 2 Stunden. Dann leb dein Leben.",
  description:
    "Ein soziales Netzwerk, das nur 2 Stunden am Tag geöffnet hat. Poste Memes, sammle Upvotes, werde lustigste Person des Tages. Um Mitternacht wird alles gelöscht.",
  openGraph: {
    title: "2Hours",
    description: "Social Media. 2 Stunden. Dann leb dein Leben.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
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

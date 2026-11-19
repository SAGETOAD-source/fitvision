import "./globals.css";
import type { Metadata } from "next";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "FitVision AI Coach",
  description: "Live browser-based AI fitness rep counting and form feedback",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-zinc-950 text-zinc-100 min-h-screen selection:bg-emerald-500 selection:text-black font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}


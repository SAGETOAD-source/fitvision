import "./globals.css";
import type { Metadata } from "next";

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
    <html lang="en">
      <body className="antialiased bg-slate-950 text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}


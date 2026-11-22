import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter, Montserrat, Lora, Unbounded } from "next/font/google";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { PageTransition } from "@/components/layout/PageTransition";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  variable: "--font-montserrat",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-lora",
  display: "swap",
});

const unbounded = Unbounded({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FitVision — Intelligent Real-Time Athletic Vision",
  description:
    "Train with intelligence. Real-time computer vision fitness coaching directly in your browser with private, on-device pose tracking.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${montserrat.variable} ${lora.variable} ${unbounded.variable} dark`}
    >
      <body className="antialiased bg-bg-base text-white min-h-screen selection:bg-brand selection:text-white">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:px-4 focus:py-2 focus:bg-brand focus:text-white focus:font-display focus:text-xs focus:font-bold focus:uppercase focus:tracking-wider focus:border focus:border-accent"
        >
          Skip to main content
        </a>
        <AuthProvider>
          <PageTransition />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

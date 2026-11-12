import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter, Montserrat, Lora } from "next/font/google";

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
      className={`${inter.variable} ${montserrat.variable} ${lora.variable} dark`}
    >
      <body className="antialiased bg-black text-white min-h-screen selection:bg-[#6D001A] selection:text-white">
        {children}
      </body>
    </html>
  );
}




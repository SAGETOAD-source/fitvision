import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        "bg-base": "#000000",
        surface: "#0B0B0C",
        "surface-elevated": "#131314",
        brand: "#6D001A",
        "brand-hover": "#851630",
        accent: "#FF4D6D",
        "text-muted": "#DEBFBF",
        "border-subtle": "#1A1A1E",
        "primary-container": "#6D001A",
        "primary-container-hover": "#851630",
        "signal-rose": "#FF4D6D",
        "surface-dark": "#0B0B0C",
        "surface-card": "#131314",
        "surface-container": "#201F20",
        "card-border": "#1A1A1E",
        "on-surface-variant": "#DEBFBF",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "-apple-system", "sans-serif"],
        headline: ["var(--font-montserrat)", "Montserrat", "sans-serif"],
        display: [
          "var(--font-display)",
          "var(--font-montserrat)",
          "Montserrat",
          "sans-serif",
        ],
        serif: ["var(--font-lora)", "Lora", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;



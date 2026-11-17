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
        // Primitive tokens
        'fv-bg': 'var(--fv-bg)',
        'fv-bg-elevated': 'var(--fv-bg-elevated)',
        'fv-fg': 'var(--fv-fg)',
        'fv-fg-muted': 'var(--fv-fg-muted)',
        'fv-burgundy': 'var(--fv-burgundy)',
        'fv-burgundy-hover': 'var(--fv-burgundy-hover)',
        'fv-rose': 'var(--fv-rose)',
        'fv-rose-muted': 'var(--fv-rose-muted)',
        'fv-border': 'var(--fv-border)',
        'fv-border-focus': 'var(--fv-border-focus)',

        // Semantic aliases
        background: 'var(--fv-bg)',
        foreground: 'var(--fv-fg)',
        primary: {
          DEFAULT: 'var(--fv-burgundy)',
          hover: 'var(--fv-burgundy-hover)',
        },
        accent: {
          DEFAULT: 'var(--fv-rose)',
          muted: 'var(--fv-rose-muted)',
        },
        muted: 'var(--fv-fg-muted)',
        border: 'var(--fv-border)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'label': ['0.75rem', { letterSpacing: '0.2em', fontWeight: '700' }],
      },
      borderRadius: {
        'cta': 'var(--radius-cta)',
        'card': 'var(--radius-card)',
      },
      transitionDuration: {
        'wipe': 'var(--duration-wipe)',
        'progress': 'var(--duration-progress)',
        'nudge': 'var(--duration-nudge)',
        'crossfade': 'var(--duration-crossfade)',
        'press': 'var(--duration-press)',
      },
      transitionTimingFunction: {
        'ease-out-expo': 'var(--ease-out-expo)',
        'ease-in-out': 'var(--ease-in-out)',
        'linear': 'linear',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'progress-fill': {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
        'wipe-fill': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        crossfade: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        marquee: 'marquee var(--duration-marquee) linear infinite',
        'progress-fill': 'progress-fill var(--duration-progress) linear forwards',
        'wipe-fill': 'wipe-fill var(--duration-wipe) var(--ease-out-expo) forwards',
        crossfade: 'crossfade var(--duration-crossfade) var(--ease-in-out) forwards',
      },
    },
  },
  plugins: [],
};
export default config;
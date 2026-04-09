import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        surface: {
          0: "#ffffff",
          50: "#fafbfc",
          100: "#f4f5f7",
          200: "#e8eaed",
          300: "#d1d5db",
          400: "#9ca3af",
          500: "#6b7280",
          600: "#4b5563",
          700: "#374151",
          800: "#1f2937",
          900: "#111827",
          950: "#0a0d14",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "SF Pro Display",
          "-apple-system",
          "system-ui",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      fontSize: {
        "display-xl": ["3.5rem", { lineHeight: "1.05", letterSpacing: "-0.035em", fontWeight: "600" }],
        "display": ["2.75rem", { lineHeight: "1.1", letterSpacing: "-0.03em", fontWeight: "600" }],
        "heading-1": ["2rem", { lineHeight: "1.2", letterSpacing: "-0.025em", fontWeight: "600" }],
        "heading-2": ["1.5rem", { lineHeight: "1.3", letterSpacing: "-0.02em", fontWeight: "600" }],
        "heading-3": ["1.25rem", { lineHeight: "1.4", letterSpacing: "-0.015em", fontWeight: "600" }],
        "body-lg": ["1.125rem", { lineHeight: "1.6", letterSpacing: "-0.01em", fontWeight: "400" }],
        "body": ["1rem", { lineHeight: "1.6", fontWeight: "400" }],
        "body-sm": ["0.875rem", { lineHeight: "1.5", fontWeight: "400" }],
        "caption": ["0.8125rem", { lineHeight: "1.4", fontWeight: "500" }],
        "micro": ["0.75rem", { lineHeight: "1.4", fontWeight: "500" }],
      },
      boxShadow: {
        "xs": "0 1px 2px rgba(0,0,0,0.04)",
        "soft": "0 2px 8px -2px rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.04)",
        "card": "0 0 0 1px rgba(0,0,0,0.04), 0 2px 8px -2px rgba(0,0,0,0.08), 0 4px 16px -4px rgba(0,0,0,0.06)",
        "elevated": "0 0 0 1px rgba(0,0,0,0.04), 0 4px 12px -2px rgba(0,0,0,0.1), 0 12px 32px -8px rgba(0,0,0,0.1)",
        "stripe": "rgba(50,50,93,0.12) 0px 6px 18px -6px, rgba(0,0,0,0.06) 0px 3px 10px -3px",
        "stripe-lg": "rgba(50,50,93,0.15) 0px 16px 40px -12px, rgba(0,0,0,0.08) 0px 8px 20px -8px",
        "glow": "0 0 24px -4px rgba(99,102,241,0.25)",
        "inner-border": "inset 0 0 0 1px rgba(0,0,0,0.06)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem",
        "4xl": "1.5rem",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "marquee": "marquee var(--duration, 30s) linear infinite",
        "border-beam": "border-beam var(--duration, 6s) linear infinite",
        "gradient": "gradient 6s ease infinite",
        "shimmer": "shimmer 2s linear infinite",
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(calc(-100% - var(--gap)))" },
        },
        "border-beam": {
          "0%": { left: "0%", opacity: "0" },
          "10%": { opacity: "1" },
          "90%": { opacity: "1" },
          "100%": { left: "100%", opacity: "0" },
        },
        gradient: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;

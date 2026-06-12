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
        // Terracotta — warm primary accent
        brand: {
          50: "#faeee7",
          100: "#f3dccd",
          200: "#e7bfa7",
          300: "#d89e79",
          400: "#cb7d53",
          500: "#c25e3a",
          600: "#a94e2f",
          700: "#8a3f26",
          800: "#6e3220",
          900: "#5a2a1c",
          950: "#32150b",
        },
        // Warm cream / taupe neutrals - ATSTATYTA GAMYKLINĖ PALETĖ
        surface: {
          0: "#ece9e2",   // Pagrindinis šiltas svetainės fonas
          50: "#f5f3ef",  // Švelni kreminė pilka (skeletonams ir šviesiems burbulams)
          100: "#e3dfd4",
          200: "#d6d0c3",
          300: "#c0b9a8",
          400: "#a29b8b",
          500: "#7e7768",
          600: "#5f584c",
          700: "#463f35",
          800: "#312d25",
          900: "#25221e",  // Prabangi tamsi (naudok tekstui arba tamsiems burbulams)
          950: "#1a1813",
        },
        // Semantic roles — ONE per role. Use only for genuine status meaning,
        // never as decoration (terracotta `brand` is the only accent).
        danger: {
          soft: "#fef2f2",
          DEFAULT: "#dc2626",
          strong: "#991b1b",
        },
        success: {
          soft: "#ecfdf3",
          DEFAULT: "#16a34a",
          strong: "#15803d",
        },
        warning: {
          soft: "#fdf6e3",
          DEFAULT: "#d9920b",
          strong: "#a66c08",
        },
        // Themed board surface (Užklausų lenta paper sheet)
        paper: {
          DEFAULT: "var(--surface-paper)",
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
        serif: [
          "var(--font-serif)",
          "Georgia",
          "Cambria",
          "Times New Roman",
          "serif",
        ],
        // Display = the serif (Lora), aliased. Page-level H1 use this;
        // all other text uses `sans` (Inter). No new font is introduced.
        display: [
          "var(--font-display)",
          "Georgia",
          "Cambria",
          "Times New Roman",
          "serif",
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
        // Canonical 3-step scale — warm brown hue (rgba(93,70,54)) is brand,
        // kept on purpose. Prefer these over ad-hoc shadow-[...] recipes.
        "sm": "0 1px 2px rgba(93,70,54,0.08)",
        "md": "0 4px 14px rgba(93,70,54,0.10)",
        "lg": "0 16px 36px -12px rgba(93,70,54,0.14)",
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
      // Canonical motion — one duration, one easing. Use `duration-base` /
      // `ease-standard` for interactive transitions.
      transitionDuration: {
        base: "150ms",
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(0.4, 0, 0.2, 1)",
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

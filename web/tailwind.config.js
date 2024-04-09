/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  safelist: [
    {
      pattern: /(outline|shadow)-severity_(alert|detection|significant_motion)/,
    },
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    fontFamily: {
      sans: ['"Inter"', "sans-serif"],
    },
    extend: {
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        move: "move 3s ease-in-out infinite",
        scale1: "scale1 3s ease-in-out infinite",
        scale2: "scale2 3s ease-in-out infinite",
        scale3: "scale3 3s ease-in-out infinite",
        scale4: "scale4 3s ease-in-out infinite",
      },
      aspectRatio: {
        wide: "32 / 9",
        tall: "8 / 9",
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        danger: "#ef4444",
        success: "#22c55e",
        background: "hsl(var(--background))",
        background_alt: "hsl(var(--background-alt))",
        foreground: "hsl(var(--foreground))",
        selected: "hsl(var(--selected))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          highlight: "hsl(var(--secondary-highlight))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        severity_alert: {
          DEFAULT: "hsl(var(--severity_alert))",
          dimmed: "hsl(var(--severity_alert_dimmed))",
        },
        severity_detection: {
          DEFAULT: "hsl(var(--severity_detection))",
          dimmed: "hsl(var(--severity_detection_dimmed))",
        },
        severity_significant_motion: {
          DEFAULT: "hsl(var(--severity_significant_motion))",
          dimmed: "hsl(var(--severity_significant_motion_dimmed))",
        },
        motion_review: {
          DEFAULT: "hsl(var(--motion_review))",
          dimmed: "hsl(var(--motion_review_dimmed))",
        },
        audio_review: {
          DEFAULT: "hsl(var(--audio_review))",
        },
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        move: {
          "50%": { left: "calc(100% - 7px)" },
        },
        scale1: {
          "0%, 100%": { transform: "scale(1.3)" },
          "10%, 90%": { transform: "scale(1.4)" },
          "20%, 80%": { transform: "scale(1)" },
        },
        scale2: {
          "20%, 80%": { transform: "scale(1.4)" },
          "10%, 30%, 70%, 90%": { transform: "scale(1)" },
        },
        scale3: {
          "30%, 70%": { transform: "scale(1.4)" },
          "20%, 40%, 60%, 80%": { transform: "scale(1)" },
        },
        scale4: {
          "50%": { transform: "scale(1.3)" },
          "40%, 60%": { transform: "scale(1.4)" },
          "30%, 70%": { transform: "scale(1)" },
        },
      },
      screens: {
        xs: "480px",
        "2xl": "1440px",
        "3xl": "1920px",
        "4xl": "2560px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

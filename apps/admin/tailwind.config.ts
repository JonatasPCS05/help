import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#2E7D32",
          dark: "#1B5E20",
          light: "#E8F3E9",
        },
        secondary: {
          DEFAULT: "#FF9800",
          light: "#FFF3E0",
        },
        tertiary: {
          DEFAULT: "#B14B6F",
          light: "#F7E9EE",
        },
        ink: "#1A1A1A",
        canvas: "#FBF9F6",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;

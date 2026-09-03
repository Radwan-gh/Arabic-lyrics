import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-tajawal)", "Tahoma", "Arial", "sans-serif"],
        naskh: ["var(--font-scheherazade)", "Amiri", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;

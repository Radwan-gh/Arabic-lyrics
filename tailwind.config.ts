import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-tajawal)", "Tahoma", "Arial", "sans-serif"],
        naskh: ["var(--font-scheherazade)", "Amiri", "serif"],
        ruqaa: ["var(--font-ruqaa)", "var(--font-tajawal)", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;

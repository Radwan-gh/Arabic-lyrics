import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-scheherazade)", "Amiri", "Tahoma", "serif"],
        naskh: ["var(--font-scheherazade)", "Amiri", "serif"],
        ruqaa: ["var(--font-ruqaa)", "var(--font-scheherazade)", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;

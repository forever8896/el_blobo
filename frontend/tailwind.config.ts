import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
        display: ["Syne", "sans-serif"],
      },
      colors: {
        blob: {
          cobalt: "#1E4CDD",
          mint: "#4FFFB0",
          peach: "#FFDAB9",
          violet: "#240B4D",
          orange: "#FF9F1C",
          green: "#2ECC71",
        },
        ronin: {
          blue: "#1E4CDD",
          mint: "#4FFFB0",
          peach: "#FFDAB9",
          violet: "#240B4D",
          orange: "#FF9F1C",
          green: "#2ECC71",
        }
      }
    },
  },
  plugins: [],
};

export default config;
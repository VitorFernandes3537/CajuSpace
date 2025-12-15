import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx,js,jsx,mdx}",
    "./components/**/*.{ts,tsx,js,jsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#5EB8FF",
          darkblue: "#0E3B5F",
          orange: "#FF8A42",
          offwhite: "#F7F9FB",
          lightgray: "#E6E9EE",
        },
        caju: {
          500: "#F77411",
          600: "#D35A0D",
          700: "#A3410A",
        },
      },

      boxShadow: {
        soft: "0px 10px 32px rgba(0,0,0,0.25)",
        card: "0 2px 12px rgba(0,0,0,0.15)",
      },

      fontFamily: {
        sans: ["Poppins", "Inter", "Montserrat", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;

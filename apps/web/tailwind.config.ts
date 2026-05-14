import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        mirror: {
          ink: "#0b0d10",
          panel: "#12151a",
          line: "#2a2f37",
          frost: "#e7e9ed",
          ember: "#d6a35c",
          mint: "#d6a35c"
        }
      },
      boxShadow: {
        mirror: "none"
      }
    }
  },
  plugins: []
};

export default config;

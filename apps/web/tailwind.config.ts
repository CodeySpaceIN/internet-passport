import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", ".dark"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      container: {
        center: true,
        padding: "1rem",
      },
      borderRadius: {
        xl: "0.75rem",
      },
    },
  },
};

export default config;

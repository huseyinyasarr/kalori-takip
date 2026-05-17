import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        ink: "#17201c",
        leaf: "#2f7d5b",
        mint: "#dff4e7",
        coral: "#ef7d63",
        amberSoft: "#f5bd4f",
        cloud: "#f7faf8",
      },
      boxShadow: {
        soft: "0 18px 50px rgba(23, 32, 28, 0.08)",
      },
    },
  },
  plugins: [],
} satisfies Config;

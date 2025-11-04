import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'custom-green': '#21C700',
        primary: {
            DEFAULT: '#21C700',
            foreground: "#000000",
        },
        border: "#21C700",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
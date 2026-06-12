/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#fdfaf3",
          100: "#faf3e3",
          200: "#f3e7c9",
          300: "#ead8a8",
        },
        hazel: {
          100: "#ecdcc8",
          300: "#c9a87c",
          500: "#8b5e34",
          700: "#5e3f23",
          900: "#3e2a17",
        },
        leaf: {
          100: "#d8f3dc",
          300: "#95d5b2",
          500: "#52b788",
          700: "#2d6a4f",
          900: "#1b4332",
        },
      },
    },
  },
  plugins: [],
};

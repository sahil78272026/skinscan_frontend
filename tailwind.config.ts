import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        peach: {
          50: '#fdf8f6',
          100: '#f2e8e5',
          200: '#eaddd7',
          300: '#e0cec7',
          400: '#d2bab0',
          500: '#c5a596',
          600: '#b08b7a',
          700: '#9b715f',
          800: '#875845',
          900: '#72402b',
        },
        terracotta: {
          500: '#e07a5f',
          600: '#c96a51',
          700: '#b25a43',
        },
        gold: {
          400: '#f4d06f',
          500: '#e9b83b',
        }
      },
      fontFamily: {
        display: ['var(--font-fraunces)'],
        body: ['var(--font-manrope)'],
      }
    },
  },
  plugins: [],
};
export default config;

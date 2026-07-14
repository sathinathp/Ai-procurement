/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        copilot: {
          blue: {
            DEFAULT: '#0078d4',
            light: '#eff6fc',
            dark: '#106ebe',
            hover: '#106ebe',
            border: '#deecf9',
          },
          neutral: {
            white: '#ffffff',
            light: '#f3f2f1',
            border: '#edebe9',
            text: '#323130',
            secondary: '#605e5c',
            hover: '#f3f2f1',
          }
        }
      },
      fontFamily: {
        sans: ['Segoe UI', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

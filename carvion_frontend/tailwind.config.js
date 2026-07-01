/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f4ff",
          100: "#d9e2ff",
          200: "#b8c9ff",
          300: "#8ca7ff",
          400: "#597cff",
          500: "#2a4cff", // Core brand purple-blue accent
          600: "#001eff",
          700: "#0016cc",
          800: "#000f99",
          900: "#000866",
        },
        dark: {
          50: "#a3a3a3",
          100: "#737373",
          200: "#525252",
          300: "#404040",
          400: "#262626",
          500: "#171717", // Main background for card elements in dark mode
          600: "#0a0a0a", // Deep background for dashboard layout
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      backdropBlur: {
        xs: "2px",
      }
    },
  },
  plugins: [],
}

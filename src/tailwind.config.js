/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        indigo: {
          600: "#6366f1",
          700: "#4f46e5",
        },
        amber: {
          600: "#f59e0b",
          700: "#d97706",
        },
        green: {
          600: "#10b981",
        },
        red: {
          600: "#ef4444",
          700: "#dc2626",
        },
        slate: {
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
        },
      },
      animation: {
        pulse: "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};

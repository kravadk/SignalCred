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
        bg: "#cabdeb",
        purple: {
          DEFAULT: "#3f1d72",
          deep: "#291153",
          soft: "#7a55c6",
          light: "#efe5ff",
        },
        pink: "#ff6a84",
        orange: "#ff624e",
        cream: "#fff8eb",
        green: {
          DEFAULT: "#26aa68",
          mint: "#69d99a",
        },
      },
      fontFamily: {
        display: ["'Changa One'", "sans-serif"],
        fun: ["'Changa One'", "sans-serif"],
        body: ["'Nunito'", "sans-serif"],
      },
      backgroundImage: {
        "purple-gradient": "linear-gradient(135deg, #44207a 0%, #291153 100%)",
        "card-gradient":
          "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))",
      },
      boxShadow: {
        card: "inset 0 1px 0 rgba(255,255,255,0.18), 0 22px 36px rgba(20,8,48,0.2)",
        btn: "0 14px 24px rgba(16,7,37,0.22)",
      },
      borderRadius: {
        card: "38px",
        btn: "19px",
      },
      animation: {
        pop: "pop 0.34s ease both",
        "spin-slow": "spin 8s linear infinite",
      },
      keyframes: {
        pop: {
          from: { opacity: "0", transform: "translateY(14px) scale(0.99)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      opacity: {
        "8": "0.08",
        "12": "0.12",
        "15": "0.15",
      },
    },
  },
  plugins: [],
};

export default config;

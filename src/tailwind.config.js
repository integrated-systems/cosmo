/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Хэрэглэгчийн 2026-08-12 θгсθн Login хуудасны θнгθний палитр (эх
        // suh.html-ийн гараар засварласан login overlay-аас) — theme-ийг
        // нэг л газар тодорхойлж, бγх компонентод дахин ашиглана.
        appbg: '#0b132b',
        sidebg: '#070d1d',
        bordercol: '#1a2642',
        text: '#e2e8f0',
        darktext: '#5c6c84',
        mutedtext: '#8a99ad',
        menuhover: 'rgba(255, 255, 255, 0.03)',
        menuactive: 'rgba(59, 130, 246, 0.1)',
        customYellow: '#f8f23d',
        customGreen: '#10b981',
        customBlue: '#3b82f6',
        customRed: '#ef5555',
        customOrange: '#f59e0b',
        customPurple: '#8b5cf6',
        customPink: '#ec4899',
        customIndigo: '#0a428f',
        customBlack: '#1c1e1f',
        customSkyBlue: '#cbeeff',
      },
      fontFamily: {
        // эх login хуудасны font-family
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
      },
      borderWidth: {
        DEFAULT: '1px',
      },
    },
  },
  plugins: [],
};

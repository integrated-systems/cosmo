/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // projectcosmo.html-ийн эх дизайны θнгθний tokens ЯГ хуулбарлав —
        // theme-ийг нэг л газар тодорхойлж, бγх компонентод дахин ашиглана
        // (θмнθх тθсθлд сурсан сургамж: pixel утгыг хуудас бγрт тусад нь
        // давтахгγй, эхнээсээ theme tokens-д тодорхойл).
        appbg: '#0b132b',
        sidebg: '#070d1d',
        bordercol: '#1a2642',
        menuhover: 'rgba(255, 255, 255, 0.03)',
        menuactive: 'rgba(59, 130, 246, 0.1)',
        mutedtext: '#8a99ad',
        darktext: '#5c6c84',
        customRed: '#ef5555',
        customBlue: '#3b82f6',
        customGreen: '#10b981',
      },
    },
  },
  plugins: [],
};

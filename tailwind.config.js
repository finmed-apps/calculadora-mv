/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        fm: {
          green:      '#2d3f1f',
          'green-dark': '#1e2b13',
          'green-soft': '#3d5028',
          yellow:     '#f4c542',
          'yellow-dark': '#e0b030',
          cream:      '#faf6ec',
          ivory:      '#fffdf7',
          paper:      '#ffffff',
          text:       '#1e2b13',
          'text-soft':'#5a6451',
          'text-mute':'#8a8e7f',
          border:     '#e4dfc9',
          'border-soft':'#efebd9',
          success:    '#4a7c3a',
          warn:       '#c97a1d',
          danger:     '#b64a3e',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        'fm':       '0 8px 24px rgba(30, 43, 19, 0.08)',
        'fm-lg':    '0 16px 48px rgba(30, 43, 19, 0.12)',
        'fm-yellow':'0 12px 40px rgba(244, 197, 66, 0.35)',
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sage: {
          50:  '#f4f9f5',
          100: '#e4f1e7',
          200: '#c5e2cc',
          300: '#96ca9f',
          400: '#67b076',
          500: '#4a9460',
          600: '#3a754c',
          700: '#2d5c3c',
          800: '#244a31',
          900: '#1b3a26',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

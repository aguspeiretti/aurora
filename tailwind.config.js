/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fdf8ef',
          100: '#f7edda',
          200: '#eed9b3',
          300: '#e2c07d',
          400: '#d4a04e',
          500: '#c9893a',
          600: '#a87030',
          700: '#8b5a24',
          800: '#744a1e',
          900: '#5e3b17',
          950: '#3a2209',
        },
        rose: {
          50:  '#fdf2ee',
          100: '#f9e0d5',
          200: '#f2c0ab',
          300: '#e89878',
          400: '#db7554',
          500: '#c4856a',
          600: '#b06050',
          700: '#924d3f',
          800: '#733c31',
          900: '#5a2f26',
          950: '#321510',
        },
        jade: {
          50:  '#edf7f3',
          100: '#d2ede3',
          200: '#a8d9c8',
          300: '#74bfa7',
          400: '#45a085',
          500: '#2d7a5f',
          600: '#24614c',
          700: '#1d4e3d',
          800: '#163d30',
          900: '#0f2d23',
          950: '#081a15',
        },
        cream: {
          50:  '#fdfaf6',
          100: '#f9f2e8',
          200: '#f2e5d0',
          300: '#e8d5b5',
          400: '#dbc49a',
          DEFAULT: '#F5EFE6',
        },
      },
      fontFamily: {
        sans:  ['Outfit', 'system-ui', 'sans-serif'],
        serif: ['Outfit', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl': '0.875rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
}

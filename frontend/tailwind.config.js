/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          orange: '#ff6b00',
          amber:  '#ffb95f',
          cream:  '#ffb693',
          green:  '#4edea3',
          dark:   '#0b1326',
          navy:   '#171f33',
        },
      },
    },
  },
  plugins: [],
}

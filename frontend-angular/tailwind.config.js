/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'ahedna': {
          'beige': '#F5E6D3',
          'red': '#DC2626',
          'green': '#16A34A',
          'yellow': '#EAB308',
          'blue': '#2563EB',
        }
      }
    },
  },
  plugins: [],
}

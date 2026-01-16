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
        },
        'paper': {
          '50': '#FDF8F3',
          '100': '#FAF0E6',
          '200': '#F5E6D3',
          '300': '#E8D5C0',
          '400': '#D4C0A8',
          '500': '#B8A082',
          '600': '#9A8568',
          '700': '#7A6A52',
          '800': '#5C4F3D',
          '900': '#3E3529',
        },
        'sepia': {
          '50': '#FDF8F3',
          '100': '#FAF0E6',
          '200': '#F5E6D3',
          '300': '#E8D5C0',
          '400': '#D4C0A8',
        }
      },
      fontFamily: {
        'serif': ['Georgia', 'Times New Roman', 'serif'],
        'vintage': ['"Playfair Display"', 'Georgia', 'serif'],
      },
      backgroundImage: {
        'paper-texture': 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23d4c0a8\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        'paper-grain': 'radial-gradient(circle at 2px 2px, rgba(0,0,0,0.03) 1px, transparent 0)',
      },
      boxShadow: {
        'paper': '0 2px 8px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.1)',
        'paper-lg': '0 4px 16px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.08), inset 0 2px 0 rgba(255,255,255,0.1)',
        'paper-xl': '0 8px 32px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.1), inset 0 4px 0 rgba(255,255,255,0.15)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.8s ease-out',
        'fade-in': 'fadeIn 1s ease-out',
        'slide-in-left': 'slideInLeft 0.8s ease-out',
        'slide-in-right': 'slideInRight 0.8s ease-out',
        'paper-unfold': 'paperUnfold 1.2s ease-out',
        'path-draw': 'pathDraw 2s ease-in-out',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-50px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(50px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        paperUnfold: {
          '0%': { opacity: '0', transform: 'scale(0.95) rotateY(-5deg)', filter: 'blur(4px)' },
          '100%': { opacity: '1', transform: 'scale(1) rotateY(0deg)', filter: 'blur(0px)' },
        },
        pathDraw: {
          '0%': { strokeDashoffset: '1000' },
          '100%': { strokeDashoffset: '0' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
    },
  },
  plugins: [],
}

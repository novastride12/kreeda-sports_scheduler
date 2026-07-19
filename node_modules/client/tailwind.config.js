/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          dark: '#0B0B0C',
          card: '#121214',
          light: '#1C1C1E',
          accent: '#2C2C2E',
        },
        gold: {
          primary: '#D4AF37',
          dark: '#AA8A2A',
          light: '#E5C060',
        },
        crimson: {
          primary: '#D9383A',
          dark: '#B22426',
          light: '#E25F60',
        },
        ivory: {
          primary: '#F4F4F6',
          muted: '#A1A1A5',
          dark: '#7E7E82',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'gold-glow': '0 0 15px rgba(212, 175, 55, 0.15)',
        'gold-glow-strong': '0 0 25px rgba(212, 175, 55, 0.3)',
        'crimson-glow': '0 0 15px rgba(217, 56, 58, 0.2)',
      }
    },
  },
  plugins: [],
}

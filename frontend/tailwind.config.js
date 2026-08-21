/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        base: {
          dark: '#080B11',
          surface: '#0E131F',
          card: 'rgba(18, 24, 38, 0.75)',
          'card-hover': 'rgba(26, 35, 54, 0.85)',
          'card-solid': '#131929',
          input: 'rgba(14, 19, 31, 0.9)',
          'input-focus': 'rgba(20, 28, 46, 0.95)',
        },
        brand: {
          primary: '#10B981',
          'primary-light': '#34D399',
          'primary-dark': '#059669',
        },
        accent: {
          cyan: '#06B6D4',
          violet: '#8B5CF6',
          gold: '#F59E0B',
          rose: '#F43F5E',
        }
      },
      fontFamily: {
        heading: ['Outfit', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 25px rgba(16, 185, 129, 0.35)',
        'glow-cyan': '0 0 25px rgba(6, 182, 212, 0.35)',
        'glow-violet': '0 0 25px rgba(139, 92, 246, 0.35)',
      },
      animation: {
        'pulse-slow': 'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        }
      }
    },
  },
  plugins: [],
}

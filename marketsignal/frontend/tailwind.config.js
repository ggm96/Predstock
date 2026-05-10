/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#080c10',
        surface: '#0d1117',
        card: '#161b22',
        border: '#30363d',
        'accent-green': '#39d353',
        'accent-red': '#f85149',
        'accent-yellow': '#e3b341',
        'text-primary': '#e6edf3',
        'text-muted': '#8b949e',
        kalshi: '#6e40c9',
        polymarket: '#0052ff',
        manifold: '#4337c9',
        metaculus: '#2563eb',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite',
        'fade-up': 'fadeUp 0.4s ease both',
        pulse_glow: 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
}

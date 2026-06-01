export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        dungeon: {
          950: '#090d0b',
          900: '#0f1713',
          800: '#15231c',
          700: '#1f3329',
          500: '#3c5f4f',
          300: '#9dd5ac',
        },
        ember: {
          500: '#f97316',
          300: '#fbbf24',
        },
      },
      boxShadow: {
        pixel: '0 0 0 2px rgba(8, 15, 10, 1), 6px 6px 0 rgba(8, 15, 10, 0.85)',
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        body: ['VT323', 'monospace'],
      },
    },
  },
  plugins: [],
}

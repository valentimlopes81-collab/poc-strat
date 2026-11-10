/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        term: {
          bg: '#000000',
          panel: '#0a0a0a',
          panel2: '#0e0e0e',
          border: '#242424',
          text: '#e5e5e5',
          muted: '#7a7a7a',
          amber: '#ff9f1c',
          amberdim: '#8a5a1c',
          green: '#00d964',
          red: '#ff3b30',
          blue: '#4fc3f7',
        },
      },
      fontFamily: {
        mono: ['"IBM Plex Mono"', 'ui-monospace', '"SF Mono"', '"Roboto Mono"', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        base: ["'IM Fell English'", 'Palatino', 'Georgia', 'serif'],
        display: ["'IM Fell Double Pica'", 'Georgia', 'serif'],
        mono: ["'Share Tech Mono'", 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}


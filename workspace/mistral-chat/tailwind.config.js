/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(240 10% 3.9%)',
        foreground: 'hsl(0 0% 98%)',
        muted: 'hsl(240 3.7% 15.9%)',
        border: 'hsl(240 3.7% 15.9%)',
        card: 'hsl(240 10% 3.9%)',
        popover: 'hsl(240 10% 3.9%)',
        primary: {
          DEFAULT: '#8b5cf6',
          foreground: '#fff'
        },
        secondary: {
          DEFAULT: 'hsl(240 3.7% 15.9%)',
          foreground: 'hsl(0 0% 98%)'
        }
      }
    }
  },
  plugins: [],
}
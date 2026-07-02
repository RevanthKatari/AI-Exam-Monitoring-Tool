/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        danger: { bg: 'var(--danger-bg)', text: 'var(--danger-text)', dot: 'var(--danger-dot)' },
        warning: { bg: 'var(--warning-bg)', text: 'var(--warning-text)', dot: 'var(--warning-dot)' },
        info: { bg: 'var(--info-bg)', text: 'var(--info-text)', dot: 'var(--info-dot)' },
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'sans-serif'],
        sans: ['"DM Sans"', 'sans-serif'],
      },
      colors: {
        cream: '#F0EBDD',
        'cream-light': '#FAF6EA',
        forest: '#1F3A2A',
        'forest-deep': '#16271D',
        sage: '#5C7A4D',
        olive: '#8B9E6E',
        'olive-light': '#B5C29A',
        coral: '#D9824D',
        'coral-light': '#E8A777',
        ink: '#1F1D17',
        muted: '#6B6857',
        border: '#E0D8C5',
        'border-sub': '#ECE5D2',
        disabled: '#C9C0A8',
        'dis-light': '#B5AC95',
      },
      borderRadius: {
        pill: '999px',
      },
      maxWidth: {
        container: '1320px',
      },
      boxShadow: {
        tag: '0 12px 30px rgba(31,58,42,0.10)',
        'card-hover': '0 16px 36px rgba(31,58,42,0.10)',
        modal: '0 40px 80px rgba(0,0,0,0.30)',
      },
    },
  },
  plugins: [],
}

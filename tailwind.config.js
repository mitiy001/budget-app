/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        pig: {
          bg: '#FFF7EC',
          card: '#FFFFFF',
          ink: '#6B4B3A',
          sub: '#A98E7E',
          deposit: '#F4A261',
          withdraw: '#94B8C7',
          accent: '#F2A65A',
          coral: '#E76F51',
        },
      },
      fontFamily: {
        cute: ['"Baloo 2"', '"Comic Sans MS"', '"PingFang SC"', 'sans-serif'],
      },
      borderRadius: {
        blob: '1.5rem',
      },
      boxShadow: {
        soft: '0 6px 20px rgba(236, 175, 115, 0.18)',
        chip: '0 3px 0 rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
}
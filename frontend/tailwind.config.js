/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0F3D2E',
          dark: '#0A2E22',
          light: '#1B5E43',
        },
        accent: {
          DEFAULT: '#C8862D',
          light: '#E8A94F',
        },
        background: '#F4F6F5',
        surface: '#FFFFFF',
        danger: '#D64545',
        success: '#2E7D32',
        muted: '#8A9490',
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        jetbrains: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#F97316',    // Orange-500
        secondary: '#FB923C',  // Orange-400
        accent: '#FDBA74',     // Orange-300
        danger: '#DC2626',     // Red-600
        dark: '#1F2937',       // Gray-800
      },
    },
  },
  plugins: [],
}

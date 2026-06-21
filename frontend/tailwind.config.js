/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // CredChain brand — navy + blue (shared with the CV Studio image,
        // the PDF CV and the FastAPI CV Studio page).
        credchain: {
          primary: '#276ef1', // blue — primary actions / highlights
          accent: '#38bdf8',  // sky blue — secondary actions / accents
          dark: '#0f2040',    // navy — app background
        },
      },
    },
  },
  plugins: [],
};

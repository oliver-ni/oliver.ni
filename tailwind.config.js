const defaultTheme = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./**/*.{html,md}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter var", ...defaultTheme.fontFamily.sans],
        serif: ["EB Garamond", ...defaultTheme.fontFamily.serif],
      },
    },
  },
  plugins: [],
};

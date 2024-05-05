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
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            a: {
              textDecoration: "none",
              fontWeight: "medium",
              // color: theme("colors.blue.500"),
              transitionProperty: theme("transitionProperty.shadow"),
              transitionTimingFunction: theme(
                "transitionTimingFunction.in-out"
              ),
              transitionDuration: theme("transitionDuration.150"),
              boxShadow: `inset 0 -0.4em ${theme("colors.gray.200")}`,
              "&:hover": {
                boxShadow: `inset 0 -0.6em ${theme("colors.gray.300")}`,
              },
            },
          },
        },
      }),
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

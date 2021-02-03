'use strict';

module.exports = {
  purge: ['./public/**/*.html', './src/**/*.jsx'],
  darkMode: 'class',
  theme: {
    extend: {},
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
      '3xl': '1720px',
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
};

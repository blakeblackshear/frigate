# Scrollbar Plugin for Tailwind CSS
![Tests](https://github.com/adoxography/tailwind-scrollbar/workflows/Tests/badge.svg)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/af892fe4afc048c4860462c5fc736675)](https://www.codacy.com/gh/adoxography/tailwind-scrollbar/dashboard?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=adoxography/tailwind-scrollbar&amp;utm_campaign=Badge_Grade)
![npm](https://img.shields.io/npm/dt/tailwind-scrollbar)

`tailwind-scrollbar` is a plugin for [Tailwind CSS](https://tailwindcss.com) that adds styling utilities for scrollbars with cross-browser support.

## Motivation
There are currently two competing standards for styling scrollbars amongst browsers: the [scrollbar-width](https://developer.mozilla.org/en-US/docs/Web/CSS/scrollbar-width) and [scrollbar-color](https://developer.mozilla.org/en-US/docs/Web/CSS/scrollbar-color) properties used by Firefox and newer Chromium-based browsers, and the [::-webkit-scrollbar](https://developer.mozilla.org/en-US/docs/Web/CSS/::-webkit-scrollbar) family of pseudoelements used by everything else. This plugin defines a single API for configuring both standards at once from within Tailwind.

## Installation

1. Add the package to your project
```bash
# npm
npm install --save-dev tailwind-scrollbar
# yarn
yarn add -D tailwind-scrollbar
# pnpm
pnpm add -D tailwind-scrollbar
```

2. Add it to the plugins array of your Tailwind config

```javascript
module.exports = {
    // ...
    plugins: [
        // ...
        require('tailwind-scrollbar'),
    ],
};
```

## Usage
See the [documentation](https://adoxography.github.io/tailwind-scrollbar/examples).

## License

This project is licensed under the [MIT License](/LICENSE).

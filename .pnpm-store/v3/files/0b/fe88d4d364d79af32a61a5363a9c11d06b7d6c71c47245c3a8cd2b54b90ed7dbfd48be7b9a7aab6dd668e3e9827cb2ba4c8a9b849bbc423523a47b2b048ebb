<a href="https://www.npmjs.com/package/docusaurus-plugin-sass" alt="npm package">
<img alt="npm" src="https://img.shields.io/npm/v/docusaurus-plugin-sass">
</a>

# docusaurus-plugin-sass

Provides support for SASS/SCSS to Docusaurus v2 and v3.

Note: this plugin is compatible with [Docusaurus Faster](https://github.com/facebook/docusaurus/issues/10556)

# Installation

```sh
yarn add docusaurus-plugin-sass sass
```

`sass-loader` requires you to install either [Dart Sass](https://github.com/sass/dart-sass) or [Node Sass](https://github.com/sass/node-sass) on your own (more documentation can be found at [`sass-loader`](https://github.com/webpack-contrib/sass-loader#getting-started)).

# How to use

1. Include the plugin in your `docusaurus.config.js` file.

```diff
// docusaurus.config.js
module.exports = {
  ...
+ plugins: ['docusaurus-plugin-sass'],
  ...
}
```

2. Write and import your stylesheets in Sass/SCSS as normal for both `global styles` and `CSS modules`.

## Global styles

Assuming you are using `@docusaurus/preset-classic` (or `@docusaurus/theme-classic`), you can set
the `customCss` property to point to yous Sass/SCSS file:

```javascript
// docusaurus.config.js
module.exports = {
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        ...
        theme: {
          customCss: require.resolve('./src/css/custom.scss'),
        },
        ...
      },
    ],
  ],
};
```

## Sass/SCSS modules
To style your components using modules, name your stylesheet files with the .module.scss suffix (e.g. welcome.module.scss). Webpack will load such files as CSS modules and you have to reference the class names from the imported CSS module (as opposed to using plain strings). This is similar to the convention used in Create React App.

```scss
/* styles.module.scss */
.main {
  padding: 12px;

  article {
    color: #ccc;
  }
}
```

```javascript
import styles from './styles.module.scss';

function MyComponent() {
  return (
    <main className={styles.main}>
      <article>Lorem Ipsum</article>
    </main>
  );
}
```

### TypeScript support

To enable TypeScript support for Sass/SCSS modules, the TypeScript configuration should be updated to add the `docusaurus-plugin-sass` type definitions. This can be done in the `tsconfig.json` file:

```diff
{
  "extends": "@tsconfig/docusaurus/tsconfig.json",
  "compilerOptions": {
    ...
+    "types": ["docusaurus-plugin-sass"]
  }
}
```

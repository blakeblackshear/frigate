<div align="center">
  <img height="170"
    src="https://worldvectorlogo.com/logos/sass-1.svg">
  <a href="https://github.com/webpack/webpack">
    <img width="200" height="200"
      src="https://webpack.js.org/assets/icon-square-big.svg">
  </a>
</div>

[![npm][npm]][npm-url]
[![node][node]][node-url]
[![tests][tests]][tests-url]
[![coverage][cover]][cover-url]
[![discussion][discussion]][discussion-url]
[![size][size]][size-url]

# sass-loader

Loads a Sass/SCSS file and compiles it to CSS.

## Getting Started

To begin, you'll need to install `sass-loader`:

```console
npm install sass-loader sass webpack --save-dev
```

or

```console
yarn add -D sass-loader sass webpack
```

or

```console
pnpm add -D sass-loader sass webpack
```

> [!NOTE]
>
> To enable CSS processing in your project, you need to install [style-loader](https://webpack.js.org/loaders/style-loader/) and [css-loader](https://webpack.js.org/loaders/css-loader/) via `npm i style-loader css-loader`.

`sass-loader` requires you to install either [Dart Sass](https://github.com/sass/dart-sass), [Node Sass](https://github.com/sass/node-sass) on your own (more documentation can be found below) or [Sass Embedded](https://github.com/sass/embedded-host-node).

This allows you to control the versions of all your dependencies, and to choose which Sass implementation to use.

> [!NOTE]
>
> We highly recommend using [Sass Embedded](https://github.com/sass/embedded-host-node) or [Dart Sass](https://github.com/sass/dart-sass).

> [!WARNING]
>
> [Node Sass](https://github.com/sass/node-sass) does not work with [Yarn PnP](https://classic.yarnpkg.com/en/docs/pnp/) and doesn't support [@use rule](https://sass-lang.com/documentation/at-rules/use).

Chain the `sass-loader` with the [css-loader](https://github.com/webpack-contrib/css-loader) and the [style-loader](https://github.com/webpack-contrib/style-loader) to immediately apply all styles to the DOM or the [mini-css-extract-plugin](https://github.com/webpack-contrib/mini-css-extract-plugin) to extract it into a separate file.

Then add the loader to your webpack configuration. For example:

**app.js**

```js
import "./style.scss";
```

**style.scss**

```scss
$body-color: red;

body {
  color: $body-color;
}
```

**webpack.config.js**

```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.s[ac]ss$/i,
        use: [
          // Creates `style` nodes from JS strings
          "style-loader",
          // Translates CSS into CommonJS
          "css-loader",
          // Compiles Sass to CSS
          "sass-loader",
        ],
      },
    ],
  },
};
```

Finally run `webpack` via your preferred method.

### The `style` (new API, by default since 16 version) and `outputStyle` (old API) options in `production` mode

For `production` mode, the `style` (new API, by default since 16 version) and `outputStyle` (old API) options default to `compressed` unless otherwise specified in `sassOptions`.

### Resolving `import` and `use` at-rules

Webpack provides an [advanced mechanism to resolve files](https://webpack.js.org/concepts/module-resolution/).

The `sass-loader` uses Sass's custom importer feature to pass all queries to the webpack resolving engine enabling you to import your Sass modules from `node_modules`.

```scss
@import "bootstrap";
```

Using `~` is deprecated and should be removed from your code, but we still support it for historical reasons.
Why can you remove it? The loader will first try to resolve `@import` as a relative path. If it cannot be resolved, then the loader will try to resolve `@import` inside [`node_modules`](https://webpack.js.org/configuration/resolve/#resolvemodules).

Prepending module paths with a `~` tells webpack to search through [`node_modules`](https://webpack.js.org/configuration/resolve/#resolvemodules).

```scss
@import "~bootstrap";
```

It's important to prepend the path with only `~`, because `~/` resolves to the home directory.
Webpack needs to distinguish between `bootstrap` and `~bootstrap` because CSS and Sass files have no special syntax for importing relative files.
Writing `@import "style.scss"` is the same as `@import "./style.scss";`

### Problems with `url(...)`

Since Sass implementations don't provide [url rewriting](https://github.com/sass/libsass/issues/532), all linked assets must be relative to the output.

- If you pass the generated CSS on to the `css-loader`, all urls must be relative to the entry-file (e.g. `main.scss`).
- If you're just generating CSS without passing it to the `css-loader`, it must be relative to your web root.

You might be surprised by this first issue, as it is natural to expect relative references to be resolved against the `.sass`/`.scss` file in which they are specified (like in regular `.css` files).

Thankfully there are two solutions to this problem:

- Add the missing url rewriting using the [resolve-url-loader](https://github.com/bholloway/resolve-url-loader). Place it before `sass-loader` in the loader chain.
- Library authors usually provide a variable to modify the asset path. [bootstrap-sass](https://github.com/twbs/bootstrap-sass) for example has an `$icon-font-path`.

## Options

- **[`implementation`](#implementation)**
- **[`sassOptions`](#sassoptions)**
- **[`sourceMap`](#sourcemap)**
- **[`additionalData`](#additionaldata)**
- **[`webpackImporter`](#webpackimporter)**
- **[`warnRuleAsWarning`](#warnruleaswarning)**
- **[`api`](#api)**

### `implementation`

Type:

```ts
type implementation = object | string;
```

Default: `sass`

The special `implementation` option determines which implementation of Sass to use.

By default, the loader resolves the implementation based on your dependencies.
Just add the desired implementation to your `package.json` (`sass`, `sass-embedded`, or `node-sass` package) and install dependencies.

Example where the `sass-loader` loader uses the `sass` (`dart-sass`) implementation:

**package.json**

```json
{
  "devDependencies": {
    "sass-loader": "^7.2.0",
    "sass": "^1.22.10"
  }
}
```

Example where the `sass-loader` loader uses the `node-sass` implementation:

**package.json**

```json
{
  "devDependencies": {
    "sass-loader": "^7.2.0",
    "node-sass": "^5.0.0"
  }
}
```

Example where the `sass-loader` loader uses the `sass-embedded` implementation:

**package.json**

```json
{
  "devDependencies": {
    "sass-loader": "^7.2.0",
    "sass": "^1.22.10"
  },
  "optionalDependencies": {
    "sass-embedded": "^1.70.0"
  }
}
```

> [!NOTE]
>
> Using `optionalDependencies` means that `sass-loader` can fallback to `sass`
> when running on an operating system not supported by `sass-embedded`

Be aware of the order that `sass-loader` will resolve the implementation:

1. `sass-embedded`
2. `sass`
3. `node-sass`

You can specify a specific implementation by using the `implementation` option, which accepts one of the above values.

#### `object`

For example, to always use Dart Sass, you'd pass:

```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.s[ac]ss$/i,
        use: [
          "style-loader",
          "css-loader",
          {
            loader: "sass-loader",
            options: {
              // Prefer `dart-sass`, even if `sass-embedded` is available
              implementation: require("sass"),
            },
          },
        ],
      },
    ],
  },
};
```

#### `string`

For example, to use Dart Sass, you'd pass:

```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.s[ac]ss$/i,
        use: [
          "style-loader",
          "css-loader",
          {
            loader: "sass-loader",
            options: {
              // Prefer `dart-sass`, even if `sass-embedded` is available
              implementation: require.resolve("sass"),
            },
          },
        ],
      },
    ],
  },
};
```

### `sassOptions`

Type:

```ts
type sassOptions =
  | import("sass").LegacyOptions<"async">
  | ((
      content: string | Buffer,
      loaderContext: LoaderContext,
      meta: any,
    ) => import("sass").LegacyOptions<"async">);
```

Default: defaults values for Sass implementation

Options for [Dart Sass](http://sass-lang.com/dart-sass) or [Node Sass](https://github.com/sass/node-sass) implementation.

> [!NOTE]
>
> The `charset` option is `true` by default for `dart-sass`, we strongly discourage setting this to `false`, because webpack doesn't support files other than `utf-8`.

> [!NOTE]
>
> The `syntax` (new API, by default since 16 version)`and`indentedSyntax`(old API) option is`scss`for the`scss`extension,`indented`for the`sass`extension and`css`for the`css` extension.

> [!NOTE]
>
> Options such as `data` and `file` are unavailable and will be ignored.

> ℹ We strongly discourage changing the `sourceMap` (new API, by default since 16 version), `outFile` (old API), `sourceMapContents` (old API), `sourceMapEmbed` (old API), and `sourceMapRoot` (old API) options because `sass-loader` sets these automatically when the `sourceMap` option is `true`.

> [!NOTE]
>
> Access to the [loader context](https://webpack.js.org/api/loaders/#the-loader-context) inside the custom importer can be done using the `this.webpackLoaderContext` property.

There is a slight difference between the options for `sass` (`dart-sass`) and `node-sass`.

Please consult their respective documentation before using them:

- [Dart Sass documentation](https://sass-lang.com/documentation/js-api/interfaces/Options) for all available `sass` options.
- [Sass Embedded documentation](https://github.com/sass/embedded-host-node) for all available `sass` options.
- [Node Sass documentation](https://github.com/sass/node-sass/#options) for all available `node-sass` options.

#### `object`

Use an object for the Sass implementation setup.

**webpack.config.js**

```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.s[ac]ss$/i,
        use: [
          "style-loader",
          "css-loader",
          {
            loader: "sass-loader",
            options: {
              sassOptions: {
                style: `compressed`,
                loadPaths: ["absolute/path/a", "absolute/path/b"],
              },
            },
          },
        ],
      },
    ],
  },
};
```

#### `function`

Allows configuring the Sass implementation with different options based on the loader context.

```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.s[ac]ss$/i,
        use: [
          "style-loader",
          "css-loader",
          {
            loader: "sass-loader",
            options: {
              sassOptions: (loaderContext) => {
                // More information about available properties https://webpack.js.org/api/loaders/
                const { resourcePath, rootContext } = loaderContext;
                const relativePath = path.relative(rootContext, resourcePath);

                if (relativePath === "styles/foo.scss") {
                  return {
                    loadPaths: ["absolute/path/c", "absolute/path/d"],
                  };
                }

                return {
                  loadPaths: ["absolute/path/a", "absolute/path/b"],
                };
              },
            },
          },
        ],
      },
    ],
  },
};
```

### `sourceMap`

Type:

```ts
type sourceMap = boolean;
```

Default: depends on the `compiler.devtool` value

Enables/Disables generation of source maps.

By default generation of source maps depends on the [`devtool`](https://webpack.js.org/configuration/devtool/) option.
All values enable source map generation except `eval` and `false`.

> ℹ If `true`, the `sourceMap` (new API, by default since 16 version), `outFile` (old API), `sourceMapContents` (old API), `sourceMapEmbed` (old API), and `sourceMapRoot` (old API) from `sassOptions` will be ignored.

**webpack.config.js**

```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.s[ac]ss$/i,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              sourceMap: true,
            },
          },
          {
            loader: "sass-loader",
            options: {
              sourceMap: true,
            },
          },
        ],
      },
    ],
  },
};
```

> ℹ In some rare cases `node-sass` can output invalid source maps (it is a `node-sass` bug).
>
> In order to avoid this, you can try to update `node-sass` to latest version, or you can try to set within `sassOptions` the `outputStyle` option to `compressed`.

**webpack.config.js**

```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.s[ac]ss$/i,
        use: [
          "style-loader",
          "css-loader",
          {
            loader: "sass-loader",
            options: {
              sourceMap: true,
              sassOptions: {
                outputStyle: "compressed",
              },
            },
          },
        ],
      },
    ],
  },
};
```

### `additionalData`

Type:

```ts
type additionalData =
  | string
  | ((content: string | Buffer, loaderContext: LoaderContext) => string);
```

Default: `undefined`

Prepends `Sass`/`SCSS` code before the actual entry file.
In this case, the `sass-loader` will not override the `data` option but just **prepend** the entry's content.

This is especially useful when some of your Sass variables depend on the environment:

#### `string`

```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.s[ac]ss$/i,
        use: [
          "style-loader",
          "css-loader",
          {
            loader: "sass-loader",
            options: {
              additionalData: "$env: " + process.env.NODE_ENV + ";",
            },
          },
        ],
      },
    ],
  },
};
```

#### `function`

##### Sync

```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.s[ac]ss$/i,
        use: [
          "style-loader",
          "css-loader",
          {
            loader: "sass-loader",
            options: {
              additionalData: (content, loaderContext) => {
                // More information about available properties https://webpack.js.org/api/loaders/
                const { resourcePath, rootContext } = loaderContext;
                const relativePath = path.relative(rootContext, resourcePath);

                if (relativePath === "styles/foo.scss") {
                  return "$value: 100px;" + content;
                }

                return "$value: 200px;" + content;
              },
            },
          },
        ],
      },
    ],
  },
};
```

##### Async

```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.s[ac]ss$/i,
        use: [
          "style-loader",
          "css-loader",
          {
            loader: "sass-loader",
            options: {
              additionalData: async (content, loaderContext) => {
                // More information about available properties https://webpack.js.org/api/loaders/
                const { resourcePath, rootContext } = loaderContext;
                const relativePath = path.relative(rootContext, resourcePath);

                if (relativePath === "styles/foo.scss") {
                  return "$value: 100px;" + content;
                }

                return "$value: 200px;" + content;
              },
            },
          },
        ],
      },
    ],
  },
};
```

### `webpackImporter`

Type:

```ts
type webpackImporter = boolean;
```

Default: `true`

Enables/Disables the default webpack importer.

This can improve performance in some cases, though use it with caution because aliases and `@import` at-rules starting with `~` will not work.
You can pass your own `importer` to solve this (see [`importer docs`](https://github.com/sass/node-sass#importer--v200---experimental)).

**webpack.config.js**

```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.s[ac]ss$/i,
        use: [
          "style-loader",
          "css-loader",
          {
            loader: "sass-loader",
            options: {
              webpackImporter: false,
            },
          },
        ],
      },
    ],
  },
};
```

### `warnRuleAsWarning`

Type:

```ts
type warnRuleAsWarning = boolean;
```

Default: `true`

Treats the `@warn` rule as a webpack warning.

**style.scss**

```scss
$known-prefixes: webkit, moz, ms, o;

@mixin prefix($property, $value, $prefixes) {
  @each $prefix in $prefixes {
    @if not index($known-prefixes, $prefix) {
      @warn "Unknown prefix #{$prefix}.";
    }

    -#{$prefix}-#{$property}: $value;
  }
  #{$property}: $value;
}

.tilt {
  // Oops, we typo'd "webkit" as "wekbit"!
  @include prefix(transform, rotate(15deg), wekbit ms);
}
```

The presented code will throw a webpack warning instead logging.

To ignore unnecessary warnings you can use the [ignoreWarnings](https://webpack.js.org/configuration/other-options/#ignorewarnings) option.

**webpack.config.js**

```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.s[ac]ss$/i,
        use: [
          "style-loader",
          "css-loader",
          {
            loader: "sass-loader",
            options: {
              warnRuleAsWarning: true,
            },
          },
        ],
      },
    ],
  },
};
```

### `api`

Type:

```ts
type api = "legacy" | "modern" | "modern-compiler";
```

Default: `"modern"` for `sass` (`dart-sass`) and `sass-embedded`, or `"legacy"` for `node-sass`

Allows you to switch between the `legacy` and `modern` APIs. You can find more information [here](https://sass-lang.com/documentation/js-api). The `modern-compiler` option enables the modern API with support for [Shared Resources](https://github.com/sass/sass/blob/main/accepted/shared-resources.d.ts.md).

> [!NOTE]
>
> Using `modern-compiler` and `sass-embedded` together significantly improve performance and decrease built time. We strongly recommend their use. We will enable them by default in a future major release.

> [!WARNING]
>
> The sass options are different for the `legacy` and `modern` APIs. Please look at [docs](https://sass-lang.com/documentation/js-api) how to migrate to the modern options.

**webpack.config.js**

```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.s[ac]ss$/i,
        use: [
          "style-loader",
          "css-loader",
          {
            loader: "sass-loader",
            options: {
              api: "modern-compiler",
              sassOptions: {
                // Your sass options
              },
            },
          },
        ],
      },
    ],
  },
};
```

## How to enable `@debug` output

By default, the output of `@debug` messages are disabled.
Add the following to **webpack.config.js** to enable them:

```js
module.exports = {
  stats: {
    loggingDebug: ["sass-loader"],
  },
  // ...
};
```

## Examples

### Extracts CSS into separate files

For production builds it's recommended to extract the CSS from your bundle to be able to use parallel loading of CSS/JS resources later on.

There are four recommended ways to extract a stylesheet from a bundle:

#### 1. [mini-css-extract-plugin](https://github.com/webpack-contrib/mini-css-extract-plugin)

**webpack.config.js**

```js
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  module: {
    rules: [
      {
        test: /\.s[ac]ss$/i,
        use: [
          // fallback to style-loader in development
          process.env.NODE_ENV !== "production"
            ? "style-loader"
            : MiniCssExtractPlugin.loader,
          "css-loader",
          "sass-loader",
        ],
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      // Options similar to the same options in webpackOptions.output
      // both options are optional
      filename: "[name].css",
      chunkFilename: "[id].css",
    }),
  ],
};
```

#### 2. [Asset Modules](https://webpack.js.org/guides/asset-modules/)

**webpack.config.js**

```js
module.exports = {
  entry: [__dirname + "/src/scss/app.scss"],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: [],
      },
      {
        test: /\.scss$/,
        exclude: /node_modules/,
        type: "asset/resource",
        generator: {
          filename: "bundle.css",
        },
        use: ["sass-loader"],
      },
    ],
  },
};
```

#### 3. [extract-loader](https://github.com/peerigon/extract-loader) (simpler, but specialized on the css-loader's output)

#### 4. [file-loader](https://github.com/webpack-contrib/file-loader) (deprecated--should only be used in webpack v4)

**webpack.config.js**

```js
module.exports = {
  entry: [__dirname + "/src/scss/app.scss"],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: [],
      },
      {
        test: /\.scss$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "file-loader",
            options: { outputPath: "css/", name: "[name].min.css" },
          },
          "sass-loader",
        ],
      },
    ],
  },
};
```

(source: https://stackoverflow.com/a/60029923/2969615)

### Source maps

Enables/Disables generation of source maps.

To enable CSS source maps, you'll need to pass the `sourceMap` option to the `sass-loader` _and_ the `css-loader`.

**webpack.config.js**

```javascript
module.exports = {
  devtool: "source-map", // any "source-map"-like devtool is possible
  module: {
    rules: [
      {
        test: /\.s[ac]ss$/i,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              sourceMap: true,
            },
          },
          {
            loader: "sass-loader",
            options: {
              sourceMap: true,
            },
          },
        ],
      },
    ],
  },
};
```

If you want to edit the original Sass files inside Chrome, [there's a good blog post](https://medium.com/@toolmantim/getting-started-with-css-sourcemaps-and-in-browser-sass-editing-b4daab987fb0). Checkout [test/sourceMap](https://github.com/webpack-contrib/sass-loader/tree/master/test) for a running example.

## Contributing

Please take a moment to read our contributing guidelines if you haven't yet done so.

[CONTRIBUTING](./.github/CONTRIBUTING.md)

## License

[MIT](./LICENSE)

[npm]: https://img.shields.io/npm/v/sass-loader.svg
[npm-url]: https://npmjs.com/package/sass-loader
[node]: https://img.shields.io/node/v/sass-loader.svg
[node-url]: https://nodejs.org
[tests]: https://github.com/webpack-contrib/sass-loader/workflows/sass-loader/badge.svg
[tests-url]: https://github.com/webpack-contrib/sass-loader/actions
[cover]: https://codecov.io/gh/webpack-contrib/sass-loader/branch/master/graph/badge.svg
[cover-url]: https://codecov.io/gh/webpack-contrib/sass-loader
[discussion]: https://img.shields.io/github/discussions/webpack/webpack
[discussion-url]: https://github.com/webpack/webpack/discussions
[size]: https://packagephobia.now.sh/badge?p=sass-loader
[size-url]: https://packagephobia.now.sh/result?p=sass-loader

const webpack = require("webpack");
const TerserPlugin = require("terser-webpack-plugin");

const { version, author, license } = require("./package.json");

module.exports = {
  mode: "production",
  entry: {
    NoSleep: `${__dirname}/src/index.js`,
    "NoSleep.min": `${__dirname}/src/index.js`,
  },
  output: {
    path: `${__dirname}/dist`,
    filename: "[name].js",
    library: "NoSleep",
    libraryTarget: "umd",
    globalObject: "this",
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["env"],
          },
        },
      },
    ],
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        test: /\.min\.js(\?.*)?$/i,
        extractComments: false,
      }),
    ],
  },

  plugins: [
    new webpack.BannerPlugin({
      banner: `[name].js v${version} - git.io/vfn01 - ${author} - ${license} license`,
    }),
  ],
};

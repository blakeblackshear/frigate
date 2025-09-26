const path = require('path');
const webpack = require('webpack');
const UnminifiedWebpackPlugin = require('unminified-webpack-plugin');

module.exports = {
  entry: {
    'dist': './lib/index.js',
    'doc': './lib/index.js'
  },
  output: {
    path: path.resolve(__dirname, '.'),
    filename: '[name]/xml-js.min.js',
    libraryTarget: 'window',
    // library: 'xmljs' // don't specify this
  },
  // module: {
  //   rules: [
  //     {
  //       test: /\.(js)$/,
  //       use: 'babel-loader'
  //     }
  //   ]
  // },
  plugins: [
    new webpack.optimize.UglifyJsPlugin(),
    new UnminifiedWebpackPlugin()
  ]
}

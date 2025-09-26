const webpack = require('webpack');
const path = require('path');
const ReactLoadableSSRAddon = require('./lib');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = process.env.PORT || '8080';

module.exports = {
  mode: 'production',
  target: 'web',
  entry: {
    index: './example/client.jsx',
  },
  devtool: 'eval-cheap-module-source-map',
  output: {
    publicPath: '/dist/',
    path: path.join(__dirname, 'example', 'dist'),
    filename: '[name].js',
    chunkFilename: '[name].chunk.js',
  },
  resolve: {
    extensions: ['.js', '.jsx'],
    alias: {
      'react-loadable-ssr-addon': path.resolve(__dirname, './source'),
    },
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /(node_modules|bower_components|public\/)/,
        use: {
          loader: 'babel-loader',
          options: {
            babelrc: false,
            presets: [
              '@babel/preset-env',
              '@babel/preset-react',
            ],
            plugins: [
              require('@babel/plugin-proposal-class-properties'),
              require('@babel/plugin-proposal-object-rest-spread'),
              require('@babel/plugin-syntax-dynamic-import'),
              require('react-loadable/babel'),
            ],
          },
        },
      },
    ],
  },
  plugins: [
    new ReactLoadableSSRAddon({
      filename: 'react-loadable-ssr-addon.json',
    }),
  ],
  performance: false,
};

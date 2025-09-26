const path = require('path');
const pkg = require('./package.json');
const camelcase = require('camelcase');
const process = require('process');
const webpack = require('webpack');
const env = process.env;
const NODE_ENV = env.NODE_ENV;
const MIN = env.MIN;
const PROD = NODE_ENV === 'production';

let config = {
  devtool: PROD ? false : 'inline-source-map',
  entry: './index.js',
  output: {
    path: path.join( __dirname ),
    filename: 'cose-base.js',
    library: camelcase( pkg.name ),
    libraryTarget: 'umd',
    globalObject: 'this'
  },
  module: {
    rules: [
      { test: /\.js$/, exclude: /node_modules/, use: 'babel-loader' }
    ]
  },
  optimization: {
    minimize: MIN ? true : false
  },  
  externals: PROD ? {
    'layout-base': {
      commonjs2: 'layout-base',
      commonjs: 'layout-base',
      amd: 'layout-base',
      root: 'layoutBase'
    }
  } : {}
};

module.exports = config;
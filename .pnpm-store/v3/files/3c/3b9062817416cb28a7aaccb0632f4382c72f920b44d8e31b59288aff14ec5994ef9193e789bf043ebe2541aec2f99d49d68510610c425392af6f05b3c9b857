module.exports = function(_, {id, ...options}) {
  return {
    name: 'docusaurus-plugin-sass',
    configureWebpack(_, isServer, utils) {
      const { getStyleLoaders } = utils;
      const isProd = process.env.NODE_ENV === 'production';
      return {
        module: {
          rules: [{
            test: /\.s[ca]ss$/,
            oneOf: [{
              test: /\.module\.s[ca]ss$/,
              use: [
                ...getStyleLoaders(isServer, {
                  modules: {
                    localIdentName: isProd
                      ? `[local]_[hash:base64:4]`
                      : `[local]_[path][name]`,
                    exportOnlyLocals: isServer,
                  },
                  importLoaders: 2,
                  sourceMap: !isProd,
                }), {
                  loader: require.resolve('sass-loader'),
                  options: options || {}
                }
              ]
            }, {
              use: [
                ...getStyleLoaders(isServer), {
                  loader: require.resolve('sass-loader'),
                  options: options || {}
                }
              ]
            }]
          }]
        }
      };
    }
  };
};

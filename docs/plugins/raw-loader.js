module.exports = function (context, options) {
  return {
    name: 'labelmap',
    configureWebpack(config, isServer, utils) {
      return {
        module: {
          rules: [{ test: /\.txt$/, use: 'raw-loader' }],
        },
      };
    },
  };
};

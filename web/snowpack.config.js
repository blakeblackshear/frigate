'use strict';

module.exports = {
  mount: {
    public: { url: '/', static: true },
    src: { url: '/dist' },
  },
  plugins: [
    '@snowpack/plugin-postcss',
    '@prefresh/snowpack',
    [
      '@snowpack/plugin-optimize',
      {
        preloadModules: true,
      },
    ],
    [
      '@snowpack/plugin-webpack',
      {
        sourceMap: true,
      },
    ],
  ],
  packageOptions: {
    sourcemap: false,
  },
  buildOptions: {
    sourcemap: true,
  },
};

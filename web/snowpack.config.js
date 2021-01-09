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
  ],
  installOptions: {
    sourceMaps: false,
  },
  buildOptions: {
    sourceMaps: true,
  },
};

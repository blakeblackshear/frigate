'use strict';

module.exports = {
  mount: {
    public: { url: '/', static: true },
    src: { url: '/dist' },
  },
  plugins: ['@snowpack/plugin-postcss', '@prefresh/snowpack', 'snowpack-plugin-hash'],
  routes: [{ match: 'routes', src: '.*', dest: '/index.html' }],
  optimize: {
    bundle: true,
    minify: true,
    treeshake: true,
  },
  packageOptions: {
    sourcemap: false,
  },
  buildOptions: {
    sourcemap: false,
  },
};

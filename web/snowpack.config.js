module.exports = {
  mount: {
    public: { url: '/', static: true },
    src: { url: '/dist' },
  },
  exclude: ['**/jsmpeg.*'],
  plugins: ['@snowpack/plugin-postcss', '@prefresh/snowpack', 'snowpack-plugin-hash'],
  routes: [{ match: 'all', src: '(?!.*(.svg|.gif|.json|.jpg|.jpeg|.png|.js)).*', dest: '/index.html' }],
  optimize: {
    bundle: false,
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

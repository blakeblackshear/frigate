module.exports = {
  mount: {
    public: { url: '/', static: true },
    src: { url: '/dist' },
  },
  plugins: ['@prefresh/snowpack', '@snowpack/plugin-typescript', '@snowpack/plugin-postcss', 'snowpack-plugin-hash'],
  devOptions: {
    tailwindConfig: './tailwind.config.js',
  },
  routes: [{ match: 'all', src: '(?!.*(.svg|.gif|.json|.jpg|.jpeg|.png|.js)).*', dest: '/index.html' }],
  optimize: {
    bundle: false,
    minify: true,
    treeshake: true,
  },
  packageOptions: {
    knownEntrypoints: [
      '@videojs/vhs-utils/es/stream.js',
      '@videojs/vhs-utils/es/resolve-url.js',
      '@videojs/vhs-utils/es/media-types.js',
      '@videojs/vhs-utils/es/decode-b64-to-uint8-array.js',
      '@videojs/vhs-utils/es/id3-helpers',
      '@videojs/vhs-utils/es/byte-helpers',
      '@videojs/vhs-utils/es/containers',
      '@videojs/vhs-utils/es/codecs.js',
      'global/window',
      'global/document',
    ],
  },
  buildOptions: {},
  alias: {
    react: 'preact/compat',
    'react-dom': 'preact/compat',
  },
};

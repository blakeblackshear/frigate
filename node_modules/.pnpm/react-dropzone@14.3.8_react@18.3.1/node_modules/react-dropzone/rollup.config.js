const { nodeResolve } = require("@rollup/plugin-node-resolve");
const commonjs = require("@rollup/plugin-commonjs");
const { babel } = require("@rollup/plugin-babel");
const { terser } = require("rollup-plugin-terser");

const umdGlobals = {
  react: "React",
  "prop-types": "PropTypes",
};

module.exports = [
  {
    input: "./src/index.js",
    output: {
      file: "dist/index.js",
      format: "umd",
      name: "reactDropzone",
      globals: umdGlobals,
      sourcemap: "inline",
      exports: "named",
    },
    external: Object.keys(umdGlobals),
    plugins: [
      nodeResolve(),
      commonjs({ include: "**/node_modules/**" }),
      babel({
        exclude: "**/node_modules/**",
        babelHelpers: "bundled",
      }),
      terser(),
    ],
  },
];

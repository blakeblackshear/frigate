import resolve from 'rollup-plugin-node-resolve'
import babel from 'rollup-plugin-babel'
import commonjs from 'rollup-plugin-commonjs'

export default {
  external: [ 'react', 'react-dom' ],
  input: 'src/index.js',
  output: {
    file: 'dist/lib.js',
    format: 'cjs'
  },
  plugins: [
    resolve(),
    babel({
      babelrc: false,
      presets: ["@babel/preset-env", '@babel/preset-react'],
    }),
    commonjs({ include: 'node_modules/**' })
  ]
}

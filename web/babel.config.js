module.exports = {
  presets: ['@babel/preset-env', ['@babel/typescript', { jsxPragma: 'h' }]],
  plugins: [['@babel/plugin-transform-react-jsx', { pragma: 'h' }]],
};

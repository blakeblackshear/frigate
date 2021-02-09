module.exports = {
  presets: ['@babel/preset-env'],
  plugins: [['@babel/plugin-transform-react-jsx', { pragma: 'preact.h' }]],
};

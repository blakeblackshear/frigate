const { rules: configPrettierRules } = require('eslint-config-prettier');
const {
  rules: configPrettierOverridesRules,
} = require('eslint-config-prettier/prettier');
const eslintPluginPrettier = require('./eslint-plugin-prettier');

// Merge the contents of eslint-config-prettier into config
module.exports = {
  name: 'eslint-plugin-prettier/recommended',
  plugins: {
    prettier: eslintPluginPrettier,
  },
  rules: {
    ...configPrettierRules,
    ...configPrettierOverridesRules,
    'prettier/prettier': 'error',
  },
};

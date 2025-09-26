const plugin = require('tailwindcss/plugin');
const {
  addBaseStyles,
  addBaseSizeUtilities,
  addColorUtilities,
  addRoundedUtilities,
  addSizeUtilities
} = require('./utilities');
const { addVariantOverrides } = require('./variants');

module.exports = plugin.withOptions((options = {}) => tailwind => {
  let preferredStrategy = options.preferredStrategy ?? 'standard';

  if (preferredStrategy !== 'standard' && preferredStrategy !== 'pseudoelements') {
    // eslint-disable-next-line no-console
    console.warn('WARNING: tailwind-scrollbar preferredStrategy should be \'standard\' or \'pseudoelements\'');
    preferredStrategy = 'standard';
  }

  addBaseStyles(tailwind, preferredStrategy);
  addBaseSizeUtilities(tailwind, preferredStrategy);
  addColorUtilities(tailwind);
  addVariantOverrides(tailwind);

  if (options.nocompatible) {
    addRoundedUtilities(tailwind);
    addSizeUtilities(tailwind);
  }
});

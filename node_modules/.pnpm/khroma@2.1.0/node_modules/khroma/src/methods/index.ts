
/* IMPORT */

import hex from '~/methods/rgba'; // Alias
import rgb from '~/methods/rgba'; // Alias
import rgba from '~/methods/rgba';
import hsl from '~/methods/hsla'; // Alias
import hsla from '~/methods/hsla';
import toKeyword from '~/methods/to_keyword';
import toHex from '~/methods/to_hex';
import toRgba from '~/methods/to_rgba';
import toHsla from '~/methods/to_hsla';
import channel from '~/methods/channel';
import red from '~/methods/red';
import green from '~/methods/green';
import blue from '~/methods/blue';
import hue from '~/methods/hue';
import saturation from '~/methods/saturation';
import lightness from '~/methods/lightness';
import alpha from '~/methods/alpha';
import opacity from '~/methods/alpha'; // Alias
import contrast from '~/methods/contrast';
import luminance from '~/methods/luminance';
import isDark from '~/methods/is_dark';
import isLight from '~/methods/is_light';
import isTransparent from '~/methods/is_transparent';
import isValid from '~/methods/is_valid';
import saturate from '~/methods/saturate';
import desaturate from '~/methods/desaturate';
import lighten from '~/methods/lighten';
import darken from '~/methods/darken';
import opacify from '~/methods/opacify';
import fadeIn from '~/methods/opacify'; // Alias
import transparentize from '~/methods/transparentize';
import fadeOut from '~/methods/transparentize'; // Alias
import complement from '~/methods/complement';
import grayscale from '~/methods/grayscale';
import adjust from '~/methods/adjust';
import change from '~/methods/change';
import invert from '~/methods/invert';
import mix from '~/methods/mix';
import scale from '~/methods/scale';

/* EXPORT */

export {
  /* CREATE */
  hex,
  rgb,
  rgba,
  hsl,
  hsla,
  /* CONVERT */
  toKeyword,
  toHex,
  toRgba,
  toHsla,
  /* GET - CHANNEL */
  channel,
  red,
  green,
  blue,
  hue,
  saturation,
  lightness,
  alpha,
  opacity,
  /* GET - MORE */
  contrast,
  luminance,
  isDark,
  isLight,
  isTransparent,
  isValid,
  /* EDIT - CHANNEL */
  saturate,
  desaturate,
  lighten,
  darken,
  opacify,
  fadeIn,
  transparentize,
  fadeOut,
  complement,
  grayscale,
  /* EDIT - MORE */
  adjust,
  change,
  invert,
  mix,
  scale
};

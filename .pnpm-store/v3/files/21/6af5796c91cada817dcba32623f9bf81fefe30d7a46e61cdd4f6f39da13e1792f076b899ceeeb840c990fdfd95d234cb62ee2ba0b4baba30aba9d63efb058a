import * as is from '../is.mjs';
import * as regex from './regex.mjs';

  // get [r, g, b] from #abc or #aabbcc
export const hex2tuple = hex => {
  if( !(hex.length === 4 || hex.length === 7) || hex[0] !== '#' ){ return; }

  let shortHex = hex.length === 4;
  let r, g, b;
  let base = 16;

  if( shortHex ){
    r = parseInt( hex[1] + hex[1], base );
    g = parseInt( hex[2] + hex[2], base );
    b = parseInt( hex[3] + hex[3], base );
  } else {
    r = parseInt( hex[1] + hex[2], base );
    g = parseInt( hex[3] + hex[4], base );
    b = parseInt( hex[5] + hex[6], base );
  }

  return [ r, g, b ];
};

  // get [r, g, b, a] from hsl(0, 0, 0) or hsla(0, 0, 0, 0)
export const hsl2tuple = hsl => {
  let ret;
  let h, s, l, a, r, g, b;
  function hue2rgb( p, q, t ){
    if( t < 0 ) t += 1;
    if( t > 1 ) t -= 1;
    if( t < 1 / 6 ) return p + (q - p) * 6 * t;
    if( t < 1 / 2 ) return q;
    if( t < 2 / 3 ) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }

  let m = new RegExp( '^' + regex.hsla + '$' ).exec( hsl );
  if( m ){

    // get hue
    h = parseInt( m[1] );
    if( h < 0 ){
      h = ( 360 - (-1 * h % 360) ) % 360;
    } else if( h > 360 ){
      h = h % 360;
    }
    h /= 360; // normalise on [0, 1]

    s = parseFloat( m[2] );
    if( s < 0 || s > 100 ){ return; } // saturation is [0, 100]
    s = s / 100; // normalise on [0, 1]

    l = parseFloat( m[3] );
    if( l < 0 || l > 100 ){ return; } // lightness is [0, 100]
    l = l / 100; // normalise on [0, 1]

    a = m[4];
    if( a !== undefined ){
      a = parseFloat( a );

      if( a < 0 || a > 1 ){ return; } // alpha is [0, 1]
    }

    // now, convert to rgb
    // code from http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
    if( s === 0 ){
      r = g = b = Math.round( l * 255 ); // achromatic
    } else {
      let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      let p = 2 * l - q;
      r = Math.round( 255 * hue2rgb( p, q, h + 1 / 3 ) );
      g = Math.round( 255 * hue2rgb( p, q, h ) );
      b = Math.round( 255 * hue2rgb( p, q, h - 1 / 3 ) );
    }

    ret = [ r, g, b, a ];
  }

  return ret;
};

// get [r, g, b, a] from rgb(0, 0, 0) or rgba(0, 0, 0, 0)
export const rgb2tuple = rgb => {
  let ret;

  let m = new RegExp( '^' + regex.rgba + '$' ).exec( rgb );
  if( m ){
    ret = [];

    let isPct = [];
    for( let i = 1; i <= 3; i++ ){
      let channel = m[ i ];

      if( channel[ channel.length - 1 ] === '%' ){
        isPct[ i ] = true;
      }
      channel = parseFloat( channel );

      if( isPct[ i ] ){
        channel = channel / 100 * 255; // normalise to [0, 255]
      }

      if( channel < 0 || channel > 255 ){ return; } // invalid channel value

      ret.push( Math.floor( channel ) );
    }

    let atLeastOneIsPct = isPct[1] || isPct[2] || isPct[3];
    let allArePct = isPct[1] && isPct[2] && isPct[3];
    if( atLeastOneIsPct && !allArePct ){ return; } // must all be percent values if one is

    let alpha = m[4];
    if( alpha !== undefined ){
      alpha = parseFloat( alpha );

      if( alpha < 0 || alpha > 1 ){ return; } // invalid alpha value

      ret.push( alpha );
    }
  }

  return ret;
};

export const colorname2tuple = color => {
  return colors[ color.toLowerCase() ];
};

export const color2tuple = color => {
  return ( is.array( color ) ? color : null )
    || colorname2tuple( color )
    || hex2tuple( color )
    || rgb2tuple( color )
    || hsl2tuple( color );
};

export const colors = {
  // special colour names
  transparent: [0, 0, 0, 0], // NB alpha === 0

  // regular colours
  aliceblue: [ 240, 248, 255 ],
  antiquewhite: [ 250, 235, 215 ],
  aqua: [0, 255, 255 ],
  aquamarine: [ 127, 255, 212 ],
  azure: [ 240, 255, 255 ],
  beige: [ 245, 245, 220 ],
  bisque: [ 255, 228, 196 ],
  black: [0, 0, 0],
  blanchedalmond: [ 255, 235, 205 ],
  blue: [0, 0, 255 ],
  blueviolet: [ 138, 43, 226 ],
  brown: [ 165, 42, 42 ],
  burlywood: [ 222, 184, 135 ],
  cadetblue: [ 95, 158, 160 ],
  chartreuse: [ 127, 255, 0],
  chocolate: [ 210, 105, 30 ],
  coral: [ 255, 127, 80 ],
  cornflowerblue: [ 100, 149, 237 ],
  cornsilk: [ 255, 248, 220 ],
  crimson: [ 220, 20, 60 ],
  cyan: [0, 255, 255 ],
  darkblue: [0, 0, 139 ],
  darkcyan: [0, 139, 139 ],
  darkgoldenrod: [ 184, 134, 11 ],
  darkgray: [ 169, 169, 169 ],
  darkgreen: [0, 100, 0],
  darkgrey: [ 169, 169, 169 ],
  darkkhaki: [ 189, 183, 107 ],
  darkmagenta: [ 139, 0, 139 ],
  darkolivegreen: [ 85, 107, 47 ],
  darkorange: [ 255, 140, 0],
  darkorchid: [ 153, 50, 204 ],
  darkred: [ 139, 0, 0],
  darksalmon: [ 233, 150, 122 ],
  darkseagreen: [ 143, 188, 143 ],
  darkslateblue: [ 72, 61, 139 ],
  darkslategray: [ 47, 79, 79 ],
  darkslategrey: [ 47, 79, 79 ],
  darkturquoise: [0, 206, 209 ],
  darkviolet: [ 148, 0, 211 ],
  deeppink: [ 255, 20, 147 ],
  deepskyblue: [0, 191, 255 ],
  dimgray: [ 105, 105, 105 ],
  dimgrey: [ 105, 105, 105 ],
  dodgerblue: [ 30, 144, 255 ],
  firebrick: [ 178, 34, 34 ],
  floralwhite: [ 255, 250, 240 ],
  forestgreen: [ 34, 139, 34 ],
  fuchsia: [ 255, 0, 255 ],
  gainsboro: [ 220, 220, 220 ],
  ghostwhite: [ 248, 248, 255 ],
  gold: [ 255, 215, 0],
  goldenrod: [ 218, 165, 32 ],
  gray: [ 128, 128, 128 ],
  grey: [ 128, 128, 128 ],
  green: [0, 128, 0],
  greenyellow: [ 173, 255, 47 ],
  honeydew: [ 240, 255, 240 ],
  hotpink: [ 255, 105, 180 ],
  indianred: [ 205, 92, 92 ],
  indigo: [ 75, 0, 130 ],
  ivory: [ 255, 255, 240 ],
  khaki: [ 240, 230, 140 ],
  lavender: [ 230, 230, 250 ],
  lavenderblush: [ 255, 240, 245 ],
  lawngreen: [ 124, 252, 0],
  lemonchiffon: [ 255, 250, 205 ],
  lightblue: [ 173, 216, 230 ],
  lightcoral: [ 240, 128, 128 ],
  lightcyan: [ 224, 255, 255 ],
  lightgoldenrodyellow: [ 250, 250, 210 ],
  lightgray: [ 211, 211, 211 ],
  lightgreen: [ 144, 238, 144 ],
  lightgrey: [ 211, 211, 211 ],
  lightpink: [ 255, 182, 193 ],
  lightsalmon: [ 255, 160, 122 ],
  lightseagreen: [ 32, 178, 170 ],
  lightskyblue: [ 135, 206, 250 ],
  lightslategray: [ 119, 136, 153 ],
  lightslategrey: [ 119, 136, 153 ],
  lightsteelblue: [ 176, 196, 222 ],
  lightyellow: [ 255, 255, 224 ],
  lime: [0, 255, 0],
  limegreen: [ 50, 205, 50 ],
  linen: [ 250, 240, 230 ],
  magenta: [ 255, 0, 255 ],
  maroon: [ 128, 0, 0],
  mediumaquamarine: [ 102, 205, 170 ],
  mediumblue: [0, 0, 205 ],
  mediumorchid: [ 186, 85, 211 ],
  mediumpurple: [ 147, 112, 219 ],
  mediumseagreen: [ 60, 179, 113 ],
  mediumslateblue: [ 123, 104, 238 ],
  mediumspringgreen: [0, 250, 154 ],
  mediumturquoise: [ 72, 209, 204 ],
  mediumvioletred: [ 199, 21, 133 ],
  midnightblue: [ 25, 25, 112 ],
  mintcream: [ 245, 255, 250 ],
  mistyrose: [ 255, 228, 225 ],
  moccasin: [ 255, 228, 181 ],
  navajowhite: [ 255, 222, 173 ],
  navy: [0, 0, 128 ],
  oldlace: [ 253, 245, 230 ],
  olive: [ 128, 128, 0],
  olivedrab: [ 107, 142, 35 ],
  orange: [ 255, 165, 0],
  orangered: [ 255, 69, 0],
  orchid: [ 218, 112, 214 ],
  palegoldenrod: [ 238, 232, 170 ],
  palegreen: [ 152, 251, 152 ],
  paleturquoise: [ 175, 238, 238 ],
  palevioletred: [ 219, 112, 147 ],
  papayawhip: [ 255, 239, 213 ],
  peachpuff: [ 255, 218, 185 ],
  peru: [ 205, 133, 63 ],
  pink: [ 255, 192, 203 ],
  plum: [ 221, 160, 221 ],
  powderblue: [ 176, 224, 230 ],
  purple: [ 128, 0, 128 ],
  red: [ 255, 0, 0],
  rosybrown: [ 188, 143, 143 ],
  royalblue: [ 65, 105, 225 ],
  saddlebrown: [ 139, 69, 19 ],
  salmon: [ 250, 128, 114 ],
  sandybrown: [ 244, 164, 96 ],
  seagreen: [ 46, 139, 87 ],
  seashell: [ 255, 245, 238 ],
  sienna: [ 160, 82, 45 ],
  silver: [ 192, 192, 192 ],
  skyblue: [ 135, 206, 235 ],
  slateblue: [ 106, 90, 205 ],
  slategray: [ 112, 128, 144 ],
  slategrey: [ 112, 128, 144 ],
  snow: [ 255, 250, 250 ],
  springgreen: [0, 255, 127 ],
  steelblue: [ 70, 130, 180 ],
  tan: [ 210, 180, 140 ],
  teal: [0, 128, 128 ],
  thistle: [ 216, 191, 216 ],
  tomato: [ 255, 99, 71 ],
  turquoise: [ 64, 224, 208 ],
  violet: [ 238, 130, 238 ],
  wheat: [ 245, 222, 179 ],
  white: [ 255, 255, 255 ],
  whitesmoke: [ 245, 245, 245 ],
  yellow: [ 255, 255, 0],
  yellowgreen: [ 154, 205, 50 ]
};

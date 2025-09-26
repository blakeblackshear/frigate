
/* IMPORT */

import type {RGB, HSL} from '~/types';

/* MAIN */

const Channel = {

  /* CLAMP */

  min: {
    r: 0,
    g: 0,
    b: 0,
    s: 0,
    l: 0,
    a: 0
  },

  max: {
    r: 255,
    g: 255,
    b: 255,
    h: 360,
    s: 100,
    l: 100,
    a: 1
  },

  clamp: {
    r: ( r: number ) => r >= 255 ? 255 : ( r < 0 ? 0 : r ),
    g: ( g: number ) => g >= 255 ? 255 : ( g < 0 ? 0 : g ),
    b: ( b: number ) => b >= 255 ? 255 : ( b < 0 ? 0 : b ),
    h: ( h: number ) => h % 360,
    s: ( s: number ) => s >= 100 ? 100 : ( s < 0 ? 0 : s ),
    l: ( l: number ) => l >= 100 ? 100 : ( l < 0 ? 0 : l ),
    a: ( a: number ) => a >= 1 ? 1 : ( a < 0 ? 0 : a )
  },

  /* CONVERSION */

  //SOURCE: https://planetcalc.com/7779

  toLinear: ( c: number ): number => {

    const n = c / 255;

    return c > .03928 ? Math.pow ( ( ( n + .055 ) / 1.055 ), 2.4 ) : n / 12.92;

  },

  //SOURCE: https://gist.github.com/mjackson/5311256

  hue2rgb: ( p: number, q: number, t: number ): number => {

    if ( t < 0 ) t += 1;

    if ( t > 1 ) t -= 1;

    if ( t < 1/6 ) return p + ( q - p ) * 6 * t;

    if ( t < 1/2 ) return q;

    if ( t < 2/3 ) return p + ( q - p ) * ( 2/3 - t ) * 6;

    return p;

  },

  hsl2rgb: ( { h, s, l }: HSL, channel: keyof RGB ): number => {

    if ( !s ) return l * 2.55; // Achromatic

    h /= 360;
    s /= 100;
    l /= 100;

    const q = ( l < .5 ) ? l * ( 1 + s ) : ( l + s ) - ( l * s );
    const p = 2 * l - q;

    switch ( channel ) {
      case 'r': return Channel.hue2rgb ( p, q, h + 1/3 ) * 255;
      case 'g': return Channel.hue2rgb ( p, q, h ) * 255;
      case 'b': return Channel.hue2rgb ( p, q, h - 1/3 ) * 255;
    }

  },

  rgb2hsl: ( { r, g, b }: RGB, channel: keyof HSL ): number => {

    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max ( r, g, b );
    const min = Math.min ( r, g, b );
    const l = ( max + min ) / 2;

    if ( channel === 'l' ) return l * 100;

    if ( max === min ) return 0; // Achromatic

    const d = max - min;
    const s = ( l > .5 ) ? d / ( 2 - max - min ) : d / ( max + min );

    if ( channel === 's' ) return s * 100;

    switch ( max ) {
      case r: return ( ( g - b ) / d + ( g < b ? 6 : 0 ) ) * 60;
      case g: return ( ( b - r ) / d + 2 ) * 60;
      case b: return ( ( r - g ) / d + 4 ) * 60;
      default: return -1; //TSC: TypeScript is stupid and complains if there isn't this useless default statement
    }

  }

};

/* EXPORT */

export default Channel;

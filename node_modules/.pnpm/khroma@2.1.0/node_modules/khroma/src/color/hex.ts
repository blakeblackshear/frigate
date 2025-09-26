
/* IMPORT */

import _ from '~/utils';
import ChannelsReusable from '~/channels/reusable';
import {DEC2HEX} from '~/constants';
import type {Channels} from '~/types';

/* MAIN */

const Hex = {

  /* VARIABLES */

  re: /^#((?:[a-f0-9]{2}){2,4}|[a-f0-9]{3})$/i,

  /* API */

  parse: ( color: string ): Channels | void => {

    if ( color.charCodeAt ( 0 ) !== 35 ) return; // '#'

    const match = color.match ( Hex.re );

    if ( !match ) return;

    const hex = match[1];
    const dec = parseInt ( hex, 16 );
    const length = hex.length;
    const hasAlpha = length % 4 === 0;
    const isFullLength = length > 4;
    const multiplier = isFullLength ? 1 : 17;
    const bits = isFullLength ? 8 : 4;
    const bitsOffset = hasAlpha ? 0 : -1;
    const mask = isFullLength ? 255 : 15;

    return ChannelsReusable.set ({
      r: ( ( dec >> ( bits * ( bitsOffset + 3 ) ) ) & mask ) * multiplier,
      g: ( ( dec >> ( bits * ( bitsOffset + 2 ) ) ) & mask ) * multiplier,
      b: ( ( dec >> ( bits * ( bitsOffset + 1 ) ) ) & mask ) * multiplier,
      a: hasAlpha ? ( dec & mask ) * multiplier / 255 : 1
    }, color );

  },

  stringify: ( channels: Channels ): string => {

    const {r, g, b, a} = channels;

    if ( a < 1 ) { // #RRGGBBAA

      return `#${DEC2HEX[Math.round ( r )]}${DEC2HEX[Math.round ( g )]}${DEC2HEX[Math.round ( b )]}${DEC2HEX[Math.round ( a * 255 )]}`;

    } else { // #RRGGBB

      return `#${DEC2HEX[Math.round ( r )]}${DEC2HEX[Math.round ( g )]}${DEC2HEX[Math.round ( b )]}`;

    }

  }

};

/* EXPORT */

export default Hex;

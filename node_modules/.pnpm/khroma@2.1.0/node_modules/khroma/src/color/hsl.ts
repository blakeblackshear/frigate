
/* IMPORT */

import _ from '~/utils';
import ChannelsReusable from '~/channels/reusable';
import type {Channels} from '~/types';

/* MAIN */

const HSL = {

  /* VARIABLES */

  re: /^hsla?\(\s*?(-?(?:\d+(?:\.\d+)?|(?:\.\d+))(?:e-?\d+)?(?:deg|grad|rad|turn)?)\s*?(?:,|\s)\s*?(-?(?:\d+(?:\.\d+)?|(?:\.\d+))(?:e-?\d+)?%)\s*?(?:,|\s)\s*?(-?(?:\d+(?:\.\d+)?|(?:\.\d+))(?:e-?\d+)?%)(?:\s*?(?:,|\/)\s*?\+?(-?(?:\d+(?:\.\d+)?|(?:\.\d+))(?:e-?\d+)?(%)?))?\s*?\)$/i,
  hueRe: /^(.+?)(deg|grad|rad|turn)$/i,

  /* HELPERS */

  _hue2deg: ( hue: string ): number => {

    const match = hue.match ( HSL.hueRe );

    if ( match ) {

      const [, number, unit] = match;

      switch ( unit ) {
        case 'grad': return _.channel.clamp.h ( parseFloat ( number ) * .9 );
        case 'rad': return _.channel.clamp.h ( parseFloat ( number ) * 180 / Math.PI );
        case 'turn': return _.channel.clamp.h ( parseFloat ( number ) * 360 );
      }

    }

    return _.channel.clamp.h ( parseFloat ( hue ) );

  },

  /* API */

  parse: ( color: string ): Channels | void => {

    const charCode = color.charCodeAt ( 0 );

    if ( charCode !== 104 && charCode !== 72 ) return; // 'h'/'H'

    const match = color.match ( HSL.re );

    if ( !match ) return;

    const [, h, s, l, a, isAlphaPercentage] = match;

    return ChannelsReusable.set ({
      h: HSL._hue2deg ( h ),
      s: _.channel.clamp.s ( parseFloat ( s ) ),
      l: _.channel.clamp.l ( parseFloat ( l ) ),
      a: a ? _.channel.clamp.a ( isAlphaPercentage ? parseFloat ( a ) / 100 : parseFloat ( a ) ) : 1
    }, color );

  },

  stringify: ( channels: Channels ): string => {

    const {h, s, l, a} = channels;

    if ( a < 1 ) { // HSLA

      return `hsla(${_.lang.round ( h )}, ${_.lang.round ( s )}%, ${_.lang.round ( l )}%, ${a})`;

    } else { // HSL

      return `hsl(${_.lang.round ( h )}, ${_.lang.round ( s )}%, ${_.lang.round ( l )}%)`;

    }

  }

};

/* EXPORT */

export default HSL;

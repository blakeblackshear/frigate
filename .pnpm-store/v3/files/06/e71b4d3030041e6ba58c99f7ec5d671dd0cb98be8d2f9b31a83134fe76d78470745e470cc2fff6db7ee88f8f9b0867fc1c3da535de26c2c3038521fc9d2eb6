
/* IMPORT */

import _ from '~/utils';
import Color from '~/color';
import type {Channels} from '~/types';

/* MAIN */

//SOURCE: https://planetcalc.com/7779

const luminance = ( color: string | Channels ): number => {

  const {r, g, b} = Color.parse ( color );
  const luminance = .2126 * _.channel.toLinear ( r ) + .7152 * _.channel.toLinear ( g ) + .0722 * _.channel.toLinear ( b );

  return _.lang.round ( luminance );

};

/* EXPORT */

export default luminance;

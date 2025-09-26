
/* IMPORT */

import _ from '~/utils';
import Color from '~/color';
import adjust from '~/methods/adjust';
import type {CHANNELS, Channels} from '~/types';

/* MAIN */

const scale = ( color: string | Channels, channels: Partial<CHANNELS> ): string => {

  const ch = Color.parse ( color );
  const adjustments: Partial<CHANNELS> = {};
  const delta = ( amount: number, weight: number, max: number ) => weight > 0 ? ( max - amount ) * weight / 100 : amount * weight / 100;

  for ( const c in channels ) {

    adjustments[c] = delta ( ch[c], channels[c], _.channel.max[c] );

  }

  return adjust ( color, adjustments );

};

/* EXPORT */

export default scale;

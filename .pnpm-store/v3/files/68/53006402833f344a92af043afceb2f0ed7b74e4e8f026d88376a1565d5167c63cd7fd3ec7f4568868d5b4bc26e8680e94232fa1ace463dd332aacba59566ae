
/* IMPORT */

import Color from '~/color';
import change from '~/methods/change';
import type {CHANNELS, Channels} from '~/types';

/* MAIN */

const adjust = ( color: string | Channels, channels: Partial<CHANNELS> ): string => {

  const ch = Color.parse ( color );
  const changes: Partial<CHANNELS> = {};

  for ( const c in channels ) {

    if ( !channels[c] ) continue;

    changes[c] = ch[c] + channels[c];

  }

  return change ( color, changes );

};

/* EXPORT */

export default adjust;

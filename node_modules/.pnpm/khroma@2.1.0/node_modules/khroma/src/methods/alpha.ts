
/* IMPORT */

import channel from '~/methods/channel';
import type {Channels} from '~/types';

/* MAIN */

const alpha = ( color: string | Channels ): number => {

  return channel ( color, 'a' );

};

/* EXPORT */

export default alpha;

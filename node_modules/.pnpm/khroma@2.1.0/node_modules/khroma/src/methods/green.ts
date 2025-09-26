
/* IMPORT */

import channel from '~/methods/channel';
import type {Channels} from '~/types';

/* MAIN */

const green = ( color: string | Channels ): number => {

  return channel ( color, 'g' );

};

/* EXPORT */

export default green;

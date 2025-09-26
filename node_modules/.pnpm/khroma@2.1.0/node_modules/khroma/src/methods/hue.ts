
/* IMPORT */

import channel from '~/methods/channel';
import type {Channels} from '~/types';

/* MAIN */

const hue = ( color: string | Channels ): number => {

  return channel ( color, 'h' );

};

/* EXPORT */

export default hue;

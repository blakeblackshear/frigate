
/* IMPORT */

import adjustChannel from '~/methods/adjust_channel';
import type {Channels} from '~/types';

/* MAIN */

const complement = ( color: string | Channels ): string => {

  return adjustChannel ( color, 'h', 180 );

};

/* EXPORT */

export default complement;

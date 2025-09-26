
/* IMPORT */

import change from '~/methods/change';
import type {Channels} from '~/types';

/* MAIN */

const grayscale = ( color: string | Channels ): string => {

  return change ( color, { s: 0 } );

};

/* EXPORT */

export default grayscale;


/* IMPORT */

import adjustChannel from '~/methods/adjust_channel';
import type {Channels} from '~/types';

/* MAIN */

const transparentize = ( color: string | Channels, amount: number ): string => {

  return adjustChannel ( color, 'a', -amount );

};

/* EXPORT */

export default transparentize;

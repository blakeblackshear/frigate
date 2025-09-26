
/* IMPORT */

import Color from '~/color';
import mix from '~/methods/mix';
import type {Channels} from '~/types';

/* MAIN */

const invert = ( color: string | Channels, weight: number = 100 ): string => {

  const inverse = Color.parse ( color );

  inverse.r = 255 - inverse.r;
  inverse.g = 255 - inverse.g;
  inverse.b = 255 - inverse.b;

  return mix ( inverse, color, weight );

};

/* EXPORT */

export default invert;

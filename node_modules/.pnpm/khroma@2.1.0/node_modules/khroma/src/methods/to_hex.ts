
/* IMPORT */

import Color from '~/color';

/* MAIN */

const toHex = ( color: string ): string => {

  return Color.format.hex.stringify ( Color.parse ( color ) );

};

/* EXPORT */

export default toHex;

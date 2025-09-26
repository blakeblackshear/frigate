
/* IMPORT */

import Color from '~/color';

/* MAIN */

const toHsla = ( color: string ): string => {

  return Color.format.hsla.stringify ( Color.parse ( color ) );

};

/* EXPORT */

export default toHsla;

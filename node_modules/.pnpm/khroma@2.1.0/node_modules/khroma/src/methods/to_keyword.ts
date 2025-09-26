
/* IMPORT */

import Color from '~/color';

/* MAIN */

const toKeyword = ( color: string ): string | undefined => {

  return Color.format.keyword.stringify ( Color.parse ( color ) );

};

/* EXPORT */

export default toKeyword;

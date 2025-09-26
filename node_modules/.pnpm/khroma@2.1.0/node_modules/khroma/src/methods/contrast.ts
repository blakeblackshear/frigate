
/* IMPORT */

import _ from '~/utils';
import luminance from '~/methods/luminance';

/* MAIN */

const contrast = ( color1: string, color2: string ): number => {

  const luminance1 = luminance ( color1 );
  const luminance2 = luminance ( color2 );
  const max = Math.max ( luminance1, luminance2 );
  const min = Math.min ( luminance1, luminance2 );
  const ratio = ( max + Number.EPSILON ) / ( min + Number.EPSILON );

  return _.lang.round ( _.lang.clamp ( ratio, 1, 10 ) );

};

/* EXPORT */

export default contrast;

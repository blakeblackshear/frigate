
/* IMPORT */

import {describe} from 'fava';
import {saturation} from '../../dist/index.js';

/* MAIN */

describe ( 'saturation', it => {

  it ( 'gets the saturation channel of the color', t => {

    const tests = [
      ['hsl(10, 20%, 30%)', 20],
      ['rgb(10, 20, 30)', 50],
      ['rgb(0, 0, 0)', 0],
      ['#102030', 50],
      ['#ff0000', 100]
    ];

    tests.forEach ( ([ color, output ]) => {
      t.is ( saturation ( color ), output );
    });

  });

});

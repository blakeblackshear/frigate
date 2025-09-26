
/* IMPORT */

import {describe} from 'fava';
import {red} from '../../dist/index.js';

/* MAIN */

describe ( 'red', it => {

  it ( 'gets the red channel of the color', t => {

    const tests = [
      ['rgb(10, 20, 30)', 10],
      ['#102030', 16],
      ['hsl(10, 20%, 30%)', 91.8]
    ];

    tests.forEach ( ([ color, output ]) => {
      t.is ( red ( color ), output );
    });

  });

});

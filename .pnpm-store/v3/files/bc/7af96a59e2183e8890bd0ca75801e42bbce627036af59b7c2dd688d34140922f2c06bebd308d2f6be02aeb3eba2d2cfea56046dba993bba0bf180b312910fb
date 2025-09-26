
/* IMPORT */

import {describe} from 'fava';
import {green} from '../../dist/index.js';

/* MAIN */

describe ( 'green', it => {

  it ( 'gets the green channel of the color', t => {

    const tests = [
      ['rgb(10, 20, 30)', 20],
      ['#102030', 32],
      ['hsl(10, 20%, 30%)', 66.3]
    ];

    tests.forEach ( ([ color, output ]) => {
      t.is ( green ( color ), output );
    });

  });

});

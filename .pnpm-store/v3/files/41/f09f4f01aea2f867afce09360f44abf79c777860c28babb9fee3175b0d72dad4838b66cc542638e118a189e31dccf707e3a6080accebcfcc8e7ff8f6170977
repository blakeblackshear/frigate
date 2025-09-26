
/* IMPORT */

import {describe} from 'fava';
import {hue} from '../../dist/index.js';

/* MAIN */

describe ( 'hue', it => {

  it ( 'gets the hue channel of the color', t => {

    const tests = [
      ['hsl(10, 20%, 30%)', 10],
      ['rgb(10, 20, 30)', 210],
      ['#102030', 210]
    ];

    tests.forEach ( ([ color, output ]) => {
      t.is ( hue ( color ), output );
    });

  });

});

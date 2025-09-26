
/* IMPORT */

import {describe} from 'fava';
import {blue} from '../../dist/index.js';

/* MAIN */

describe ( 'blue', it => {

  it ( 'gets the blue channel of the color', t => {

    const tests = [
      ['rgb(10, 20, 30)', 30],
      ['#102030', 48],
      ['hsl(10, 20%, 30%)', 61.2]
    ];

    tests.forEach ( ([ color, output ]) => {
      t.is ( blue ( color ), output );
    });

  });

});

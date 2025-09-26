
/* IMPORT */

import {describe} from 'fava';
import {isTransparent} from '../../dist/index.js';

/* MAIN */

describe ( 'isTransparent', it => {

  it ( 'checks if the provided color is a transparent color', t => {

    const tests = [
      ['transparent', true],
      ['#00000000', true],
      ['#ffffff00', true],
      ['black', false],
      ['#00000001', false],
      ['#ffffffff', false],
      ['#8a8a8a', false],
      ['#bbbbbb', false],
      ['#ffcc00', false],
      ['#e0e0e0', false],
      ['#ffffff', false]
    ];

    tests.forEach ( ([ color, output ]) => {
      t.is ( isTransparent ( color ), output );
    });

  });

});

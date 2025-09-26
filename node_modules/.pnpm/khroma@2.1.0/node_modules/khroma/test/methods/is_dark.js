
/* IMPORT */

import {describe} from 'fava';
import {isDark} from '../../dist/index.js';

/* MAIN */

describe ( 'isDark', it => {

  it ( 'checks if the provided color is a dark color', t => {

    const tests = [
      ['#000000', true],
      ['#8a8a8a', true],
      ['#bbbbbb', true],
      ['#ffcc00', false],
      ['#e0e0e0', false],
      ['#ffffff', false]
    ];

    tests.forEach ( ([ color, output ]) => {
      t.is ( isDark ( color ), output );
    });

  });

});


/* IMPORT */

import {describe} from 'fava';
import {desaturate} from '../../dist/index.js';

/* MAIN */

describe ( 'desaturate', it => {

  it ( 'decreases the saturation channel of the color', t => {

    const tests = [
      [['hsl(0, 100%, 50%)', 0], 'hsl(0, 100%, 50%)'],
      [['hsl(0, 100%, 50%)', 50], 'hsl(0, 50%, 50%)'],
      [['hsl(0, 100%, 50%)', 75], 'hsl(0, 25%, 50%)'],
      [['hsl(0, 100%, 50%)', 100], 'hsl(0, 0%, 50%)'],
      [['hsl(0, 50%, 50%)', 100], 'hsl(0, 0%, 50%)'],
      [['hsl(0, 0%, 50%)', 100], 'hsl(0, 0%, 50%)']
    ];

    tests.forEach ( ([ args, output ]) => {
      t.is ( desaturate ( ...args ), output );
    });

  });

});

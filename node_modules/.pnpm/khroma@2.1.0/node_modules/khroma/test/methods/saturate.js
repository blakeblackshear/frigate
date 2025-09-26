
/* IMPORT */

import {describe} from 'fava';
import {saturate} from '../../dist/index.js';

/* MAIN */

describe ( 'saturate', it => {

  it ( 'increases the saturation channel of the color', t => {

    const tests = [
      [['hsl(0, 0%, 50%)', 0], 'hsl(0, 0%, 50%)'],
      [['hsl(0, 0%, 50%)', 50], 'hsl(0, 50%, 50%)'],
      [['hsl(0, 0%, 50%)', 75], 'hsl(0, 75%, 50%)'],
      [['hsl(0, 0%, 50%)', 100], 'hsl(0, 100%, 50%)'],
      [['hsl(0, 50%, 50%)', 100], 'hsl(0, 100%, 50%)'],
      [['hsl(0, 100%, 50%)', 100], 'hsl(0, 100%, 50%)']
    ];

    tests.forEach ( ([ args, output ]) => {
      t.is ( saturate ( ...args ), output );
    });

  });

});

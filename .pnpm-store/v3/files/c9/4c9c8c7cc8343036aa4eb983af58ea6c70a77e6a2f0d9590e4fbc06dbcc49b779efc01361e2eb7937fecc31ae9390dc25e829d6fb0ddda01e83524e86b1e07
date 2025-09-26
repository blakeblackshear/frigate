
/* IMPORT */

import {describe} from 'fava';
import {darken} from '../../dist/index.js';

/* MAIN */

describe ( 'darken', it => {

  it ( 'decreases the lightness channel of the color', t => {

    const tests = [
      [['hsl(0, 0%, 100%)', 0], 'hsl(0, 0%, 100%)'],
      [['hsl(0, 0%, 100%)', 50], 'hsl(0, 0%, 50%)'],
      [['hsl(0, 0%, 100%)', 75], 'hsl(0, 0%, 25%)'],
      [['hsl(0, 0%, 100%)', 100], 'hsl(0, 0%, 0%)'],
      [['hsl(0, 0%, 50%)', 100], 'hsl(0, 0%, 0%)']
    ];

    tests.forEach ( ([ args, output ]) => {
      t.is ( darken ( ...args ), output );
    });

  });

});

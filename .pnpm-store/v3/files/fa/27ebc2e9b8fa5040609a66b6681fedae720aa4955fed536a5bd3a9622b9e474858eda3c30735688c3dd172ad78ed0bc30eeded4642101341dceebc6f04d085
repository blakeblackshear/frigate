
/* IMPORT */

import {describe} from 'fava';
import {hsla} from '../../dist/index.js';

/* MAIN */

describe ( 'hsla', it => {

  it ( 'creates a new color given its hsla channels.', t => {

    const tests = [
      [[0, 0, 0, 0], 'hsla(0, 0%, 0%, 0)'],
      [[0, 0, 0, 0.5], 'hsla(0, 0%, 0%, 0.5)'],
      [[0, 0, 0, 1], 'hsl(0, 0%, 0%)'],
      [[180, 50, 50, 1], 'hsl(180, 50%, 50%)'],
      [[-1, -1, -1, -1], 'hsla(-1, 0%, 0%, 0)'],
      [[1000, 1000, 1000, 1000], 'hsl(280, 100%, 100%)']
    ];

    tests.forEach ( ([ args, output ]) => {
      t.is ( hsla ( ...args ), output );
    });

  });

  it ( 'allows ommiting the alpha channel', t => {

    const tests = [
      [[0, 0, 0], 'hsl(0, 0%, 0%)'],
      [[180, 50, 50], 'hsl(180, 50%, 50%)']
    ];

    tests.forEach ( ([ args, output ]) => {
      t.is ( hsla ( ...args ), output );
    });

  });

});

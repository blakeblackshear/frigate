
/* IMPORT */

import {describe} from 'fava';
import {hex} from '../../dist/index.js';

/* MAIN */

describe ( 'hex', it => {

  it ( 'creates a new color given its rgba channels', t => {

    const tests = [
      [[0, 0, 0, 0], 'rgba(0, 0, 0, 0)'],
      [[255, 255, 255, 0.5], 'rgba(255, 255, 255, 0.5)'],
      [[0, 0, 0, 1], '#000000'],
      [[128, 128, 128, 1], '#808080'],
      [[-1, -1, -1, -1], 'rgba(0, 0, 0, 0)'],
      [[1000, 1000, 1000, 1000], '#ffffff']
    ];

    tests.forEach ( ([ args, output ]) => {
      t.is ( hex ( ...args ), output );
    });

  });

  it ( 'allows ommiting the alpha channel', t => {

    const tests = [
      [[0, 0, 0], '#000000'],
      [[255, 255, 255], '#ffffff']
    ];

    tests.forEach ( ([ args, output ]) => {
      t.is ( hex ( ...args ), output );
    });

  });

});

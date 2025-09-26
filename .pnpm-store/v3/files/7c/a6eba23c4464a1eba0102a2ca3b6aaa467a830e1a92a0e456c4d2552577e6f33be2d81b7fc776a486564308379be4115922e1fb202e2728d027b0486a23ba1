
/* IMPORT */

import {describe} from 'fava';
import {opacify} from '../../dist/index.js';

/* MAIN */

describe ( 'opacify', it => {

  it ( 'increases the opacity channel of the color', t => {

    const tests = [
      [['#000000', 1], '#000000'],
      [['rgba(0, 0, 0, 0.5)', 0.5], '#000000'],
      [['rgba(0, 0, 0, 0.5)', 0.1], 'rgba(0, 0, 0, 0.6)']
    ];

    tests.forEach ( ([ args, output ]) => {
      t.is ( opacify ( ...args ), output );
    });

  });

});

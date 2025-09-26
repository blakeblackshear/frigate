
/* IMPORT */

import {describe} from 'fava';
import {mix} from '../../dist/index.js';

/* MAIN */

describe ( 'mix', it => {

  it ( 'mixes two colors together', t => {

    const tests = [
      [['#036', '#d2e1dd'], 'rgb(105, 138, 161.5)'],
      [['#036', '#d2e1dd', 75 ], 'rgb(52.5, 94.5, 131.75)'],
      [['#036', '#d2e1dd', 25 ], 'rgb(157.5, 181.5, 191.25)'],
      [['rgba(242, 236, 228, 0.5)', '#6b717f'], 'rgba(140.75, 143.75, 152.25, 0.75)']
    ];

    tests.forEach ( ([ args, output ]) => {
      t.is ( mix ( ...args ), output );
    });

  });

});

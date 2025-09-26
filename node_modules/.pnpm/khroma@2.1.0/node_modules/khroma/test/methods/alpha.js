
/* IMPORT */

import {describe} from 'fava';
import {alpha} from '../../dist/index.js';

/* MAIN */

describe ( 'alpha', it => {

  it ( 'gets the alpha channel of the color', t => {

    const tests = [
      ['rgba(10, 20, 30)', 1],
      ['rgba(10, 20, 30, 0.1)', 0.1],
      ['#10203040', 0.2509803922],
      ['hsla(10, 20%, 30%, 0.5)', 0.5]
    ];

    tests.forEach ( ([ color, output ]) => {
      t.is ( alpha ( color ), output );
    });

  });

});

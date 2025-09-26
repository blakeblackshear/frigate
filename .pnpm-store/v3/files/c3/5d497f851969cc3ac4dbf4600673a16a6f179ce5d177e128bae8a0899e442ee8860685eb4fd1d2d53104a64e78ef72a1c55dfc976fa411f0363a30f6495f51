
/* IMPORT */

import {describe} from 'fava';
import {lightness} from '../../dist/index.js';

/* MAIN */

describe ( 'lightness', it => {

  it ( 'gets the lightness channel of the color', t => {

    const tests = [
      ['hsl(10, 20%, 30%)', 30],
      ['rgb(10, 20, 30)', 7.8431372549],
      ['rgb(0, 0, 0)', 0],
      ['#102030', 12.5490196078]
    ];

    tests.forEach ( ([ color, output ]) => {
      t.is ( lightness ( color ), output );
    });

  });

});

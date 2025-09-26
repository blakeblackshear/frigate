
/* IMPORT */

import {describe} from 'fava';
import {isValid} from '../../dist/index.js';

/* MAIN */

describe ( 'isValid', it => {

  it ( 'checks if the provided color is a valid color', t => {

    const tests = [
      ['black', true],
      ['rgb(10, 20, 30)', true],
      ['#102030', true],
      ['hsl(10, 20%, 30%)', true],
      ['#ggg', false],
      ['foo', false]
    ];

    tests.forEach ( ([ color, output ]) => {
      t.is ( isValid ( color ), output );
    });

  });

});

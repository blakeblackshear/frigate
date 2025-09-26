
/* IMPORT */

import {describe} from 'fava';
import Color from '../../dist/color/index.js';

/* MAIN */

describe ( 'Keyword', it => {

  it ( 'parses keywords colors', t => {

    const tests = [
      ['black', '#000000'],
      ['BLACK', '#000000'],
      ['tranSpaRent', '#00000000']
    ];

    tests.forEach ( ([ input, output ]) => {
      t.is ( Color.format.hex.stringify ( Color.parse ( input ) ), output );
    });

  });

  it ( 'throws with unsupported colors', t => {

    const colors = [
      'foo',
      'bar'
    ];

    colors.forEach ( color => {
      t.throws ( () => Color.parse ( color ), /unsupported/i );
    });

  });

});

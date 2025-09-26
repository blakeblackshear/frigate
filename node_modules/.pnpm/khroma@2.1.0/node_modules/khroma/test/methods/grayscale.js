
/* IMPORT */

import {describe} from 'fava';
import {grayscale} from '../../dist/index.js';

/* MAIN */

describe ( 'grayscale', it => {

  it ( 'gets the grayscale version of the color', t => {

    const tests = [
      ['#6b717f', 'hsl(222, 0%, 45.8823529412%)'],
      ['#d2e1dd', 'hsl(164, 0%, 85.2941176471%)'],
      ['#036', 'hsl(210, 0%, 20%)']
    ];

    tests.forEach ( ([ color, output ]) => {
      t.is ( grayscale ( color ), output );
    });

  });

});

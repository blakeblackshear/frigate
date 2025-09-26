
/* IMPORT */

import {describe} from 'fava';
import {contrast} from '../../dist/index.js';

/* MAIN */

describe ( 'contrast', it => {

  it ( 'gets the contrast ratio between two colors', t => {

    const tests = [
      ['#000000', '#000000', 1],
      ['#ffffff', '#ffffff', 1],
      ['#000000', '#ffffff', 10],
      ['#ffffff', '#000000', 10],
      ['#888888', '#ffffff', 4.0617165366],
      ['#ffffff', '#888888', 4.0617165366]
    ];

    tests.forEach ( ([ color1, color2, output ]) => {
      t.is ( contrast ( color1, color2 ), output );
    });

  });

});

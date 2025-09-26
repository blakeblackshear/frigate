
/* IMPORT */

import {describe} from 'fava';
import {luminance} from '../../dist/index.js';

/* MAIN */

describe ( 'luminance', it => {

  it ( 'gets the relative luminance of the color', t => {

    const tests = [
      ['#000000', 0],
      ['#8a8a8a', .2541520943],
      ['#bbbbbb', .4969329951],
      ['#ffcc00', .6444573127],
      ['#e0e0e0', .7454042095],
      ['#ffffff', 1]
    ];

    tests.forEach ( ([ color, output ]) => {
      t.is ( luminance ( color ), output );
    });

  });

});

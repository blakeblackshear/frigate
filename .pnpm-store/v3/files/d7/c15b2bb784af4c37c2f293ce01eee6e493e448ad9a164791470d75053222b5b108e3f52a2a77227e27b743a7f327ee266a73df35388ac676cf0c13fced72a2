
/* IMPORT */

import {describe} from 'fava';
import Color from '../../dist/color/index.js';

/* MAIN */

describe ( 'Hex', it => {

  it ( 'parses hex colors', t => {

    const tests = [
      /* RGB */
      ['#000', '#000000'],
      ['#fff', '#ffffff'],
      ['#a2b', '#aa22bb'],
      ['#a2B', '#aa22bb'],
      /* RGBA */
      ['#0000', '#00000000'],
      ['#fffF', '#ffffff'],
      ['#fff8', '#ffffff88'],
      ['#a2bf', '#aa22bb'],
      ['#a2Bf', '#aa22bb'],
      /* RRGGBB */
      ['#000000', '#000000'],
      ['#FFFFFF', '#ffffff'],
      ['#ffffff', '#ffffff'],
      ['#ae12b4', '#ae12b4'],
      ['#Ae12B4', '#ae12b4'],
      /* RRGGBBAA */
      ['#000000ff', '#000000'],
      ['#00000000', '#00000000'],
      ['#ffffffa8', '#ffffffa8'],
      ['#ffffffA8', '#ffffffa8']
    ];

    tests.forEach ( ([ input, output ]) => {
      t.is ( Color.format.hex.stringify ( Color.parse ( input ) ), output );
    });

  });

  it ( 'throws with unsupported colors', t => {

    const colors = [
      '#',
      '#0',
      '#00',
      '#ggg',
      '#zzz',
      'fff',
      '#0 0 0',
      '# 000',
      '#aabbc',
      '#aabbccd',
      '#aabbccdde'
    ];

    colors.forEach ( color => {
      t.throws ( () => Color.parse ( color ), /unsupported/i );
    });

  });

});

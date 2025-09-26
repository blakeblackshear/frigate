
/* IMPORT */

import {describe} from 'fava';
import Color from '../../dist/color/index.js';

/* MAIN */

describe ( 'RGB', it => {

  it ( 'parses RGB colors', t => {

    const tests = [
      /* DECIAML 0~255 */
      ['rgb(1, 20, 255)', 'rgb(1, 20, 255)'],
      ['rgb(1.99, 20.5, 255)', 'rgb(1.99, 20.5, 255)'],
      ['rgb(300, 255, -100)', 'rgb(255, 255, 0)'],
      /* PERCENTAGE 0~100 */
      ['rgb(10%, 20%, 30%)', 'rgb(25.5, 51, 76.5)'],
      ['rgb(10.5%, 20.7%, 30%)', 'rgb(26.775, 52.785, 76.5)'],
      ['rgb(100% 200% -30%)', 'rgb(255, 255, 0)'],
      /* WITH COMMAS AND WEIRD SPACES */
      ['rgb(  1 , 20 , 255  )', 'rgb(1, 20, 255)'],
      ['rgb(1,20,255)', 'rgb(1, 20, 255)'],
      ['rgb( 1,20,255 )', 'rgb(1, 20, 255)'],
      /* WITHOUT COMMAS */
      ['rgb(10% 20% 30%)', 'rgb(25.5, 51, 76.5)'],
      ['rgb(1 20 255)', 'rgb(1, 20, 255)'],
      ['rgb(   1    20     255   )', 'rgb(1, 20, 255)'],
      /* MIXED UNITS */
      ['rgb(10% 20 30%)', 'rgb(25.5, 20, 76.5)'],
      ['rgb(1 25.5 25.5)', 'rgb(1, 25.5, 25.5)'],
      /* WEIRD CASING */
      ['RGB(1, 20, 255)', 'rgb(1, 20, 255)'],
      ['rGb(1, 20, 255)', 'rgb(1, 20, 255)']
    ];

    tests.forEach ( ([ input, output ]) => {
      t.is ( Color.format.rgb.stringify ( Color.parse ( input ) ), output );
    });

  });

  it ( 'throws with unsupported colors', t => {

    const colors = [
      'rgb()',
      'rgb(1, 2, 3, 4, 5)',
      'rgb(1/2/3)',
      'rgb(1,, 20, 255)',
      'rgb(1%,, 20%, 255%)',
      'rgb(1%, 255%)',
      'rgb(1%, 10%%, 255%)',
      'rgb(1%, %10%, 255%)',
      'rgb(1)',
      'rgb(1, 20, 255',
      'rgb 1, 20, 255',
      'rgb 1, 20, 255)',
      'rgb(1, a, 255)',
      'rgb (1, 2, 255)',
      'rgb(1,2,3..5)',
      'rgb(1, 2, 3.4.5)',
      'rgbQ(1, 2, 255)',
      'r g b(1, 2, 255)'
    ];

    colors.forEach ( color => {
      t.throws ( () => Color.parse ( color ), /unsupported/i );
    });

  });

});


/* IMPORT */

import {describe} from 'fava';
import Color from '../../dist/color/index.js';

/* MAIN */

describe ( 'RGBA', it => {

  it ( 'parses RGBA colors', t => {

    const tests = [
      /* FRACTION 0~1 */
      ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0)'],
      ['rgba(0, 0, 0)', 'rgb(0, 0, 0)'],
      ['rgba(0, 0, 0, 10)', 'rgb(0, 0, 0)'],
      ['rgba(0, 0, 0, -10)', 'rgba(0, 0, 0, 0)'],
      ['rgba(0, 0, 0, 0.5)', 'rgba(0, 0, 0, 0.5)'],
      ['rgba(0, 0, 0, .5)', 'rgba(0, 0, 0, 0.5)'],
      ['rgba(0, 0, 0,   0.5   )', 'rgba(0, 0, 0, 0.5)'],
      /* PERCENTAGE 0~100 */
      ['rgba(0, 0, 0, 0%)', 'rgba(0, 0, 0, 0)'],
      ['rgba(0, 0, 0, 100%)', 'rgb(0, 0, 0)'],
      ['rgba(0, 0, 0, 110%)', 'rgb(0, 0, 0)'],
      ['rgba(0, 0, 0, -110%)', 'rgba(0, 0, 0, 0)'],
      ['rgba(0, 0, 0, 50%)', 'rgba(0, 0, 0, 0.5)'],
      ['rgba(0, 0, 0, 50.5%)', 'rgba(0, 0, 0, 0.505)'],
      /* WITH COMMAS AND WEIRD SPACES */
      ['rgba(  1 , 20 , 255, 0.5  )', 'rgba(1, 20, 255, 0.5)'],
      ['rgba(1,20,255,50%)', 'rgba(1, 20, 255, 0.5)'],
      ['rgba( 1,20,255,0.5 )', 'rgba(1, 20, 255, 0.5)'],
      /* WITH SLASH */
      ['rgba(51 170 51 / 0.4)', 'rgba(51, 170, 51, 0.4)'],
      ['rgba(51 170 51/0.4)', 'rgba(51, 170, 51, 0.4)'],
      ['rgba(51 170 51 / 40%)', 'rgba(51, 170, 51, 0.4)'],
      ['rgba(51, 170, 51 / 40%)', 'rgba(51, 170, 51, 0.4)'],
      ['rgba(51,170,51/40%)', 'rgba(51, 170, 51, 0.4)'],
      /* SCIENTIFIC NOTATION */
      ['rgba(1e2, .5e1, .5e0, +.25e2%)', 'rgba(100, 5, 0.5, 0.25)'],
      ['rgba(1e2, .5e1, .5e0, +.25e1%)', 'rgba(100, 5, 0.5, 0.025)'],
      ['rgba(1e2, .5e1, .5e0, +.25e0%)', 'rgba(100, 5, 0.5, 0.0025)'],
      ['rgba(1e2, .5e1, .5e0, .25e0)', 'rgba(100, 5, 0.5, 0.25)'],
      ['rgba(1e2, .5e1, .5e0, .25e1)', 'rgb(100, 5, 0.5)'],
      /* MIXED UNITS */
      ['rgba(1, 10%, .5e0, +.25e2%)', 'rgba(1, 25.5, 0.5, 0.25)'],
      /* WEIRD CASING */
      ['RGBA(1, 20, 255, 0.5)', 'rgba(1, 20, 255, 0.5)'],
      ['rgbA(1, 20, 255, 0.5)', 'rgba(1, 20, 255, 0.5)']
    ];

    tests.forEach ( ([ input, output ]) => {
      t.is ( Color.format.rgba.stringify ( Color.parse ( input ) ), output );
    });

  });

  it ( 'throws with unsupported colors', t => {

    const colors = [
      'rgba()',
      'rgba(51 170 51 0.4)',
      'rgba(1, 2, 3, 4, 5)',
      'rgba(0, 0, 0, 0..5)',
      'rgba(0, 0, 0, 0.5.)',
      'rgba(0, 0, 0, 0%%)',
      'rgba(51 170 51 // 0.4)',
      'rgba(1ee2, .5e1, .5e0, +.25e2%)',
      'rgba(1f2, .5e1, .5e0, +.25e2%)'
    ];

    colors.forEach ( color => {
      t.throws ( () => Color.parse ( color ), /unsupported/i );
    });

  });

});

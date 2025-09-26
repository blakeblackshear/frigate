
/* IMPORT */

import {describe} from 'fava';
import Color from '../../dist/color/index.js';

/* MAIN */

describe ( 'HSLA', it => {

  it ( 'parses HSLA colors', t => {

    const tests = [
      /* NO UNIT HUE */
      ['hsla(0, 0%, 0%, 0)', 'hsla(0, 0%, 0%, 0)'],
      ['hsla(0, 0%, 0%)', 'hsl(0, 0%, 0%)'],
      ['hsla(0, 0%, 0%, 10)', 'hsl(0, 0%, 0%)'],
      ['hsla(0, 0%, 0%, -10)', 'hsla(0, 0%, 0%, 0)'],
      ['hsla(0, 0%, 0%, 0.5)', 'hsla(0, 0%, 0%, 0.5)'],
      ['hsla(0, 0%, 0%, .5)', 'hsla(0, 0%, 0%, 0.5)'],
      ['hsla(0, 0%, 0%,   0.5   )', 'hsla(0, 0%, 0%, 0.5)'],
      /* PERCENTAGE 0~100 */
      ['hsla(0, 0%, 0%, 0%)', 'hsla(0, 0%, 0%, 0)'],
      ['hsla(0, 0%, 0%, 100%)', 'hsl(0, 0%, 0%)'],
      ['hsla(0, 0%, 0%, 110%)', 'hsl(0, 0%, 0%)'],
      ['hsla(0, 0%, 0%, -110%)', 'hsla(0, 0%, 0%, 0)'],
      ['hsla(0, 0%, 0%, 50%)', 'hsla(0, 0%, 0%, 0.5)'],
      ['hsla(0, 0%, 0%, 50.5%)', 'hsla(0, 0%, 0%, 0.505)'],
      /* WITH COMMAS AND WEIRD SPACES */
      ['hsla(  1 , 20% , 50%, 0.5  )', 'hsla(1, 20%, 50%, 0.5)'],
      ['hsla(1,20%,50%,50%)', 'hsla(1, 20%, 50%, 0.5)'],
      ['hsla( 1,20%,50%,0.5 )', 'hsla(1, 20%, 50%, 0.5)'],
      /* WITH SLASH */
      ['hsla(0 0% 0% / 0.4)', 'hsla(0, 0%, 0%, 0.4)'],
      ['hsla(0 0% 0%/0.4)', 'hsla(0, 0%, 0%, 0.4)'],
      ['hsla(0 0% 0% / 40%)', 'hsla(0, 0%, 0%, 0.4)'],
      ['hsla(0, 0%, 0% / 40%)', 'hsla(0, 0%, 0%, 0.4)'],
      ['hsla(0,0%,0%/40%)', 'hsla(0, 0%, 0%, 0.4)'],
      /* SCIENTIFIC NOTATION */
      ['hsla(1e2, 2e1%, .5e2%, +.25e2%)', 'hsla(100, 20%, 50%, 0.25)'],
      ['hsla(1e2, 2e1%, .5e2%, +.25e1%)', 'hsla(100, 20%, 50%, 0.025)'],
      ['hsla(1e2, 2e1%, .5e2%, +.25e0%)', 'hsla(100, 20%, 50%, 0.0025)'],
      ['hsla(1e2, 2e1%, .5e2%, .25e0)', 'hsla(100, 20%, 50%, 0.25)'],
      ['hsla(1e2, 2e1%, .5e2%, .25e1)', 'hsl(100, 20%, 50%)'],
      ['hsla(1e2, 2e1%, .5e2%, 25e-2)', 'hsla(100, 20%, 50%, 0.25)'],
      /* MIXED UNITS */
      ['hsla(1, 20%, .5e2%, +.25e2%)', 'hsla(1, 20%, 50%, 0.25)'],
      /* WEIRD CASING */
      ['HSLA(1, 20%, 50%, 0.5)', 'hsla(1, 20%, 50%, 0.5)'],
      ['hSlA(1, 20%, 50%, 0.5)', 'hsla(1, 20%, 50%, 0.5)']
    ];

    tests.forEach ( ([ input, output ]) => {
      t.is ( Color.format.hsla.stringify ( Color.parse ( input ) ), output );
    });

  });

  it ( 'throws with unsupported colors', t => {

    const colors = [
      'hsla()',
      'hsla(51 170 51 0.4)',
      'hsla(1, 2, 3, 4, 5)',
      'hsla(0, 0, 0, 0..5)',
      'hsla(0, 0, 0, 0.5.)',
      'hsla(0, 0, 0, 0%%)',
      'hsla(51 170 51 // 0.4)',
      'hsla(1ee2, .5e1, .5e0, +.25e2%)',
      'hsla(1f2, .5e1, .5e0, +.25e2%)',
      'hsla(0, 0, 0, 0)',
      'hsla(0, 100, 0, 0)',
      'hsla(0, 0, 100, 0)',
      'hsla(0, 100, 100, 0)',
      'hsla(180, 50, 50, 0)',
      'hsla(180, 40.4, 70.4, 0)'
    ];

    colors.forEach ( color => {
      t.throws ( () => Color.parse ( color ), /unsupported/i );
    });

  });

});

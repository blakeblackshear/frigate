
/* IMPORT */

import {describe} from 'fava';
import Color from '../../dist/color/index.js';

/* MAIN */

describe ( 'HSL', it => {

  it ( 'parses HSL colors', t => {

    const tests = [
      /* NO UNIT HUE */
      ['hsl(0, 0%, 0%)', 'hsl(0, 0%, 0%)'],
      ['hsl(0, 100%, 0%)', 'hsl(0, 100%, 0%)'],
      ['hsl(0, 0%, 100%)', 'hsl(0, 0%, 100%)'],
      ['hsl(0, 100%, 100%)', 'hsl(0, 100%, 100%)'],
      ['hsl(180, 50%, 50%)', 'hsl(180, 50%, 50%)'],
      ['hsl(180, 40.4%, 70.4%)', 'hsl(180, 40.4%, 70.4%)'],
      /* S & L CLAMPING - H WRAPPING */
      ['hsl(-180, 40.4%, 70.4%)', 'hsl(-180, 40.4%, 70.4%)'],
      ['hsl(180, -40.4%, -70.4%)', 'hsl(180, 0%, 0%)'],
      ['hsl(180, 400.4%, 700.4%)', 'hsl(180, 100%, 100%)'],
      ['hsl(540, 100%, 50%)', 'hsl(180, 100%, 50%)'],
      /* DEGREES */
      ['hsl(-180deg, 50%, 50%)', 'hsl(-180, 50%, 50%)'],
      ['hsl(0deg, 50%, 50%)', 'hsl(0, 50%, 50%)'],
      ['hsl(180deg, 50%, 50%)', 'hsl(180, 50%, 50%)'],
      ['hsl(360deg, 50%, 50%)', 'hsl(0, 50%, 50%)'],
      ['hsl(540deg, 50%, 50%)', 'hsl(180, 50%, 50%)'],
      /* GRADIANS */
      ['hsl(0grad, 50%, 50%)', 'hsl(0, 50%, 50%)'],
      ['hsl(200grad, 50%, 50%)', 'hsl(180, 50%, 50%)'],
      ['hsl(400grad, 50%, 50%)', 'hsl(0, 50%, 50%)'],
      /* RADIANS */
      ['hsl(0rad, 50%, 50%)', 'hsl(0, 50%, 50%)'],
      ['hsl(3.14159265359rad, 50%, 50%)', 'hsl(180, 50%, 50%)'],
      /* TURNS */
      ['hsl(0turn, 50%, 50%)', 'hsl(0, 50%, 50%)'],
      ['hsl(0.5turn, 50%, 50%)', 'hsl(180, 50%, 50%)'],
      ['hsl(1turn, 50%, 50%)', 'hsl(0, 50%, 50%)'],
      /* SCIENTIFIC NOTATION */
      ['hsl(1.8e2, 4.04e1%, .704e2%)', 'hsl(180, 40.4%, 70.4%)'],
      ['hsl(1.8e2deg, 4.04e1%, .704e2%)', 'hsl(180, 40.4%, 70.4%)'],
      ['hsl(1800e-1deg, 404e-1%, 7040e-2%)', 'hsl(180, 40.4%, 70.4%)'],
      /* WITH COMMAS AND WEIRD SPACES */
      ['hsl( 0 ,   0%   ,  0%   )', 'hsl(0, 0%, 0%)'],
      ['hsl(0,0%,0%)', 'hsl(0, 0%, 0%)'],
      /* WITHOUT COMMAS */
      ['hsl(0 0% 0%)', 'hsl(0, 0%, 0%)'],
      ['hsl(   0   0%   0%   )', 'hsl(0, 0%, 0%)'],
      ['hsl(180deg 50% 50%)', 'hsl(180, 50%, 50%)'],
      ['hsl(180 40.4% 70.4%)', 'hsl(180, 40.4%, 70.4%)'],
      /* WEIRD CASING */
      ['HSL(0 0% 0%)', 'hsl(0, 0%, 0%)'],
      ['hSl(0 0% 0%)', 'hsl(0, 0%, 0%)']
    ];

    tests.forEach ( ([ input, output ]) => {
      t.is ( Color.format.hsl.stringify ( Color.parse ( input ) ), output );
    });

  });

  it ( 'throws with unsupported colors', t => {

    const colors = [
      'hsl',
      'hsl()',
      'hsl(0, 0)',
      'hsl(0, 1, dog)',
      'hsl(0de, 0, 0)',
      'hsl(0gra, 0, 0)',
      'hsl(1, 2, 3, 4, 5)',
      'hsl(1/2/3)',
      'hsl(1,, 20, 255)',
      'hsl(1%,, 20%, 255%)',
      'hsl(1%, 255%)',
      'hsl(1%, 10%%, 255%)',
      'hsl(1%, %10%, 255%)',
      'hsl(1)',
      'hsl(1, 20, 255',
      'hsl 1, 20, 255',
      'hsl 1, 20, 255)',
      'hsl(1, a, 255)',
      'hsl (1, 2, 255)',
      'hsl(1,2,3..5)',
      'hsl(1, 2, 3.4.5)',
      'hslQ(1, 2, 255)',
      'h s l(1, 2, 255)',
      'hsl(0, 0, 0)',
      'hsl(0, 100, 0)',
      'hsl(0, 0, 100)',
      'hsl(0, 100, 100)',
      'hsl(180, 50, 50)',
      'hsl(180, 40.4, 70.4)'
    ];

    colors.forEach ( color => {
      t.throws ( () => Color.parse ( color ), /unsupported/i );
    });

  });

});

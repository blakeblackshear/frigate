
/* IMPORT */

import {describe} from 'fava';
import {adjust} from '../../dist/index.js';
import Color from '../../dist/color/index.js';

/* MAIN */

describe ( 'adjust', it => {

  it ( 'increases or decreases the value of any RGB channel of the color', t => {

    const tests = [
      [['rgb(0, 0, 0)', { r: 100 }], 'rgb(100, 0, 0)'],
      [['rgb(0, 0, 0)', { g: 100 }], 'rgb(0, 100, 0)'],
      [['rgb(0, 0, 0)', { b: 100 }], 'rgb(0, 0, 100)'],
      [['rgb(0, 0, 0)', { r: 100, g: 100 }], 'rgb(100, 100, 0)'],
      [['rgb(0, 0, 0)', { r: 100, g: 100, b: 100 }], 'rgb(100, 100, 100)'],
      [['rgb(255, 255, 255)', { r: -100 }], 'rgb(155, 255, 255)'],
      [['rgb(255, 255, 255)', { g: -100 }], 'rgb(255, 155, 255)'],
      [['rgb(255, 255, 255)', { b: -100 }], 'rgb(255, 255, 155)'],
      [['rgb(200, 0, 0)', { r: 100 }], 'rgb(255, 0, 0)'],
      [['rgb(100, 0, 0)', { r: -200 }], 'rgb(0, 0, 0)']
    ];

    tests.forEach ( ([ args, output ]) => {
      t.is ( Color.format.rgb.stringify ( Color.parse ( adjust ( ...args ) ) ), output );
    });

  });

  it ( 'increases or decreases the value of any HSL channel of the color', t => {

    const tests = [
      [['hsl(0, 50%, 50%)', { h: 100 }], 'hsl(100, 50%, 50%)'],
      [['hsl(0, 50%, 50%)', { s: 25 }], 'hsl(0, 75%, 50%)'],
      [['hsl(0, 50%, 50%)', { l: 25 }], 'hsl(0, 50%, 75%)'],
      [['hsl(0, 50%, 50%)', { h: 100, s: 25 }], 'hsl(100, 75%, 50%)'],
      [['hsl(0, 50%, 50%)', { h: 100, s: 25, l: 25 }], 'hsl(100, 75%, 75%)'],
      [['hsl(100, 50%, 50%)', { h: -100 }], 'hsl(0, 50%, 50%)'],
      [['hsl(0, 50%, 50%)', { s: -25 }], 'hsl(0, 25%, 50%)'],
      [['hsl(0, 50%, 50%)', { l: -25 }], 'hsl(0, 50%, 25%)'],
      [['hsl(300, 50%, 50%)', { h: 100 }], 'hsl(40, 50%, 50%)'],
      [['hsl(0, 50%, 50%)', { h: -100 }], 'hsl(-100, 50%, 50%)'],
      [['hsl(0, 100%, 50%)', { s: 25 }], 'hsl(0, 100%, 50%)'],
      [['hsl(0, 0%, 50%)', { s: -25 }], 'hsl(0, 0%, 50%)'],
      [['hsla(0, 0%, 50%, .5)', { s: -25 }], 'hsla(0, 0%, 50%, 0.5)']
    ];

    tests.forEach ( ([ args, output ]) => {
      t.is ( Color.format.hsl.stringify ( Color.parse ( adjust ( ...args ) ) ), output );
    });

  });

  it ( 'increases or decreases the value of the alpha channel of the color', t => {

    const tests = [
      [['rgba(0, 0, 0, 0)', { a: 0.5 }], 'rgba(0, 0, 0, 0.5)'],
      [['hsla(0, 0%, 0%, 0)', { a: 0.5 }], 'hsla(0, 0%, 0%, 0.5)'],
      [['rgba(0, 0, 0, 0)', { a: 1 }], '#000000'],
      [['rgba(0, 0, 0, 1)', { a: -0.5 }], 'rgba(0, 0, 0, 0.5)'],
      [['rgba(0, 0, 0, 1)', { a: -1 }], 'rgba(0, 0, 0, 0)'],
      [['rgba(0, 0, 0, 0.5)', { a: 1 }], '#000000'],
      [['rgba(0, 0, 0, 0.5)', { a: -1 }], 'rgba(0, 0, 0, 0)']
    ];

    tests.forEach ( ([ args, output ]) => {
      t.is ( adjust ( ...args ), output );
    });

  });

  it ( 'throws when setting RGB and HSL channels at the same time', t => {

    const tests = [
      ['#000', { r: 10, h: 10 }],
      ['#000', { g: 10, l: 10 }],
      ['#000', { b: 10, s: 10 }]
    ];

    tests.forEach ( args => {
      t.throws ( () => adjust ( ...args ), /cannot.*at the same time/i );
    });

  });

});

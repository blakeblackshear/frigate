
/* IMPORT */

import {describe} from 'fava';
import {scale} from '../../dist/index.js';
import Color from '../../dist/color/index.js';

/* MAIN */

describe ( 'scale', it => {

  it ( 'scales any RGBA channels of the color', t => {

    const tests = [
      [['rgb(0, 0, 0)', { r: 100 }], 'rgb(255, 0, 0)'],
      [['rgb(0, 0, 0)', { r: 50 }], 'rgb(127.5, 0, 0)'],
      [['rgb(0, 0, 0)', { r: 0 }], 'rgb(0, 0, 0)'],
      [['rgb(255, 0, 0)', { r: -100 }], 'rgb(0, 0, 0)'],
      [['rgb(255, 0, 0)', { r: -50 }], 'rgb(127.5, 0, 0)'],
      [['rgb(255, 0, 0)', { r: -0 }], 'rgb(255, 0, 0)'],
      [['rgb(0, 0, 0)', { g: 100 }], 'rgb(0, 255, 0)'],
      [['rgb(0, 0, 0)', { g: 50 }], 'rgb(0, 127.5, 0)'],
      [['rgb(0, 0, 0)', { g: 0 }], 'rgb(0, 0, 0)'],
      [['rgb(0, 0, 0)', { b: 100 }], 'rgb(0, 0, 255)'],
      [['rgb(0, 0, 0)', { b: 50 }], 'rgb(0, 0, 127.5)'],
      [['rgb(0, 0, 0)', { b: 0 }], 'rgb(0, 0, 0)'],
      [['rgb(0, 0, 0)', { r: 50, g: 50, b: 50 }], 'rgb(127.5, 127.5, 127.5)'],
      [['rgba(0, 0, 0, .5)', { b: 0 }], 'rgba(0, 0, 0, 0.5)']
    ];

    tests.forEach ( ([ args, ouptut ]) => {
      t.is ( Color.format.rgb.stringify ( Color.parse ( scale ( ...args ) ) ), ouptut );
    });

  });

  it ( 'scales any HSLA channels of the color', t => {

    const tests = [
      [['hsl(0, 50%, 50%)', { h: 100 }], 'hsl(0, 50%, 50%)'], // Wraps becuase 360deg = 0deg
      [['hsl(0, 50%, 50%)', { h: 50 }], 'hsl(180, 50%, 50%)'],
      [['hsl(0, 50%, 50%)', { h: 0 }], 'hsl(0, 50%, 50%)'],
      [['hsl(180, 50%, 50%)', { h: -100 }], 'hsl(0, 50%, 50%)'],
      [['hsl(180, 50%, 50%)', { h: -50 }], 'hsl(90, 50%, 50%)'],
      [['hsl(0, 50%, 50%)', { s: 100 }], 'hsl(0, 100%, 50%)'],
      [['hsl(0, 50%, 50%)', { s: 50 }], 'hsl(0, 75%, 50%)'],
      [['hsl(0, 50%, 50%)', { s: 0 }], 'hsl(0, 50%, 50%)'],
      [['hsl(0, 50%, 50%)', { s: -100 }], 'hsl(0, 0%, 50%)'],
      [['hsl(0, 50%, 50%)', { s: -50 }], 'hsl(0, 25%, 50%)'],
      [['hsl(0, 50%, 50%)', { l: 100 }], 'hsl(0, 50%, 100%)'],
      [['hsl(0, 50%, 50%)', { l: 50 }], 'hsl(0, 50%, 75%)'],
      [['hsl(0, 50%, 50%)', { l: 0 }], 'hsl(0, 50%, 50%)'],
      [['hsla(0, 50%, 50%, .5)', { l: 0 }], 'hsla(0, 50%, 50%, 0.5)']
    ];

    tests.forEach ( ([ args, output ]) => {
      t.is ( Color.format.hsl.stringify ( Color.parse ( scale ( ...args ) ) ), output );
    });

  });

  it ( 'scales the alpha channel', t => {

    const tests = [
      [['rgba(0, 0, 0, 0)', { a: 0 }], 'rgba(0, 0, 0, 0)'],
      [['rgba(0, 0, 0, 0)', { a: 50 }], 'rgba(0, 0, 0, 0.5)'],
      [['rgba(0, 0, 0, 0)', { a: 100 }], '#000000'],
      [['hsla(0, 0%, 0%, 0)', { a: 50 }], 'hsla(0, 0%, 0%, 0.5)'],
      [['rgba(0, 0, 0, 1)', { a: -50 }], 'rgba(0, 0, 0, 0.5)'],
      [['rgba(0, 0, 0, 1)', { a: -100 }], 'rgba(0, 0, 0, 0)'],
      [['rgba(0, 0, 0, 0.5)', { a: 100 }], '#000000'],
      [['rgba(0, 0, 0, 0.5)', { a: -100 }], 'rgba(0, 0, 0, 0)']
    ];

    tests.forEach ( ([ args, output ]) => {
      t.is ( scale ( ...args ), output );
    });

  });

  it ( 'throws when setting RGB and HSL channels at the same time', t => {

    const tests = [
      ['#000', { r: 10, h: 10 }],
      ['#000', { g: 10, l: 10 }],
      ['#000', { b: 10, s: 10 }]
    ];

    tests.forEach ( args => {
      t.throws ( () => scale ( ...args ), /cannot.*at the same time/i );
    });

  });

});

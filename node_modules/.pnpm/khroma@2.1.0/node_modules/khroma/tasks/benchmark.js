
/* IMPORT */

import benchmark from 'benchloop';
import Color from '../dist/color/index.js';
import {hex, rgb, rgba, hsl, hsla, channel, red, green, blue, alpha, hue, saturation, lightness, darken, lighten, opacify, transparentize, saturate, desaturate, grayscale, invert, complement, scale, adjust, change, mix, contrast, luminance, isDark, isLight, isTransparent, toKeyword, toHex, toRgba, toHsla} from '../dist/index.js';

/* MAIN */

benchmark.config ({
  iterations: 10_000
});

benchmark.group ( 'parse', () => {

  benchmark ({
    name: 'keyword',
    fn: () => {
      Color.parse ( 'blue' );
    }
  });

  benchmark.group ( 'hex', () => {

    benchmark ({
      name: 'rgb',
      fn: () => {
        Color.parse ( '#fc0' );
      }
    });

    benchmark ({
      name: 'rgba',
      fn: () => {
        Color.parse ( '#fc08' );
      }
    });

    benchmark ({
      name: 'rrggbb',
      fn: () => {
        Color.parse ( '#ffcc00' );
      }
    });

    benchmark ({
      name: 'rrggbbaa',
      fn: () => {
        Color.parse ( '#ffcc0088' );
      }
    });

  });

  benchmark.group ( 'rgb', () => {

    benchmark ({
      name: 'rgb',
      fn: () => {
        Color.parse ( 'rgb(255, 204, 0)' );
      }
    });

    benchmark ({
      name: 'rgba',
      fn: () => {
        Color.parse ( 'rgb(255, 204, 0, .5)' );
      }
    });

    benchmark ({
      name: 'rgba:percentage',
      fn: () => {
        Color.parse ( 'rgb(100%, 80%, 0%, .5)' );
      }
    });

    benchmark ({
      name: 'rgba:scientific',
      fn: () => {
        Color.parse ( 'rgba(1e2, .5e1, .5e0, +.25e2%)' );
      }
    });

  });

  benchmark.group ( 'hsl', () => {

    benchmark ({
      name: 'hsl',
      fn: () => {
        Color.parse ( 'hsl(150, 50%, 50%)' );
      }
    });

    benchmark ({
      name: 'hsla',
      fn: () => {
        Color.parse ( 'hsla(150, 50%, 50%, .5)' );
      }
    });

    benchmark ({
      name: 'hsla:deg',
      fn: () => {
        Color.parse ( 'hsla(0deg, 50%, 50%, .5)' );
      }
    });

    benchmark ({
      name: 'hsla:scientific',
      fn: () => {
        Color.parse ( 'hsla(1e2, 2e1%, .5e2%, +.25e2%)' );
      }
    });

    benchmark ({
      name: 'hsla:grad',
      fn: () => {
        Color.parse ( 'hsla(0grad, 50%, 50%, .5)' );
      }
    });

    benchmark ({
      name: 'hsla:rad',
      fn: () => {
        Color.parse ( 'hsla(3.14rad, 50%, 50%, .5)' );
      }
    });


    benchmark ({
      name: 'hsla:turn',
      fn: () => {
        Color.parse ( 'hsla(1turn, 50%, 50%, .5)' );
      }
    });

  });

});

benchmark.group ( 'stringify', () => {

  const channels = Color.parse ( '#ff00ff' );

  benchmark ({
    name: 'keyword',
    fn: () => {
      toKeyword ( channels );
    }
  });

  benchmark ({
    name: 'hex',
    fn: () => {
      toHex ( channels );
    }
  });

  benchmark ({
    name: 'rgba',
    fn: () => {
      toRgba ( channels );
    }
  });

  benchmark ({
    name: 'hsla',
    fn: () => {
      toHsla ( channels );
    }
  });

});

benchmark.group ( 'create', () => {

  benchmark ({
    name: 'hex',
    fn: () => {
      hex ( 255, 204, 0 );
    }
  });

  benchmark ({
    name: 'rgb',
    fn: () => {
      rgb ( 255, 204, 0 );
    }
  });

  benchmark ({
    name: 'rgba',
    fn: () => {
      rgba ( 255, 204, 0, 136 );
    }
  });

  benchmark ({
    name: 'hsl',
    fn: () => {
      hsl ( 150, 50, 50 );
    }
  });

  benchmark ({
    name: 'hsla',
    fn: () => {
      hsla ( 150, 50, 50, .5 );
    }
  });

});

benchmark.group ( 'get.channel', () => {

  benchmark ({
    name: 'channel',
    fn: () => {
      channel ( '#ffcc00', 'r' );
    }
  });

  benchmark ({
    name: 'red',
    fn: () => {
      red ( '#ffcc00' );
    }
  });

  benchmark ({
    name: 'green',
    fn: () => {
      green ( '#ffcc00' );
    }
  });

  benchmark ({
    name: 'blue',
    fn: () => {
      blue ( '#ffcc00' );
    }
  });

  benchmark ({
    name: 'hue',
    fn: () => {
      hue ( '#ffcc00' );
    }
  });

  benchmark ({
    name: 'saturation',
    fn: () => {
      saturation ( '#ffcc00' );
    }
  });

  benchmark ({
    name: 'lightness',
    fn: () => {
      lightness ( '#ffcc00' );
    }
  });

  benchmark ({
    name: 'alpha',
    fn: () => {
      alpha ( '#ffcc00' );
    }
  });

});

benchmark.group ( 'get.more', () => {

  benchmark ({
    name: 'contrast',
    fn: () => {
      contrast ( '#000000', '#ffffff' );
    }
  });

  benchmark ({
    name: 'luminance',
    fn: () => {
      luminance ( '#ffcc00' );
    }
  });

  benchmark ({
    name: 'isDark',
    fn: () => {
      isDark ( '#ffcc00' );
    }
  });

  benchmark ({
    name: 'isLight',
    fn: () => {
      isLight ( '#ffcc00' );
    }
  });

  benchmark ({
    name: 'isTransparent',
    fn: () => {
      isTransparent ( '#ffcc00' );
    }
  });

});

benchmark.group ( 'edit.channel', () => {

  benchmark ({
    name: 'saturate',
    fn: () => {
      saturate ( '#ffcc00', 50 );
    }
  });

  benchmark ({
    name: 'desaturate',
    fn: () => {
      desaturate ( '#ffcc00', 50 );
    }
  });

  benchmark ({
    name: 'lighten',
    fn: () => {
      lighten ( '#ffcc00', 50 );
    }
  });

  benchmark ({
    name: 'darken',
    fn: () => {
      darken ( '#ffcc00', 50 );
    }
  });

  benchmark ({
    name: 'opacify',
    fn: () => {
      opacify ( '#ffcc00', .5 );
    }
  });

  benchmark ({
    name: 'transparentize',
    fn: () => {
      transparentize ( '#ffcc00', .5 );
    }
  });

  benchmark ({
    name: 'rgba',
    fn: () => {
      rgba ( '#ffcc00', .5 );
    }
  });

  benchmark ({
    name: 'complement',
    fn: () => {
      complement ( '#ffcc00' );
    }
  });

  benchmark ({
    name: 'grayscale',
    fn: () => {
      grayscale ( '#ffcc00' );
    }
  });

});

benchmark.group ( 'edit.more', () => {

  benchmark ({
    name: 'adjust',
    fn: () => {
      adjust ( '#ffcc00', { a: -.5 } );
    }
  });

  benchmark ({
    name: 'change',
    fn: () => {
      change ( '#ffcc00', { a: .5 } );
    }
  });

  benchmark ({
    name: 'invert',
    fn: () => {
      invert ( '#ffcc00', 50 );
    }
  });

  benchmark ({
    name: 'mix',
    fn: () => {
      mix ( '#ffcc00', '#000000', 50 );
    }
  });

  benchmark ({
    name: 'scale',
    fn: () => {
      scale ( '#ffcc00', { r: 50, g: 50, b: 50 } );
    }
  });

});

benchmark.summary ();

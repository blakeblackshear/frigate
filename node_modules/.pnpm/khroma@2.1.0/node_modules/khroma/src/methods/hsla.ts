
/* IMPORT */

import _ from '~/utils';
import ChannelsReusable from '~/channels/reusable';
import Color from '~/color';

/* MAIN */

const hsla = ( h: number, s: number, l: number, a: number = 1 ): string => {

  const channels = ChannelsReusable.set ({
    h: _.channel.clamp.h ( h ),
    s: _.channel.clamp.s ( s ),
    l: _.channel.clamp.l ( l ),
    a: _.channel.clamp.a ( a )
  });

  return Color.stringify ( channels );

};

/* EXPORT */

export default hsla;

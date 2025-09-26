
/* IMPORT */

import _ from '~/utils';
import ChannelsReusable from '~/channels/reusable';
import Color from '~/color';
import change from '~/methods/change';
import type {Channels} from '~/types';

/* TYPES */

type IRgba = {
  ( color: string | Channels, opacity: number ): string,
  ( r: number, g: number, b: number, a?: number ): string
};

/* MAIN */

const rgba: IRgba = ( r: string | Channels | number, g: number, b: number = 0, a: number = 1 ): string => { //TSC: `b` shouldn't have a default value

  if ( typeof r !== 'number' ) return change ( r, { a: g } );

  const channels = ChannelsReusable.set ({
    r: _.channel.clamp.r ( r ),
    g: _.channel.clamp.g ( g ),
    b: _.channel.clamp.b ( b ),
    a: _.channel.clamp.a ( a )
  });

  return Color.stringify ( channels );

};

/* EXPORT */

export default rgba;

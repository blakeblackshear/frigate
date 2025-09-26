
/* IMPORT */

import _ from '~/utils';
import Color from '~/color';
import type {CHANNEL, Channels} from '~/types';

/* MAIN */

const adjustChannel = ( color: string | Channels, channel: CHANNEL, amount: number ): string => {

  const channels = Color.parse ( color );
  const amountCurrent = channels[channel];
  const amountNext = _.channel.clamp[channel]( amountCurrent + amount );

  if ( amountCurrent !== amountNext ) channels[channel] = amountNext;

  return Color.stringify ( channels );

};

/* EXPORT */

export default adjustChannel;

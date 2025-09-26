
/* IMPORT */

import _ from '~/utils';
import Color from '~/color';
import type {CHANNEL, Channels} from '~/types';

/* MAIN */

const channel = ( color: string | Channels, channel: CHANNEL ): number => {

  return _.lang.round ( Color.parse ( color )[channel] );

};

/* EXPORT */

export default channel;

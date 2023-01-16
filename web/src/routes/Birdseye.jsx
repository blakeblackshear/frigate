import { h, Fragment } from 'preact';
import { usePersistence } from '../context';
import ActivityIndicator from '../components/ActivityIndicator';
import JSMpegPlayer from '../components/JSMpegPlayer';
import Heading from '../components/Heading';
import WebRtcPlayer from '../components/WebRtcPlayer';
import MsePlayer from '../components/MsePlayer';
import useSWR from 'swr';

export default function Birdseye() {
  const { data: config } = useSWR('config');

  const [viewSource, setViewSource, sourceIsLoaded] = usePersistence('birdseye-source', 'mse');
  const sourceValues = ['mse', 'webrtc', 'jsmpeg'];

  if (!config || !sourceIsLoaded) {
    return <ActivityIndicator />;
  }

  let player;
  if (viewSource == 'mse' && config.birdseye.restream) {
    if ('MediaSource' in window) {
      player = (
        <Fragment>
          <div className="max-w-5xl">
            <MsePlayer camera="birdseye" />
          </div>
        </Fragment>
      );
    } else {
      player = (
        <Fragment>
          <div className="w-5xl text-center text-sm">
            MSE is not supported on iOS devices. You'll need to use jsmpeg or webRTC. See the docs for more info.
          </div>
        </Fragment>
      );
    }
  } else if (viewSource == 'webrtc' && config.birdseye.restream) {
    player = (
      <Fragment>
        <div className="max-w-5xl">
          <WebRtcPlayer camera="birdseye" />
        </div>
      </Fragment>
    );
  } else {
    player = (
      <Fragment>
        <div className="max-w-7xl">
          <JSMpegPlayer camera="birdseye" />
        </div>
      </Fragment>
    );
  }

  return (
    <div className="space-y-4 p-2 px-4">
      <div className="flex justify-between">
        <Heading className="p-2" size="2xl">
          Birdseye
        </Heading>

        {config.birdseye.restream && (
          <select
            className="basis-1/8 cursor-pointer rounded dark:bg-slate-800"
            value={viewSource}
            onChange={(e) => setViewSource(e.target.value)}
          >
            {sourceValues.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        )}
      </div>

      {player}
    </div>
  );
}

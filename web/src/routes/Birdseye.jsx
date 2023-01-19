import { h, Fragment } from 'preact';
import { usePersistence } from '../context';
import ActivityIndicator from '../components/ActivityIndicator';
import JSMpegPlayer from '../components/JSMpegPlayer';
import Heading from '../components/Heading';
import WebRtcPlayer from '../components/WebRtcPlayer';
import MsePlayer from '../components/MsePlayer';
import useSWR from 'swr';
import { useMemo } from 'preact/hooks';
import CameraControlPanel from '../components/CameraControlPanel';

export default function Birdseye() {
  const { data: config } = useSWR('config');

  const [viewSource, setViewSource, sourceIsLoaded] = usePersistence(
    'birdseye-source', 
    getDefaultLiveMode(config)
  );
  const sourceValues = ['mse', 'webrtc', 'jsmpeg'];

  const ptzCameras = useMemo(() => {
    if (!config) {
      return [];
    }

    return Object.entries(config.cameras)
      .filter(([_, conf]) => conf.onvif?.host)
      .map(([_, camera]) => camera.name);
  }, [config]);

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

      <div className="xl:flex justify-between">
        {player}

        {ptzCameras && (
          <div className="dark:bg-gray-800 shadow-md hover:shadow-lg rounded-lg transition-shadow p-4 w-full sm:w-min xl:h-min">
            <Heading size="sm">Control Panel</Heading>
            {ptzCameras.map((camera) => (
              <div className="p-4" key={camera}>
                <Heading size="lg">{camera.replaceAll('_', ' ')}</Heading>
                <CameraControlPanel camera={camera} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


function getDefaultLiveMode(config) {
  if (config) {
    if (config.birdseye.restream) {
      return config.ui.live_mode;
    }

    return 'jsmpeg';
  }

  return undefined;
}

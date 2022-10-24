import { h, Fragment } from 'preact';
import AutoUpdatingCameraImage from '../components/AutoUpdatingCameraImage';
import ActivityIndicator from '../components/ActivityIndicator';
import JSMpegPlayer from '../components/JSMpegPlayer';
import Button from '../components/Button';
import Card from '../components/Card';
import Heading from '../components/Heading';
import Link from '../components/Link';
import SettingsIcon from '../icons/Settings';
import Switch from '../components/Switch';
import ButtonsTabbed from '../components/ButtonsTabbed';
import { usePersistence } from '../context';
import { useCallback, useMemo, useState } from 'preact/hooks';
import { useApiHost } from '../api';
import useSWR from 'swr';
import VideoPlayer from '../components/VideoPlayer';
import WebRtcPlayer from '../components/WebRtcPlayer';

const emptyObject = Object.freeze({});

export default function Camera({ camera }) {
  const { data: config } = useSWR('config');
  const apiHost = useApiHost();
  const [showSettings, setShowSettings] = useState(false);
  const [viewMode, setViewMode] = useState('live');

  const cameraConfig = config?.cameras[camera];
  const jsmpegWidth = cameraConfig
    ? Math.round(cameraConfig.restream.jsmpeg.height * (cameraConfig.detect.width / cameraConfig.detect.height))
    : 0;
  const [viewSource, setViewSource] = usePersistence(`${camera}-source`, undefined);
  const sourceValues = (cameraConfig && cameraConfig.restream.enabled) ? ['jsmpeg', 'mp4', 'webrtc'] : ['jsmpeg'];
  const [options, setOptions] = usePersistence(`${camera}-feed`, emptyObject);

  const handleSetOption = useCallback(
    (id, value) => {
      const newOptions = { ...options, [id]: value };
      setOptions(newOptions);
    },
    [options, setOptions]
  );

  const searchParams = useMemo(
    () =>
      new URLSearchParams(
        Object.keys(options).reduce((memo, key) => {
          memo.push([key, options[key] === true ? '1' : '0']);
          return memo;
        }, [])
      ),
    [options]
  );

  const handleToggleSettings = useCallback(() => {
    setShowSettings(!showSettings);
  }, [showSettings, setShowSettings]);

  if (!cameraConfig) {
    return <ActivityIndicator />;
  }

  const optionContent = showSettings ? (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <Switch
        checked={options['bbox']}
        id="bbox"
        onChange={handleSetOption}
        label="Bounding box"
        labelPosition="after"
      />
      <Switch
        checked={options['timestamp']}
        id="timestamp"
        onChange={handleSetOption}
        label="Timestamp"
        labelPosition="after"
      />
      <Switch checked={options['zones']} id="zones" onChange={handleSetOption} label="Zones" labelPosition="after" />
      <Switch checked={options['mask']} id="mask" onChange={handleSetOption} label="Masks" labelPosition="after" />
      <Switch
        checked={options['motion']}
        id="motion"
        onChange={handleSetOption}
        label="Motion boxes"
        labelPosition="after"
      />
      <Switch
        checked={options['regions']}
        id="regions"
        onChange={handleSetOption}
        label="Regions"
        labelPosition="after"
      />
      <Link href={`/cameras/${camera}/editor`}>Mask & Zone creator</Link>
    </div>
  ) : null;

  let player;
  if (viewMode === 'live') {
    if (viewSource == 'mp4') {
      player = (
        <Fragment>
          <div className="max-w-5xl">
            <VideoPlayer
              live={true}
              options={{
                autoplay: true,
                preload: 'metadata',
                poster: `${apiHost}/api/${camera}/latest.jpg`,
                playbackRates: [1],
                sources: [
                  {
                    src: `${apiHost}/live/mp4/${camera}`,
                    type: 'video/mp4',
                  },
                ],
              }}
              seekOptions={{ forward: false, back: false }}
              onReady={() => {}}
            />
          </div>
        </Fragment>
      );
    } else if (viewSource == 'webrtc') {
      player = (
        <Fragment>
          <div className="max-w-5xl">
            <WebRtcPlayer camera={camera} />
          </div>
        </Fragment>
      );
    } else {
      player = (
        <Fragment>
          <div>
            <JSMpegPlayer camera={camera} width={jsmpegWidth} height={cameraConfig.restream.jsmpeg.height} />
          </div>
        </Fragment>
      );
    }
  } else if (viewMode === 'debug') {
    player = (
      <Fragment>
        <div>
          <AutoUpdatingCameraImage camera={camera} searchParams={searchParams} />
        </div>

        <Button onClick={handleToggleSettings} type="text">
          <span className="w-5 h-5">
            <SettingsIcon />
          </span>{' '}
          <span>{showSettings ? 'Hide' : 'Show'} Options</span>
        </Button>
        {showSettings ? <Card header="Options" elevated={false} content={optionContent} /> : null}
      </Fragment>
    );
  }

  return (
    <div className="space-y-4 p-2 px-4">
      <div className='flex justify-between'>
        <Heading className='p-2' size="2xl">{camera.replaceAll('_', ' ')}</Heading>
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
      </div>

      <ButtonsTabbed viewModes={['live', 'debug']} setViewMode={setViewMode} />

      {player}

      <div className="space-y-4">
        <Heading size="sm">Tracked objects</Heading>
        <div className="flex flex-wrap justify-start">
          {cameraConfig.objects.track.map((objectType) => (
            <Card
              className="mb-4 mr-4"
              key={objectType}
              header={objectType}
              href={`/events?camera=${camera}&label=${encodeURIComponent(objectType)}`}
              media={<img src={`${apiHost}/api/${camera}/${encodeURIComponent(objectType)}/thumbnail.jpg`} />}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

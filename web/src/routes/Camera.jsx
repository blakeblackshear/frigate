import { h, Fragment } from 'preact';
import AutoUpdatingCameraImage from '../components/AutoUpdatingCameraImage';
import JSMpegPlayer from '../components/JSMpegPlayer';
import Button from '../components/Button';
import Card from '../components/Card';
import Heading from '../components/Heading';
import Link from '../components/Link';
import SettingsIcon from '../icons/Settings';
import Switch from '../components/Switch';
import { usePersistence } from '../context';
import { useCallback, useMemo, useState } from 'preact/hooks';
import { useApiHost, useConfig } from '../api';

const emptyObject = Object.freeze({});

export default function Camera({ camera }) {
  const { data: config } = useConfig();
  const apiHost = useApiHost();
  const [showSettings, setShowSettings] = useState(false);
  const [viewMode, setViewMode] = useState('live');

  const cameraConfig = config?.cameras[camera];
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
    player = <>
      <div>
        <JSMpegPlayer camera={camera} />
      </div>
    </>;
  }
  else if (viewMode === 'debug') {
    player = <>
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
    </>;
  }

  return (
    <div className="space-y-4">
      <Heading size="2xl">{camera}</Heading>
      <div>
        <nav className="flex justify-end">
          <button onClick={() => setViewMode('live')} className={viewMode === 'live' ? 'text-gray-600 py-0 px-4 block hover:text-gray-500 focus:outline-none border-b-2 font-medium border-gray-500' : 'text-gray-600 py-0 px-4 block hover:text-gray-500'}>
            Live
          </button>
          <button onClick={() => setViewMode('debug')} className={viewMode === 'debug' ? 'text-gray-600 py-0 px-4 block hover:text-gray-500 focus:outline-none border-b-2 font-medium border-gray-500' : 'text-gray-600 py-0 px-4 block hover:text-gray-500'}>
            Debug
          </button>
        </nav>
      </div>

      {player}

      <div className="space-y-4">
        <Heading size="sm">Tracked objects</Heading>
        <div className="flex flex-wrap justify-start">
          {cameraConfig.objects.track.map((objectType) => (
            <Card
              className="mb-4 mr-4"
              key={objectType}
              header={objectType}
              href={`/events?camera=${camera}&label=${objectType}`}
              media={<img src={`${apiHost}/api/${camera}/${objectType}/best.jpg?crop=1&h=150`} />}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

import { h } from 'preact';
import AutoUpdatingCameraImage from '../components/AutoUpdatingCameraImage';
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
      <div className="flex space-x-3">
        <Switch checked={options['bbox']} id="bbox" onChange={handleSetOption} />
        <span className="inline-flex">Bounding box</span>
      </div>
      <div className="flex space-x-3">
        <Switch checked={options['timestamp']} id="timestamp" onChange={handleSetOption} />
        <span className="inline-flex">Timestamp</span>
      </div>
      <div className="flex space-x-3">
        <Switch checked={options['zones']} id="zones" onChange={handleSetOption} />
        <span className="inline-flex">Zones</span>
      </div>
      <div className="flex space-x-3">
        <Switch checked={options['mask']} id="mask" onChange={handleSetOption} />
        <span className="inline-flex">Masks</span>
      </div>
      <div className="flex space-x-3">
        <Switch checked={options['motion']} id="motion" onChange={handleSetOption} />
        <span className="inline-flex">Motion boxes</span>
      </div>
      <div className="flex space-x-3">
        <Switch checked={options['regions']} id="regions" onChange={handleSetOption} />
        <span className="inline-flex">Regions</span>
      </div>
      <Link href={`/cameras/${camera}/editor`}>Mask & Zone creator</Link>
    </div>
  ) : null;

  return (
    <div className="space-y-4">
      <Heading size="2xl">{camera}</Heading>
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

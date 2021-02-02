import { h } from 'preact';
import AutoUpdatingCameraImage from './components/AutoUpdatingCameraImage';
import Card from './components/Card';
import Heading from './components/Heading';
import Link from './components/Link';
import Switch from './components/Switch';
import { route } from 'preact-router';
import { useCallback, useContext } from 'preact/hooks';
import { useApiHost, useConfig } from './api';

export default function Camera({ camera, url }) {
  const { data: config } = useConfig();
  const apiHost = useApiHost();

  if (!config) {
    return <div>{`No camera named ${camera}`}</div>;
  }

  const cameraConfig = config.cameras[camera];
  const objectCount = cameraConfig.objects.track.length;

  const { pathname, searchParams } = new URL(`${window.location.protocol}//${window.location.host}${url}`);
  const searchParamsString = searchParams.toString();

  const handleSetOption = useCallback(
    (id, value) => {
      searchParams.set(id, value ? 1 : 0);
      route(`${pathname}?${searchParams.toString()}`, true);
    },
    [searchParams]
  );

  function getBoolean(id) {
    return Boolean(parseInt(searchParams.get(id), 10));
  }

  return (
    <div className="space-y-4">
      <Heading size="2xl">{camera}</Heading>
      <div>
        <AutoUpdatingCameraImage camera={camera} searchParams={searchParamsString} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
        <div className="flex space-x-3">
          <Switch checked={getBoolean('bbox')} id="bbox" onChange={handleSetOption} />
          <span class="inline-flex">Bounding box</span>
        </div>
        <div className="flex space-x-3">
          <Switch checked={getBoolean('timestamp')} id="timestamp" onChange={handleSetOption} />
          <span class="inline-flex">Timestamp</span>
        </div>
        <div className="flex space-x-3">
          <Switch checked={getBoolean('zones')} id="zones" onChange={handleSetOption} />
          <span class="inline-flex">Zones</span>
        </div>
        <div className="flex space-x-3">
          <Switch checked={getBoolean('mask')} id="mask" onChange={handleSetOption} />
          <span class="inline-flex">Masks</span>
        </div>
        <div className="flex space-x-3">
          <Switch checked={getBoolean('motion')} id="motion" onChange={handleSetOption} />
          <span class="inline-flex">Motion boxes</span>
        </div>
        <div className="flex space-x-3">
          <Switch checked={getBoolean('regions')} id="regions" onChange={handleSetOption} />
          <span class="inline-flex">Regions</span>
        </div>
        <Link href={`/cameras/${camera}/editor`}>Mask & Zone creator</Link>
      </div>

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

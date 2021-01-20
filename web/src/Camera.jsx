import { h } from 'preact';
import AutoUpdatingCameraImage from './components/AutoUpdatingCameraImage';
import Box from './components/Box';
import Heading from './components/Heading';
import Link from './components/Link';
import Switch from './components/Switch';
import { route } from 'preact-router';
import { useCallback, useContext } from 'preact/hooks';
import { ApiHost, Config } from './context';

export default function Camera({ camera, url }) {
  const config = useContext(Config);
  const apiHost = useContext(ApiHost);

  if (!(camera in config.cameras)) {
    return <div>{`No camera named ${camera}`}</div>;
  }

  const cameraConfig = config.cameras[camera];

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
      <Box>
        <AutoUpdatingCameraImage camera={camera} searchParams={searchParamsString} />
      </Box>

      <Box className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
        <Switch checked={getBoolean('bbox')} id="bbox" label="Bounding box" onChange={handleSetOption} />
        <Switch checked={getBoolean('timestamp')} id="timestamp" label="Timestamp" onChange={handleSetOption} />
        <Switch checked={getBoolean('zones')} id="zones" label="Zones" onChange={handleSetOption} />
        <Switch checked={getBoolean('mask')} id="mask" label="Masks" onChange={handleSetOption} />
        <Switch checked={getBoolean('motion')} id="motion" label="Motion boxes" onChange={handleSetOption} />
        <Switch checked={getBoolean('regions')} id="regions" label="Regions" onChange={handleSetOption} />
        <Link href={`/cameras/${camera}/editor`}>Mask & Zone creator</Link>
      </Box>

      <div className="space-y-4">
        <Heading size="sm">Tracked objects</Heading>
        <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
          {cameraConfig.objects.track.map((objectType) => {
            return (
              <Box key={objectType} hover href={`/events?camera=${camera}&label=${objectType}`}>
                <Heading size="sm">{objectType}</Heading>
                <img src={`${apiHost}/api/${camera}/${objectType}/best.jpg?crop=1&h=150`} />
              </Box>
            );
          })}
        </div>
      </div>
    </div>
  );
}

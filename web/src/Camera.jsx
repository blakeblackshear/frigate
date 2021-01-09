import { h } from 'preact';
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
    <div>
      <Heading size="2xl">{camera}</Heading>
      <img
        width={cameraConfig.width}
        height={cameraConfig.height}
        key={searchParamsString}
        src={`${apiHost}/api/${camera}?${searchParamsString}`}
      />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
        <Switch checked={getBoolean('bbox')} id="bbox" label="Bounding box" onChange={handleSetOption} />
        <Switch checked={getBoolean('timestamp')} id="timestamp" label="Timestamp" onChange={handleSetOption} />
        <Switch checked={getBoolean('zones')} id="zones" label="Zones" onChange={handleSetOption} />
        <Switch checked={getBoolean('mask')} id="mask" label="Masks" onChange={handleSetOption} />
        <Switch checked={getBoolean('motion')} id="motion" label="Motion boxes" onChange={handleSetOption} />
        <Switch checked={getBoolean('regions')} id="regions" label="Regions" onChange={handleSetOption} />
      </div>
      <div>
        <Heading size="sm">Tracked objects</Heading>
        <ul className="flex flex-row flex-wrap space-x-4">
          {cameraConfig.objects.track.map((objectType) => {
            return (
              <li key={objectType}>
                <Link href={`/events?camera=${camera}&label=${objectType}`}>
                  <span className="capitalize">{objectType}</span>
                  <img src={`${apiHost}/api/${camera}/${objectType}/best.jpg?crop=1&h=150`} />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <Heading size="sm">Options</Heading>
        <ul>
          <li>
            <Link href={`/cameras/${camera}/map-editor`}>Mask & Zone editor</Link>
          </li>
        </ul>
      </div>
    </div>
  );
}

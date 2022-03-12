import { h, Fragment } from 'preact';
import LinkedLogo from './components/LinkedLogo';
import { Match } from 'preact-router/match';
import { memo } from 'preact/compat';
import { ENV } from './env';
import { useMemo } from 'preact/hooks'
import useSWR from 'swr';
import NavigationDrawer, { Destination, Separator } from './components/NavigationDrawer';

export default function Sidebar() {
  const { data: config } = useSWR('config');
  if (!config) {
    return null;
  }
  const { cameras, birdseye } = config;

  return (
    <NavigationDrawer header={<Header />}>
      <Destination href="/" text="Cameras" />
      <Match path="/cameras/:camera/:other?">
        {({ matches }) =>
          matches ? (
            <SortedCameras unsortedCameras={cameras} />
          ) : null
        }
      </Match>
      <Match path="/recording/:camera/:date?/:hour?/:seconds?">
        {({ matches }) =>
          matches ? (
            <SortedRecordingCameras unsortedCameras={cameras} />
          ) : null
        }
      </Match>
      {birdseye?.enabled ? <Destination href="/birdseye" text="Birdseye" /> : null}
      <Destination href="/events" text="Events" />
      <Destination href="/debug" text="Debug" />
      <Separator />
      <div className="flex flex-grow" />
      {ENV !== 'production' ? (
        <Fragment>
          <Destination href="/styleguide" text="Style Guide" />
          <Separator />
        </Fragment>
      ) : null}
      <Destination className="self-end" href="https://docs.frigate.video" text="Documentation" />
      <Destination className="self-end" href="https://github.com/blakeblackshear/frigate" text="GitHub" />
    </NavigationDrawer>
  );
}

function SortedCameras({ unsortedCameras }) {

  const sortedCameras = useMemo(() => {
    Object.entries(unsortedCameras)
      .filter(([_, conf]) => conf.ui.show)
      .sort(([_, aConf], [__, bConf]) => aConf.ui.order === bConf.ui.order ? 0 : (aConf.ui.order > bConf.ui.order ? 1 : -1))
  }, [unsortedCameras]);

  return (
    <Fragment>
      <Separator />
      {sortedCameras.map(([camera]) => (
        <Destination key={camera} href={`/cameras/${camera}`} text={camera} /> 
      ))}
      <Separator />
    </Fragment>
  );
}

function SortedRecordingCameras({ unsortedCameras }) {

  const sortedCameras = useMemo(() => {
    Object.entries(unsortedCameras)
      .filter(([_, conf]) => conf.ui.show)
      .sort(([_, aConf], [__, bConf]) => aConf.ui.order === bConf.ui.order ? 0 : (aConf.ui.order > bConf.ui.order ? 1 : -1))
  }, [unsortedCameras]);

  return (
    <Fragment>
      <Separator />
      {sortedCameras.map(([camera, conf]) => {
        if (conf.record.enabled) {
          return (
            <Destination
              key={camera}
              path={`/recording/${camera}/:date?/:hour?/:seconds?`}
              href={`/recording/${camera}`}
              text={camera}
            />
          );
        }
        return null;
      })}
      <Separator />
    </Fragment>
  );
}

const Header = memo(() => {
  return (
    <div className="text-gray-500">
      <LinkedLogo />
    </div>
  );
});

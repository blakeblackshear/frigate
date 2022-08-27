import { h, Fragment } from 'preact';
import LinkedLogo from './components/LinkedLogo';
import { Match } from 'preact-router/match';
import { memo } from 'preact/compat';
import { ENV } from './env';
import { useMemo } from 'preact/hooks'
import useSWR from 'swr';
import NavigationDrawer, { Destination, Separator } from './components/NavigationDrawer';
import { useTranslation } from 'react-i18next';

export default function Sidebar() {
  const { t } = useTranslation();
  const { data: config } = useSWR('config');

  const sortedCameras = useMemo(() => {
    if (!config) {
      return [];
    }

    return Object.entries(config.cameras)
      .filter(([_, conf]) => conf.ui.dashboard)
      .sort(([_, aConf], [__, bConf]) => aConf.ui.order - bConf.ui.order);
  }, [config]);

  if (!config) {
    return null;
  }
  const { birdseye } = config;

  return (
    <NavigationDrawer header={<Header />}>
      <Destination href="/" text={t('cameras')} />
      <Match path="/cameras/:camera/:other?">
        {({ matches }) =>
          matches ? (
            <CameraSection sortedCameras={sortedCameras} />
          ) : null
        }
      </Match>
      <Match path="/recording/:camera/:date?/:hour?/:seconds?">
        {({ matches }) =>
          matches ? (
            <RecordingSection sortedCameras={sortedCameras} />
          ) : null
        }
      </Match>
      {birdseye?.enabled ? <Destination href="/birdseye" text={t('birdseye')} /> : null}
      <Destination href="/events" text={t('events')} />
      <Destination href="/debug" text={t('debug')} />
      <Separator />
      <div className="flex flex-grow" />
      {ENV !== 'production' ? (
        <Fragment>
          <Destination href="/styleguide" text={t('style_guide')} />
          <Separator />
        </Fragment>
      ) : null}
      <Destination className="self-end" href="https://docs.frigate.video" text={t('documentation')} />
      <Destination className="self-end" href="https://github.com/blakeblackshear/frigate" text={t('github')} />
    </NavigationDrawer>
  );
}

function CameraSection({ sortedCameras }) {

  return (
    <Fragment>
      <Separator />
      {sortedCameras.map(([camera]) => (
        <Destination key={camera} href={`/cameras/${camera}`} text={camera.replaceAll('_', ' ')} />
      ))}
      <Separator />
    </Fragment>
  );
}

function RecordingSection({ sortedCameras }) {

  return (
    <Fragment>
      <Separator />
      {sortedCameras.map(([camera, _]) => {
        return (
          <Destination
            key={camera}
            path={`/recording/${camera}/:date?/:hour?/:seconds?`}
            href={`/recording/${camera}`}
            text={camera.replaceAll('_', ' ')}
          />
        );
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
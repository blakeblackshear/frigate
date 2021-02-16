import { h, Fragment } from 'preact';
import LinkedLogo from './components/LinkedLogo';
import { Match } from 'preact-router/match';
import { memo } from 'preact/compat';
import { ENV } from './env';
import { useConfig } from './api';
import { useMemo } from 'preact/hooks';
import NavigationDrawer, { Destination, Separator } from './components/NavigationDrawer';

export default function Sidebar() {
  const { data: config } = useConfig();
  const cameras = useMemo(() => Object.keys(config.cameras), [config]);

  return (
    <NavigationDrawer header={<Header />}>
      <Destination href="/" text="Cameras" />
      <Match path="/cameras/:camera/:other?">
        {({ matches }) =>
          matches ? (
            <Fragment>
              <Separator />
              {cameras.map((camera) => (
                <Destination href={`/cameras/${camera}`} text={camera} />
              ))}
              <Separator />
            </Fragment>
          ) : null
        }
      </Match>
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
      <Destination className="self-end" href="https://blakeblackshear.github.io/frigate" text="Documentation" />
      <Destination className="self-end" href="https://github.com/blakeblackshear/frigate" text="GitHub" />
    </NavigationDrawer>
  );
}

const Header = memo(() => {
  return (
    <div className="text-gray-500">
      <LinkedLogo />
    </div>
  );
});

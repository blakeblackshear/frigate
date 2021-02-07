import { h } from 'preact';
import ActivityIndicator from '../components/ActivityIndicator';
import Card from '../components/Card';
import CameraImage from '../components/CameraImage';
import Heading from '../components/Heading';
import { route } from 'preact-router';
import { useConfig } from '../api';
import { useMemo } from 'preact/hooks';

export default function Cameras() {
  const { data: config, status } = useConfig();

  if (!config) {
    return <p>loading…</p>;
  }

  return (
    <div className="grid grid-cols-1 3xl:grid-cols-3 md:grid-cols-2 gap-4">
      {Object.keys(config.cameras).map((camera) => (
        <Camera name={camera} />
      ))}
    </div>
  );
}

function Camera({ name }) {
  const href = `/cameras/${name}`;
  const buttons = useMemo(() => [{ name: 'Events', href: `/events?camera=${name}` }], [name]);

  return <Card buttons={buttons} href={href} header={name} media={<CameraImage camera={name} />} />;
}

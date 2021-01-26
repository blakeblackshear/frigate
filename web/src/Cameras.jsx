import { h } from 'preact';
import Box from './components/Box';
import CameraImage from './components/CameraImage';
import Events from './Events';
import Heading from './components/Heading';
import { route } from 'preact-router';
import { useConfig } from './api';

export default function Cameras() {
  const { data: config, status } = useConfig();

  if (!config) {
    return <p>loading…</p>;
  }

  return (
    <div className="grid lg:grid-cols-2 md:grid-cols-1 gap-4">
      {Object.keys(config.cameras).map((camera) => (
        <Camera name={camera} />
      ))}
    </div>
  );
}

function Camera({ name }) {
  const href = `/cameras/${name}`;

  return (
    <Box
      className="bg-white dark:bg-gray-700 shadow-lg rounded-lg p-4 hover:bg-gray-300 hover:dark:bg-gray-500 dark:hover:text-gray-900 dark:hover:text-gray-900"
      href={href}
    >
      <Heading size="base">{name}</Heading>
      <CameraImage camera={name} />
    </Box>
  );
}

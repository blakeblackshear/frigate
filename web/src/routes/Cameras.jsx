import { h } from 'preact';
import ActivityIndicator from '../components/ActivityIndicator';
import Card from '../components/Card';
import CameraImage from '../components/CameraImage';
import ClipIcon from '../icons/Clip';
import MotionIcon from '../icons/Motion';
import SnapshotIcon from '../icons/Snapshot';
import { useDetectState, useClipsState, useSnapshotsState } from '../api/mqtt';
import { useConfig, FetchStatus } from '../api';
import { useMemo } from 'preact/hooks';

export default function Cameras() {
  const { data: config, status } = useConfig();

  return status !== FetchStatus.LOADED ? (
    <ActivityIndicator />
  ) : (
    <div className="grid grid-cols-1 3xl:grid-cols-3 md:grid-cols-2 gap-4">
      {Object.keys(config.cameras).map((camera) => (
        <Camera name={camera} />
      ))}
    </div>
  );
}

function Camera({ name }) {
  const { payload: detectValue, send: sendDetect } = useDetectState(name);
  const { payload: clipValue, send: sendClips } = useClipsState(name);
  const { payload: snapshotValue, send: sendSnapshots } = useSnapshotsState(name);
  const href = `/cameras/${name}`;
  const buttons = useMemo(() => [
    { name: 'Events', href: `/events?camera=${name}` },
    { name: 'Recordings', href: `/recordings/${name}` }
  ], [name]);
  const icons = useMemo(
    () => [
      {
        name: `Toggle detect ${detectValue === 'ON' ? 'off' : 'on'}`,
        icon: MotionIcon,
        color: detectValue === 'ON' ? 'blue' : 'gray',
        onClick: () => {
          sendDetect(detectValue === 'ON' ? 'OFF' : 'ON');
        },
      },
      {
        name: `Toggle clips ${clipValue === 'ON' ? 'off' : 'on'}`,
        icon: ClipIcon,
        color: clipValue === 'ON' ? 'blue' : 'gray',
        onClick: () => {
          sendClips(clipValue === 'ON' ? 'OFF' : 'ON');
        },
      },
      {
        name: `Toggle snapshots ${snapshotValue === 'ON' ? 'off' : 'on'}`,
        icon: SnapshotIcon,
        color: snapshotValue === 'ON' ? 'blue' : 'gray',
        onClick: () => {
          sendSnapshots(snapshotValue === 'ON' ? 'OFF' : 'ON');
        },
      },
    ],
    [detectValue, sendDetect, clipValue, sendClips, snapshotValue, sendSnapshots]
  );

  return (
    <Card buttons={buttons} href={href} header={name} icons={icons} media={<CameraImage camera={name} stretch />} />
  );
}

import { h } from 'preact';
import ActivityIndicator from '../components/ActivityIndicator';
import Card from '../components/Card';
import CameraImage from '../components/CameraImage';
import ClipIcon from '../icons/Clip';
import MotionIcon from '../icons/Motion';
import SnapshotIcon from '../icons/Snapshot';
import { useDetectState, useRecordingsState, useSnapshotsState } from '../api/mqtt';
import { useConfig, FetchStatus } from '../api';
import { useMemo } from 'preact/hooks';

export default function Cameras() {
  const { data: config, status } = useConfig();

  return status !== FetchStatus.LOADED ? (
    <ActivityIndicator />
  ) : (
    <div className="grid grid-cols-1 3xl:grid-cols-3 md:grid-cols-2 gap-4">
      {Object.entries(config.cameras).map(([camera, conf]) => (
        <Camera name={camera} conf={conf} />
      ))}
    </div>
  );
}

function Camera({ name, conf }) {
  const { payload: detectValue, send: sendDetect } = useDetectState(name);
  const { payload: recordValue, send: sendRecordings } = useRecordingsState(name);
  const { payload: snapshotValue, send: sendSnapshots } = useSnapshotsState(name);
  const href = `/cameras/${name}`;
  const buttons = useMemo(() => {
    return [{ name: 'Events', href: `/events?camera=${name}` }, { name: 'Recordings', href: `/recording/${name}` }];
  }, [name]);
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
        name: `Toggle recordings ${recordValue === 'ON' ? 'off' : 'on'}`,
        icon: ClipIcon,
        color: recordValue === 'ON' ? 'blue' : 'gray',
        onClick: () => {
          sendRecordings(recordValue === 'ON' ? 'OFF' : 'ON');
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
    [detectValue, sendDetect, recordValue, sendRecordings, snapshotValue, sendSnapshots]
  );

  return (
    <Card buttons={buttons} href={href} header={name} icons={icons} media={<CameraImage camera={name} stretch />} />
  );
}

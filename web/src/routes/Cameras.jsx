import { h, Fragment } from 'preact';
import ActivityIndicator from '../components/ActivityIndicator';
import Card from '../components/Card';
import CameraImage from '../components/CameraImage';
import ClipIcon from '../icons/Clip';
import MotionIcon from '../icons/Motion';
import SnapshotIcon from '../icons/Snapshot';
import { useDetectState, useRecordingsState, useSnapshotsState } from '../api/mqtt';
import { useMemo } from 'preact/hooks';
import useSWR from 'swr';
import { useTranslation } from 'react-i18next';

export default function Cameras() {
  const { data: config } = useSWR('config');

  return !config ? (
    <ActivityIndicator />
  ) : (
    <div className="grid grid-cols-1 3xl:grid-cols-3 md:grid-cols-2 gap-4 p-2 px-4">
      <SortedCameras unsortedCameras={config.cameras} />
    </div>
  );
}

function SortedCameras({ unsortedCameras }) {
  const sortedCameras = useMemo(
    () =>
      Object.entries(unsortedCameras)
        .filter(([_, conf]) => conf.ui.dashboard)
        .sort(([_, aConf], [__, bConf]) => aConf.ui.order - bConf.ui.order),
    [unsortedCameras]
  );

  return (
    <Fragment>
      {sortedCameras.map(([camera, conf]) => (
        <Camera key={camera} name={camera} conf={conf} />
      ))}
    </Fragment>
  );
}

function Camera({ name }) {
  const { t } = useTranslation();
  const { payload: detectValue, send: sendDetect } = useDetectState(name);
  const { payload: recordValue, send: sendRecordings } = useRecordingsState(name);
  const { payload: snapshotValue, send: sendSnapshots } = useSnapshotsState(name);
  const href = `/cameras/${name}`;
  const buttons = useMemo(() => {
    return [
      { name: `${t('events')}`, href: `/events?camera=${name}` },
      { name: `${t('recordings')}`, href: `/recording/${name}` },
    ];
  }, [name, t]);
  const cleanName = useMemo(
    () => { return `${name.replaceAll('_', ' ')}` },
    [name]
  );
  const icons = useMemo(
    () => [
      {
        name: `${t('toggle_detect')} ${detectValue === 'ON' ? 'Off' : 'On'}`,
        icon: MotionIcon,
        color: detectValue === 'ON' ? 'blue' : 'gray',
        onClick: () => {
          sendDetect(detectValue === 'ON' ? 'OFF' : 'ON', true);
        },
      },
      {
        name: `${t('toggle_recordings')} ${recordValue === 'ON' ? 'Off' : 'On'}`,
        icon: ClipIcon,
        color: recordValue === 'ON' ? 'blue' : 'gray',
        onClick: () => {
          sendRecordings(recordValue === 'ON' ? 'OFF' : 'ON', true);
        },
      },
      {
        name: `${t('toggle_snapshots')} ${snapshotValue === 'ON' ? 'Off' : 'On'}`,
        icon: SnapshotIcon,
        color: snapshotValue === 'ON' ? 'blue' : 'gray',
        onClick: () => {
          sendSnapshots(snapshotValue === 'ON' ? 'OFF' : 'ON', true);
        },
      },
    ],
    [detectValue, sendDetect, recordValue, sendRecordings, snapshotValue, sendSnapshots, t]
  );

  return (
    <Card buttons={buttons} href={href} header={cleanName} icons={icons} media={<CameraImage camera={name} stretch />} />
  );
}

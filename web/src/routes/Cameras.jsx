import { h, Fragment } from 'preact';
import ActivityIndicator from '../components/ActivityIndicator';
import Card from '../components/Card';
import CameraImage from '../components/CameraImage';
import ClipIcon from '../icons/Clip';
import MotionIcon from '../icons/Motion';
import SnapshotIcon from '../icons/Snapshot';
import Prompt from '../components/Prompt';
import { useDetectState, useRecordingsState, useSnapshotsState } from '../api/mqtt';
import { useMemo, useState } from 'preact/hooks';
import useSWR from 'swr';

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

  const sortedCameras = useMemo(() =>
    Object.entries(unsortedCameras)
      .filter(([_, conf]) => conf.ui.dashboard)
      .sort(([_, aConf], [__, bConf]) => aConf.ui.order - bConf.ui.order),
  [unsortedCameras]);

  return (
    <Fragment>
      {sortedCameras.map(([camera, conf]) => (
        <Camera key={camera} name={camera} conf={conf} />
      ))}
    </Fragment>
  );
}

function Camera({ name }) {
  const {data: config} = useSWR('config');
  const showConfirmationPrompts = config && config.ui.show_confirmation_prompts;
  const { payload: detectValue, send: sendDetect } = useDetectState(name);
  const [showToggleDetectDialog, setShowToggleDetectDialog] = useState(false);
  const { payload: recordValue, send: sendRecordings } = useRecordingsState(name);
  const [showToggleRecordingDialog, setShowToggleRecordingDialog] = useState(false);
  const { payload: snapshotValue, send: sendSnapshots } = useSnapshotsState(name);
  const [showToggleSnapshotDialog, setShowToggleSnapshotDialog] = useState(false);
  const href = `/cameras/${name}`;
  const buttons = useMemo(() => {
    return [
      { name: 'Events', href: `/events?camera=${name}` },
      { name: 'Recordings', href: `/recording/${name}` },
    ];
  }, [name]);
  const icons = useMemo(
    () => [
      {
        name: `Toggle detect ${detectValue === 'ON' ? 'off' : 'on'}`,
        icon: MotionIcon,
        color: detectValue === 'ON' ? 'blue' : 'gray',
        onClick: () => {
          if (showConfirmationPrompts) {
            setShowToggleDetectDialog(true);
          } else {
            sendDetect(recordValue === 'ON' ? 'OFF' : 'ON');
          }
        },
      },
      {
        name: `Toggle recordings ${recordValue === 'ON' ? 'off' : 'on'}`,
        icon: ClipIcon,
        color: recordValue === 'ON' ? 'blue' : 'gray',
        onClick: () => {
          if (showConfirmationPrompts) {
            setShowToggleRecordingDialog(true);
          } else {
            sendRecordings(recordValue === 'ON' ? 'OFF' : 'ON');
          }
        },
      },
      {
        name: `Toggle snapshots ${snapshotValue === 'ON' ? 'off' : 'on'}`,
        icon: SnapshotIcon,
        color: snapshotValue === 'ON' ? 'blue' : 'gray',
        onClick: () => {
          if (showConfirmationPrompts) {
            setShowToggleSnapshotDialog(true);
          } else {
            sendSnapshots(recordValue === 'ON' ? 'OFF' : 'ON');
          }
        },
      },
    ],
    [detectValue, recordValue, snapshotValue]
  );

  const dialogs = useMemo(
    () => [
      {
        showDialog: showToggleRecordingDialog,
        dismiss: () => setShowToggleRecordingDialog(false),
        title: `${recordValue === 'ON' ? 'Disable' : 'Enable '} recordings?`,
        callback: () => {
          sendRecordings(recordValue === 'ON' ? 'OFF' : 'ON');
          setShowToggleRecordingDialog(false);
        }
      },
      {
        showDialog: showToggleDetectDialog,
        dismiss: () => setShowToggleDetectDialog(false),
        title: `${detectValue === 'ON' ? 'Disable' : 'Enable '} detection?`,
        callback: () => {
          sendDetect(snapshotValue === 'ON' ? 'OFF' : 'ON');
          setShowToggleDetectDialog(false);
        }
      },
      {
        showDialog: showToggleSnapshotDialog,
        dismiss: () => setShowToggleSnapshotDialog(false),
        title: `${snapshotValue === 'ON' ? 'Disable' : 'Enable '} snapshots?`,
        callback: () => {
          sendSnapshots(snapshotValue === 'ON' ? 'OFF' : 'ON');
          setShowToggleSnapshotDialog(false);
        },
      },
    ],
    [showToggleDetectDialog, showToggleRecordingDialog, showToggleSnapshotDialog, detectValue, recordValue, snapshotValue]
  );

  return (
    <Fragment>
      <Card buttons={buttons} href={href} header={name} icons={icons} media={<CameraImage camera={name} stretch />} />
      {dialogs.map(({showDialog, dismiss, title, callback}) =>
        showDialog ? <Prompt
          title={title}
          text="Are you sure?"
          onDismiss={dismiss}
          actions={[
            {text: 'Yes', color: 'red', onClick: callback},
            {text: 'Cancel', onClick: dismiss},
          ]}
        /> : null
      )}
    </Fragment>
  );
}

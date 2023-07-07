import { h, Fragment } from 'preact';
import ActivityIndicator from '../components/ActivityIndicator';
import Card from '../components/Card';
import CameraImage from '../components/CameraImage';
import JSMpegPlayer from '../components/JSMpegPlayer';
import AudioIcon from '../icons/Audio';
import ClipIcon from '../icons/Clip';
import MotionIcon from '../icons/Motion';
import SnapshotIcon from '../icons/Snapshot';
import { useAudioState, useDetectState, useRecordingsState, useSnapshotsState } from '../api/ws';
import { useMemo, useState } from 'preact/hooks';
import useSWR from 'swr';

export default function Cameras() {
  const { data: config } = useSWR('config');

  return !config ? (
    <ActivityIndicator />
  ) : (
    <div className="grid grid-cols-1 3xl:grid-cols-3 md:grid-cols-2 gap-4 p-2 px-4">
      <SortedCameras config={config} unsortedCameras={config.cameras} />
    </div>
  );
}

function SortedCameras({ config, unsortedCameras }) {
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
        <Camera key={camera} name={camera} config={config.cameras[camera]} conf={conf} />
      ))}
    </Fragment>
  );
}

function Camera({ name, config }) {
  const { payload: detectValue, send: sendDetect } = useDetectState(name);
  const { payload: recordValue, send: sendRecordings } = useRecordingsState(name);
  const { payload: snapshotValue, send: sendSnapshots } = useSnapshotsState(name);
  const { payload: audioValue, send: sendAudio } = useAudioState(name);
  const href = `/cameras/${name}`;
  const buttons = useMemo(() => {
    return [
      { name: 'Events', href: `/events?cameras=${name}` },
      { name: 'Recordings', href: `/recording/${name}` },
    ];
  }, [name]);
  const cleanName = useMemo(() => {
    return `${name.replaceAll('_', ' ')}`;
  }, [name]);
  const icons = useMemo(
    () => [
      {
        name: `Toggle detect ${detectValue === 'ON' ? 'off' : 'on'}`,
        icon: MotionIcon,
        color: detectValue === 'ON' ? 'blue' : 'gray',
        onClick: () => {
          sendDetect(detectValue === 'ON' ? 'OFF' : 'ON', true);
        },
      },
      {
        name: config.record.enabled_in_config
          ? `Toggle recordings ${recordValue === 'ON' ? 'off' : 'on'}`
          : 'Recordings must be enabled in the config to be turned on in the UI.',
        icon: ClipIcon,
        color: config.record.enabled_in_config ? (recordValue === 'ON' ? 'blue' : 'gray') : 'red',
        onClick: () => {
          if (config.record.enabled_in_config) {
            sendRecordings(recordValue === 'ON' ? 'OFF' : 'ON', true);
          }
        },
      },
      {
        name: `Toggle snapshots ${snapshotValue === 'ON' ? 'off' : 'on'}`,
        icon: SnapshotIcon,
        color: snapshotValue === 'ON' ? 'blue' : 'gray',
        onClick: () => {
          sendSnapshots(snapshotValue === 'ON' ? 'OFF' : 'ON', true);
        },
      },
      config.audio.enabled_in_config
        ? {
          name: `Toggle audio detection ${audioValue === 'ON' ? 'off' : 'on'}`,
          icon: AudioIcon,
          color: audioValue === 'ON' ? 'blue' : 'gray',
          onClick: () => {
            sendAudio(audioValue === 'ON' ? 'OFF' : 'ON', true);
          },
        }
        : null,
    ].filter((button) => button != null),
    [config, audioValue, sendAudio, detectValue, sendDetect, recordValue, sendRecordings, snapshotValue, sendSnapshots]
  );

  const [isHovered, setIsHovered] = useState(false); // Add a state to track if the mouse is over the card
  const [timerId, setTimerId] = useState(null); // Add a state to keep track of the timer

  const handleMouseEnter = () => {
    // Set a timer to change the state after 0.5 seconds
    const id = setTimeout(() => {
      setIsHovered(true);
    }, 500);
    setTimerId(id);
  };

  const handleMouseLeave = () => {
    // Clear the timer if the mouse leaves before the 0.5 seconds are up
    clearTimeout(timerId);
    setIsHovered(false);
  };


  return (
    <Card
      buttons={buttons}
      href={href}
      header={cleanName}
      icons={icons}
      //media={<CameraImage camera={name} stretch />}
      media={isHovered ? <JSMpegPlayer camera={name} stretch /> : <CameraImage camera={name} stretch />} // Use the state to decide which component to render
      onMouseEnter={handleMouseEnter} // Handle mouse enter event
      onMouseLeave={handleMouseLeave} // Handle mouse leave event
    />
  );
}

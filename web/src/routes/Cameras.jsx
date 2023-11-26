import { h, Fragment } from 'preact';
import ActivityIndicator from '../components/ActivityIndicator';
import Card from '../components/Card';
import CameraImage from '../components/CameraImage';
import JSMpegPlayer from '../components/JSMpegPlayer';
import AudioIcon from '../icons/Audio';
import ClipIcon from '../icons/Clip';
import MotionIcon from '../icons/Motion';
import SettingsIcon from '../icons/Settings';
import SnapshotIcon from '../icons/Snapshot';
import { useAudioState, useDetectState, useRecordingsState, useSnapshotsState } from '../api/ws';
import { useMemo, useState } from 'preact/hooks';
import useSWR from 'swr';
import { useRef } from 'react';
import { useResizeObserver } from '../hooks';
import Dialog from '../components/Dialog';
import Switch from '../components/Switch';
import Heading from '../components/Heading';
import Button from '../components/Button';

export default function Cameras() {
  const { data: config } = useSWR('config');

  const containerRef = useRef(null);
  const [{ width: containerWidth }] = useResizeObserver(containerRef);
  // Add scrollbar width (when visible) to the available observer width to eliminate screen juddering.
  // https://github.com/blakeblackshear/frigate/issues/1657
  let scrollBarWidth = 0;
  if (window.innerWidth && document.body.offsetWidth) {
    scrollBarWidth = window.innerWidth - document.body.offsetWidth;
  }
  const availableWidth = scrollBarWidth ? containerWidth + scrollBarWidth : containerWidth;

  return !config ? (
    <ActivityIndicator />
  ) : (
    <div className="grid grid-cols-1 3xl:grid-cols-3 md:grid-cols-2 gap-4 p-2 px-4" ref={containerRef}>
      <SortedCameras config={config} unsortedCameras={config.cameras} availableWidth={availableWidth} />
    </div>
  );
}

function SortedCameras({ config, unsortedCameras, availableWidth }) {
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
        <Camera key={camera} name={camera} config={config.cameras[camera]} conf={conf} availableWidth={availableWidth} />
      ))}
    </Fragment>
  );
}

function Camera({ name, config, availableWidth }) {
  const { payload: detectValue, send: sendDetect } = useDetectState(name);
  const { payload: recordValue, send: sendRecordings } = useRecordingsState(name);
  const { payload: snapshotValue, send: sendSnapshots } = useSnapshotsState(name);
  const { payload: audioValue, send: sendAudio } = useAudioState(name);

  const [cameraOptions, setCameraOptions] = useState('');

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
    () => (availableWidth < 448 ? [
      {
        icon: SettingsIcon,
        color: 'gray',
        onClick: () => {
          setCameraOptions(config.name);
        },
      },
    ] : [
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
    ]).filter((button) => button != null),
    [config, availableWidth, setCameraOptions, audioValue, sendAudio, detectValue, sendDetect, recordValue, sendRecordings, snapshotValue, sendSnapshots]
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
    <Fragment>
      {cameraOptions && (
        <Dialog>
          <div className="p-4">
            <Heading size="md">{`${name.replaceAll('_', ' ')} Settings`}</Heading>
            <Switch
              className="my-3"
              checked={detectValue == 'ON'}
              id="detect"
              onChange={() => sendDetect(detectValue === 'ON' ? 'OFF' : 'ON', true)}
              label="Detect"
              labelPosition="before"
            />
            {config.record.enabled_in_config && <Switch
              className="my-3"
              checked={recordValue == 'ON'}
              id="record"
              onChange={() => sendRecordings(recordValue === 'ON' ? 'OFF' : 'ON', true)}
              label="Recordings"
              labelPosition="before"
            />}
            <Switch
              className="my-3"
              checked={snapshotValue == 'ON'}
              id="snapshot"
              onChange={() => sendSnapshots(snapshotValue === 'ON' ? 'OFF' : 'ON', true)}
              label="Snapshots"
              labelPosition="before"
            />
            {config.audio.enabled_in_config && <Switch
              className="my-3"
              checked={audioValue == 'ON'}
              id="audio"
              onChange={() => sendAudio(audioValue === 'ON' ? 'OFF' : 'ON', true)}
              label="Audio Detection"
              labelPosition="before"
            />}
          </div>
          <div className="p-2 flex justify-start flex-row-reverse space-x-2">
            <Button className="ml-2" onClick={() => setCameraOptions('')} type="text">
              Close
            </Button>
          </div>
        </Dialog>
      )}

      <Card
        buttons={buttons}
        href={href}
        header={cleanName}
        icons={icons}
        media={isHovered ? <JSMpegPlayer camera={name} stretch /> : <CameraImage camera={name} stretch />} // Use the state to decide which component to render
        onMouseEnter={handleMouseEnter} // Handle mouse enter event
        onMouseLeave={handleMouseLeave} // Handle mouse leave event
      />
    </Fragment>
  );
}

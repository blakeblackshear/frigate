import { h, Fragment } from 'preact';
import AutoUpdatingCameraImage from '../components/AutoUpdatingCameraImage';
import JSMpegPlayer from '../components/JSMpegPlayer';
import Heading from '../components/Heading';
import Link from '../components/Link';
import Switch from '../components/Switch';
import { usePersistence } from '../context';
import { useCallback, useMemo, useState } from 'preact/hooks';
import { useApiHost, useConfig, useEvents } from '../api';
import { Tabs, TextTab } from '../components/Tabs';
import Timeline from '../components/Timeline';
import { LiveChip } from '../components/LiveChip';
import { HistoryHeader } from './HistoryHeader';
import { longToDate } from '../utils/dateUtil';
import { useSearchString } from '../hooks/useSearchString';

const emptyObject = Object.freeze({});

export default function Camera({ camera }) {
  const apiHost = useApiHost();

  const { data: config } = useConfig();
  const { searchString } = useSearchString(25, `camera=${camera}`);
  const { data: events } = useEvents(searchString);

  const [hideBanner, setHideBanner] = useState(false);
  const [playerType, setPlayerType] = useState('live');

  const cameraConfig = config?.cameras[camera];
  const liveWidth = Math.round(cameraConfig.live.height * (cameraConfig.detect.width / cameraConfig.detect.height));
  const [options, setOptions] = usePersistence(`${camera}-feed`, emptyObject);

  const [currentEvent, setCurrentEvent] = useState(undefined);

  const handleSetOption = useCallback(
    (id, value) => {
      const newOptions = { ...options, [id]: value };
      setOptions(newOptions);
    },
    [options, setOptions]
  );

  const searchParams = useMemo(
    () =>
      new URLSearchParams(
        Object.keys(options).reduce((memo, key) => {
          memo.push([key, options[key] === true ? '1' : '0']);
          return memo;
        }, [])
      ),
    [options]
  );

  const optionContent = (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <Switch
        checked={options['bbox']}
        id="bbox"
        onChange={handleSetOption}
        label="Bounding box"
        labelPosition="after"
      />
      <Switch
        checked={options['timestamp']}
        id="timestamp"
        onChange={handleSetOption}
        label="Timestamp"
        labelPosition="after"
      />
      <Switch checked={options['zones']} id="zones" onChange={handleSetOption} label="Zones" labelPosition="after" />
      <Switch checked={options['mask']} id="mask" onChange={handleSetOption} label="Masks" labelPosition="after" />
      <Switch
        checked={options['motion']}
        id="motion"
        onChange={handleSetOption}
        label="Motion boxes"
        labelPosition="after"
      />
      <Switch
        checked={options['regions']}
        id="regions"
        onChange={handleSetOption}
        label="Regions"
        labelPosition="after"
      />
      <Link href={`/cameras/${camera}/editor`}>Mask & Zone creator</Link>
    </div>
  );

  const RenderPlayer = useCallback(() => {
    if (playerType === 'live') {
      return <JSMpegPlayer camera={camera} width={liveWidth} height={cameraConfig.live.height} />;
    } else if (playerType === 'debug') {
      return (
        <div>
          <AutoUpdatingCameraImage camera={camera} searchParams={searchParams} className="w-full" />
          {/* {optionContent} */}
        </div>
      );
    } else if (playerType === 'history') {
      return (
        currentEvent && (
          <video
            onClick={handleVideoTouch}
            poster={`${apiHost}/api/events/${currentEvent.id}/snapshot.jpg`}
            preload="none"
            playsInline
            controls
          >
            <source
              src={`${apiHost}/api/${camera}/start/${currentEvent.startTime}/end/${currentEvent.endTime}/clip.mp4`}
            />
          </video>
        )
      );
    }
  }, [playerType, currentEvent]);

  const handleVideoTouch = () => {
    setHideBanner(true);
  };

  const handleTabChange = (index) => {
    if (index === 0) {
      setPlayerType('history');
    } else if (index === 1) {
      setPlayerType('live');
    } else if (index === 2) {
      setPlayerType('debug');
    }
  };

  const handleTimelineChange = (event) => {
    setCurrentEvent(event);
  };

  return (
    <div className="flex bg-black w-full h-full justify-center">
      <div className="relative max-w-screen-md flex-grow w-full">
        <div
          className={`absolute top-0 text-white w-full transition-opacity duration-300 ${hideBanner && 'opacity-0'}`}
        >
          <div className="flex pt-4 pl-4 items-center bg-gradient-to-b from-black to-transparent w-full h-16 z10">
            {(playerType === 'live' || playerType === 'debug') && (
              <Fragment>
                <Heading size="xl" className="mr-2">
                  {camera}
                </Heading>
                <LiveChip />
              </Fragment>
            )}
          </div>
        </div>

        <div className="flex flex-col justify-center h-full">
          <div className="relative">
            {currentEvent && (
              <HistoryHeader
                camera={camera}
                date={longToDate(currentEvent.start_time)}
                objectLabel={currentEvent.label}
                className="mb-2"
              />
            )}
            <RenderPlayer />
          </div>

          {playerType === 'history' && <Timeline events={events} onChange={handleTimelineChange} />}
        </div>

        <div className="absolute flex justify-center bottom-8 w-full">
          <Tabs selectedIndex={1} onChange={handleTabChange} className="justify">
            <TextTab text="History" />
            <TextTab text="Live" />
            <TextTab text="Debug" />
          </Tabs>
        </div>
      </div>
    </div>
  );
}

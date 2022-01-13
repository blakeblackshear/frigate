import { h, Fragment, render } from 'preact';
import AutoUpdatingCameraImage from '../components/AutoUpdatingCameraImage';
import JSMpegPlayer from '../components/JSMpegPlayer';
import Heading from '../components/Heading';
import Link from '../components/Link';
import Switch from '../components/Switch';
import { usePersistence } from '../context';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { useApiHost, useConfig, useEvents } from '../api';
import { Tabs, TextTab } from '../components/Tabs';
import Timeline from '../components/Timeline';
import { LiveChip } from '../components/LiveChip';
import { HistoryHeader } from './HistoryHeader';
import { longToDate } from '../utils/dateUtil';
import { useSearchString } from '../hooks/useSearchString';
import { Previous } from '../icons/Previous';
import { Play } from '../icons/Play';
import { Next } from '../icons/Next';

const emptyObject = Object.freeze({});

export default function Camera({ camera }) {
  const apiHost = useApiHost();
  const videoRef = useRef();

  const { data: config } = useConfig();

  const beginningOfDay = new Date().setHours(0, 0, 0) / 1000;
  const { searchString } = useSearchString(200, `camera=${camera}&after=${beginningOfDay}`);
  const { data: events } = useEvents(searchString);
  const [timelineEvents, setTimelineEvents] = useState();

  const [hideBanner, setHideBanner] = useState(false);
  const [playerType, setPlayerType] = useState('live');

  const cameraConfig = config?.cameras[camera];
  const liveWidth = Math.round(cameraConfig.live.height * (cameraConfig.detect.width / cameraConfig.detect.height));
  const [options, setOptions] = usePersistence(`${camera}-feed`, emptyObject);

  const [currentEvent, setCurrentEvent] = useState();
  const [currentEventIndex, setCurrentEventIndex] = useState();
  const [timelineOffset, setTimelineOffset] = useState(0);

  useEffect(() => {
    if (events) {
      setTimelineEvents([...events].reverse().filter((e) => e.end_time !== undefined));
    }
  }, [events]);

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
    <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
      <Switch
        checked={options['bbox']}
        id='bbox'
        onChange={handleSetOption}
        label='Bounding box'
        labelPosition='after'
      />
      <Switch
        checked={options['timestamp']}
        id='timestamp'
        onChange={handleSetOption}
        label='Timestamp'
        labelPosition='after'
      />
      <Switch checked={options['zones']} id='zones' onChange={handleSetOption} label='Zones' labelPosition='after' />
      <Switch checked={options['mask']} id='mask' onChange={handleSetOption} label='Masks' labelPosition='after' />
      <Switch
        checked={options['motion']}
        id='motion'
        onChange={handleSetOption}
        label='Motion boxes'
        labelPosition='after'
      />
      <Switch
        checked={options['regions']}
        id='regions'
        onChange={handleSetOption}
        label='Regions'
        labelPosition='after'
      />
      <Link href={`/cameras/${camera}/editor`}>Mask & Zone creator</Link>
    </div>
  );

  let renderPlayer;

  switch (playerType) {
    case 'live':
      renderPlayer = (
        <Fragment>
          <div>
            <JSMpegPlayer camera={camera} width={liveWidth} height={cameraConfig.live.height} />
          </div>
        </Fragment>
      );
      break;
    case 'history':
      if (currentEvent) {
        renderPlayer = (
          <video
            ref={videoRef}
            onTimeUpdate={handleTimeUpdate}
            onPause={handlePaused}
            onClick={handleVideoTouch}
            poster={`${apiHost}/api/events/${currentEvent.id}/snapshot.jpg`}
            preload='none'
            playsInline
            controls
          >
            <source
              src={`${apiHost}/api/${camera}/start/${currentEvent.startTime}/end/${currentEvent.endTime}/clip.mp4`}
            />
          </video>
        );
      }
      break;
    case 'debug':
      renderPlayer = (
        <Fragment>
          <div>
            <AutoUpdatingCameraImage camera={camera} searchParams={searchParams} />
          </div>
          {optionContent}
        </Fragment>
      );
      break;
    default:
      break;
  }

  const handleTimeUpdate = () => {
    const timestamp = Math.round(videoRef.current.currentTime);
    const offset = Math.round(timestamp);
    const triggerStateChange = offset !== timelineOffset;
    if (triggerStateChange) {
      setTimelineOffset(offset);
    }
  };

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
    if (event !== undefined) {
      setCurrentEvent(event);
      setCurrentEventIndex(event.index);
    }
  };

  const handlePlay = function () {
    videoRef.current.play();
  };

  const handlePaused = () => {
    setTimelineOffset(undefined);
  };

  const handlePrevious = function () {
    setCurrentEventIndex((index) => index - 1);
  };

  const handleNext = function () {
    setCurrentEventIndex((index) => index + 1);
  };

  return (
    <div className='flex bg-gray-900 w-full h-full justify-center'>
      <div className='relative max-w-screen-md flex-grow w-full'>
        <div className='absolute top-0 text-white w-full'>
          <div className='flex pt-4 pl-4 items-center w-full h-16 z10'>
            {(playerType === 'live' || playerType === 'debug') && (
              <Fragment>
                <Heading size='xl' className='mr-2'>
                  {camera}
                </Heading>
                <LiveChip />
              </Fragment>
            )}
          </div>
        </div>

        <div className='flex flex-col justify-center h-full'>
          <div className='relative'>
            {currentEvent && (
              <HistoryHeader
                camera={camera}
                date={longToDate(currentEvent.start_time)}
                objectLabel={currentEvent.label}
                className='mb-2'
              />
            )}
            {renderPlayer}
          </div>

          {playerType === 'history' && (
            <Fragment>
              <Timeline
                events={timelineEvents}
                offset={timelineOffset}
                currentIndex={currentEventIndex}
                onChange={handleTimelineChange}
              />

              <div className='flex self-center'>
                <button onClick={handlePrevious}>
                  <Previous />
                </button>
                <button onClick={handlePlay}>
                  <Play />
                </button>
                <button onClick={handleNext}>
                  <Next />
                </button>
              </div>
            </Fragment>
          )}
        </div>

        <div className='absolute flex justify-center bottom-8 w-full'>
          <Tabs selectedIndex={1} onChange={handleTabChange} className='justify'>
            <TextTab text='History' />
            <TextTab text='Live' />
            <TextTab text='Debug' />
          </Tabs>
        </div>
      </div>
    </div>
  );
}

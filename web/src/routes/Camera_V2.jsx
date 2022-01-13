import { h, Fragment } from 'preact';
import AutoUpdatingCameraImage from '../components/AutoUpdatingCameraImage';
import JSMpegPlayer from '../components/JSMpegPlayer';
import Heading from '../components/Heading';
import Link from '../components/Link';
import Switch from '../components/Switch';
import { usePersistence } from '../context';
import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import { useConfig } from '../api';
import { Tabs, TextTab } from '../components/Tabs';
import { LiveChip } from '../components/LiveChip';
import HistoryViewer from '../components/HistoryViewer';

const emptyObject = Object.freeze({});

export default function Camera({ camera }) {
  const { data: config } = useConfig();

  const [playerType, setPlayerType] = useState('live');

  const cameraConfig = config?.cameras[camera];
  const liveWidth = Math.round(cameraConfig.live.height * (cameraConfig.detect.width / cameraConfig.detect.height));
  const [options, setOptions] = usePersistence(`${camera}-feed`, emptyObject);

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
      renderPlayer = <HistoryViewer camera={camera} />;
      break;
    case 'debug':
      renderPlayer = (
        <Fragment>
          <AutoUpdatingCameraImage camera={camera} searchParams={searchParams} />
          {optionContent}
        </Fragment>
      );
      break;
    default:
      break;
  }

  const handleTabChange = (index) => {
    if (index === 0) {
      setPlayerType('history');
    } else if (index === 1) {
      setPlayerType('live');
    } else if (index === 2) {
      setPlayerType('debug');
    }
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

        <div className='flex flex-col justify-center h-full'>{renderPlayer}</div>

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

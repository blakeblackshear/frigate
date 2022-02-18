import { h, Fragment } from 'preact';
import JSMpegPlayer from '../components/JSMpegPlayer';
import Heading from '../components/Heading';
import { useState } from 'preact/hooks';
import { useConfig } from '../api';
import { Tabs, TextTab } from '../components/Tabs';
import { LiveChip } from '../components/LiveChip';
import { DebugCamera } from '../components/DebugCamera';
import { HistoryViewer } from '../components/HistoryViewer'

export default function Camera({ camera }) {
  const { data: config } = useConfig();

  const [playerType, setPlayerType] = useState('live');

  const cameraConfig = config?.cameras[camera];

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
    <div className='flex bg-white dark:bg-black w-full h-full justify-center'>
      <div className='relative max-w-screen-md flex-grow w-full'>
        <div className='absolute top-0 text-white w-full'>
          <div className='flex pt-4 pl-4 items-center w-full h-16 z10'>
            {(playerType === 'live' || playerType === 'debug') && (
              <Fragment>
                <Heading size='xl' className='mr-2 text-black dark:text-white'>
                  {camera}
                </Heading>
                <LiveChip className='text-green-400 border-2 border-solid border-green-400 bg-opacity-40 dark:bg-opacity-10' />
              </Fragment>
            )}
          </div>
        </div>

        <div className='flex flex-col justify-center h-full'>
          <RenderPlayer camera={camera} cameraConfig={cameraConfig} playerType={playerType} />
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

const RenderPlayer = function ({ camera, cameraConfig, playerType }) {
  const liveWidth = Math.round(cameraConfig.live.height * (cameraConfig.detect.width / cameraConfig.detect.height));
  if (playerType === 'live') {
    return (
      <Fragment>
        <div>
          <JSMpegPlayer camera={camera} width={liveWidth} height={cameraConfig.live.height} />
        </div>
      </Fragment>
    );
  } else if (playerType === 'history') {
    return <HistoryViewer camera={camera} />;
  } else if (playerType === 'debug') {
    return <DebugCamera camera={camera} />;
  }
  return <Fragment />;
};

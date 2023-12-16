import { h } from 'preact';
import Link from './Link';
import Switch from './Switch';
import { useCallback, useMemo } from 'preact/hooks';
import { usePersistence } from '../context';
import AutoUpdatingCameraImage from './AutoUpdatingCameraImage';

const emptyObject = Object.freeze({});

export function DebugCamera({ camera }) {
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

  return (
    <div>
      <AutoUpdatingCameraImage camera={camera} searchParams={searchParams} />
      {optionContent}
    </div>
  );
}

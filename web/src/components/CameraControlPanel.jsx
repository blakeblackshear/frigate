import { h } from 'preact';
import { useState } from 'preact/hooks';
import useSWR from 'swr';
import { usePtzCommand } from '../api/ws';
import ActivityIndicator from './ActivityIndicator';
import Button from './Button';

export default function CameraControlPanel({ camera = '' }) {
  const { data: ptz } = useSWR(`${camera}/ptz/info`);
  const [currentPreset, setCurrentPreset] = useState('');

  const { payload: _, send: sendPtz } = usePtzCommand(camera);

  const onSetPreview = async (e) => {
    e.stopPropagation();

    if (currentPreset == 'none') {
      return;
    }

    sendPtz(`preset-${currentPreset}`);
    setCurrentPreset('');
  };

  if (!ptz) {
    return <ActivityIndicator />;
  }

  return (
    <div data-testid="cameras" className="grid grid-cols-1 3xl:grid-cols-4 md:grid-cols-3 gap-4">
      ptz is enabled with features {ptz.features[0]}
      {ptz.presets && (
        <div>
          <div className="p-4">
            <select
              className="cursor-pointer rounded dark:bg-slate-800"
              value={currentPreset}
              onChange={(e) => {
                setCurrentPreset(e.target.value);
              }}
            >
              <option value="">Select Preset</option>
              {ptz.presets.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <Button onClick={(e) => onSetPreview(e)}>Move Camera To Preset</Button>
        </div>
      )}
    </div>
  );
}

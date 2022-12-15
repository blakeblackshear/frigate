import { h } from 'preact';
import { useState } from 'preact/hooks';
import useSWR from 'swr';
import { usePtzCommand } from '../api/ws';
import ActivityIndicator from './ActivityIndicator';
import ArrowRightDouble from '../icons/ArrowRightDouble';
import ArrowUpDouble from '../icons/ArrowUpDouble';
import ArrowDownDouble from '../icons/ArrowDownDouble';
import ArrowLeftDouble from '../icons/ArrowLeftDouble';
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

  const onSetMove = async (e, dir) => {
    e.stopPropagation();
    sendPtz(`MOVE_${dir}`);
    setCurrentPreset('');
  };

  const onSetStop = async (e) => {
    e.stopPropagation();
    sendPtz('STOP');
  };

  if (!ptz) {
    return <ActivityIndicator />;
  }

  return (
    <div data-testid="control-panel" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {ptz.features.includes('pt') && (
        <div className="w-44 p-4">
          <div className="w-full flex justify-center">
            <button onMouseDown={(e) => onSetMove(e, 'UP')} onMouseUp={(e) => onSetStop(e)}>
              <ArrowUpDouble className="h-12 p-2 bg-slate-500" />
            </button>
          </div>
          <div className="w-full flex justify-between">
            <button onMouseDown={(e) => onSetMove(e, 'LEFT')} onMouseUp={(e) => onSetStop(e)}>
              <ArrowLeftDouble className="btn h-12 p-2 bg-slate-500" />
            </button>
            <button onMouseDown={(e) => onSetMove(e, 'RIGHT')} onMouseUp={(e) => onSetStop(e)}>
              <ArrowRightDouble className="h-12 p-2 bg-slate-500" />
            </button>
          </div>
          <div className="flex justify-center">
            <button onMouseDown={(e) => onSetMove(e, 'DOWN')} onMouseUp={(e) => onSetStop(e)}>
              <ArrowDownDouble className="h-12 p-2 bg-slate-500" />
            </button>
          </div>
        </div>
      )}

      {ptz.features.includes('zoom') && <div>zoom</div>}

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
                  {item.charAt(0).toUpperCase() + item.slice(1)}
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

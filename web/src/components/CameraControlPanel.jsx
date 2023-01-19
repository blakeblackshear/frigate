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
import Heading from './Heading';

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

  const onSetZoom = async (e, dir) => {
    e.stopPropagation();
    sendPtz(`ZOOM_${dir}`);
    setCurrentPreset('');
  };

  const onSetStop = async (e) => {
    e.stopPropagation();
    sendPtz('STOP');
  };

  if (!ptz) {
    return <ActivityIndicator />;
  }

  document.addEventListener('keydown', (e) => {
    if (!e) {
      return;
    }

    if (e.repeat) {
      e.preventDefault();
      return;
    }

    if (ptz.features.includes('pt')) {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onSetMove(e, 'LEFT');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onSetMove(e, 'RIGHT');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        onSetMove(e, 'UP');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onSetMove(e, 'DOWN');
      }

      if (ptz.features.includes('zoom')) {
        if (e.key == '+') {
          e.preventDefault();
          onSetZoom(e, 'IN');
        } else if (e.key == '-') {
          e.preventDefault();
          onSetZoom(e, 'OUT');
        }
      }
    }
  });

  document.addEventListener('keyup', (e) => {
    if (!e || e.repeat) {
      return;
    }

    if (
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown' ||
      e.key === '+' ||
      e.key === '-'
    ) {
      e.preventDefault();
      onSetStop(e);
    }
  });

  return (
    <div data-testid="control-panel" className="p-4 sm:flex justify-start">
      {ptz.features.includes('zoom') && (
        <div className="flex justify-center">
          <div className="w-44 px-4">
            <Heading size="xs" className="my-4">
              Pan / Tilt
            </Heading>
            <div className="w-full flex justify-center">
              <button
                onMouseDown={(e) => onSetMove(e, 'UP')}
                onMouseUp={(e) => onSetStop(e)}
                onTouchStart={(e) => {
                  onSetMove(e, 'UP');
                  e.preventDefault();
                }}
                onTouchEnd={(e) => {
                  onSetStop(e);
                  e.preventDefault();
                }}
              >
                <ArrowUpDouble className="h-12 p-2 bg-slate-500" />
              </button>
            </div>
            <div className="w-full flex justify-between">
              <button
                onMouseDown={(e) => onSetMove(e, 'LEFT')}
                onMouseUp={(e) => onSetStop(e)}
                onTouchStart={(e) => {
                  onSetMove(e, 'LEFT');
                  e.preventDefault();
                }}
                onTouchEnd={(e) => {
                  onSetStop(e);
                  e.preventDefault();
                }}
              >
                <ArrowLeftDouble className="btn h-12 p-2 bg-slate-500" />
              </button>
              <button
                onMouseDown={(e) => onSetMove(e, 'RIGHT')}
                onMouseUp={(e) => onSetStop(e)}
                onTouchStart={(e) => {
                  onSetMove(e, 'RIGHT');
                  e.preventDefault();
                }}
                onTouchEnd={(e) => {
                  onSetStop(e);
                  e.preventDefault();
                }}
              >
                <ArrowRightDouble className="h-12 p-2 bg-slate-500" />
              </button>
            </div>
            <div className="flex justify-center">
              <button
                onMouseDown={(e) => onSetMove(e, 'DOWN')}
                onMouseUp={(e) => onSetStop(e)}
                onTouchStart={(e) => {
                  onSetMove(e, 'DOWN');
                  e.preventDefault();
                }}
                onTouchEnd={(e) => {
                  onSetStop(e);
                  e.preventDefault();
                }}
              >
                <ArrowDownDouble className="h-12 p-2 bg-slate-500" />
              </button>
            </div>
          </div>
        </div>
      )}

      {ptz.features.includes('zoom') && (
        <div className="px-4 sm:w-44">
          <Heading size="xs" className="my-4">
            Zoom
          </Heading>
          <div className="w-full flex justify-center">
            <button
              onMouseDown={(e) => onSetZoom(e, 'IN')}
              onMouseUp={(e) => onSetStop(e)}
              onTouchStart={(e) => {
                onSetZoom(e, 'IN');
                e.preventDefault();
              }}
              onTouchEnd={(e) => {
                onSetStop(e);
                e.preventDefault();
              }}
            >
              <div className="h-12 w-12 p-2 text-2xl bg-slate-500 select-none">+</div>
            </button>
          </div>
          <div className="h-12" />
          <div className="flex justify-center">
            <button
              onMouseDown={(e) => onSetZoom(e, 'OUT')}
              onMouseUp={(e) => onSetStop(e)}
              onTouchStart={(e) => {
                onSetZoom(e, 'OUT');
                e.preventDefault();
              }}
              onTouchEnd={(e) => {
                onSetStop(e);
                e.preventDefault();
              }}
            >
              <div className="h-12 w-12 p-2 text-2xl bg-slate-500 select-none">-</div>
            </button>
          </div>
        </div>
      )}

      {ptz.presets && (
        <div className="px-4">
          <Heading size="xs" className="my-4">
            Presets
          </Heading>
          <div className="py-4">
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

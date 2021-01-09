import { h } from 'preact';
import Button from './components/Button';
import Heading from './components/Heading';
import Switch from './components/Switch';
import { route } from 'preact-router';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { ApiHost, Config } from './context';

export default function Camera({ camera, url }) {
  const config = useContext(Config);
  const apiHost = useContext(ApiHost);
  const imageRef = useRef(null);
  const [imageScale, setImageScale] = useState(1);

  if (!(camera in config.cameras)) {
    return <div>{`No camera named ${camera}`}</div>;
  }

  const cameraConfig = config.cameras[camera];
  const { width, height, mask, zones } = cameraConfig;
  const [editing, setEditing] = useState('mask');

  useEffect(() => {
    if (!imageRef.current) {
      return;
    }
    const scaledWidth = imageRef.current.width;
    const scale = scaledWidth / width;
    setImageScale(scale);
  }, [imageRef.current, setImageScale]);

  const initialZonePoints = {};
  if (mask) {
    initialZonePoints.mask = getPolylinePoints(mask);
  }
  const [zonePoints, setZonePoints] = useState(
    Object.keys(zones).reduce(
      (memo, zone) => ({ ...memo, [zone]: getPolylinePoints(zones[zone].coordinates) }),
      initialZonePoints
    )
  );

  const handleUpdateEditable = useCallback(
    (newPoints) => {
      setZonePoints({ ...zonePoints, [editing]: newPoints });
    },
    [editing, setZonePoints, zonePoints]
  );

  const handleSelectEditable = useCallback(
    (name) => {
      setEditing(name);
    },
    [setEditing]
  );

  const handleAddMask = useCallback(() => {
    setZonePoints({ mask: [], ...zonePoints });
  }, [zonePoints, setZonePoints]);

  const handleAddZone = useCallback(() => {
    const n = Object.keys(zonePoints).length;
    const zoneName = `zone-${n}`;
    setZonePoints({ ...zonePoints, [zoneName]: [] });
    setEditing(zoneName);
  }, [zonePoints, setZonePoints]);

  return (
    <div>
      <Heading size="2xl">{camera}</Heading>
      <div className="relative">
        <img ref={imageRef} width={width} height={height} src={`${apiHost}/api/${camera}/latest.jpg`} />
        <EditableMask
          onChange={handleUpdateEditable}
          points={zonePoints[editing]}
          scale={imageScale}
          width={width}
          height={height}
        />
      </div>
      <div class="flex-column space-y-4 overflow-hidden">
        {Object.keys(zonePoints).map((zone) => (
          <MaskValues
            editing={editing === zone}
            onSelect={handleSelectEditable}
            points={zonePoints[zone]}
            name={zone}
          />
        ))}
      </div>
      <div class="flex flex-grow-0 space-x-4">
        {!mask ? <Button onClick={handleAddMask}>Add Mask</Button> : null}
        <Button onClick={handleAddZone}>Add Zone</Button>
      </div>
    </div>
  );
}

function EditableMask({ onChange, points: initialPoints, scale, width, height }) {
  const [points, setPoints] = useState(initialPoints);

  useEffect(() => {
    setPoints(initialPoints);
  }, [setPoints, initialPoints]);

  function boundedSize(value, maxValue) {
    return Math.min(Math.max(0, Math.round(value)), maxValue);
  }

  const handleDragEnd = useCallback(
    (index, newX, newY) => {
      if (newX < 0 && newY < 0) {
        return;
      }
      const x = boundedSize(newX / scale, width);
      const y = boundedSize(newY / scale, height);
      const newPoints = [...points];
      newPoints[index] = [x, y];
      setPoints(newPoints);
      onChange(newPoints);
    },
    [scale, points, setPoints]
  );

  // Add a new point between the closest two other points
  const handleAddPoint = useCallback(
    (event) => {
      const { offsetX, offsetY } = event;
      const scaledX = boundedSize(offsetX / scale, width);
      const scaledY = boundedSize(offsetY / scale, height);
      const newPoint = [scaledX, scaledY];
      const closest = points.reduce((a, b, i) => {
        if (!a) {
          return b;
        }
        return distance(a, newPoint) < distance(b, newPoint) ? a : b;
      }, null);
      const index = points.indexOf(closest);
      const newPoints = [...points];
      newPoints.splice(index, 0, newPoint);
      setPoints(newPoints);
      onChange(newPoints);
    },
    [scale, points, setPoints, onChange]
  );

  const handleRemovePoint = useCallback(
    (index) => {
      const newPoints = [...points];
      newPoints.splice(index, 1);
      setPoints(newPoints);
      onChange(newPoints);
    },
    [points, setPoints, onChange]
  );

  const scaledPoints = useMemo(() => scalePolylinePoints(points, scale), [points, scale]);

  return (
    <div onclick={handleAddPoint}>
      {!scaledPoints
        ? null
        : scaledPoints.map(([x, y], i) => (
            <PolyPoint index={i} onDragend={handleDragEnd} onRemove={handleRemovePoint} x={x} y={y} />
          ))}
      <svg width="100%" height="100%" className="absolute" style="top: 0; left: 0; right: 0; bottom: 0;">
        {!scaledPoints ? null : (
          <g>
            <polyline points={polylinePointsToPolyline(scaledPoints)} fill="rgba(244,0,0,0.5)" />
          </g>
        )}
      </svg>
    </div>
  );
}

function MaskValues({ editing, name, onSelect, points }) {
  const handleClick = useCallback(() => {
    onSelect(name);
  }, [name, onSelect]);

  return (
    <div
      className={`rounded border-gray-500 border-solid border p-2 hover:bg-gray-400 cursor-pointer ${
        editing ? 'bg-gray-300' : ''
      }`}
      onclick={handleClick}
    >
      <Heading className="mb-4" size="sm">
        {name}
      </Heading>
      <textarea className="select-all font-mono border-gray-300 text-gray-900 dark:text-gray-100 w-full" readonly>
        {name === 'mask' ? 'poly,' : null}
        {polylinePointsToPolyline(points)}
      </textarea>
    </div>
  );
}

function distance([x0, y0], [x1, y1]) {
  return Math.sqrt(Math.pow(x0 - x1, 2) + Math.pow(y0 - y1, 2));
}

function getPolylinePoints(polyline) {
  if (!polyline) {
    return;
  }

  return polyline
    .replace('poly,', '')
    .split(',')
    .reduce((memo, point, i) => {
      if (i % 2) {
        memo[memo.length - 1].push(parseInt(point, 10));
      } else {
        memo.push([parseInt(point, 10)]);
      }
      return memo;
    }, []);
}

function scalePolylinePoints(polylinePoints, scale) {
  if (!polylinePoints) {
    return;
  }

  return polylinePoints.map(([x, y]) => [Math.round(x * scale), Math.round(y * scale)]);
}

function polylinePointsToPolyline(polylinePoints) {
  if (!polylinePoints) {
    return;
  }
  return polylinePoints.reduce((memo, [x, y]) => `${memo}${x},${y},`, '').replace(/,$/, '');
}

const PolyPointRadius = 10;
function PolyPoint({ index, x, y, onDragend, onRemove }) {
  const [hidden, setHidden] = useState(false);
  const handleDragStart = useCallback(() => {
    setHidden(true);
  }, [setHidden]);
  const handleDrag = useCallback(
    (event) => {
      const { offsetX, offsetY } = event;
      onDragend(index, event.offsetX + x - PolyPointRadius, event.offsetY + y - PolyPointRadius);
    },
    [onDragend, index]
  );
  const handleDragEnd = useCallback(() => {
    setHidden(false);
  }, [setHidden]);

  const handleRightClick = useCallback(
    (event) => {
      event.preventDefault();
      onRemove(index);
    },
    [onRemove, index]
  );

  const handleClick = useCallback((event) => {
    event.stopPropagation();
    event.preventDefault();
  }, []);

  return (
    <div
      className={`${hidden ? 'opacity-0' : ''} bg-gray-900 rounded-full absolute z-20`}
      style={`top: ${y - PolyPointRadius}px; left: ${x - PolyPointRadius}px; width: 20px; height: 20px;`}
      draggable
      onclick={handleClick}
      oncontextmenu={handleRightClick}
      ondragstart={handleDragStart}
      ondrag={handleDrag}
      ondragend={handleDragEnd}
    />
  );
}

import { h } from 'preact';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import Heading from '../components/Heading.jsx';
import Switch from '../components/Switch.jsx';
import { useResizeObserver } from '../hooks';
import { useCallback, useMemo, useRef, useState } from 'preact/hooks';
import { useApiHost } from '../api';
import useSWR from 'swr';

export default function CameraMasks({ camera }) {
  const { data: config } = useSWR('config');
  const apiHost = useApiHost();
  const imageRef = useRef(null);
  const [snap, setSnap] = useState(true);

  const cameraConfig = config.cameras[camera];
  const {
    motion: { mask: motionMask },
    objects: { filters: objectFilters },
    zones,
  } = cameraConfig;

  const { width, height } = cameraConfig.detect;

  const [{ width: scaledWidth }] = useResizeObserver(imageRef);
  const imageScale = scaledWidth / width;

  const [motionMaskPoints, setMotionMaskPoints] = useState(
    Array.isArray(motionMask)
      ? motionMask.map((mask) => getPolylinePoints(mask))
      : motionMask
        ? [getPolylinePoints(motionMask)]
        : []
  );

  const [zonePoints, setZonePoints] = useState(
    Object.keys(zones).reduce((memo, zone) => ({ ...memo, [zone]: getPolylinePoints(zones[zone].coordinates) }), {})
  );

  const [objectMaskPoints, setObjectMaskPoints] = useState(
    Object.keys(objectFilters).reduce(
      (memo, name) => ({
        ...memo,
        [name]: Array.isArray(objectFilters[name].mask)
          ? objectFilters[name].mask.map((mask) => getPolylinePoints(mask))
          : objectFilters[name].mask
            ? [getPolylinePoints(objectFilters[name].mask)]
            : [],
      }),
      {}
    )
  );

  const [editing, setEditing] = useState({ set: motionMaskPoints, key: 0, fn: setMotionMaskPoints });

  const handleUpdateEditable = useCallback(
    (newPoints) => {
      let newSet;
      if (Array.isArray(editing.set)) {
        newSet = [...editing.set];
        newSet[editing.key] = newPoints;
      } else if (editing.subkey !== undefined) {
        newSet = { ...editing.set };
        newSet[editing.key][editing.subkey] = newPoints;
      } else {
        newSet = { ...editing.set, [editing.key]: newPoints };
      }
      editing.set = newSet;
      editing.fn(newSet);
    },
    [editing]
  );

  // Motion mask methods
  const handleAddMask = useCallback(() => {
    const newMotionMaskPoints = [...motionMaskPoints, []];
    setMotionMaskPoints(newMotionMaskPoints);
    setEditing({ set: newMotionMaskPoints, key: newMotionMaskPoints.length - 1, fn: setMotionMaskPoints });
  }, [motionMaskPoints, setMotionMaskPoints]);

  const handleEditMask = useCallback(
    (key) => {
      setEditing({ set: motionMaskPoints, key, fn: setMotionMaskPoints });
    },
    [setEditing, motionMaskPoints, setMotionMaskPoints]
  );

  const handleRemoveMask = useCallback(
    (key) => {
      const newMotionMaskPoints = [...motionMaskPoints];
      newMotionMaskPoints.splice(key, 1);
      setMotionMaskPoints(newMotionMaskPoints);
    },
    [motionMaskPoints, setMotionMaskPoints]
  );

  const handleCopyMotionMasks = useCallback(async () => {
    await window.navigator.clipboard.writeText(`  motion:
    mask:
${motionMaskPoints.map((mask) => `      - ${polylinePointsToPolyline(mask)}`).join('\n')}`);
  }, [motionMaskPoints]);

  // Zone methods
  const handleEditZone = useCallback(
    (key) => {
      setEditing({ set: zonePoints, key, fn: setZonePoints });
    },
    [setEditing, zonePoints, setZonePoints]
  );

  const handleAddZone = useCallback(() => {
    const n = Object.keys(zonePoints).filter((name) => name.startsWith('zone_')).length;
    const zoneName = `zone_${n}`;
    const newZonePoints = { ...zonePoints, [zoneName]: [] };
    setZonePoints(newZonePoints);
    setEditing({ set: newZonePoints, key: zoneName, fn: setZonePoints });
  }, [zonePoints, setZonePoints]);

  const handleRemoveZone = useCallback(
    (key) => {
      const newZonePoints = { ...zonePoints };
      delete newZonePoints[key];
      setZonePoints(newZonePoints);
    },
    [zonePoints, setZonePoints]
  );

  const handleCopyZones = useCallback(async () => {
    await window.navigator.clipboard.writeText(`  zones:
${Object.keys(zonePoints)
    .map(
      (zoneName) => `    ${zoneName}:
      coordinates: ${polylinePointsToPolyline(zonePoints[zoneName])}`
    )
    .join('\n')}`);
  }, [zonePoints]);

  // Object methods
  const handleEditObjectMask = useCallback(
    (key, subkey) => {
      setEditing({ set: objectMaskPoints, key, subkey, fn: setObjectMaskPoints });
    },
    [setEditing, objectMaskPoints, setObjectMaskPoints]
  );

  const handleAddObjectMask = useCallback(() => {
    const n = Object.keys(objectMaskPoints).filter((name) => name.startsWith('object_')).length;
    const newObjectName = `object_${n}`;
    const newObjectMaskPoints = { ...objectMaskPoints, [newObjectName]: [[]] };
    setObjectMaskPoints(newObjectMaskPoints);
    setEditing({ set: newObjectMaskPoints, key: newObjectName, subkey: 0, fn: setObjectMaskPoints });
  }, [objectMaskPoints, setObjectMaskPoints, setEditing]);

  const handleRemoveObjectMask = useCallback(
    (key, subkey) => {
      const newObjectMaskPoints = { ...objectMaskPoints };
      delete newObjectMaskPoints[key][subkey];
      setObjectMaskPoints(newObjectMaskPoints);
    },
    [objectMaskPoints, setObjectMaskPoints]
  );

  const handleCopyObjectMasks = useCallback(async () => {
    await window.navigator.clipboard.writeText(`  objects:
    filters:
${Object.keys(objectMaskPoints)
    .map((objectName) =>
      objectMaskPoints[objectName].length
        ? `      ${objectName}:
        mask: ${polylinePointsToPolyline(objectMaskPoints[objectName])}`
        : ''
    )
    .filter(Boolean)
    .join('\n')}`);
  }, [objectMaskPoints]);

  const handleAddToObjectMask = useCallback(
    (key) => {
      const newObjectMaskPoints = { ...objectMaskPoints, [key]: [...objectMaskPoints[key], []] };
      setObjectMaskPoints(newObjectMaskPoints);
      setEditing({
        set: newObjectMaskPoints,
        key,
        subkey: newObjectMaskPoints[key].length - 1,
        fn: setObjectMaskPoints,
      });
    },
    [objectMaskPoints, setObjectMaskPoints, setEditing]
  );

  const handleChangeSnap = useCallback(
    (id, value) => {
      setSnap(value);
    },
    [setSnap]
  );

  return (
    <div className="flex-col space-y-4 p-2 px-4">
      <Heading size="2xl">{camera} mask & zone creator</Heading>

      <Card
        content={
          <div>
            <p>This tool can help you create masks & zones for your {camera} camera.</p>
            <ul>
              <li>Click to add a point.</li>
              <li>Click and hold on an existing point to move it.</li>
              <li>Right-Click on an existing point to delete it.</li>
            </ul>
          </div>
        }
        header="Instructions"
      />

      <Card
        content={
          <p>
            When done, copy each mask configuration into your <code className="font-mono">config.yml</code> file
            restart your Frigate instance to save your changes.
          </p>
        }
        header="Warning"
      />

      <div className="space-y-4">
        <div className="relative">
          <img ref={imageRef} src={`${apiHost}/api/${camera}/latest.jpg`} />
          <EditableMask
            onChange={handleUpdateEditable}
            points={'subkey' in editing ? editing.set[editing.key][editing.subkey] : editing.set[editing.key]}
            scale={imageScale}
            snap={snap}
            width={width}
            height={height}
          />
        </div>
        <div className="max-w-xs">
          <Switch checked={snap} label="Snap to edges" labelPosition="after" onChange={handleChangeSnap} />
        </div>
      </div>

      <div className="flex-col space-y-4">
        <MaskValues
          editing={editing}
          title="Motion masks"
          onCopy={handleCopyMotionMasks}
          onCreate={handleAddMask}
          onEdit={handleEditMask}
          onRemove={handleRemoveMask}
          points={motionMaskPoints}
          yamlPrefix={'motion:\n  mask:'}
          yamlKeyPrefix={maskYamlKeyPrefix}
        />

        <MaskValues
          editing={editing}
          title="Zones"
          onCopy={handleCopyZones}
          onCreate={handleAddZone}
          onEdit={handleEditZone}
          onRemove={handleRemoveZone}
          points={zonePoints}
          yamlPrefix="zones:"
          yamlKeyPrefix={zoneYamlKeyPrefix}
        />

        <MaskValues
          isMulti
          editing={editing}
          title="Object masks"
          onAdd={handleAddToObjectMask}
          onCopy={handleCopyObjectMasks}
          onCreate={handleAddObjectMask}
          onEdit={handleEditObjectMask}
          onRemove={handleRemoveObjectMask}
          points={objectMaskPoints}
          yamlPrefix={'objects:\n  filters:'}
          yamlKeyPrefix={objectYamlKeyPrefix}
        />
      </div>
    </div>
  );
}

function maskYamlKeyPrefix() {
  return '    - ';
}

function zoneYamlKeyPrefix(_points, key) {
  return `  ${key}:
    coordinates: `;
}

function objectYamlKeyPrefix() {
  return '        - ';
}

const MaskInset = 20;

function boundedSize(value, maxValue, snap) {
  const newValue = Math.min(Math.max(0, Math.round(value)), maxValue);
  if (snap) {
    if (newValue <= MaskInset) {
      return 0;
    } else if (maxValue - newValue <= MaskInset) {
      return maxValue;
    }
  }

  return newValue;
}

function EditableMask({ onChange, points, scale, snap, width, height }) {
  const boundingRef = useRef(null);

  const handleMovePoint = useCallback(
    (index, newX, newY) => {
      if (newX < 0 && newY < 0) {
        return;
      }
      const x = boundedSize(newX / scale, width, snap);
      const y = boundedSize(newY / scale, height, snap);

      const newPoints = [...points];
      newPoints[index] = [x, y];
      onChange(newPoints);
    },
    [height, width, onChange, scale, points, snap]
  );

  // Add a new point between the closest two other points
  const handleAddPoint = useCallback(
    (event) => {
      const { offsetX, offsetY } = event;
      const scaledX = boundedSize((offsetX - MaskInset) / scale, width, snap);
      const scaledY = boundedSize((offsetY - MaskInset) / scale, height, snap);
      const newPoint = [scaledX, scaledY];

      const { index } = points.reduce(
        (result, point, i) => {
          const nextPoint = points.length === i + 1 ? points[0] : points[i + 1];
          const distance0 = Math.sqrt(Math.pow(point[0] - newPoint[0], 2) + Math.pow(point[1] - newPoint[1], 2));
          const distance1 = Math.sqrt(Math.pow(point[0] - nextPoint[0], 2) + Math.pow(point[1] - nextPoint[1], 2));
          const distance = distance0 + distance1;
          return distance < result.distance ? { distance, index: i } : result;
        },
        { distance: Infinity, index: -1 }
      );
      const newPoints = [...points];
      newPoints.splice(index, 0, newPoint);
      onChange(newPoints);
    },
    [height, width, scale, points, onChange, snap]
  );

  const handleRemovePoint = useCallback(
    (index) => {
      const newPoints = [...points];
      newPoints.splice(index, 1);
      onChange(newPoints);
    },
    [points, onChange]
  );

  const scaledPoints = useMemo(() => scalePolylinePoints(points, scale), [points, scale]);

  return (
    <div
      className="absolute"
      style={`top: -${MaskInset}px; right: -${MaskInset}px; bottom: -${MaskInset}px; left: -${MaskInset}px`}
    >
      {!scaledPoints
        ? null
        : scaledPoints.map(([x, y], i) => (
          <PolyPoint
            key={i}
            boundingRef={boundingRef}
            index={i}
            onMove={handleMovePoint}
            onRemove={handleRemovePoint}
            x={x + MaskInset}
            y={y + MaskInset}
          />
        ))}
      <div className="absolute inset-0 right-0 bottom-0" onClick={handleAddPoint} ref={boundingRef} />
      <svg
        width="100%"
        height="100%"
        className="absolute pointer-events-none"
        style={`top: ${MaskInset}px; right: ${MaskInset}px; bottom: ${MaskInset}px; left: ${MaskInset}px`}
      >
        {!scaledPoints ? null : (
          <g>
            <polyline points={polylinePointsToPolyline(scaledPoints)} fill="rgba(244,0,0,0.5)" />
          </g>
        )}
      </svg>
    </div>
  );
}

function MaskValues({
  isMulti = false,
  editing,
  title,
  onAdd,
  onCopy,
  onCreate,
  onEdit,
  onRemove,
  points,
  yamlPrefix,
  yamlKeyPrefix,
}) {
  const [showButtons, setShowButtons] = useState(false);

  const handleMousein = useCallback(() => {
    setShowButtons(true);
  }, [setShowButtons]);

  const handleMouseout = useCallback(
    (event) => {
      const el = event.toElement || event.relatedTarget;
      if (!el || el.parentNode === event.target) {
        return;
      }
      setShowButtons(false);
    },
    [setShowButtons]
  );

  const handleEdit = useCallback(
    (event) => {
      const { key, subkey } = event.target.dataset;
      onEdit(key, subkey);
    },
    [onEdit]
  );

  const handleRemove = useCallback(
    (event) => {
      const { key, subkey } = event.target.dataset;
      onRemove(key, subkey);
    },
    [onRemove]
  );

  const handleAdd = useCallback(
    (event) => {
      const { key } = event.target.dataset;
      onAdd(key);
    },
    [onAdd]
  );

  return (
    <div className="overflow-hidden" onMouseOver={handleMousein} onMouseOut={handleMouseout}>
      <div className="flex space-x-4">
        <Heading className="flex-grow self-center" size="base">
          {title}
        </Heading>
        <Button onClick={onCopy}>Copy</Button>
        <Button onClick={onCreate}>Add</Button>
      </div>
      <pre className="relative overflow-auto font-mono text-gray-900 dark:text-gray-100 rounded bg-gray-100 dark:bg-gray-800 p-2">
        {yamlPrefix}
        {Object.keys(points).map((mainkey) => {
          if (isMulti) {
            return (
              <div key={mainkey}>
                {`    ${mainkey}:\n      mask:\n`}
                {onAdd && showButtons ? (
                  <Button className="absolute -mt-12 right-0 font-sans" data-key={mainkey} onClick={handleAdd}>
                    {`Add to ${mainkey}`}
                  </Button>
                ) : null}
                {points[mainkey].map((item, subkey) => (
                  <Item
                    key={subkey}
                    mainkey={mainkey}
                    subkey={subkey}
                    editing={editing}
                    handleEdit={handleEdit}
                    handleRemove={handleRemove}
                    points={item}
                    showButtons={showButtons}
                    yamlKeyPrefix={yamlKeyPrefix}
                  />
                ))}
              </div>
            );
          }
          return (
            <Item
              key={mainkey}
              mainkey={mainkey}
              editing={editing}
              handleAdd={onAdd ? handleAdd : undefined}
              handleEdit={handleEdit}
              handleRemove={handleRemove}
              points={points[mainkey]}
              showButtons={showButtons}
              yamlKeyPrefix={yamlKeyPrefix}
            />
          );
        })}
      </pre>
    </div>
  );
}

function Item({ mainkey, subkey, editing, handleEdit, points, showButtons, _handleAdd, handleRemove, yamlKeyPrefix }) {
  return (
    <span
      data-key={mainkey}
      data-subkey={subkey}
      className={`block hover:text-blue-400 cursor-pointer relative ${
        editing.key === mainkey && editing.subkey === subkey ? 'text-blue-800 dark:text-blue-600' : ''
      }`}
      onClick={handleEdit}
      title="Click to edit"
    >
      {`${yamlKeyPrefix(points, mainkey, subkey)}${polylinePointsToPolyline(points)}`}
      {showButtons ? (
        <Button
          className="absolute top-0 right-0"
          color="red"
          data-key={mainkey}
          data-subkey={subkey}
          onClick={handleRemove}
        >
          Remove
        </Button>
      ) : null}
    </span>
  );
}

function getPolylinePoints(polyline) {
  if (!polyline) {
    return;
  }

  return polyline.split(',').reduce((memo, point, i) => {
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
function PolyPoint({ boundingRef, index, x, y, onMove, onRemove }) {
  const [hidden, setHidden] = useState(false);

  const handleDragOver = useCallback(
    (event) => {
      if (
        !boundingRef.current ||
        (event.target !== boundingRef.current && !boundingRef.current.contains(event.target))
      ) {
        return;
      }
      onMove(index, event.layerX - PolyPointRadius * 2, event.layerY - PolyPointRadius * 2);
    },
    [onMove, index, boundingRef]
  );

  const handleDragStart = useCallback(() => {
    boundingRef.current && boundingRef.current.addEventListener('dragover', handleDragOver, false);
    setHidden(true);
  }, [setHidden, boundingRef, handleDragOver]);

  const handleDragEnd = useCallback(() => {
    boundingRef.current && boundingRef.current.removeEventListener('dragover', handleDragOver);
    setHidden(false);
  }, [setHidden, boundingRef, handleDragOver]);

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
      onClick={handleClick}
      onContextMenu={handleRightClick}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    />
  );
}

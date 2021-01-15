import { h } from 'preact';
import Button from './components/Button';
import Heading from './components/Heading';
import Switch from './components/Switch';
import { route } from 'preact-router';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { ApiHost, Config } from './context';

export default function CameraMasks({ camera, url }) {
  const config = useContext(Config);
  const apiHost = useContext(ApiHost);
  const imageRef = useRef(null);
  const [imageScale, setImageScale] = useState(1);

  if (!(camera in config.cameras)) {
    return <div>{`No camera named ${camera}`}</div>;
  }

  const cameraConfig = config.cameras[camera];
  const {
    width,
    height,
    motion: { mask: motionMask },
    objects: { filters: objectFilters },
    zones,
  } = cameraConfig;

  useEffect(() => {
    if (!imageRef.current) {
      return;
    }
    const scaledWidth = imageRef.current.width;
    const scale = scaledWidth / width;
    setImageScale(scale);
  }, [imageRef.current, setImageScale]);

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

  const handleSelectEditable = useCallback(
    (name) => {
      setEditing(name);
    },
    [setEditing]
  );

  const handleRemoveEditable = useCallback(
    (name) => {
      const filteredZonePoints = Object.keys(zonePoints)
        .filter((zoneName) => zoneName !== name)
        .reduce((memo, name) => {
          memo[name] = zonePoints[name];
          return memo;
        }, {});
      setZonePoints(filteredZonePoints);
    },
    [zonePoints, setZonePoints]
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
${motionMaskPoints.map((mask, i) => `      - ${polylinePointsToPolyline(mask)}`).join('\n')}`);
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
    const newObjectMaskPoints = { ...objectMaskPoints, [newObjectName]: [] };
    setObjectMaskPoints(newObjectMaskPoints);
    setEditing({ set: newObjectMaskPoints, key: newObjectName, subkey: 0, fn: setObjectMaskPoints });
  }, [objectMaskPoints, setObjectMaskPoints, setEditing]);

  const handleRemoveObjectMask = useCallback(
    (key, subkey) => {
      const newObjectMaskPoints = { ...objectMaskPoints };
      delete newObjectMaskPoints[key];
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

  return (
    <div class="flex-col space-y-4" style={`max-width: ${width}px`}>
      <Heading size="2xl">{camera} mask & zone creator</Heading>
      <p>
        This tool can help you create masks & zones for your {camera} camera. When done, copy each mask configuration
        into your <code className="font-mono">config.yml</code> file restart your Frigate instance to save your changes.
      </p>
      <div className="relative">
        <img ref={imageRef} width={width} height={height} src={`${apiHost}/api/${camera}/latest.jpg`} />
        <EditableMask
          onChange={handleUpdateEditable}
          points={editing.subkey ? editing.set[editing.key][editing.subkey] : editing.set[editing.key]}
          scale={imageScale}
          width={width}
          height={height}
        />
      </div>

      <div class="flex-col space-y-4">
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

function maskYamlKeyPrefix(points) {
  return `    - `;
}

function zoneYamlKeyPrefix(points, key) {
  return `  ${key}:
    coordinates: `;
}

function objectYamlKeyPrefix(points, key, subkey) {
  return `        - `;
}

function EditableMask({ onChange, points, scale, width, height }) {
  if (!points) {
    return null;
  }
  const boundingRef = useRef(null);

  function boundedSize(value, maxValue) {
    return Math.min(Math.max(0, Math.round(value)), maxValue);
  }

  const handleMovePoint = useCallback(
    (index, newX, newY) => {
      if (newX < 0 && newY < 0) {
        return;
      }
      const x = boundedSize(newX / scale, width);
      const y = boundedSize(newY / scale, height);
      const newPoints = [...points];
      newPoints[index] = [x, y];
      onChange(newPoints);
    },
    [scale, points]
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
      console.log(points, newPoints);
      onChange(newPoints);
    },
    [scale, points, onChange]
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
    <div onclick={handleAddPoint}>
      {!scaledPoints
        ? null
        : scaledPoints.map(([x, y], i) => (
            <PolyPoint
              boundingRef={boundingRef}
              index={i}
              onMove={handleMovePoint}
              onRemove={handleRemovePoint}
              x={x}
              y={y}
            />
          ))}
      <svg
        ref={boundingRef}
        width="100%"
        height="100%"
        className="absolute"
        style="top: 0; left: 0; right: 0; bottom: 0;"
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

  return (
    <div
      className="overflow-hidden rounded border-gray-500 border-solid border p-2"
      onmouseover={handleMousein}
      onmouseout={handleMouseout}
    >
      <div class="flex space-x-4">
        <Heading className="flex-grow self-center" size="base">
          {title}
        </Heading>
        <Button onClick={onCopy}>Copy</Button>
        <Button onClick={onCreate}>Add</Button>
      </div>
      <pre class="overflow-hidden font-mono text-gray-900 dark:text-gray-100">
        {yamlPrefix}
        {Object.keys(points).map((mainkey) => {
          if (isMulti) {
            return (
              <div>
                {`    ${mainkey}:\n      mask:\n`}
                {points[mainkey].map((item, subkey) => (
                  <Item
                    mainkey={mainkey}
                    subkey={subkey}
                    editing={editing}
                    handleEdit={handleEdit}
                    points={item}
                    showButtons={showButtons}
                    handleRemove={handleRemove}
                    yamlKeyPrefix={yamlKeyPrefix}
                  />
                ))}
              </div>
            );
          } else {
            return (
              <Item
                mainkey={mainkey}
                editing={editing}
                handleEdit={handleEdit}
                points={points[mainkey]}
                showButtons={showButtons}
                handleRemove={handleRemove}
                yamlKeyPrefix={yamlKeyPrefix}
              />
            );
          }
        })}
      </pre>
    </div>
  );
}

function Item({ mainkey, subkey, editing, handleEdit, points, showButtons, handleRemove, yamlKeyPrefix }) {
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

function distance([x0, y0], [x1, y1]) {
  return Math.sqrt(Math.pow(x0 - x1, 2) + Math.pow(y0 - y1, 2));
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
      if (event.target !== boundingRef.current && !boundingRef.current.contains(event.target)) {
        return;
      }
      onMove(index, event.layerX, event.layerY - PolyPointRadius);
    },
    [onMove, index, boundingRef.current]
  );

  const handleDragStart = useCallback(() => {
    boundingRef.current && boundingRef.current.addEventListener('dragover', handleDragOver, false);
    setHidden(true);
  }, [setHidden, boundingRef.current, handleDragOver]);

  const handleDragEnd = useCallback(() => {
    boundingRef.current && boundingRef.current.removeEventListener('dragover', handleDragOver);
    setHidden(false);
  }, [setHidden, boundingRef.current, handleDragOver]);

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
      ondragend={handleDragEnd}
    />
  );
}

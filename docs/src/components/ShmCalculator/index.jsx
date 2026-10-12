import React, { useState, useEffect } from "react";
import Admonition from "@theme/Admonition";
import styles from "./styles.module.css";

// follows calculate_shm_requirements() in frigate/util/services.py, but sizes
// for 25 frames so float rounding can't land under its 20 frame warning
const MB = 1048576;
const RESERVED_MB = 50; // logs + nginx cache
const TARGET_FRAMES = 25;
const DEFAULT_FRAMES = 50;

const frameMb = (width, height) =>
  Math.round(((width * height * 1.5 + 270480) / MB) * 10) / 10;

// room for 2 cameras added at runtime, sized as 720p
const addedCamerasMb = 2 * frameMb(1280, 720);

const ShmCalculator = () => {
  const [width, setWidth] = useState(1280);
  const [height, setHeight] = useState(720);
  const [cameraCount, setCameraCount] = useState(1);
  const [result, setResult] = useState("-");
  const [singleCameraShm, setSingleCameraShm] = useState("-");
  const [addedCamerasShm, setAddedCamerasShm] = useState("-");
  const [fullRingShm, setFullRingShm] = useState("-");

  const calculate = () => {
    if (!width || !height || !cameraCount) {
      setResult("Please enter valid values");
      setSingleCameraShm("-");
      setAddedCamerasShm("-");
      setFullRingShm("-");
      return;
    }

    const cameraFramesMb = cameraCount * frameMb(width, height) + addedCamerasMb;

    setSingleCameraShm(formatMb(frameMb(width, height) * TARGET_FRAMES));
    setAddedCamerasShm(formatMb(addedCamerasMb * TARGET_FRAMES));
    setResult(formatMb(Math.round(RESERVED_MB + cameraFramesMb * TARGET_FRAMES)));
    setFullRingShm(
      formatMb(Math.round(RESERVED_MB + cameraFramesMb * DEFAULT_FRAMES)),
    );
  };

  const formatMb = (value) => {
    if (value >= 1024) {
      return `${(value / 1024).toFixed(2)}gb`;
    }

    return `${Number(value.toFixed(2))}mb`;
  };

  const formatWithUnit = (value) => {
    const match = value.match(/^([\d.]+)(mb|kb|gb)$/i);
    if (match) {
      return (
        <>
          {match[1]}<span className={styles.unit}>{match[2]}</span>
        </>
      );
    }
    return value;
  };

  const applyPreset = (w, h, count) => {
    setWidth(w);
    setHeight(h);
    setCameraCount(count);
    calculate();
  };

  useEffect(() => {
    calculate();
  }, [width, height, cameraCount]);

  return (
    <div className={styles.shmCalculator}>
      <div className={styles.card}>
        <h3 className={styles.title}>SHM Calculator</h3>
        <p className={styles.description}>
          Calculate required shared memory (SHM) based on camera resolution and
          count
        </p>

        <Admonition type="note">
          The resolution below is the <strong>detect</strong> stream resolution,
          not the <strong>record</strong> stream resolution. SHM size is
          determined by the detect resolution used for object detection.{" "}
          <a href="/frigate/camera_setup#choosing-a-detect-resolution">
            Learn more about choosing a detect resolution.
          </a>
        </Admonition>

        {width * height > 1280 * 720 && (
          <Admonition type="warning">
            Using a detect resolution higher than 720p is not recommended.
            Higher resolutions do not improve object detection accuracy and will
            consume significantly more resources.
          </Admonition>
        )}

        <div className="row">
          <div className="col col--6">
            <div className={styles.formGroup}>
              <label htmlFor="width" className={styles.label}>
                Width:
              </label>
              <input
                id="width"
                type="number"
                min="1"
                placeholder="e.g.: 1280"
                className={styles.input}
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="col col--6">
            <div className={styles.formGroup}>
              <label htmlFor="height" className={styles.label}>
                Height:
              </label>
              <input
                id="height"
                type="number"
                min="1"
                placeholder="e.g.: 720"
                className={styles.input}
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="cameraCount" className={styles.label}>
            Camera Count:
          </label>
          <input
            id="cameraCount"
            type="number"
            min="1"
            placeholder="e.g.: 8"
            className={styles.input}
            value={cameraCount}
            onChange={(e) => setCameraCount(Number(e.target.value))}
          />
        </div>

        <div className={styles.resultSection}>
          <h4>Calculation Result</h4>
          <div className={styles.resultValue}>
            <span className={styles.resultNumber}>{formatWithUnit(result)}</span>
          </div>
          <div className={styles.formulaDisplay}>
            <p>
              <strong>Per Camera:</strong> {formatWithUnit(singleCameraShm)}
            </p>
            <p>
              <strong>Formula:</strong> (width × height × 1.5 + 270480) ÷
              1048576 × {TARGET_FRAMES} frames
            </p>
            <p>
              <strong>Room for 2 Added Cameras:</strong>{" "}
              {formatWithUnit(addedCamerasShm)}
            </p>
            <p>
              <strong>Logs and Cache:</strong> + {RESERVED_MB}
              <span className={styles.unit}>mb</span>
            </p>
            <p>
              <strong>Birdseye Restream:</strong> + 8
              <span className={styles.unit}>mb</span> if enabled
            </p>
            <p>
              <strong>For {DEFAULT_FRAMES} Frames:</strong>{" "}
              {formatWithUnit(fullRingShm)}
            </p>
          </div>
        </div>

        <div className={styles.presets}>
          <h4>Common Presets</h4>
          <div className={styles.presetButtons}>
            <button
              className="button button--outline button--primary button--sm"
              onClick={() => applyPreset(640, 360, 1)}
            >
              640x360 × 1
            </button>
            <button
              className="button button--outline button--primary button--sm"
              onClick={() => applyPreset(1280, 720, 1)}
            >
              1280x720 × 1
            </button>
            <button
              className="button button--outline button--primary button--sm"
              onClick={() => applyPreset(1280, 720, 4)}
            >
              1280x720 × 4
            </button>
            <button
              className="button button--outline button--primary button--sm"
              onClick={() => applyPreset(1280, 720, 8)}
            >
              1280x720 × 8
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShmCalculator;

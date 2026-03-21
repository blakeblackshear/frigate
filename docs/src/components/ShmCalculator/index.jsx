import React, { useState, useEffect } from "react";
import Admonition from "@theme/Admonition";
import styles from "./styles.module.css";

const ShmCalculator = () => {
  const [width, setWidth] = useState(1280);
  const [height, setHeight] = useState(720);
  const [cameraCount, setCameraCount] = useState(1);
  const [result, setResult] = useState("26.32MB");
  const [singleCameraShm, setSingleCameraShm] = useState("26.32MB");
  const [totalShm, setTotalShm] = useState("26.32MB");

  const calculate = () => {
    if (!width || !height || !cameraCount) {
      setResult("Please enter valid values");
      setSingleCameraShm("-");
      setTotalShm("-");
      return;
    }

    // Single camera base SHM calculation (excluding logs)
    // Formula: (width * height * 1.5 * 20 + 270480) / 1048576
    const singleCameraBase =
      (width * height * 1.5 * 20 + 270480) / 1048576;
    setSingleCameraShm(`${singleCameraBase.toFixed(2)}mb`);

    // Total SHM calculation (multiple cameras, including logs)
    const totalBase = singleCameraBase * cameraCount;
    const finalResult = totalBase + 40; // Default includes logs +40mb

    setTotalShm(`${(totalBase + 40).toFixed(2)}mb`);

    // Format result
    if (finalResult < 1) {
      setResult(`${(finalResult * 1024).toFixed(2)}kb`);
    } else if (finalResult >= 1024) {
      setResult(`${(finalResult / 1024).toFixed(2)}gb`);
    } else {
      setResult(`${finalResult.toFixed(2)}mb`);
    }
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
              <strong>Single Camera:</strong> {formatWithUnit(singleCameraShm)}
            </p>
            <p>
              <strong>Formula:</strong> (width × height × 1.5 × 20 + 270480) ÷
              1048576
            </p>
            {cameraCount > 1 && (
              <p>
                <strong>Total ({cameraCount} cameras):</strong> {formatWithUnit(totalShm)}
              </p>
            )}
            <p>
              <strong>With Logs:</strong> + 40<span className={styles.unit}>mb</span>
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

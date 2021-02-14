import { h } from 'preact';
import ActivityIndicator from '../components/ActivityIndicator';
import Button from '../components/Button';
import Heading from '../components/Heading';
import Link from '../components/Link';
import { useConfig, useStats } from '../api';
import { Table, Tbody, Thead, Tr, Th, Td } from '../components/Table';
import { useCallback, useEffect, useState } from 'preact/hooks';

const emptyObject = Object.freeze({});

export default function Debug() {
  const config = useConfig();

  const [timeoutId, setTimeoutId] = useState(null);
  const { data: stats } = useStats(null, timeoutId);

  const forceUpdate = useCallback(() => {
    const timeoutId = setTimeout(forceUpdate, 1000);
    setTimeoutId(timeoutId);
  }, []);

  useEffect(() => {
    forceUpdate();
  }, [forceUpdate]);

  useEffect(() => {
    return () => {
      clearTimeout(timeoutId);
    };
  }, [timeoutId]);

  const { detectors, service, detection_fps, ...cameras } = stats || emptyObject;

  const detectorNames = Object.keys(detectors || emptyObject);
  const detectorDataKeys = Object.keys(detectors ? detectors[detectorNames[0]] : emptyObject);
  const cameraNames = Object.keys(cameras || emptyObject);
  const cameraDataKeys = Object.keys(cameras[cameraNames[0]] || emptyObject);

  const handleCopyConfig = useCallback(() => {
    async function copy() {
      await window.navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    }
    copy();
  }, [config]);

  return stats === null ? (
    <ActivityIndicator />
  ) : (
    <div className="space-y-4">
      <Heading>
        Debug <span className="text-sm">{service.version}</span>
      </Heading>

      <div data-testid="detectors" className="min-w-0 overflow-auto">
        <Table className="w-full">
          <Thead>
            <Tr>
              <Th>detector</Th>
              {detectorDataKeys.map((name) => (
                <Th>{name.replace('_', ' ')}</Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {detectorNames.map((detector, i) => (
              <Tr index={i}>
                <Td>{detector}</Td>
                {detectorDataKeys.map((name) => (
                  <Td key={`${name}-${detector}`}>{detectors[detector][name]}</Td>
                ))}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>

      <div data-testid="cameras" className="min-w-0 overflow-auto">
        <Table className="w-full">
          <Thead>
            <Tr>
              <Th>camera</Th>
              {cameraDataKeys.map((name) => (
                <Th>{name.replace('_', ' ')}</Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {cameraNames.map((camera, i) => (
              <Tr index={i}>
                <Td>
                  <Link href={`/cameras/${camera}`}>{camera}</Link>
                </Td>
                {cameraDataKeys.map((name) => (
                  <Td key={`${name}-${camera}`}>{cameras[camera][name]}</Td>
                ))}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>

      <div className="relative">
        <Heading size="sm">Config</Heading>
        <Button className="absolute top-8 right-4" onClick={handleCopyConfig}>
          Copy to Clipboard
        </Button>
        <pre className="overflow-auto font-mono text-gray-900 dark:text-gray-100 rounded bg-gray-100 dark:bg-gray-800 p-2 max-h-96">
          {JSON.stringify(config, null, 2)}
        </pre>
      </div>
    </div>
  );
}

import { h } from 'preact';
import ActivityIndicator from './components/ActivityIndicator';
import Box from './components/Box';
import Button from './components/Button';
import Heading from './components/Heading';
import Link from './components/Link';
import { FetchStatus, useConfig, useStats } from './api';
import { Table, Tbody, Thead, Tr, Th, Td } from './components/Table';
import { useCallback, useEffect, useState } from 'preact/hooks';

export default function Debug() {
  const config = useConfig();

  const [timeoutId, setTimeoutId] = useState(null);

  const forceUpdate = useCallback(async () => {
    setTimeoutId(setTimeout(forceUpdate, 1000));
  }, []);

  useEffect(() => {
    forceUpdate();
  }, []);

  useEffect(() => {
    return () => {
      clearTimeout(timeoutId);
    };
  }, [timeoutId]);
  const { data: stats, status } = useStats(null, timeoutId);

  if (stats === null && (status === FetchStatus.LOADING || status === FetchStatus.NONE)) {
    return <ActivityIndicator />;
  }

  const { detectors, detection_fps, service, ...cameras } = stats;

  const detectorNames = Object.keys(detectors);
  const detectorDataKeys = Object.keys(detectors[detectorNames[0]]);

  const cameraNames = Object.keys(cameras);
  const cameraDataKeys = Object.keys(cameras[cameraNames[0]]);

  const handleCopyConfig = useCallback(async () => {
    await window.navigator.clipboard.writeText(JSON.stringify(config, null, 2));
  }, [config]);

  return (
    <div class="space-y-4">
      <Heading>
        Debug <span className="text-sm">{service.version}</span>
      </Heading>

      <Box>
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
      </Box>

      <Box>
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
      </Box>

      <Box className="relative">
        <Heading size="sm">Config</Heading>
        <Button className="absolute top-4 right-8" onClick={handleCopyConfig}>
          Copy to Clipboard
        </Button>
        <pre className="overflow-auto font-mono text-gray-900 dark:text-gray-100 rounded bg-gray-100 dark:bg-gray-800 p-2 max-h-96">
          {JSON.stringify(config, null, 2)}
        </pre>
      </Box>
    </div>
  );
}

import { h } from 'preact';
import Box from './components/Box';
import Button from './components/Button';
import Heading from './components/Heading';
import Link from './components/Link';
import { ApiHost, Config } from './context';
import { Table, Tbody, Thead, Tr, Th, Td } from './components/Table';
import { useCallback, useContext, useEffect, useState } from 'preact/hooks';

export default function Debug() {
  const apiHost = useContext(ApiHost);
  const config = useContext(Config);
  const [stats, setStats] = useState({});
  const [timeoutId, setTimeoutId] = useState(null);

  const fetchStats = useCallback(async () => {
    const statsResponse = await fetch(`${apiHost}/api/stats`);
    const stats = statsResponse.ok ? await statsResponse.json() : {};
    setStats(stats);
    setTimeoutId(setTimeout(fetchStats, 1000));
  }, [setStats]);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    return () => {
      clearTimeout(timeoutId);
    };
  }, [timeoutId]);

  const { detectors, detection_fps, service, ...cameras } = stats;
  if (!service) {
    return 'loading…';
  }

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

import { h, Fragment } from 'preact';
import ActivityIndicator from '../components/ActivityIndicator';
import Button from '../components/Button';
import Heading from '../components/Heading';
import Link from '../components/Link';
import { useMqtt } from '../api/mqtt';
import useSWR from 'swr';
import axios from 'axios';
import { Table, Tbody, Thead, Tr, Th, Td } from '../components/Table';
import { useCallback } from 'preact/hooks';

const emptyObject = Object.freeze({});

export default function Debug() {
  const { data: config } = useSWR('config');

  const {
    value: { payload: stats },
  } = useMqtt('stats');
  const { data: initialStats } = useSWR('stats');

  const { cpu_usages, detectors, service = {}, detection_fps: _, ...cameras } = stats || initialStats || emptyObject;

  const detectorNames = Object.keys(detectors || emptyObject);
  const detectorDataKeys = Object.keys(detectors ? detectors[detectorNames[0]] : emptyObject);
  const cameraNames = Object.keys(cameras || emptyObject);

  const handleCopyConfig = useCallback(() => {
    async function copy() {
      await window.navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    }
    copy();
  }, [config]);

  const onCopyFfprobe = async (camera, e) => {
    if (e) {
      e.stopPropagation();
    }

    const response = await axios.get(`${camera}/ffprobe`);

    if (response.status === 200) {
      await window.navigator.clipboard.writeText(JSON.stringify(response.data, null, 2));
    }
  };

  return (
    <div className="space-y-4 p-2 px-4">
      <Heading>
        Debug <span className="text-sm">{service.version}</span>
      </Heading>

      {!detectors ? (
        <div>
          <ActivityIndicator />
        </div>
      ) : (
        <Fragment>
          <Heading>Detectors</Heading>
          <div data-testid="detectors" className="grid grid-cols-1 3xl:grid-cols-3 md:grid-cols-2 gap-4 p-2 px-4">
            {detectorNames.map((detector) => (
              <div key={detector} className="dark:bg-gray-800 shadow-md hover:shadow-lg rounded-lg transition-shadow p-4 m-2">
                <div className="text-lg flex justify-between">{detector}</div>
                <Table className="w-full">
                  <Thead>
                    <Tr>
                      {detectorDataKeys.map((name) => (
                        <Th key={name}>{name.replace('_', ' ')}</Th>
                      ))}
                    </Tr>
                  </Thead>
                  <Tbody>
                    {detectorNames.map((detector, i) => (
                      <Tr key={i} index={i}>
                        {detectorDataKeys.map((name) => (
                          <Td key={`${name}-${detector}`}>{detectors[detector][name]}</Td>
                        ))}
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </div>
            ))}
          </div>

          <Heading>Cameras</Heading>
          <div data-testid="cameras" className="grid grid-cols-1 3xl:grid-cols-3 md:grid-cols-2 gap-4 p-2 px-4">
            {cameraNames.map((camera) => (
              <div key={camera} className="dark:bg-gray-800 shadow-md hover:shadow-lg rounded-lg transition-shadow p-4 m-2">
                <div className="text-lg flex justify-between">
                  <Link href={`/cameras/${camera}`}>{camera.replaceAll('_', ' ')}</Link>
                  <Button onClick={(e) => onCopyFfprobe(camera, e)}>copy ffprobe</Button>
                </div>
                <div className="p-4">
                  <Table className="w-full">
                    <Thead>
                      <Tr>
                        <Th>Processes</Th>
                        <Th>Process ID</Th>
                        <Th>fps</Th>
                        <Th>Cpu %</Th>
                        <Th>Memory %</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      <Tr key="capture" index="0">
                        <Td>Capture</Td>
                        <Td>{cameras[camera]['capture_pid']}</Td>
                        <Td>{cameras[camera]['process_fps']}</Td>
                        <Td>{cpu_usages[cameras[camera]['capture_pid']]['cpu']}%</Td>
                        <Td>{cpu_usages[cameras[camera]['capture_pid']]['mem']}%</Td>
                      </Tr>
                      <Tr key="detect" index="1">
                        <Td>Detect</Td>
                        <Td>{cameras[camera]['pid']}</Td>
                        <Td>
                          {cameras[camera]['detection_fps']} ({cameras[camera]['skipped_fps']} skipped)
                        </Td>
                        <Td>{cpu_usages[cameras[camera]['pid']]['cpu']}%</Td>
                        <Td>{cpu_usages[cameras[camera]['pid']]['cpu']}%</Td>
                      </Tr>
                      <Tr key="ffmpeg" index="2">
                        <Td>ffmpeg</Td>
                        <Td>{cameras[camera]['ffmpeg_pid']}</Td>
                        <Td>{cameras[camera]['camera_fps']}</Td>
                        <Td>{cpu_usages[cameras[camera]['ffmpeg_pid']]['cpu']}%</Td>
                        <Td>{cpu_usages[cameras[camera]['ffmpeg_pid']]['cpu']}%</Td>
                      </Tr>
                    </Tbody>
                  </Table>
                </div>
              </div>
            ))}
          </div>

          <p>Debug stats update automatically every {config.mqtt.stats_interval} seconds.</p>
        </Fragment>
      )}

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

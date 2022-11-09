import { h, Fragment } from 'preact';
import ActivityIndicator from '../components/ActivityIndicator';
import Button from '../components/Button';
import Heading from '../components/Heading';
import Link from '../components/Link';
import { useMqtt } from '../api/mqtt';
import useSWR from 'swr';
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
  const cameraDataKeys = Object.keys(cameras[cameraNames[0]] || emptyObject);

  const handleCopyConfig = useCallback(() => {
    async function copy() {
      await window.navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    }
    copy();
  }, [config]);

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
          <div data-testid="detectors" className="min-w-0 overflow-auto">
            <Table className="w-full">
              <Thead>
                <Tr>
                  <Th>detector</Th>
                  {detectorDataKeys.map((name) => (
                    <Th key={name}>{name.replace('_', ' ')}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {detectorNames.map((detector, i) => (
                  <Tr key={i} index={i}>
                    <Td>{detector}</Td>
                    {detectorDataKeys.map((name) => (
                      <Td key={`${name}-${detector}`}>{detectors[detector][name]}</Td>
                    ))}
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>

            <Heading>
              Cameras
            </Heading>
            <div data-testid="cameras" className="min-w-0 overflow-auto">

              {cameraNames.map((camera, i) => (
                <div className='dark:bg-gray-800 shadow-md hover:shadow-lg rounded-lg transition-shadow p-4 m-2'>
                  <div className='text-lg flex justify-between'>
                    <Link href={`/cameras/${camera}`}>{camera.replaceAll('_', ' ')}</Link>
                    <div className='text-sm'>
                      ffprobe
                    </div>
                  </div>
                  <div className='p-4'>
                    <Table className='w-full'>
                      <Thead>
                        <Tr>
                          <Th>Processes</Th>
                          <Th>Process ID</Th>
                          <Th>Cpu %</Th>
                          <Th>Memory %</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        <Tr key='capture' index='0'>
                          <Td>Capture</Td>
                          <Td>{cameras[camera]['capture_pid']}</Td>
                          <Td>{cpu_usages[cameras[camera]['capture_pid']]['cpu']}%</Td>
                          <Td>{cpu_usages[cameras[camera]['capture_pid']]['mem']}%</Td>
                        </Tr>
                        <Tr key='detect' index='1'>
                          <Td>Detect</Td>
                          <Td>{cameras[camera]['pid']}</Td>
                          <Td>{cpu_usages[cameras[camera]['pid']]['cpu']}%</Td>
                          <Td>{cpu_usages[cameras[camera]['pid']]['cpu']}%</Td>
                        </Tr>
                        <Tr key='ffmpeg' index='2'>
                          <Td>ffmpeg</Td>
                          <Td>{cameras[camera]['ffmpeg_pid']}</Td>
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

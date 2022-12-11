import { h, Fragment } from 'preact';
import ActivityIndicator from '../components/ActivityIndicator';
import Heading from '../components/Heading';
import { useWs } from '../api/ws';
import useSWR from 'swr';
import { Table, Tbody, Thead, Tr, Th, Td } from '../components/Table';
import Link from '../components/Link';

const emptyObject = Object.freeze({});

export default function Storage() {
  const { data: storage } = useSWR('recordings/storage');

  const {
    value: { payload: stats },
  } = useWs('stats');
  const { data: initialStats } = useSWR('stats');

  const { service } = stats || initialStats || emptyObject;

  return (
    <div className="space-y-4 p-2 px-4">
      <Heading>Storage</Heading>

      {(!service || !storage) ? (
        <div>
          <ActivityIndicator />
        </div>
      ) : (
        <Fragment>
          <Heading size="lg">Overview</Heading>
          <div data-testid="detectors" className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="dark:bg-gray-800 shadow-md hover:shadow-lg rounded-lg transition-shadow">
              <div className="text-lg flex justify-between p-4">Data</div>
              <div className="p-2">
                <Table className="w-full">
                  <Thead>
                    <Tr>
                      <Th>Location</Th>
                      <Th>Used MB</Th>
                      <Th>Total MB</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    <Tr>
                      <Td>Snapshots & Recordings</Td>
                      <Td>{service['storage']['/media/frigate/recordings']['used']}</Td>
                      <Td>{service['storage']['/media/frigate/recordings']['total']}</Td>
                    </Tr>
                  </Tbody>
                </Table>
              </div>
            </div>
            <div className="dark:bg-gray-800 shadow-md hover:shadow-lg rounded-lg transition-shadow">
              <div className="text-lg flex justify-between p-4">Memory</div>
              <div className="p-2">
                <Table className="w-full">
                  <Thead>
                    <Tr>
                      <Th>Location</Th>
                      <Th>Used MB</Th>
                      <Th>Total MB</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    <Tr>
                      <Td>/dev/shm</Td>
                      <Td>{service['storage']['/dev/shm']['used']}</Td>
                      <Td>{service['storage']['/dev/shm']['total']}</Td>
                    </Tr>
                    <Tr>
                      <Td>/tmp/cache</Td>
                      <Td>{service['storage']['/tmp/cache']['used']}</Td>
                      <Td>{service['storage']['/tmp/cache']['total']}</Td>
                    </Tr>
                  </Tbody>
                </Table>
              </div>
            </div>
          </div>

          <Heading size="lg">Cameras</Heading>
          <div data-testid="detectors" className="grid grid-cols-1 3xl:grid-cols-3 md:grid-cols-2 gap-4">
            {Object.entries(storage).map(([name, camera]) => (
              <div key={name} className="dark:bg-gray-800 shadow-md hover:shadow-lg rounded-lg transition-shadow">
                <div className="capitalize text-lg flex justify-between p-4">
                  <Link href={`/cameras/${name}`}>{name.replaceAll('_', ' ')}</Link>
                </div>
                <div className="p-2">
                  <Table className="w-full">
                    <Thead>
                      <Tr>
                        <Th>Usage</Th>
                        <Th>Stream Bandwidth</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      <Tr>
                        <Td>{Math.round(camera['usage_percent'] ?? 0)}%</Td>
                        <Td>{camera['bandwidth'] ? camera['bandwidth'] : "Calculating..."} MB/hr</Td>
                      </Tr>
                    </Tbody>
                  </Table>
                </div>
              </div>
            ))}
          </div>
        </Fragment>
      )}
    </div>
  );
}

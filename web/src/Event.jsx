import { h, Fragment } from 'preact';
import Box from './components/Box';
import Heading from './components/Heading';
import Link from './components/Link';
import { Table, Thead, Tbody, Tfoot, Th, Tr, Td } from './components/Table';
import { useApiHost, useEvent } from './api';

export default function Event({ eventId }) {
  const apiHost = useApiHost();
  const { data } = useEvent(eventId);

  if (!data) {
    return (
      <div>
        <Heading>{eventId}</Heading>
        <p>loading…</p>
      </div>
    );
  }

  const startime = new Date(data.start_time * 1000);
  const endtime = new Date(data.end_time * 1000);

  return (
    <div className="space-y-4">
      <Heading>
        {data.camera} {data.label} <span className="text-sm">{startime.toLocaleString()}</span>
      </Heading>

      <Box>
        {data.has_clip ? (
          <Fragment>
            <Heading size="sm">Clip</Heading>
            <video className="w-100" src={`${apiHost}/clips/${data.camera}-${eventId}.mp4`} controls />
          </Fragment>
        ) : (
          <p>No clip available</p>
        )}
      </Box>

      <Box>
        <Heading size="sm">{data.has_snapshot ? 'Best image' : 'Thumbnail'}</Heading>
        <img
          src={
            data.has_snapshot
              ? `${apiHost}/clips/${data.camera}-${eventId}.jpg`
              : `data:image/jpeg;base64,${data.thumbnail}`
          }
          alt={`${data.label} at ${(data.top_score * 100).toFixed(1)}% confidence`}
        />
      </Box>

      <Box>
        <Table>
          <Thead>
            <Th>Key</Th>
            <Th>Value</Th>
          </Thead>
          <Tbody>
            <Tr>
              <Td>Camera</Td>
              <Td>
                <Link href={`/cameras/${data.camera}`}>{data.camera}</Link>
              </Td>
            </Tr>
            <Tr index={1}>
              <Td>Timeframe</Td>
              <Td>
                {startime.toLocaleString()} – {endtime.toLocaleString()}
              </Td>
            </Tr>
            <Tr>
              <Td>Score</Td>
              <Td>{(data.top_score * 100).toFixed(2)}%</Td>
            </Tr>
            <Tr index={1}>
              <Td>Zones</Td>
              <Td>{data.zones.join(', ')}</Td>
            </Tr>
          </Tbody>
        </Table>
      </Box>
    </div>
  );
}

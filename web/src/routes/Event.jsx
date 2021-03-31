import { h, Fragment } from 'preact';
import { useCallback, useState } from 'preact/hooks';
import { route } from 'preact-router';
import ActivityIndicator from '../components/ActivityIndicator';
import Button from '../components/Button';
import Delete from '../icons/Delete'
import Dialog from '../components/Dialog';
import Heading from '../components/Heading';
import Link from '../components/Link';
import { FetchStatus, useApiHost, useEvent } from '../api';
import { Table, Thead, Tbody, Th, Tr, Td } from '../components/Table';

export default function Event({ eventId }) {
  const apiHost = useApiHost();
  const { data, status } = useEvent(eventId);
  const [showDialog, setShowDialog] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState(FetchStatus.NONE);
  const [deleteMessage, setDeleteMessage] = useState();

  const handleClickDelete = () => {
    setShowDialog(true);
  };

  const handleDismissDeleteDialog = () => {
    setShowDialog(false);
  };


  const handleClickDeleteDialog = useCallback(async () => {

    setDeleteStatus(FetchStatus.LOADING);
    let success;
    try {
      debugger;
      const response = await fetch(`${apiHost}/api/events/${eventId}`, { method: 'DELETE' });
      debugger;
      const deleteEvent = await response.json();
    
      success = deleteEvent.success;
      debugger;
      setDeleteStatus(success ? FetchStatus.LOADED : FetchStatus.ERROR);
      setDeleteMessage(deleteEvent.message);
    } catch (e) {
      setDeleteStatus(FetchStatus.ERROR);
    }

    if (success) {
      setDeleteStatus(FetchStatus.LOADED);
      setShowDialog(false);
      route('/events', true);

    }
  }, [apiHost, eventId, setShowDialog]);

  if (status !== FetchStatus.LOADED) {
    return <ActivityIndicator />
  }

  const startime = new Date(data.start_time * 1000);
  const endtime = new Date(data.end_time * 1000);

  return (
    <div className="space-y-4">
      <div className="flex">
        <Heading className="flex-grow">
          {data.camera} {data.label} <span className="text-sm">{startime.toLocaleString()}</span>
        </Heading>
        <Button className="self-start" color="red" onClick={handleClickDelete}>
          <Delete className="w-6" /> Delete event
        </Button>
        {showDialog ? (
          <Dialog
            onDismiss={handleDismissDeleteDialog}
            title="Delete Event?"
            text="This event will be permanently deleted along with any related clips and snapshots"
            actions={[
              deleteStatus !== FetchStatus.LOADING
                ? { text: 'Delete', color: 'red', onClick: handleClickDeleteDialog }
                : { text: 'Deleting…', color: 'red', disabled: true },
              { text: 'Cancel', onClick: handleDismissDeleteDialog },
            ]}
          />
        ) : null}
      </div>

      <Table class="w-full">
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

      {data.has_clip ? (
        <Fragment>
          <Heading size="sm">Clip</Heading>
          <video
            aria-label={`Clip for event ${data.id}`}
            autoPlay
            className="w-100"
            src={`${apiHost}/clips/${data.camera}-${eventId}.mp4`}
            controls
          />
        </Fragment>
      ) : (
        <p>No clip available</p>
      )}

      <Heading size="sm">{data.has_snapshot ? 'Best image' : 'Thumbnail'}</Heading>
      <img
        src={
          data.has_snapshot
            ? `${apiHost}/clips/${data.camera}-${eventId}.jpg`
            : `data:image/jpeg;base64,${data.thumbnail}`
        }
        alt={`${data.label} at ${(data.top_score * 100).toFixed(1)}% confidence`}
      />
    </div>
  );
}

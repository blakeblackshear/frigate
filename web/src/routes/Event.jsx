import { h, Fragment } from 'preact';
import { useCallback, useState } from 'preact/hooks';
import { route } from 'preact-router';
import ActivityIndicator from '../components/ActivityIndicator';
import Button from '../components/Button';
import Clip from '../icons/Clip';
import Delete from '../icons/Delete';
import Snapshot from '../icons/Snapshot';
import Dialog from '../components/Dialog';
import Heading from '../components/Heading';
import Link from '../components/Link';
import VideoPlayer from '../components/VideoPlayer';
import { FetchStatus, useApiHost, useEvent, useDelete } from '../api';
import { Table, Thead, Tbody, Th, Tr, Td } from '../components/Table';

export default function Event({ eventId }) {
  const apiHost = useApiHost();
  const { data, status } = useEvent(eventId);
  const [showDialog, setShowDialog] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState(FetchStatus.NONE);
  const setDeleteEvent = useDelete();

  const handleClickDelete = () => {
    setShowDialog(true);
  };

  const handleDismissDeleteDialog = () => {
    setShowDialog(false);
  };

  const handleClickDeleteDialog = useCallback(async () => {
    let success;
    try {
      success = await setDeleteEvent(eventId);
      setDeleteStatus(success ? FetchStatus.LOADED : FetchStatus.ERROR);
    } catch (e) {
      setDeleteStatus(FetchStatus.ERROR);
    }

    if (success) {
      setDeleteStatus(FetchStatus.LOADED);
      setShowDialog(false);
      route('/events', true);
    }
  }, [eventId, setShowDialog]);

  if (status !== FetchStatus.LOADED) {
    return <ActivityIndicator />;
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
            text={
              deleteStatus === FetchStatus.ERROR
                ? 'Could not delete event, please try again.'
                : 'This event will be permanently deleted along with any related clips and snapshots'
            }
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
          <Heading size="lg">Clip</Heading>
          <VideoPlayer
            options={{
              sources: [
                {
                  src: `${apiHost}/clips/${data.camera}-${eventId}.mp4`,
                  type: 'video/mp4',
                },
              ],
              poster: data.has_snapshot
                ? `${apiHost}/clips/${data.camera}-${eventId}.jpg`
                : `data:image/jpeg;base64,${data.thumbnail}`,
            }}
            seekOptions={{ forward: 10, back: 5 }}
            onReady={(player) => {}}
          />
          <div className="text-center">
            <Button className="mx-2" color="blue" href={`${apiHost}/clips/${data.camera}-${eventId}.mp4`} download>
              <Clip className="w-6" /> Download Clip
            </Button>
            <Button className="mx-2" color="blue" href={`${apiHost}/clips/${data.camera}-${eventId}.jpg`} download>
              <Snapshot className="w-6" /> Download Snapshot
            </Button>
          </div>
        </Fragment>
      ) : (
        <Fragment>
          <Heading size="sm">{data.has_snapshot ? 'Best Image' : 'Thumbnail'}</Heading>
          <img
            src={
              data.has_snapshot
                ? `${apiHost}/clips/${data.camera}-${eventId}.jpg`
                : `data:image/jpeg;base64,${data.thumbnail}`
            }
            alt={`${data.label} at ${(data.top_score * 100).toFixed(1)}% confidence`}
          />
        </Fragment>
      )}
    </div>
  );
}

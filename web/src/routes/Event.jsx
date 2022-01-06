import { h, Fragment } from 'preact';
import { useCallback, useState, useEffect } from 'preact/hooks';
import Link from '../components/Link';
import ActivityIndicator from '../components/ActivityIndicator';
import Button from '../components/Button';
import ArrowDown from '../icons/ArrowDropdown';
import ArrowDropup from '../icons/ArrowDropup';
import Clip from '../icons/Clip';
import Close from '../icons/Close';
import Delete from '../icons/Delete';
import Snapshot from '../icons/Snapshot';
import Heading from '../components/Heading';
import VideoPlayer from '../components/VideoPlayer';
import { Table, Thead, Tbody, Th, Tr, Td } from '../components/Table';
import { FetchStatus, useApiHost, useEvent, useDelete } from '../api';
import Prompt from '../components/Prompt';

const ActionButtonGroup = ({ className, handleClickDelete, close }) => (
  <div className={`space-y-2 space-x-2 sm:space-y-0 xs:space-x-4 ${className}`}>
    <Button className="xs:w-auto" color="red" onClick={handleClickDelete}>
      <Delete className="w-6" /> Delete event
    </Button>
    <Button color="gray" className="xs:w-auto" onClick={() => close()}>
      <Close className="w-6" /> Close
    </Button>
  </div>
);

const DownloadButtonGroup = ({ className, apiHost, eventId }) => (
  <span className={`space-y-2 sm:space-y-0 space-x-0 sm:space-x-4 ${className}`}>
    <Button
      className="w-full sm:w-auto"
      color="blue"
      href={`${apiHost}/api/events/${eventId}/clip.mp4?download=true`}
      download
    >
      <Clip className="w-6" /> Download Clip
    </Button>
    <Button
      className="w-full sm:w-auto"
      color="blue"
      href={`${apiHost}/api/events/${eventId}/snapshot.jpg?download=true`}
      download
    >
      <Snapshot className="w-6" /> Download Snapshot
    </Button>
  </span>
);

export default function Event({ eventId, close, scrollRef }) {
  const apiHost = useApiHost();
  const { data, status } = useEvent(eventId);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [shouldScroll, setShouldScroll] = useState(true);
  const [deleteStatus, setDeleteStatus] = useState(FetchStatus.NONE);
  const setDeleteEvent = useDelete();

  useEffect(() => {
    // Scroll event into view when component has been mounted.
    if (shouldScroll && scrollRef && scrollRef[eventId]) {
      scrollRef[eventId].scrollIntoView();
      setShouldScroll(false);
    }
    return () => {
      // When opening new event window, the previous one will sometimes cause the
      // navbar to be visible, hence the "hide nav" code bellow.
      // Navbar will be hided if we add the - translate - y - full class.appBar.js
      const element = document.getElementById('appbar');
      if (element) element.classList.add('-translate-y-full');
    };
  }, [data, scrollRef, eventId, shouldScroll]);

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
    }
  }, [eventId, setShowDialog, setDeleteEvent]);

  if (status !== FetchStatus.LOADED) {
    return <ActivityIndicator />;
  }

  const startime = new Date(data.start_time * 1000);
  const endtime = data.end_time ? new Date(data.end_time * 1000) : null;
  return (
    <div className="space-y-4">
      <div className="flex md:flex-row justify-between flex-wrap flex-col">
        <div className="space-y-2 xs:space-y-0 sm:space-x-4">
          <DownloadButtonGroup apiHost={apiHost} eventId={eventId} className="hidden sm:inline" />
          <Button className="w-full sm:w-auto" onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? (
              <Fragment>
                <ArrowDropup className="w-6" />
                Hide event Details
              </Fragment>
            ) : (
              <Fragment>
                <ArrowDown className="w-6" />
                Show event Details
              </Fragment>
            )}
          </Button>
        </div>
        <ActionButtonGroup handleClickDelete={handleClickDelete} close={close} className="hidden sm:block" />
        {showDialog ? (
          <Prompt
            onDismiss={handleDismissDeleteDialog}
            title="Delete Event?"
            text={
              deleteStatus === FetchStatus.ERROR
                ? 'An error occurred, please try again.'
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
      <div>
        {showDetails ? (
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
                  {startime.toLocaleString()}{endtime === null ? ` – ${endtime.toLocaleString()}`:''}
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
        ) : null}
      </div>

      <div className="outer-max-width xs:m-auto">
        <div className="pt-5 relative pb-20 w-screen xs:w-full">
          {data.has_clip ? (
            <Fragment>
              <Heading size="lg">Clip</Heading>
              <VideoPlayer
                options={{
                  preload: 'none',
                  sources: [
                    {
                      src: `${apiHost}/vod/event/${eventId}/index.m3u8`,
                      type: 'application/vnd.apple.mpegurl',
                    },
                  ],
                  poster: data.has_snapshot
                    ? `${apiHost}/api/events/${eventId}/snapshot.jpg`
                    : `data:image/jpeg;base64,${data.thumbnail}`,
                }}
                seekOptions={{ forward: 10, back: 5 }}
                onReady={() => {}}
              />
            </Fragment>
          ) : (
            <Fragment>
              <Heading size="sm">{data.has_snapshot ? 'Best Image' : 'Thumbnail'}</Heading>
              <img
                src={
                  data.has_snapshot
                    ? `${apiHost}/api/events/${eventId}/snapshot.jpg`
                    : `data:image/jpeg;base64,${data.thumbnail}`
                }
                alt={`${data.label} at ${(data.top_score * 100).toFixed(1)}% confidence`}
              />
            </Fragment>
          )}
        </div>
      </div>
      <div className="space-y-2 xs:space-y-0">
        <DownloadButtonGroup apiHost={apiHost} eventId={eventId} className="block sm:hidden" />
        <ActionButtonGroup handleClickDelete={handleClickDelete} close={close} className="block sm:hidden" />
      </div>
    </div>
  );
}

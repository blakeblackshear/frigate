import { h, Fragment } from 'preact';
import { useCallback, useState, useEffect } from 'preact/hooks';
import ActivityIndicator from '../components/ActivityIndicator';
import Button from '../components/Button';
import Clip from '../icons/Clip';
import Menu from '../icons/Menu';
import Delete from '../icons/Delete';
import Snapshot from '../icons/Snapshot';
import Dialog from '../components/Dialog';
import Heading from '../components/Heading';
import VideoPlayer from '../components/VideoPlayer';
import { FetchStatus, useApiHost, useEvent, useDelete } from '../api';

export default function Event({ eventId, close, scrollRef }) {
  const apiHost = useApiHost();
  const { data, status } = useEvent(eventId);
  const [showDialog, setShowDialog] = useState(false);
  const [shouldScroll, setShouldScroll] = useState(true);
  const [deleteStatus, setDeleteStatus] = useState(FetchStatus.NONE);
  const setDeleteEvent = useDelete();

  useEffect(() => {
    // Scroll event into view when component has been mounted.
    if (shouldScroll && scrollRef && scrollRef[eventId]) {
      scrollRef[eventId].scrollIntoView();
      setShouldScroll(false);
    }
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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-6 gap-4">
        <div class="col-start-1 col-end-8 md:space-x-4">
          <Button color="blue" href={`${apiHost}/api/events/${eventId}/clip.mp4?download=true`} download>
            <Clip className="w-6" /> Download Clip
          </Button>
          <Button color="blue" href={`${apiHost}/api/events/${eventId}/snapshot.jpg?download=true`} download>
            <Snapshot className="w-6" /> Download Snapshot
          </Button>
        </div>
        <div class="col-end-10 col-span-2 space-x-4">
          <Button color="gray" className="self-start" onClick={() => close()}>
            <Menu className="w-6" /> Close
          </Button>
          <Button className="self-start" color="red" onClick={handleClickDelete}>
            <Delete className="w-6" /> Delete event
          </Button>
        </div>
        {showDialog ? (
          <Dialog
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
      <div className="outer-max-width m-auto">
        <div className="aspect-ratio-box w-full relative">
          <div className="absolute w-full top-10 left-0">
            {data.has_clip ? (
              <Fragment>
                <Heading size="lg">Clip</Heading>
                <VideoPlayer
                  options={{
                    sources: [
                      {
                        src: `${apiHost}/vod/event/${eventId}/index.m3u8`,
                        type: 'application/vnd.apple.mpegurl',
                      },
                    ],
                    poster: data.has_snapshot
                      ? `${apiHost}/clips/${data.camera}-${eventId}.jpg`
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
                      ? `${apiHost}/clips/${data.camera}-${eventId}.jpg`
                      : `data:image/jpeg;base64,${data.thumbnail}`
                  }
                  alt={`${data.label} at ${(data.top_score * 100).toFixed(1)}% confidence`}
                />
              </Fragment>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

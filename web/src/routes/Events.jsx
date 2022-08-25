import { h, Fragment } from 'preact';
import { route } from 'preact-router';
import ActivityIndicator from '../components/ActivityIndicator';
import Heading from '../components/Heading';
import { useApiHost } from '../api';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import axios from 'axios';
import { useState, useRef, useCallback, useMemo } from 'preact/hooks';
import VideoPlayer from '../components/VideoPlayer';
import { StarRecording } from '../icons/StarRecording';
import { Snapshot } from '../icons/Snapshot';
import { UploadPlus } from '../icons/UploadPlus';
import { Clip } from '../icons/Clip';
import { Zone } from '../icons/Zone';
import { Camera } from '../icons/Camera';
import { Delete } from '../icons/Delete';
import { Download } from '../icons/Download';
import Menu, { MenuItem } from '../components/Menu';
import CalendarIcon from '../icons/Calendar';
import Calendar from '../components/Calendar';
import Button from '../components/Button';
import Dialog from '../components/Dialog';

const API_LIMIT = 25;

const daysAgo = (num) => {
  let date = new Date();
  date.setDate(date.getDate() - num);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 1000;
};

const monthsAgo = (num) => {
  let date = new Date();
  date.setMonth(date.getMonth() - num);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 1000;
};

export default function Events({ path, ...props }) {
  const apiHost = useApiHost();
  const [searchParams, setSearchParams] = useState({
    before: null,
    after: null,
    camera: props.camera ?? 'all',
    label: props.label ?? 'all',
    zone: props.zone ?? 'all',
    sub_label: props.sub_label ?? 'all',
  });
  const [state, setState] = useState({
    showDownloadMenu: false,
    showDatePicker: false,
    showCalendar: false,
    showPlusConfig: false,
  });
  const [uploading, setUploading] = useState([]);
  const [viewEvent, setViewEvent] = useState();
  const [downloadEvent, setDownloadEvent] = useState({
    id: null,
    has_clip: false,
    has_snapshot: false,
    plus_id: undefined,
  });
  const [deleteFavoriteState, setDeleteFavoriteState] = useState({
    deletingFavoriteEventId: null,
    showDeleteFavorite: false,
  });

  const eventsFetcher = useCallback((path, params) => {
    params = { ...params, include_thumbnails: 0, limit: API_LIMIT };
    return axios.get(path, { params }).then((res) => res.data);
  }, []);

  const getKey = useCallback(
    (index, prevData) => {
      if (index > 0) {
        const lastDate = prevData[prevData.length - 1].start_time;
        const pagedParams = { ...searchParams, before: lastDate };
        return ['events', pagedParams];
      }

      return ['events', searchParams];
    },
    [searchParams]
  );

  const { data: eventPages, mutate, size, setSize, isValidating } = useSWRInfinite(getKey, eventsFetcher);

  const { data: config } = useSWR('config');

  const { data: allSubLabels } = useSWR('sub_labels')

  const filterValues = useMemo(
    () => ({
      cameras: Object.keys(config?.cameras || {}),
      zones: Object.values(config?.cameras || {})
        .reduce((memo, camera) => {
          memo = memo.concat(Object.keys(camera?.zones || {}));
          return memo;
        }, [])
        .filter((value, i, self) => self.indexOf(value) === i),
      labels: Object.values(config?.cameras || {})
        .reduce((memo, camera) => {
          memo = memo.concat(camera?.objects?.track || []);
          return memo;
        }, config?.objects?.track || [])
        .filter((value, i, self) => self.indexOf(value) === i),
      sub_labels: Object.values(allSubLabels || []),
    }),
    [config, allSubLabels]
  );

  const onSave = async (e, eventId, save) => {
    e.stopPropagation();
    let response;
    if (save) {
      response = await axios.post(`events/${eventId}/retain`);
    } else {
      response = await axios.delete(`events/${eventId}/retain`);
    }
    if (response.status === 200) {
      mutate();
    }
  };

  const onDelete = async (e, eventId, saved) => {
    e.stopPropagation();

    if (saved) {
      setDeleteFavoriteState({ deletingFavoriteEventId: eventId, showDeleteFavorite: true });
    } else {
      const response = await axios.delete(`events/${eventId}`);
      if (response.status === 200) {
        mutate();
      }
    }
  };

  const datePicker = useRef();

  const downloadButton = useRef();

  const onDownloadClick = (e, event) => {
    e.stopPropagation();
    setDownloadEvent((_prev) => ({
      id: event.id,
      has_clip: event.has_clip,
      has_snapshot: event.has_snapshot,
      plus_id: event.plus_id,
    }));
    downloadButton.current = e.target;
    setState({ ...state, showDownloadMenu: true });
  };

  const handleSelectDateRange = useCallback(
    (dates) => {
      setSearchParams({ ...searchParams, before: dates.before, after: dates.after });
      setState({ ...state, showDatePicker: false });
    },
    [searchParams, setSearchParams, state, setState]
  );

  const onFilter = useCallback(
    (name, value) => {
      const updatedParams = { ...searchParams, [name]: value };
      setSearchParams(updatedParams);
      const queryString = Object.keys(updatedParams)
        .map((key) => {
          if (updatedParams[key] && updatedParams[key] != 'all') {
            return `${key}=${updatedParams[key]}`;
          }
          return null;
        })
        .filter((val) => val)
        .join('&');
      route(`${path}?${queryString}`);
    },
    [path, searchParams, setSearchParams]
  );

  const isDone = (eventPages?.[eventPages.length - 1]?.length ?? 0) < API_LIMIT;

  // hooks for infinite scroll
  const observer = useRef();
  const lastEventRef = useCallback(
    (node) => {
      if (isValidating) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !isDone) {
          setSize(size + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [size, setSize, isValidating, isDone]
  );

  const onSendToPlus = async (id, e) => {
    if (e) {
      e.stopPropagation();
    }

    if (uploading.includes(id)) {
      return;
    }

    if (!config.plus.enabled) {
      setState({ ...state, showDownloadMenu: false, showPlusConfig: true });
      return;
    }

    setUploading((prev) => [...prev, id]);

    const response = await axios.post(`events/${id}/plus`);

    if (response.status === 200) {
      mutate(
        (pages) =>
          pages.map((page) =>
            page.map((event) => {
              if (event.id === id) {
                return { ...event, plus_id: response.data.plus_id };
              }
              return event;
            })
          ),
        false
      );
    }

    setUploading((prev) => prev.filter((i) => i !== id));

    if (state.showDownloadMenu && downloadEvent.id === id) {
      setState({ ...state, showDownloadMenu: false });
    }
  };

  if (!config) {
    return <ActivityIndicator />;
  }

  return (
    <div className="space-y-4 p-2 px-4 w-full">
      <Heading>Events</Heading>
      <div className="flex flex-wrap gap-2 items-center">
        <select
          className="basis-1/5 cursor-pointer rounded dark:bg-slate-800"
          value={searchParams.camera}
          onChange={(e) => onFilter('camera', e.target.value)}
        >
          <option value="all">all cameras</option>
          {filterValues.cameras.map((item) => (
            <option key={item} value={item}>
              {item.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
        <select
          className="basis-1/5 cursor-pointer rounded dark:bg-slate-800"
          value={searchParams.label}
          onChange={(e) => onFilter('label', e.target.value)}
        >
          <option value="all">all labels</option>
          {filterValues.labels.map((item) => (
            <option key={item.replaceAll('_', ' ')} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          className="basis-1/5 cursor-pointer rounded dark:bg-slate-800"
          value={searchParams.zone}
          onChange={(e) => onFilter('zone', e.target.value)}
        >
          <option value="all">all zones</option>
          {filterValues.zones.map((item) => (
            <option key={item} value={item}>
              {item.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
        {
          filterValues.sub_labels.length > 0 && (
            <select
              className="basis-1/5 cursor-pointer rounded dark:bg-slate-800"
              value={searchParams.sub_label}
              onChange={(e) => onFilter('sub_label', e.target.value)}
            >
              <option value="all">all sub labels</option>
              {filterValues.sub_labels.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          )}
        <div ref={datePicker} className="ml-auto">
          <CalendarIcon
            className="h-8 w-8 cursor-pointer"
            onClick={() => setState({ ...state, showDatePicker: true })}
          />
        </div>
      </div>
      {state.showDownloadMenu && (
        <Menu onDismiss={() => setState({ ...state, showDownloadMenu: false })} relativeTo={downloadButton}>
          {downloadEvent.has_snapshot && (
            <MenuItem
              icon={Snapshot}
              label="Download Snapshot"
              value="snapshot"
              href={`${apiHost}/api/events/${downloadEvent.id}/snapshot.jpg?download=true`}
              download
            />
          )}
          {downloadEvent.has_clip && (
            <MenuItem
              icon={Clip}
              label="Download Clip"
              value="clip"
              href={`${apiHost}/api/events/${downloadEvent.id}/clip.mp4?download=true`}
              download
            />
          )}
          {downloadEvent.has_snapshot && !downloadEvent.plus_id && (
            <MenuItem
              icon={UploadPlus}
              label={uploading.includes(downloadEvent.id) ? 'Uploading...' : 'Send to Frigate+'}
              value="plus"
              onSelect={() => onSendToPlus(downloadEvent.id)}
            />
          )}
          {downloadEvent.plus_id && (
            <MenuItem
              icon={UploadPlus}
              label={'Sent to Frigate+'}
              value="plus"
              onSelect={() => setState({ ...state, showDownloadMenu: false })}
            />
          )}
        </Menu>
      )}
      {state.showDatePicker && (
        <Menu
          className="rounded-t-none"
          onDismiss={() => setState({ ...state, setShowDatePicker: false })}
          relativeTo={datePicker}
        >
          <MenuItem label="All" value={{ before: null, after: null }} onSelect={handleSelectDateRange} />
          <MenuItem label="Today" value={{ before: null, after: daysAgo(0) }} onSelect={handleSelectDateRange} />
          <MenuItem
            label="Yesterday"
            value={{ before: daysAgo(0), after: daysAgo(1) }}
            onSelect={handleSelectDateRange}
          />
          <MenuItem label="Last 7 Days" value={{ before: null, after: daysAgo(7) }} onSelect={handleSelectDateRange} />
          <MenuItem label="This Month" value={{ before: null, after: monthsAgo(0) }} onSelect={handleSelectDateRange} />
          <MenuItem
            label="Last Month"
            value={{ before: monthsAgo(0), after: monthsAgo(1) }}
            onSelect={handleSelectDateRange}
          />
          <MenuItem
            label="Custom Range"
            value="custom"
            onSelect={() => {
              setState({ ...state, showCalendar: true, showDatePicker: false });
            }}
          />
        </Menu>
      )}
      {state.showCalendar && (
        <Menu
          className="rounded-t-none"
          onDismiss={() => setState({ ...state, showCalendar: false })}
          relativeTo={datePicker}
        >
          <Calendar
            onChange={handleSelectDateRange}
            dateRange={{ before: searchParams.before * 1000 || null, after: searchParams.after * 1000 || null }}
            close={() => setState({ ...state, showCalendar: false })}
          />
        </Menu>
      )}
      {state.showPlusConfig && (
        <Dialog>
          <div className="p-4">
            <Heading size="lg">Setup a Frigate+ Account</Heading>
            <p className="mb-2">In order to submit images to Frigate+, you first need to setup an account.</p>
            <a
              className="text-blue-500 hover:underline"
              href="https://plus.frigate.video"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://plus.frigate.video
            </a>
          </div>
          <div className="p-2 flex justify-start flex-row-reverse space-x-2">
            <Button className="ml-2" onClick={() => setState({ ...state, showPlusConfig: false })} type="text">
              Close
            </Button>
          </div>
        </Dialog>
      )}
      {deleteFavoriteState.showDeleteFavorite && (
        <Dialog>
          <div className="p-4">
            <Heading size="lg">Delete Saved Event?</Heading>
            <p className="mb-2">Confirm deletion of saved event.</p>
          </div>
          <div className="p-2 flex justify-start flex-row-reverse space-x-2">
            <Button className="ml-2" color="red" onClick={(e) => { setDeleteFavoriteState({ ...state, showDeleteFavorite: false }); onDelete(e, deleteFavoriteState.deletingFavoriteEventId, false) }} type="text">
              Delete
            </Button>
          </div>
        </Dialog>
      )}
      <div className="space-y-2">
        {eventPages ? (
          eventPages.map((page, i) => {
            const lastPage = eventPages.length === i + 1;
            return page.map((event, j) => {
              const lastEvent = lastPage && page.length === j + 1;
              return (
                <Fragment key={event.id}>
                  <div
                    ref={lastEvent ? lastEventRef : false}
                    className="flex bg-slate-100 dark:bg-slate-800 rounded cursor-pointer min-w-[330px]"
                    onClick={() => (viewEvent === event.id ? setViewEvent(null) : setViewEvent(event.id))}
                  >
                    <div
                      className="relative rounded-l flex-initial min-w-[125px] h-[125px] bg-contain bg-no-repeat bg-center"
                      style={{
                        'background-image': `url(${apiHost}/api/events/${event.id}/thumbnail.jpg)`,
                      }}
                    >
                      <StarRecording
                        className="h-6 w-6 text-yellow-300 absolute top-1 right-1 cursor-pointer"
                        onClick={(e) => onSave(e, event.id, !event.retain_indefinitely)}
                        fill={event.retain_indefinitely ? 'currentColor' : 'none'}
                      />
                      {event.end_time ? null : (
                        <div className="bg-slate-300 dark:bg-slate-700 absolute bottom-0 text-center w-full uppercase text-sm rounded-bl">
                          In progress
                        </div>
                      )}
                    </div>
                    <div className="m-2 flex grow">
                      <div className="flex flex-col grow">
                        <div className="capitalize text-lg font-bold">
                          {event.sub_label ? `${event.label}: ${event.sub_label}` : event.label} (
                          {(event.top_score * 100).toFixed(0)}%)
                        </div>
                        <div className="text-sm">
                          {new Date(event.start_time * 1000).toLocaleDateString()}{' '}
                          {new Date(event.start_time * 1000).toLocaleTimeString()}
                        </div>
                        <div className="capitalize text-sm flex align-center mt-1">
                          <Camera className="h-5 w-5 mr-2 inline" />
                          {event.camera.replaceAll('_', ' ')}
                        </div>
                        <div className="capitalize  text-sm flex align-center">
                          <Zone className="w-5 h-5 mr-2 inline" />
                          {event.zones.join(',').replaceAll('_', ' ')}
                        </div>
                      </div>
                      <div class="hidden sm:flex flex-col justify-end mr-2">
                        {event.has_snapshot && (
                          <Fragment>
                            {event.plus_id ? (
                              <div className="uppercase text-xs">Sent to Frigate+</div>
                            ) : (
                              <Button
                                color="gray"
                                disabled={uploading.includes(event.id)}
                                onClick={(e) => onSendToPlus(event.id, e)}
                              >
                                {uploading.includes(event.id) ? 'Uploading...' : 'Send to Frigate+'}
                              </Button>
                            )}
                          </Fragment>
                        )}
                      </div>
                      <div class="flex flex-col">
                        <Delete className="h-6 w-6 cursor-pointer" stroke="#f87171" onClick={(e) => onDelete(e, event.id, event.retain_indefinitely)} />

                        <Download
                          className="h-6 w-6 mt-auto"
                          stroke={event.has_clip || event.has_snapshot ? '#3b82f6' : '#cbd5e1'}
                          onClick={(e) => onDownloadClick(e, event)}
                        />
                      </div>
                    </div>
                  </div>
                  {viewEvent !== event.id ? null : (
                    <div className="space-y-4">
                      <div className="mx-auto max-w-7xl">
                        {event.has_clip ? (
                          <>
                            <Heading size="lg">Clip</Heading>
                            <VideoPlayer
                              options={{
                                preload: 'auto',
                                autoplay: true,
                                sources: [
                                  {
                                    src: `${apiHost}/vod/event/${event.id}/master.m3u8`,
                                    type: 'application/vnd.apple.mpegurl',
                                  },
                                ],
                              }}
                              seekOptions={{ forward: 10, back: 5 }}
                              onReady={() => {}}
                            />
                          </>
                        ) : (
                          <div className="flex justify-center">
                            <div>
                              <Heading size="sm">{event.has_snapshot ? 'Best Image' : 'Thumbnail'}</Heading>
                              <img
                                className="flex-grow-0"
                                src={
                                  event.has_snapshot
                                    ? `${apiHost}/api/events/${event.id}/snapshot.jpg`
                                    : `data:image/jpeg;base64,${event.thumbnail}`
                                }
                                alt={`${event.label} at ${(event.top_score * 100).toFixed(0)}% confidence`}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Fragment>
              );
            });
          })
        ) : (
          <ActivityIndicator />
        )}
      </div>
      <div>{isDone ? null : <ActivityIndicator />}</div>
    </div>
  );
}

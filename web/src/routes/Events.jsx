import { h, Fragment } from 'preact';
import { route } from 'preact-router';
import ActivityIndicator from '../components/ActivityIndicator';
import Heading from '../components/Heading';
import { Tabs, TextTab } from '../components/Tabs';
import Link from '../components/Link';
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
import { Clock } from '../icons/Clock';
import { Delete } from '../icons/Delete';
import { Download } from '../icons/Download';
import Menu, { MenuItem } from '../components/Menu';
import CalendarIcon from '../icons/Calendar';
import Calendar from '../components/Calendar';
import Button from '../components/Button';
import Dialog from '../components/Dialog';
import MultiSelect from '../components/MultiSelect';
import { formatUnixTimestampToDateTime, getDurationFromTimestamps } from '../utils/dateUtil';
import TimeAgo from '../components/TimeAgo';
import Timepicker from '../components/TimePicker';
import TimelineSummary from '../components/TimelineSummary';
import TimelineEventOverlay from '../components/TimelineEventOverlay';
import { Score } from '../icons/Score';

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
  const { data: config } = useSWR('config');
  const timezone = useMemo(() => config?.ui?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone, [config]);
  const [searchParams, setSearchParams] = useState({
    before: null,
    after: null,
    cameras: props.cameras ?? 'all',
    labels: props.labels ?? 'all',
    zones: props.zones ?? 'all',
    sub_labels: props.sub_labels ?? 'all',
    time_range: '00:00,24:00',
    timezone,
    favorites: props.favorites ?? 0,
    event: props.event,
  });
  const [state, setState] = useState({
    showDownloadMenu: false,
    showDatePicker: false,
    showCalendar: false,
    showPlusSubmit: false,
  });
  const [plusSubmitEvent, setPlusSubmitEvent] = useState({
    id: null,
    label: null,
    validBox: null,
  });
  const [uploading, setUploading] = useState([]);
  const [viewEvent, setViewEvent] = useState(props.event);
  const [eventOverlay, setEventOverlay] = useState();
  const [eventDetailType, setEventDetailType] = useState('clip');
  const [downloadEvent, setDownloadEvent] = useState({
    id: null,
    label: null,
    box: null,
    has_clip: false,
    has_snapshot: false,
    plus_id: undefined,
    end_time: null,
  });
  const [deleteFavoriteState, setDeleteFavoriteState] = useState({
    deletingFavoriteEventId: null,
    showDeleteFavorite: false,
  });

  const eventsFetcher = useCallback(
    (path, params) => {
      if (searchParams.event) {
        path = `${path}/${searchParams.event}`;
        return axios.get(path).then((res) => [res.data]);
      }
      params = { ...params, include_thumbnails: 0, limit: API_LIMIT };
      return axios.get(path, { params }).then((res) => res.data);
    },
    [searchParams]
  );

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

  const { data: allLabels } = useSWR(['labels']);
  const { data: allSubLabels } = useSWR(['sub_labels', { split_joined: 1 }]);

  const filterValues = useMemo(
    () => ({
      cameras: Object.keys(config?.cameras || {}),
      zones: [
        ...Object.values(config?.cameras || {})
          .reduce((memo, camera) => {
            memo = memo.concat(Object.keys(camera?.zones || {}));
            return memo;
          }, [])
          .filter((value, i, self) => self.indexOf(value) === i),
        'None',
      ],
      labels: Object.values(allLabels || {}),
      sub_labels: (allSubLabels || []).length > 0 ? [...Object.values(allSubLabels), 'None'] : [],
    }),
    [config, allLabels, allSubLabels]
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

  const onToggleNamedFilter = (name, item) => {
    let items;

    if (searchParams[name] == 'all') {
      const currentItems = Array.from(filterValues[name]);

      // don't remove all if only one option
      if (currentItems.length > 1) {
        currentItems.splice(currentItems.indexOf(item), 1);
        items = currentItems.join(',');
      } else {
        items = ['all'];
      }
    } else {
      let currentItems = searchParams[name].length > 0 ? searchParams[name].split(',') : [];

      if (currentItems.includes(item)) {
        // don't remove the last item in the filter list
        if (currentItems.length > 1) {
          currentItems.splice(currentItems.indexOf(item), 1);
        }

        items = currentItems.join(',');
      } else if (currentItems.length + 1 == filterValues[name].length) {
        items = ['all'];
      } else {
        currentItems.push(item);
        items = currentItems.join(',');
      }
    }

    onFilter(name, items);
  };

  const onEventFrameSelected = (event, frame, seekSeconds) => {
    if (this.player) {
      this.player.pause();
      this.player.currentTime(seekSeconds);
      setEventOverlay(frame);
    }
  };

  const datePicker = useRef();

  const downloadButton = useRef();

  const onDownloadClick = (e, event) => {
    e.stopPropagation();
    setDownloadEvent((_prev) => ({
      id: event.id,
      box: event?.data?.box || event.box,
      label: event.label,
      has_clip: event.has_clip,
      has_snapshot: event.has_snapshot,
      plus_id: event.plus_id,
      end_time: event.end_time,
    }));
    downloadButton.current = e.target;
    setState({ ...state, showDownloadMenu: true });
  };

  const showSubmitToPlus = (event_id, label, box, e) => {
    if (e) {
      e.stopPropagation();
    }
    // if any of the box coordinates are > 1, then the box data is from an older version
    // and not valid to submit to plus with the snapshot image
    setPlusSubmitEvent({ id: event_id, label, validBox: !box.some((d) => d > 1) });
    setState({ ...state, showDownloadMenu: false, showPlusSubmit: true });
  };

  const handleSelectDateRange = useCallback(
    (dates) => {
      setSearchParams({ ...searchParams, before: dates.before, after: dates.after });
      setState({ ...state, showDatePicker: false });
    },
    [searchParams, setSearchParams, state, setState]
  );

  const handleSelectTimeRange = useCallback(
    (timeRange) => {
      setSearchParams({ ...searchParams, time_range: timeRange });
    },
    [searchParams]
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
      try {
        observer.current = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting && !isDone) {
            setSize(size + 1);
          }
        });
        if (node) observer.current.observe(node);
      } catch (e) {
        // no op
      }
    },
    [size, setSize, isValidating, isDone]
  );

  const onSendToPlus = async (id, false_positive, validBox) => {
    if (uploading.includes(id)) {
      return;
    }

    setUploading((prev) => [...prev, id]);

    const response = false_positive
      ? await axios.put(`events/${id}/false_positive`)
      : await axios.post(`events/${id}/plus`, validBox ? { include_annotation: 1 } : {});

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

    setState({ ...state, showPlusSubmit: false });
  };

  const handleEventDetailTabChange = (index) => {
    setEventDetailType(index == 0 ? 'clip' : 'image');
  };

  if (!config) {
    return <ActivityIndicator />;
  }

  return (
    <div className="space-y-4 p-2 px-4 w-full">
      <Heading>Events</Heading>
      <div className="flex flex-wrap gap-2 items-center">
        <MultiSelect
          className="basis-1/5 cursor-pointer rounded dark:bg-slate-800"
          title="Cameras"
          options={filterValues.cameras}
          selection={searchParams.cameras}
          onToggle={(item) => onToggleNamedFilter('cameras', item)}
          onShowAll={() => onFilter('cameras', ['all'])}
          onSelectSingle={(item) => onFilter('cameras', item)}
        />
        <MultiSelect
          className="basis-1/5 cursor-pointer rounded dark:bg-slate-800"
          title="Labels"
          options={filterValues.labels}
          selection={searchParams.labels}
          onToggle={(item) => onToggleNamedFilter('labels', item)}
          onShowAll={() => onFilter('labels', ['all'])}
          onSelectSingle={(item) => onFilter('labels', item)}
        />
        <MultiSelect
          className="basis-1/5 cursor-pointer rounded dark:bg-slate-800"
          title="Zones"
          options={filterValues.zones}
          selection={searchParams.zones}
          onToggle={(item) => onToggleNamedFilter('zones', item)}
          onShowAll={() => onFilter('zones', ['all'])}
          onSelectSingle={(item) => onFilter('zones', item)}
        />
        {filterValues.sub_labels.length > 0 && (
          <MultiSelect
            className="basis-1/5 cursor-pointer rounded dark:bg-slate-800"
            title="Sub Labels"
            options={filterValues.sub_labels}
            selection={searchParams.sub_labels}
            onToggle={(item) => onToggleNamedFilter('sub_labels', item)}
            onShowAll={() => onFilter('sub_labels', ['all'])}
            onSelectSingle={(item) => onFilter('sub_labels', item)}
          />
        )}
        {searchParams.event && (
          <Button className="ml-2" onClick={() => onFilter('event', null)} type="text">
            View All
          </Button>
        )}

        <StarRecording
          className="h-10 w-10 text-yellow-300 cursor-pointer ml-auto"
          onClick={() => onFilter('favorites', searchParams.favorites ? 0 : 1)}
          fill={searchParams.favorites == 1 ? 'currentColor' : 'none'}
        />

        <div ref={datePicker} className="ml-right">
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
          {(event?.data?.type || 'object') == 'object' &&
            downloadEvent.end_time &&
            downloadEvent.has_snapshot &&
            !downloadEvent.plus_id && (
            <MenuItem
              icon={UploadPlus}
              label={uploading.includes(downloadEvent.id) ? 'Uploading...' : 'Send to Frigate+'}
              value="plus"
              onSelect={() => showSubmitToPlus(downloadEvent.id, downloadEvent.label, downloadEvent.box)}
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
        <span>
          <Menu
            className="rounded-t-none"
            onDismiss={() => setState({ ...state, showCalendar: false })}
            relativeTo={datePicker}
          >
            <Calendar
              onChange={handleSelectDateRange}
              dateRange={{ before: searchParams.before * 1000 || null, after: searchParams.after * 1000 || null }}
              close={() => setState({ ...state, showCalendar: false })}
            >
              <Timepicker timeRange={searchParams.time_range} onChange={handleSelectTimeRange} />
            </Calendar>
          </Menu>
        </span>
      )}
      {state.showPlusSubmit && (
        <Dialog>
          {config.plus.enabled ? (
            <>
              <div className="p-4">
                <Heading size="lg">Submit to Frigate+</Heading>

                <img
                  className="flex-grow-0"
                  src={`${apiHost}/api/events/${plusSubmitEvent.id}/snapshot.jpg`}
                  alt={`${plusSubmitEvent.label}`}
                />

                {plusSubmitEvent.validBox ? (
                  <p className="mb-2">
                    Objects in locations you want to avoid are not false positives. Submitting them as false positives
                    will confuse the model.
                  </p>
                ) : (
                  <p className="mb-2">
                    Events prior to version 0.13 can only be submitted to Frigate+ without annotations.
                  </p>
                )}
              </div>
              {plusSubmitEvent.validBox ? (
                <div className="p-2 flex justify-start flex-row-reverse space-x-2">
                  <Button className="ml-2" onClick={() => setState({ ...state, showPlusSubmit: false })} type="text">
                    {uploading.includes(plusSubmitEvent.id) ? 'Close' : 'Cancel'}
                  </Button>
                  <Button
                    className="ml-2"
                    color="red"
                    onClick={() => onSendToPlus(plusSubmitEvent.id, true, plusSubmitEvent.validBox)}
                    disabled={uploading.includes(plusSubmitEvent.id)}
                    type="text"
                  >
                    This is not a {plusSubmitEvent.label}
                  </Button>
                  <Button
                    className="ml-2"
                    color="green"
                    onClick={() => onSendToPlus(plusSubmitEvent.id, false, plusSubmitEvent.validBox)}
                    disabled={uploading.includes(plusSubmitEvent.id)}
                    type="text"
                  >
                    This is a {plusSubmitEvent.label}
                  </Button>
                </div>
              ) : (
                <div className="p-2 flex justify-start flex-row-reverse space-x-2">
                  <Button
                    className="ml-2"
                    onClick={() => setState({ ...state, showPlusSubmit: false })}
                    disabled={uploading.includes(plusSubmitEvent.id)}
                    type="text"
                  >
                    {uploading.includes(plusSubmitEvent.id) ? 'Close' : 'Cancel'}
                  </Button>
                  <Button
                    className="ml-2"
                    onClick={() => onSendToPlus(plusSubmitEvent.id, false, plusSubmitEvent.validBox)}
                    disabled={uploading.includes(plusSubmitEvent.id)}
                    type="text"
                  >
                    Submit to Frigate+
                  </Button>
                </div>
              )}
            </>
          ) : (
            <>
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
                <Button className="ml-2" onClick={() => setState({ ...state, showPlusSubmit: false })} type="text">
                  Close
                </Button>
              </div>
            </>
          )}
        </Dialog>
      )}
      {deleteFavoriteState.showDeleteFavorite && (
        <Dialog>
          <div className="p-4">
            <Heading size="lg">Delete Saved Event?</Heading>
            <p className="mb-2">Confirm deletion of saved event.</p>
          </div>
          <div className="p-2 flex justify-start flex-row-reverse space-x-2">
            <Button
              className="ml-2"
              onClick={() => setDeleteFavoriteState({ ...state, showDeleteFavorite: false })}
              type="text"
            >
              Cancel
            </Button>
            <Button
              className="ml-2"
              color="red"
              onClick={(e) => {
                setDeleteFavoriteState({ ...state, showDeleteFavorite: false });
                onDelete(e, deleteFavoriteState.deletingFavoriteEventId, false);
              }}
              type="text"
            >
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
                          {event.label.replaceAll('_', ' ')}
                          {event.sub_label ? `: ${event.sub_label.replaceAll('_', ' ')}` : null}
                        </div>

                        <div className="text-sm flex">
                          <Clock className="h-5 w-5 mr-2 inline" />
                          {formatUnixTimestampToDateTime(event.start_time, { ...config.ui })}
                          <div className="hidden md:inline">
                            <span className="m-1">-</span>
                            <TimeAgo time={event.start_time * 1000} dense />
                          </div>
                          <div className="hidden md:inline">
                            <span className="m-1" />( {getDurationFromTimestamps(event.start_time, event.end_time)} )
                          </div>
                        </div>
                        <div className="capitalize text-sm flex align-center mt-1">
                          <Camera className="h-5 w-5 mr-2 inline" />
                          {event.camera.replaceAll('_', ' ')}
                        </div>
                        {event.zones.length ? (
                          <div className="capitalize  text-sm flex align-center">
                            <Zone className="w-5 h-5 mr-2 inline" />
                            {event.zones.join(', ').replaceAll('_', ' ')}
                          </div>
                        ) : null}
                        <div className="capitalize  text-sm flex align-center">
                          <Score className="w-5 h-5 mr-2 inline" />
                          {(event?.data?.top_score || event.top_score || 0) == 0
                            ? null
                            : `${event.label}: ${((event?.data?.top_score || event.top_score) * 100).toFixed(0)}%`}
                          {(event?.data?.sub_label_score || 0) == 0
                            ? null
                            : `, ${event.sub_label}: ${(event?.data?.sub_label_score * 100).toFixed(0)}%`}
                        </div>
                      </div>
                      <div class="hidden sm:flex flex-col justify-end mr-2">
                        {event.end_time && event.has_snapshot && (event?.data?.type || 'object') == 'object' && (
                          <Fragment>
                            {event.plus_id ? (
                              <div className="uppercase text-xs underline">
                                <Link
                                  href={`https://plus.frigate.video/dashboard/edit-image/?id=${event.plus_id}`}
                                  target="_blank"
                                  rel="nofollow"
                                >
                                  Edit in Frigate+
                                </Link>
                              </div>
                            ) : (
                              <Button
                                color="gray"
                                disabled={uploading.includes(event.id)}
                                onClick={(e) =>
                                  showSubmitToPlus(event.id, event.label, event?.data?.box || event.box, e)
                                }
                              >
                                {uploading.includes(event.id) ? 'Uploading...' : 'Send to Frigate+'}
                              </Button>
                            )}
                          </Fragment>
                        )}
                      </div>
                      <div class="flex flex-col">
                        <Delete
                          className="h-6 w-6 cursor-pointer"
                          stroke="#f87171"
                          onClick={(e) => onDelete(e, event.id, event.retain_indefinitely)}
                        />

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
                        <div className="flex justify-center w-full py-2">
                          <Tabs
                            selectedIndex={event.has_clip && eventDetailType == 'clip' ? 0 : 1}
                            onChange={handleEventDetailTabChange}
                            className="justify"
                          >
                            <TextTab text="Clip" disabled={!event.has_clip} />
                            <TextTab text={event.has_snapshot ? 'Snapshot' : 'Thumbnail'} />
                          </Tabs>
                        </div>

                        <div>
                          {eventDetailType == 'clip' && event.has_clip ? (
                            <div>
                              <TimelineSummary
                                event={event}
                                onFrameSelected={(frame, seekSeconds) =>
                                  onEventFrameSelected(event, frame, seekSeconds)
                                }
                              />
                              <div>
                                <VideoPlayer
                                  options={{
                                    preload: 'auto',
                                    autoplay: true,
                                    sources: [
                                      {
                                        src: `${apiHost}vod/event/${event.id}/master.m3u8`,
                                        type: 'application/vnd.apple.mpegurl',
                                      },
                                    ],
                                  }}
                                  seekOptions={{ forward: 10, backward: 5 }}
                                  onReady={(player) => {
                                    this.player = player;
                                    this.player.on('playing', () => {
                                      setEventOverlay(undefined);
                                    });
                                  }}
                                  onDispose={() => {
                                    this.player = null;
                                  }}
                                >
                                  {eventOverlay ? (
                                    <TimelineEventOverlay
                                      eventOverlay={eventOverlay}
                                      cameraConfig={config.cameras[event.camera]}
                                    />
                                  ) : null}
                                </VideoPlayer>
                              </div>
                            </div>
                          ) : null}

                          {eventDetailType == 'image' || !event.has_clip ? (
                            <div className="flex justify-center">
                              <img
                                className="flex-grow-0"
                                src={
                                  event.has_snapshot
                                    ? `${apiHost}/api/events/${event.id}/snapshot.jpg`
                                    : `${apiHost}/api/events/${event.id}/thumbnail.jpg`
                                }
                                alt={`${event.label} at ${((event?.data?.top_score || event.top_score) * 100).toFixed(
                                  0
                                )}% confidence`}
                              />
                            </div>
                          ) : null}
                        </div>
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

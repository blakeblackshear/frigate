import { h } from 'preact';
import { parseISO, endOfHour, startOfHour, getUnixTime } from 'date-fns';
import { useEffect, useMemo } from 'preact/hooks';
import ActivityIndicator from '../components/ActivityIndicator';
import Heading from '../components/Heading';
import RecordingPlaylist from '../components/RecordingPlaylist';
import VideoPlayer from '../components/VideoPlayer';
import { useApiHost } from '../api';
import useSWR from 'swr';

export default function Recording({ camera, date, hour = '00', minute = '00', second = '00' }) {
  const { data: config } = useSWR('config');
  const currentDate = useMemo(
    () => (date ? parseISO(`${date}T${hour || '00'}:${minute || '00'}:${second || '00'}`) : new Date()),
    [date, hour, minute, second]
  );
  const timezone = useMemo(() => config.ui?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone, [config]);

  const apiHost = useApiHost();
  const { data: recordingsSummary } = useSWR([`${camera}/recordings/summary`, { timezone }], {
    revalidateOnFocus: false,
  });

  const recordingParams = {
    before: getUnixTime(endOfHour(currentDate)),
    after: getUnixTime(startOfHour(currentDate)),
  };
  const { data: recordings } = useSWR([`${camera}/recordings`, recordingParams], { revalidateOnFocus: false });

  // calculates the seek seconds by adding up all the seconds in the segments prior to the playback time
  const seekSeconds = useMemo(() => {
    if (!recordings) {
      return 0;
    }
    const currentUnix = getUnixTime(currentDate);

    const hourStart = getUnixTime(startOfHour(currentDate));
    let seekSeconds = 0;
    recordings.every((segment) => {
      // if the next segment is past the desired time, stop calculating
      if (segment.start_time > currentUnix) {
        return false;
      }
      // if the segment starts before the hour, skip the seconds before the hour
      const start = segment.start_time < hourStart ? hourStart : segment.start_time;
      // if the segment ends after the selected time, use the selected time for end
      const end = segment.end_time > currentUnix ? currentUnix : segment.end_time;
      seekSeconds += end - start;
      return true;
    });
    return seekSeconds;
  }, [recordings, currentDate]);

  const playlist = useMemo(() => {
    if (!recordingsSummary) {
      return [];
    }

    const selectedDayRecordingData = recordingsSummary.find((s) => !date || s.day === date);

    if (!selectedDayRecordingData) {
      return [];
    }

    const [year, month, day] = selectedDayRecordingData.day.split('-');
    return selectedDayRecordingData.hours
      .map((h) => {
        return {
          name: h.hour,
          description: `${camera} recording @ ${h.hour}:00.`,
          sources: [
            {
              src: `${apiHost}vod/${year}-${month}/${day}/${h.hour}/${camera}/${timezone.replaceAll(
                '/',
                ','
              )}/master.m3u8`,
              type: 'application/vnd.apple.mpegurl',
            },
          ],
        };
      })
      .reverse();
  }, [apiHost, date, recordingsSummary, camera, timezone]);

  const playlistIndex = useMemo(() => {
    const index = playlist.findIndex((item) => item.name === hour);
    if (index === -1) {
      return 0;
    }
    return index;
  }, [playlist, hour]);

  useEffect(() => {
    if (this.player) {
      this.player.playlist(playlist);
    }
  }, [playlist]);

  useEffect(() => {
    if (this.player) {
      this.player.playlist.currentItem(playlistIndex);
    }
  }, [playlistIndex]);

  useEffect(() => {
    if (this.player) {
      // if the playlist has moved on to the next item, then reset
      if (this.player.playlist.currentItem() !== playlistIndex) {
        this.player.playlist.currentItem(playlistIndex);
      }
      this.player.currentTime(seekSeconds);
      // try and play since the user is likely to have interacted with the dom
      this.player.play();
    }
  }, [seekSeconds, playlistIndex]);

  if (!recordingsSummary || !recordings || !config) {
    return <ActivityIndicator />;
  }

  if (recordingsSummary.length === 0) {
    return (
      <div className="space-y-4">
        <Heading>{camera} Recordings</Heading>
        <div class="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4" role="alert">
          <p class="font-bold">No Recordings Found</p>
          <p>Make sure you have enabled the record role in your configuration for the {camera} camera.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-2 px-4">
      <Heading>{camera.replaceAll('_', ' ')} Recordings</Heading>
      <div className="text-xs">Dates and times are based on the timezone {timezone}</div>

      <VideoPlayer
        options={{
          preload: 'auto',
        }}
        onReady={(player) => {
          player.on('ratechange', () => player.defaultPlaybackRate(player.playbackRate()));
          if (player.playlist) {
            player.playlist(playlist);
            player.playlist.autoadvance(0);
            player.playlist.currentItem(playlistIndex);
            player.currentTime(seekSeconds);
            this.player = player;
          }
        }}
        onDispose={() => {
          this.player = null;
        }}
      >
        <RecordingPlaylist camera={camera} recordings={recordingsSummary} selectedDate={currentDate} />
      </VideoPlayer>
    </div>
  );
}

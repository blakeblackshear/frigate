import { h } from 'preact';
import { closestTo, format, parseISO } from 'date-fns';
import ActivityIndicator from '../components/ActivityIndicator';
import Heading from '../components/Heading';
import RecordingPlaylist from '../components/RecordingPlaylist';
import VideoPlayer from '../components/VideoPlayer';
import { FetchStatus, useApiHost, useRecording } from '../api';

export default function Recording({ camera, date, hour }) {
  const apiHost = useApiHost();
  const { data, status } = useRecording(camera);

  if (status !== FetchStatus.LOADED) {
    return <ActivityIndicator />;
  }

  const recordingDates = data.map((item) => item.date);
  const selectedDate = closestTo(
    date ? parseISO(date) : new Date(),
    recordingDates.map((i) => parseISO(i))
  );
  const selectedKey = format(selectedDate, 'yyyy-MM-dd');
  const [year, month, day] = selectedKey.split('-');
  const playlist = [];
  const hours = [];

  for (const item of data) {
    if (item.date === selectedKey) {
      for (const recording of item.recordings) {
        playlist.push({
          name: `${selectedKey} ${recording.hour}:00`,
          description: `${camera} recording @ ${recording.hour}:00.`,
          sources: [
            {
              src: `${apiHost}/vod/${year}-${month}/${day}/${recording.hour}/${camera}/index.m3u8`,
              type: 'application/vnd.apple.mpegurl',
            },
          ],
        });
        hours.push(recording.hour);
      }
    }
  }

  const selectedHour = hours.indexOf(hour);

  if (this.player !== undefined) {
    this.player.playlist([]);
    this.player.playlist(playlist);
    this.player.playlist.autoadvance(0);
    if (selectedHour !== -1) {
      this.player.playlist.currentItem(selectedHour);
    }
  }

  return (
    <div className="space-y-4">
      <Heading>{camera} Recordings</Heading>

      <VideoPlayer
        onReady={(player) => {
          if (player.playlist) {
            player.playlist(playlist);
            player.playlist.autoadvance(0);
            if (selectedHour !== -1) {
              player.playlist.currentItem(selectedHour);
            }
            this.player = player;
          }
        }}
      >
        <RecordingPlaylist camera={camera} recordings={data} selectedDate={selectedKey} />
      </VideoPlayer>
    </div>
  );
}

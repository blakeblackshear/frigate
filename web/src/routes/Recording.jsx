import { h } from 'preact';
import { closestTo, format, parseISO } from 'date-fns';
import ActivityIndicator from '../components/ActivityIndicator';
import Heading from '../components/Heading';
import RecordingPlaylist from '../components/RecordingPlaylist';
import VideoPlayer from '../components/VideoPlayer';
import { FetchStatus, useApiHost, useRecording } from '../api';

export default function Recording({ camera, date, hour, seconds }) {
  const apiHost = useApiHost();
  const { data, status } = useRecording(camera);

  if (status !== FetchStatus.LOADED) {
    return <ActivityIndicator />;
  }

  if (data.length === 0) {
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

  if (this.player) {
    this.player.playlist([]);
    this.player.playlist(playlist);
    this.player.playlist.autoadvance(0);
    if (selectedHour !== -1) {
      this.player.playlist.currentItem(selectedHour);
      if (seconds !== undefined) {
        this.player.currentTime(seconds);
        // Force playback rate to be correct
        const playbackRate = this.player.playbackRate();
        this.player.defaultPlaybackRate(playbackRate);
      }
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
              if (seconds !== undefined) {
                player.currentTime(seconds);
              }
            }
            this.player = player;
          }
        }}
        onDispose={() => {
          this.player = null;
        }}
      >
        <RecordingPlaylist camera={camera} recordings={data} selectedDate={selectedKey} selectedHour={hour} />
      </VideoPlayer>
    </div>
  );
}

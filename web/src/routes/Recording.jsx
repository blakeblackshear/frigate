import { h } from 'preact';
import { Link } from 'preact-router/match';
import { closestTo, format, isEqual, parseISO } from 'date-fns';
import ActivityIndicator from '../components/ActivityIndicator';
import Button from '../components/Button';
import Calendar from '../components/Calendar';
import Carousel from '../components/Carousel';
import Heading from '../components/Heading';
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
  const calendar = [];
  const buttons = [];
  const playlist = [];
  const hours = [];

  for (const item of data) {
    const date = parseISO(item.date);
    const events = item.recordings.map((i) => i.events);
    calendar.push(
      <Link href={`/recordings/${camera}/${item.date}`}>
        <Calendar
          date={date}
          hours={events.length}
          events={events.reduce((a, b) => a + b)}
          selected={isEqual(selectedDate, date)}
        />
      </Link>
    );

    if (item.date == selectedKey) {
      for (const recording of item.recordings) {
        buttons.push(
          <Button href={`/recordings/${camera}/${item.date}/${recording.hour}`} type="text">
            {recording.hour}:00
          </Button>
        );
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

  const selectDate = (flkty) => {
    flkty.select(recordingDates.indexOf(selectedKey), false, true);
  };

  const selectHour = (flkty) => {
    flkty.select(selectedHour, false, true);
  };

  return (
    <div className="space-y-4">
      <Heading>{camera} Recordings</Heading>

      <Carousel flickityRef={selectDate} options={{ pageDots: false }}>
        {calendar}
      </Carousel>

      <VideoPlayer
        date={selectedKey}
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
      />

      <Carousel flickityRef={selectHour} options={{ pageDots: false }}>
        {buttons}
      </Carousel>
    </div>
  );
}

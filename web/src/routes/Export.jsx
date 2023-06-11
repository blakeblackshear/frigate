import Heading from '../components/Heading';
import { useState, useEffect } from 'preact/hooks';
import useSWR from 'swr';
import Button from '../components/Button';
import axios from 'axios';

export default function Export() {
  const { data: config } = useSWR('config');

  const [camera, setCamera] = useState('select');
  const [playback, setPlayback] = useState('select');
  const [message, setMessage] = useState({ text: '', error: false });
  const [startDate, setStartDate] = useState('input');
  const [startTime, setStartTime] = useState('input');
  const [endDate, setEndDate] = useState('input');
  const [endTime, setEndTime] = useState('input');

  useEffect(() => {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const offsetMs = currentDate.getTimezoneOffset() * 60 * 1000;
    const localISOTime = (new Date(currentDate.getTime() - offsetMs)).toISOString().slice(0,16);
    setStartDate(localISOTime);
    setStartTime("00:00");
    setEndDate(localISOTime);
    setEndTime("23:59");
  }, []);

  const onHandleExport = () => {
    if (camera == 'select') {
      setMessage({ text: 'A camera needs to be selected.', error: true });
      return;
    }

    if (playback == 'select') {
      setMessage({ text: 'A playback factor needs to be selected.', error: true });
      return;
    }

    

    if (!startDate || !startTime || !endDate || !endTime) {
      setMessage({ text: 'A start and end time needs to be selected', error: true });
      return;
    }

    const start = new Date(`${startDate}T${startTime}`).getTime() / 1000;
    const end = new Date(`${endDate}T${endTime}`).getTime() / 1000;

    if (end <= start) {
      setMessage({ text: 'The end time must be after the start time.', error: true });
      return;
    }

    setMessage({ text: 'Successfully started export. View the file in the /exports folder.', error: false });
    axios.post(`export/${camera}/start/${start}/end/${end}`, { playback });
  };

  return (
    <div className="space-y-4 p-2 px-4 w-full">
      <Heading>Export</Heading>

      {message.text && (
        <div className={`max-h-20 ${message.error ? 'text-red-500' : 'text-green-500'}`}>{message.text}</div>
      )}

      <div>
        <select
          className="me-2 cursor-pointer rounded dark:bg-slate-800"
          value={camera}
          onChange={(e) => setCamera(e.target.value)}
        >
          <option value="select">Select A Camera</option>
          {Object.keys(config?.cameras || {}).map((item) => (
            <option key={item} value={item}>
              {item.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
        <select
          className="ms-2 cursor-pointer rounded dark:bg-slate-800"
          value={playback}
          onChange={(e) => setPlayback(e.target.value)}
        >
          <option value="select">Select A Playback Factor</option>
          <option value="realtime">Realtime</option>
          <option value="timelapse_25x">Timelapse</option>
        </select>
      </div>

      <div>
        <Heading className="py-2" size="sm">
          From:
        </Heading>
        <input className="dark:bg-slate-800" id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}/>
        <input className="dark:bg-slate-800" id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}/>
        <Heading className="py-2" size="sm">
          To:
        </Heading>
        <input className="dark:bg-slate-800" id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}/>
        <input className="dark:bg-slate-800" id="endTime" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}/>
      </div>
      <Button onClick={() => onHandleExport()}>Submit</Button>
    </div>
  );
}

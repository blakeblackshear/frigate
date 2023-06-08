import { h } from 'preact';
import Heading from '../components/Heading';
import { useState } from 'preact/hooks';
import useSWR from 'swr';
import Button from '../components/Button';
import axios from 'axios';

export default function Export() {
  const { data: config } = useSWR('config');

  const [camera, setCamera] = useState('select');
  const [playback, setPlayback] = useState('select');
  const [message, setMessage] = useState({ text: '', error: false });

  const onHandleExport = () => {
    if (camera == 'select') {
      setMessage({ text: 'A camera needs to be selected.', error: true });
      return;
    }

    if (playback == 'select') {
      setMessage({ text: 'A playback factor needs to be selected.', error: true });
      return;
    }

    const start = new Date(document.getElementById('start').value).getTime() / 1000;
    const end = new Date(document.getElementById('end').value).getTime() / 1000;

    if (!start || !end) {
      setMessage({ text: 'A start and end time needs to be selected', error: true });
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
        <input className="dark:bg-slate-800" id="start" type="datetime-local" />
        <Heading className="py-2" size="sm">
          To:
        </Heading>
        <input className="dark:bg-slate-800" id="end" type="datetime-local" />
      </div>
      <Button onClick={() => onHandleExport()}>Submit</Button>
    </div>
  );
}

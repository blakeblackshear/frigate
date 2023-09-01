import Heading from '../components/Heading';
import { useState } from 'preact/hooks';
import useSWR from 'swr';
import Button from '../components/Button';
import axios from 'axios';
import { baseUrl } from '../api/baseUrl';
import { Fragment } from 'preact';
import ActivityIndicator from '../components/ActivityIndicator';

export default function Export() {
  const { data: config } = useSWR('config');
  const { data: exports } = useSWR('exports/', (url) => axios({ baseURL: baseUrl, url }).then((res) => res.data));

  const [camera, setCamera] = useState('select');
  const [playback, setPlayback] = useState('select');
  const [message, setMessage] = useState({ text: '', error: false });

  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  const offsetMs = currentDate.getTimezoneOffset() * 60 * 1000;
  const localDate = new Date(currentDate.getTime() - offsetMs);
  const localISODate = localDate.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(localISODate);
  const [startTime, setStartTime] = useState('00:00');
  const [endDate, setEndDate] = useState(localISODate);
  const [endTime, setEndTime] = useState('23:59');

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

    axios
      .post(`export/${camera}/start/${start}/end/${end}`, { playback })
      .then((response) => {
        if (response.status == 200) {
          setMessage({ text: 'Successfully started export. View the file in the /exports folder.', error: false });
        }
      })
      .catch((error) => {
        if (error.response) {
          setMessage({ text: `Failed to start export: ${error.response.data.message}`, error: true });
        } else {
          setMessage({ text: `Failed to start export: ${error.message}`, error: true });
        }
      });
  };

  return (
    <div className="space-y-4 p-2 px-4 w-full">
      <Heading>Export</Heading>

      {message.text && (
        <div className={`max-h-20 ${message.error ? 'text-red-500' : 'text-green-500'}`}>{message.text}</div>
      )}

      <div className="xl:flex justify-between">
        <div>
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
            <input
              className="dark:bg-slate-800"
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <input
              className="dark:bg-slate-800"
              id="startTime"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
            <Heading className="py-2" size="sm">
              To:
            </Heading>
            <input
              className="dark:bg-slate-800"
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <input
              className="dark:bg-slate-800"
              id="endTime"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
          <Button className="my-4" onClick={() => onHandleExport()}>
            Submit
          </Button>
        </div>

        {exports && (
          <div className="p-4 bg-gray-800 xl:w-1/2">
            <Heading size="md">Exports</Heading>
            <Exports exports={exports} />
          </div>
        )}
      </div>
    </div>
  );
}

function Exports({ exports }) {
  return (
    <Fragment>
      {exports.map((item) => (
        <div className="my-4 p-4 bg-gray-700" key={item.name}>
          {item.name.startsWith('in_progress') ? (
            <div className="flex justify-start text-center items-center">
              <div>
                <ActivityIndicator size="sm" />
              </div>
              <div className="px-2">{item.name.substring(12, item.name.length - 4)}</div>
            </div>
          ) : (
            <div className="flex justify-start items-center">
              <a className="text-blue-500 hover:underline" href={`${baseUrl}exports/${item.name}`} download>
                {item.name.substring(0, item.name.length - 4)}
              </a>
            </div>
          )}
        </div>
      ))}
    </Fragment>
  );
}

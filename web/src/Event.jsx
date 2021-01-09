import { h } from 'preact';
import { ApiHost } from './context';
import Heading from './components/Heading';
import { useContext, useEffect, useState } from 'preact/hooks';

export default function Event({ eventId }) {
  const apiHost = useContext(ApiHost);
  const [data, setData] = useState(null);

  useEffect(async () => {
    const response = await fetch(`${apiHost}/api/events/${eventId}`);
    const data = response.ok ? await response.json() : null;
    setData(data);
  }, [apiHost, eventId]);

  if (!data) {
    return (
      <div>
        <Heading>{eventId}</Heading>
        <p>loading…</p>
      </div>
    );
  }

  const datetime = new Date(data.start_time * 1000);

  return (
    <div>
      <Heading>
        {data.camera} {data.label} <span className="text-sm">{datetime.toLocaleString()}</span>
      </Heading>
      <img
        src={`data:image/jpeg;base64,${data.thumbnail}`}
        alt={`${data.label} at ${(data.top_score * 100).toFixed(1)}% confidence`}
      />
      <video className="w-96" src={`${apiHost}/clips/${data.camera}-${eventId}.mp4`} controls />
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

import { h } from 'preact';
import Heading from '../components/Heading';
import { useEffect, useState } from 'preact/hooks';
import ButtonsTabbed from '../components/ButtonsTabbed';
import useSWR from 'swr';
import Button from '../components/Button';

export default function Logs() {
  const [logService, setLogService] = useState('frigate');

  const { data: frigateLogs } = useSWR('logs/frigate');
  const { data: go2rtcLogs } = useSWR('logs/go2rtc');
  const { data: nginxLogs } = useSWR('logs/nginx');

  return (
    <div className="space-y-4 p-2 px-4">
      <Heading>Logs</Heading>

      <ButtonsTabbed viewModes={['frigate', 'go2rtc', 'nginx']} setViewMode={setLogService} />

      <div className='overflow-auto font-mono text-sm text-gray-900 dark:text-gray-100 rounded bg-gray-100 dark:bg-gray-800 p-2 whitespace-pre-wrap'>
        {logService == 'frigate' ? frigateLogs : (logService == 'go2rtc' ? go2rtcLogs : nginxLogs)}
      </div>
      <Button className="">
        Copy to Clipboard
      </Button>
    </div>
  );
}

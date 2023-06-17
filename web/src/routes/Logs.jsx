import { h } from 'preact';
import Heading from '../components/Heading';
import { useCallback, useEffect, useState } from 'preact/hooks';
import ButtonsTabbed from '../components/ButtonsTabbed';
import useSWR from 'swr';
import Button from '../components/Button';
import copy from 'copy-to-clipboard';

export default function Logs() {
  const [logService, setLogService] = useState('frigate');
  const [logs, setLogs] = useState('frigate');

  const { data: frigateLogs } = useSWR('logs/frigate');
  const { data: go2rtcLogs } = useSWR('logs/go2rtc');
  const { data: nginxLogs } = useSWR('logs/nginx');

  const handleCopyLogs = useCallback(() => {
    copy(logs);
  }, [logs]);

  useEffect(() => {
    switch (logService) {
      case 'frigate':
        setLogs(frigateLogs);
        break;
      case 'go2rtc':
        setLogs(go2rtcLogs);
        break;
      case 'nginx':
        setLogs(nginxLogs);
        break;
    }
  }, [frigateLogs, go2rtcLogs, nginxLogs, logService, setLogs]);

  return (
    <div className="space-y-4 p-2 px-4">
      <Heading>Logs</Heading>

      <ButtonsTabbed viewModes={['frigate', 'go2rtc', 'nginx']} currentViewMode={logService} setViewMode={setLogService} />

      <Button className="" onClick={handleCopyLogs}>
        Copy to Clipboard
      </Button>

      <div className="overflow-auto font-mono text-sm text-gray-900 dark:text-gray-100 rounded bg-gray-100 dark:bg-gray-800 p-2 whitespace-pre-wrap">
        {logs}
      </div>
    </div>
  );
}

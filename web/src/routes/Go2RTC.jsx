import { h } from 'preact';
import useSWR from 'swr';
import axios from 'axios';
import ActivityIndicator from '../components/ActivityIndicator';
import Heading from '../components/Heading';
import { useEffect, useState } from 'preact/hooks';
import Button from '../components/Button';
import { editor } from 'monaco-editor';
import { setDiagnosticsOptions } from 'monaco-yaml';
import copy from 'copy-to-clipboard';

export default function Go2RTC() {

  const { data: config } = useSWR('go2rtc/config');
  const [success, setSuccess] = useState();
  const [error, setError] = useState();

  const onHandleSaveConfig = async (e) => {
    if (e) {
      e.stopPropagation();
    }

    axios
      .post('go2rtc/config', window.editor.getValue(), {
        headers: { 'Content-Type': 'text/plain' },
      })
      .then((response) => {
        if (response.status === 200) {
          setSuccess(response.data);
        }
      })
      .catch((error) => {
        if (error.response) {
          setError(error.response.data.message);
        } else {
          setError(error.message);
        }
      });
  };

  const handleCopyConfig = async () => {
    copy(window.editor.getValue());
  };

  useEffect(() => {
    if (!config) {
      return;
    }

    if (document.getElementById('container_go2rtc').children.length > 0) {
      // we don't need to recreate the editor if it already exists
      return;
    }

    setDiagnosticsOptions({
      enableSchemaRequest: true,
      hover: true,
      completion: true,
      validate: true,
      format: true,
    });
    
    window.editor = editor.create(document.getElementById('container_go2rtc'), {
      language: 'yaml',
      value: config,
      scrollBeyondLastLine: false,
      theme: 'vs-dark',
    });
  });

  if (!config) {
    return <ActivityIndicator />;
  }

  return (
    <div className="space-y-4 p-2 px-4 h-full">
      <div className="flex justify-between">
        <Heading>go2rtc</Heading>
        <div>
          <Button className="mx-2" onClick={(e) => handleCopyConfig(e)}>
            Copy Config
          </Button>
          <Button className="mx-2" onClick={(e) => onHandleSaveConfig(e)}>
            Save & Restart
          </Button>
        </div>
      </div>

      {success && <div className="max-h-20 text-green-500">{success}</div>}
      {error && <div className="p-4 overflow-scroll text-red-500 whitespace-pre-wrap">{error}</div>}

      <div id="container_go2rtc" className="h-full" />
    </div>
  );
}
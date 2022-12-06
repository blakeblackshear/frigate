import { h } from 'preact';
import useSWR from 'swr';
import axios from 'axios';
import ActivityIndicator from '../components/ActivityIndicator';
import Heading from '../components/Heading';
import { useEffect, useState } from 'preact/hooks';
import Button from '../components/Button';
import * as monaco from 'monaco-editor';

export default function Config() {
  const { data: config } = useSWR('config/raw');
  const [newCode, setNewCode] = useState();
  const [success, setSuccess] = useState();
  const [error, setError] = useState();

  const onHandleSaveConfig = async (e) => {
    if (e) {
      e.stopPropagation();
    }

    axios
      .post('config/save', newCode, {
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
    await window.navigator.clipboard.writeText(newCode);
  };

  useEffect(() => {
    if (!config) {
      return;
    }

    monaco.editor.create(document.getElementById('container'), {
      language: 'yaml',
      value: config,
    });
  });

  if (!config) {
    return <ActivityIndicator />;
  }

  return (
    <div className="space-y-4 p-2 px-4 h-full">
      <div className="flex justify-between">
        <Heading>Config</Heading>
        <div>
          <Button className="mx-2" onClick={(e) => handleCopyConfig(e)}>
            Copy Config
          </Button>
          {newCode && (
            <Button className="mx-2" onClick={(e) => onHandleSaveConfig(e)}>
              Save & Restart
            </Button>
          )}
        </div>
      </div>

      {success && <div className="max-h-20 text-red-500">{success}</div>}
      {error && <div className="p-4 overflow-scroll text-red-500 whitespace-pre-wrap">{error}</div>}

      <div id="container" className="h-full" />
    </div>
  );
}

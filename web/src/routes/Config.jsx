import { h } from 'preact';
import useSWR from 'swr';
import axios from 'axios';
import { useApiHost } from '../api';
import ActivityIndicator from '../components/ActivityIndicator';
import Heading from '../components/Heading';
import { useEffect, useState } from 'preact/hooks';
import Button from '../components/Button';
import { editor, Uri } from 'monaco-editor';
import { setDiagnosticsOptions } from 'monaco-yaml';

export default function Config() {
  const apiHost = useApiHost();

  const { data: config } = useSWR('config/raw');
  const [success, setSuccess] = useState();
  const [error, setError] = useState();

  const onHandleSaveConfig = async (e) => {
    if (e) {
      e.stopPropagation();
    }

    axios
      .post('config/save', window.editor.getValue(), {
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
    await window.navigator.clipboard.writeText(window.editor.getValue());
  };

  useEffect(() => {
    if (!config) {
      return;
    }

    const modelUri = Uri.parse('a://b/api/config/schema.json');

    setDiagnosticsOptions({
      enableSchemaRequest: true,
      hover: true,
      completion: true,
      validate: true,
      format: true,
      schemas: [
        {
          uri: `${apiHost}/api/config/schema.json`,
          fileMatch: [String(modelUri)],
        },
      ],
    });

    window.editor = editor.create(document.getElementById('container'), {
      language: 'yaml',
      model: editor.createModel(config, 'yaml', modelUri),
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
        <Heading>Config</Heading>
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

      <div id="container" className="h-full" />
    </div>
  );
}

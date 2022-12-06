import { h } from 'preact';
import useSWR from 'swr';
import CodeEditor from '@uiw/react-textarea-code-editor';
import ActivityIndicator from '../components/ActivityIndicator';
import Heading from '../components/Heading';
import { useState } from 'preact/hooks';
import Button from '../components/Button';
import axios from 'axios';

export default function Config() {
  const { data: config } = useSWR('config/raw');
  const [newCode, setNewCode] = useState(config);
  const [error, setError] = useState();

  const onHandleSaveConfig = async (e) => {
    if (e) {
      e.stopPropagation();
    }

    const response = await axios.post('config/save', newCode, {
      headers: { 'Content-Type': 'text/plain' },
    });
    console.log('The resp is ' + response.status + ' and data ' + response.data);
    if (response.status === 200) {
      // TODO set success
    } else {
      setError(response.data);
    }
  };

  const handleCopyConfig = async () => {
    await window.navigator.clipboard.writeText(newCode);
  };

  if (!config) {
    return <ActivityIndicator />;
  }

  return (
    <div className="space-y-4 p-2 px-4">
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

      {error && <div className="max-h-20 text-red-500">There is an error</div>}

      <CodeEditor value={config} language="yaml" onChange={(e) => setNewCode(e.target.value)} />
    </div>
  );
}

import { h, Fragment } from 'preact';
import useSWR from 'swr';
import CodeEditor from '@uiw/react-textarea-code-editor';
import ActivityIndicator from '../components/ActivityIndicator';
import Heading from '../components/Heading';
import { useState } from 'preact/hooks';

export default function Config() {
  const { data: config } = useSWR('config/raw');
  const [newCode, setNewCode] = useState(config);

  if (!config) {
    return <ActivityIndicator />;
  }

  return (
    <div className="space-y-4 p-2 px-4">
      <Heading>Config</Heading>

      <CodeEditor value={config} language="yaml" onChange={(e) => setNewCode(e.target.value)} />
    </div>
  );
}

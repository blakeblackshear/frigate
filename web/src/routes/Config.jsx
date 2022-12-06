import { h, Fragment } from 'preact';
import useSWR from 'swr';
import { createReactEditorJS } from 'react-editor-js';
import ActivityIndicator from '../components/ActivityIndicator';
import Heading from '../components/Heading';

export default function Config() {
  const { data: config } = useSWR('config/raw');
  const ReactEditorJS = createReactEditorJS();

  if (!config) {
    return <ActivityIndicator />;
  }

  return (
    <div className="space-y-4 p-2 px-4">
      <Heading>Config</Heading>

      <ReactEditorJS defaultValue={config} />
    </div>
  );
}

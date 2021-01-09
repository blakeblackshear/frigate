import { h } from 'preact';
import { ApiHost } from './context';
import { useContext, useEffect, useState } from 'preact/hooks';

export default function Debug() {
  const apiHost = useContext(ApiHost);
  const [config, setConfig] = useState({});

  useEffect(async () => {
    const response = await fetch(`${apiHost}/api/stats`);
    const data = response.ok ? await response.json() : {};
    setConfig(data);
  }, []);

  return <pre>{JSON.stringify(config, null, 2)}</pre>;
}

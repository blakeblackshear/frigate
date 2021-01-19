import { h } from 'preact';
import Camera from './Camera';
import CameraMap from './CameraMap';
import Cameras from './Cameras';
import Debug from './Debug';
import Event from './Event';
import Events from './Events';
import { Router } from 'preact-router';
import Sidebar from './Sidebar';
import { ApiHost, Config } from './context';
import { useContext, useEffect, useState } from 'preact/hooks';

export default function App() {
  const apiHost = useContext(ApiHost);
  const [config, setConfig] = useState(null);

  useEffect(async () => {
    const response = await fetch(`${apiHost}/api/config`);
    const data = response.ok ? await response.json() : {};
    setConfig(data);
  }, []);

  return !config ? (
    <div />
  ) : (
    <Config.Provider value={config}>
      <div className="md:flex flex-col md:flex-row md:min-h-screen w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white">
        <Sidebar />
        <div className="p-4 min-w-0">
          <Router>
            <CameraMap path="/cameras/:camera/editor" />
            <Camera path="/cameras/:camera" />
            <Event path="/events/:eventId" />
            <Events path="/events" />
            <Debug path="/debug" />
            <Cameras path="/" />
          </Router>
        </div>
      </div>
    </Config.Provider>
  );
  return;
}

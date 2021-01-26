import { h } from 'preact';
import Camera from './Camera';
import CameraMap from './CameraMap';
import Cameras from './Cameras';
import Debug from './Debug';
import Event from './Event';
import Events from './Events';
import { Router } from 'preact-router';
import Sidebar from './Sidebar';
import Api, { useConfig } from './api';

export default function App() {
  const { data, status } = useConfig();
  return !data ? (
    <div />
  ) : (
    <div className="md:flex flex-col md:flex-row md:min-h-screen w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white">
      <Sidebar />
      <div className="flex-auto p-2 md:p-4 lg:pl-8 lg:pr-8 min-w-0">
        <Router>
          <CameraMap path="/cameras/:camera/editor" />
          <Camera path="/cameras/:camera" />
          <Event path="/events/:eventId" />
          <Events path="/events" />
          <Debug path="/debug" />
          <Cameras default path="/" />
        </Router>
      </div>
    </div>
  );
}

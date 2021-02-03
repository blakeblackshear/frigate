import { h } from 'preact';
import ActivityIndicator from './components/ActivityIndicator';
import AppBar from './components/AppBar';
import Camera from './Camera';
import CameraMap from './CameraMap';
import Cameras from './Cameras';
import Debug from './Debug';
import Event from './Event';
import Events from './Events';
import { Router } from 'preact-router';
import Sidebar from './Sidebar';
import StyleGuide from './StyleGuide';
import Api, { FetchStatus, useConfig } from './api';
import { DarkModeProvider, SidebarProvider } from './context';

export default function App() {
  const { data, status } = useConfig();
  return (
    <DarkModeProvider>
      <SidebarProvider>
        <div class="w-full">
          <AppBar title="Frigate" />
          {status !== FetchStatus.LOADED ? (
            <div className="flex flex-grow-1 min-h-screen justify-center items-center">
              <ActivityIndicator />
            </div>
          ) : (
            <div className="flex flex-row min-h-screen w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
              <Sidebar />
              <div className="w-full flex-auto p-2 mt-24 px-4 min-w-0">
                <Router>
                  <CameraMap path="/cameras/:camera/editor" />
                  <Camera path="/cameras/:camera" />
                  <Event path="/events/:eventId" />
                  <Events path="/events" />
                  <Debug path="/debug" />
                  {import.meta.env.SNOWPACK_MODE !== 'development' ? <StyleGuide path="/styleguide" /> : null}
                  <Cameras default path="/" />
                </Router>
              </div>
            </div>
          )}
        </div>
      </SidebarProvider>
    </DarkModeProvider>
  );
}

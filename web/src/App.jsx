import * as Routes from './routes';
import { h } from 'preact';
import ActivityIndicator from './components/ActivityIndicator';
import AsyncRoute from 'preact-async-route';
import AppBar from './AppBar';
import Cameras from './routes/Cameras';
import { Router } from 'preact-router';
import Sidebar from './Sidebar';
import { DarkModeProvider, DrawerProvider } from './context';
import { FetchStatus, useConfig } from './api';

export default function App() {
  const { status } = useConfig();
  return (
    <DarkModeProvider>
      <DrawerProvider>
        <div data-testid="app" className="w-full">
          <AppBar />
          {status !== FetchStatus.LOADED ? (
            <div className="flex flex-grow-1 min-h-screen justify-center items-center">
              <ActivityIndicator />
            </div>
          ) : (
            <div className="flex flex-row min-h-screen w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
              <Sidebar />
              <div className="w-full flex-auto p-2 mt-16 px-4 min-w-0">
                <Router>
                  <AsyncRoute path="/cameras/:camera/editor" getComponent={Routes.getCameraMap} />
                  <AsyncRoute path="/cameras/:camera" getComponent={Routes.getCamera} />
                  <AsyncRoute path="/birdseye" getComponent={Routes.getBirdseye} />
                  <AsyncRoute path="/events" getComponent={Routes.getEvents} />
                  <AsyncRoute path="/recording/:camera/:date?/:hour?/:seconds?" getComponent={Routes.getRecording} />
                  <AsyncRoute path="/debug" getComponent={Routes.getDebug} />
                  <AsyncRoute path="/styleguide" getComponent={Routes.getStyleGuide} />
                  <Cameras default path="/" />
                </Router>
              </div>
            </div>
          )}
        </div>
      </DrawerProvider>
    </DarkModeProvider>
  );
}

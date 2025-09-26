import { renderHook, waitFor } from '@testing-library/react';
import { useEventSource } from './use-event-source';
import WS from "jest-websocket-mock";
import { EventSourceOptions } from './types';
import { DEFAULT_EVENT_SOURCE_OPTIONS } from './constants';

let server: WS;
const URL = 'ws://localhost:1234';
const noop = () => {};
const DEFAULT_OPTIONS = DEFAULT_EVENT_SOURCE_OPTIONS;
let options: EventSourceOptions;
console.error = noop;

beforeEach(() => {
  server = new WS(URL);
  options = { ...DEFAULT_OPTIONS };
});

afterEach(() => {
  WS.clean();
});

test('Options#eventSourceOptions, if provided, instantiates an EventSource instead of a WebSocket', async () => {
  const {
    result
  } = renderHook(() => useEventSource(URL, options));

  await waitFor(() => expect(result.current.getEventSource() instanceof EventSource).toBe(true));
});

/* eslint-disable jest/no-disabled-tests */
import { h } from 'preact';
import { WS as frigateWS, WsProvider, useWs } from '../ws';
import { useCallback, useContext } from 'preact/hooks';
import { fireEvent, render, screen } from 'testing-library';
import { WS } from 'jest-websocket-mock';

function Test() {
  const { state } = useContext(frigateWS);
  return state.__connected ? (
    <div data-testid="data">
      {Object.keys(state).map((key) => (
        <div key={key} data-testid={key}>
          {JSON.stringify(state[key])}
        </div>
      ))}
    </div>
  ) : null;
}

const TEST_URL = 'ws://test-foo:1234/ws';

describe('WsProvider', () => {
  let wsClient, wsServer;
  beforeEach(async () => {
    wsClient = {
      close: vi.fn(),
      send: vi.fn(),
    };
    wsServer = new WS(TEST_URL);
  });

  afterEach(() => {
    WS.clean();
  });

  test.skip('connects to the ws server', async () => {
    render(
      <WsProvider config={mockConfig} wsUrl={TEST_URL}>
        <Test />
      </WsProvider>
    );
    await wsServer.connected;
    await screen.findByTestId('data');
    expect(wsClient.args).toEqual([TEST_URL]);
    expect(screen.getByTestId('__connected')).toHaveTextContent('true');
  });

  test.skip('receives data through useWs', async () => {
    function Test() {
      const {
        value: { payload, retain },
        connected,
      } = useWs('tacos');
      return connected ? (
        <div>
          <div data-testid="payload">{JSON.stringify(payload)}</div>
          <div data-testid="retain">{JSON.stringify(retain)}</div>
        </div>
      ) : null;
    }

    const { rerender } = render(
      <WsProvider config={mockConfig} wsUrl={TEST_URL}>
        <Test />
      </WsProvider>
    );
    await wsServer.connected;
    await screen.findByTestId('payload');
    wsClient.onmessage({
      data: JSON.stringify({ topic: 'tacos', payload: JSON.stringify({ yes: true }), retain: false }),
    });
    rerender(
      <WsProvider config={mockConfig} wsUrl={TEST_URL}>
        <Test />
      </WsProvider>
    );
    expect(screen.getByTestId('payload')).toHaveTextContent('{"yes":true}');
    expect(screen.getByTestId('retain')).toHaveTextContent('false');
  });

  test.skip('can send values through useWs', async () => {
    function Test() {
      const { send, connected } = useWs('tacos');
      const handleClick = useCallback(() => {
        send({ yes: true });
      }, [send]);
      return connected ? <button onClick={handleClick}>click me</button> : null;
    }

    render(
      <WsProvider config={mockConfig} wsUrl={TEST_URL}>
        <Test />
      </WsProvider>
    );
    await wsServer.connected;
    await screen.findByRole('button');
    fireEvent.click(screen.getByRole('button'));
    await expect(wsClient.send).toHaveBeenCalledWith(
      JSON.stringify({ topic: 'tacos', payload: JSON.stringify({ yes: true }), retain: false })
    );
  });

  test.skip('prefills the recordings/detect/snapshots state from config', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(123456);
    const config = {
      cameras: {
        front: {
          name: 'front',
          detect: { enabled: true },
          record: { enabled: false },
          snapshots: { enabled: true },
          audio: { enabled: false },
        },
        side: {
          name: 'side',
          detect: { enabled: false },
          record: { enabled: false },
          snapshots: { enabled: false },
          audio: { enabled: false },
        },
      },
    };
    render(
      <WsProvider config={config} wsUrl={TEST_URL}>
        <Test />
      </WsProvider>
    );
    await wsServer.connected;
    await screen.findByTestId('data');
    expect(screen.getByTestId('front/detect/state')).toHaveTextContent(
      '{"lastUpdate":123456,"payload":"ON","retain":false}'
    );
    expect(screen.getByTestId('front/recordings/state')).toHaveTextContent(
      '{"lastUpdate":123456,"payload":"OFF","retain":false}'
    );
    expect(screen.getByTestId('front/snapshots/state')).toHaveTextContent(
      '{"lastUpdate":123456,"payload":"ON","retain":false}'
    );
    expect(screen.getByTestId('side/detect/state')).toHaveTextContent(
      '{"lastUpdate":123456,"payload":"OFF","retain":false}'
    );
    expect(screen.getByTestId('side/recordings/state')).toHaveTextContent(
      '{"lastUpdate":123456,"payload":"OFF","retain":false}'
    );
    expect(screen.getByTestId('side/snapshots/state')).toHaveTextContent(
      '{"lastUpdate":123456,"payload":"OFF","retain":false}'
    );
  });
});

const mockConfig = {
  cameras: {},
};

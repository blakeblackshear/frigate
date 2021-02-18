import { h } from 'preact';
import * as Mqtt from '../mqtt';
import { ApiProvider, useFetch, useApiHost } from '..';
import { render, screen } from '@testing-library/preact';

describe('useApiHost', () => {
  beforeEach(() => {
    jest.spyOn(Mqtt, 'MqttProvider').mockImplementation(({ children }) => children);
  });

  test('is set from the baseUrl', async () => {
    function Test() {
      const apiHost = useApiHost();
      return <div>{apiHost}</div>;
    }
    render(
      <ApiProvider>
        <Test />
      </ApiProvider>
    );
    expect(screen.queryByText('http://base-url.local:5000')).toBeInTheDocument();
  });
});

function Test() {
  const { data, status } = useFetch('/api/tacos');
  return (
    <div>
      <span>{data ? data.returnData : ''}</span>
      <span>{status}</span>
    </div>
  );
}

describe('useFetch', () => {
  let fetchSpy;

  beforeEach(() => {
    jest.spyOn(Mqtt, 'MqttProvider').mockImplementation(({ children }) => children);
    fetchSpy = jest.spyOn(window, 'fetch').mockImplementation(async (url, options) => {
      if (url.endsWith('/api/config')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ ok: true, json: () => Promise.resolve({ returnData: 'yep' }) });
        }, 1);
      });
    });
  });

  test('loads data', async () => {
    render(
      <ApiProvider>
        <Test />
      </ApiProvider>
    );

    expect(screen.queryByText('loading')).toBeInTheDocument();
    expect(screen.queryByText('yep')).not.toBeInTheDocument();

    jest.runAllTimers();
    await screen.findByText('loaded');
    expect(fetchSpy).toHaveBeenCalledWith('http://base-url.local:5000/api/tacos');

    expect(screen.queryByText('loaded')).toBeInTheDocument();
    expect(screen.queryByText('yep')).toBeInTheDocument();
  });

  test('sets error if response is not okay', async () => {
    jest.spyOn(window, 'fetch').mockImplementation((url) => {
      if (url.includes('/config')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ ok: false });
        }, 1);
      });
    });

    render(
      <ApiProvider>
        <Test />
      </ApiProvider>
    );

    expect(screen.queryByText('loading')).toBeInTheDocument();
    jest.runAllTimers();
    await screen.findByText('error');
  });

  test('does not re-fetch if the query has already been made', async () => {
    const { rerender } = render(
      <ApiProvider>
        <Test key={0} />
      </ApiProvider>
    );

    expect(screen.queryByText('loading')).toBeInTheDocument();
    expect(screen.queryByText('yep')).not.toBeInTheDocument();

    jest.runAllTimers();
    await screen.findByText('loaded');
    expect(fetchSpy).toHaveBeenCalledWith('http://base-url.local:5000/api/tacos');

    rerender(
      <ApiProvider>
        <Test key={1} />
      </ApiProvider>
    );

    expect(screen.queryByText('loaded')).toBeInTheDocument();
    expect(screen.queryByText('yep')).toBeInTheDocument();

    jest.runAllTimers();

    // once for /api/config, once for /api/tacos
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});

import { h } from 'preact';
import { ApiProvider, useFetch, useApiHost } from '..';
import { render, screen } from '@testing-library/preact';

jest.mock('../baseUrl');

describe('useApiHost', () => {
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

describe('useFetch', () => {
  function Test() {
    const { data, status } = useFetch('/api/tacos');
    return (
      <div>
        <span>{data ? data.returnData : ''}</span>
        <span>{status}</span>
      </div>
    );
  }
  test('loads data', async () => {
    const fetchSpy = jest.spyOn(window, 'fetch').mockImplementation(
      (url) =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({ ok: true, json: () => Promise.resolve({ returnData: 'yep' }) });
          }, 1);
        })
    );

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
    jest.spyOn(window, 'fetch').mockImplementation(
      (url) =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({ ok: false });
          }, 1);
        })
    );

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
    const fetchSpy = jest.spyOn(window, 'fetch').mockImplementation(
      (url) =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({ ok: true, json: () => Promise.resolve({ returnData: 'yep' }) });
          }, 1);
        })
    );

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

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

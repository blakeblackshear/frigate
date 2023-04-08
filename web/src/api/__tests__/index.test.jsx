import { h } from 'preact';
import * as WS from '../ws';
import { ApiProvider, useApiHost } from '..';
import { render, screen } from 'testing-library';

describe('useApiHost', () => {
  beforeEach(() => {
    vi.spyOn(WS, 'WsProvider').mockImplementation(({ children }) => children);
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
    expect(screen.queryByText('http://base-url.local:5000/')).toBeInTheDocument();
  });
});

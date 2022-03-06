import { h } from 'preact';
import * as Mqtt from '../mqtt';
import { ApiProvider, useApiHost } from '..';
import { render, screen } from 'testing-library';

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

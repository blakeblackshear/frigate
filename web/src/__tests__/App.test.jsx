import { h } from 'preact';
import * as Api from '../api';
import * as IDB from 'idb-keyval';
import * as PreactRouter from 'preact-router';
import App from '../App';
import { render, screen } from '@testing-library/preact';

describe('App', () => {
  let mockUseConfig;

  beforeEach(() => {
    jest.spyOn(IDB, 'get').mockImplementation(() => Promise.resolve(undefined));
    jest.spyOn(IDB, 'set').mockImplementation(() => Promise.resolve(true));
    mockUseConfig = jest.spyOn(Api, 'useConfig').mockImplementation(() => ({
      data: { cameras: { front: { name: 'front', objects: { track: ['taco', 'cat', 'dog'] } } } },
    }));
    jest.spyOn(Api, 'useApiHost').mockImplementation(() => 'http://base-url.local:5000');
    jest.spyOn(PreactRouter, 'Router').mockImplementation(() => <div data-testid="router" />);
  });

  test('shows a loading indicator while loading', async () => {
    mockUseConfig.mockReturnValue({ status: 'loading' });
    render(<App />);
    await screen.findByTestId('app');
    expect(screen.queryByLabelText('Loading…')).toBeInTheDocument();
  });
});

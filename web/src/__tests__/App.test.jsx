import { h } from 'preact';
import * as IDB from 'idb-keyval';
import * as PreactRouter from 'preact-router';
import App from '../App';
import { render, screen } from 'testing-library';

describe('App', () => {
  beforeEach(() => {
    jest.spyOn(IDB, 'get').mockImplementation(() => Promise.resolve(undefined));
    jest.spyOn(IDB, 'set').mockImplementation(() => Promise.resolve(true));
    jest.spyOn(PreactRouter, 'Router').mockImplementation(() => <div data-testid="router" />);
  });

  test('shows a loading indicator while loading', async () => {
    render(<App />);
    await screen.findByTestId('app');
    expect(screen.queryByLabelText('Loading…')).toBeInTheDocument();
  });
});

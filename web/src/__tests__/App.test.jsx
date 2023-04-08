import { h } from 'preact';
import App from '../app';
import { render, screen } from 'testing-library';

describe('App', () => {
  // eslint-disable-next-line jest/no-disabled-tests
  test.skip('loads the camera dashboard', async () => {
    render(<App />);
    await screen.findByText('Cameras');
    expect(screen.queryByText('front')).toBeInTheDocument();
  });
});
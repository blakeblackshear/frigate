import { h } from 'preact';
import Debug from '../Debug';
import { render, screen, waitForElementToBeRemoved } from 'testing-library';

describe('Debug Route', () => {
  beforeEach(() => {});

  test('shows an ActivityIndicator if stats are null', async () => {
    render(<Debug />);
    expect(screen.queryByLabelText('Loading…')).toBeInTheDocument();
  });

  test('shows stats and config', async () => {
    render(<Debug />);

    await waitForElementToBeRemoved(() => screen.queryByLabelText('Loading…'));

    expect(screen.queryByTestId('detectors')).toBeInTheDocument();
    expect(screen.queryByText('coral')).toBeInTheDocument();

    expect(screen.queryByTestId('cameras')).toBeInTheDocument();
    expect(screen.queryByText('front')).toBeInTheDocument();
    expect(screen.queryByText('side')).toBeInTheDocument();

    expect(screen.queryByText('Config')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copy to Clipboard' })).toBeInTheDocument();
  });
});

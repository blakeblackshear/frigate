import { h } from 'preact';
import System from '../System';
import { render, screen, waitForElementToBeRemoved } from 'testing-library';

describe('System Route', () => {
  beforeEach(() => {});

  test('shows an ActivityIndicator if stats are null', async () => {
    render(<System />);
    expect(screen.queryByLabelText('Loading…')).toBeInTheDocument();
  });

  // eslint-disable-next-line jest/no-disabled-tests
  test.skip('shows stats and config', async () => {
    render(<System />);

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

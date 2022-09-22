import { h } from 'preact';
import Events from '../Events';
import { render, screen, waitForElementToBeRemoved } from 'testing-library';

describe('Events Route', () => {
  beforeEach(() => {});

  test('shows an ActivityIndicator if not yet loaded', async () => {
    render(<Events limit={5} path="/events" />);
    expect(screen.queryByLabelText('Loading…')).toBeInTheDocument();
  });

  test('does not show ActivityIndicator after loaded', async () => {
    render(<Events limit={5} path="/events" />);

    await waitForElementToBeRemoved(() => screen.queryByLabelText('Loading…'));

    expect(screen.queryByLabelText('Loading…')).not.toBeInTheDocument();
  });
});

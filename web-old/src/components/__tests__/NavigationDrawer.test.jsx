import { h } from 'preact';
import * as Context from '../../context';
import NavigationDrawer, { Destination } from '../NavigationDrawer';
import { fireEvent, render, screen } from '@testing-library/preact';

describe('NavigationDrawer', () => {
  let useDrawer, setShowDrawer;

  beforeEach(() => {
    setShowDrawer = vi.fn();
    useDrawer = vi.spyOn(Context, 'useDrawer').mockImplementation(() => ({ showDrawer: true, setShowDrawer }));
  });

  test('renders a navigation drawer', async () => {
    render(
      <NavigationDrawer>
        <div data-testid="children">Hello</div>
      </NavigationDrawer>
    );
    expect(screen.queryByTestId('children')).toHaveTextContent('Hello');
    expect(screen.queryByTestId('drawer').classList.contains('translate-x-full')).toBe(false);
    expect(screen.queryByTestId('drawer').classList.contains('translate-x-0')).toBe(true);
  });

  test('is dismissed when the scrim is clicked', async () => {
    useDrawer
      .mockReturnValueOnce({ showDrawer: true, setShowDrawer })
      .mockReturnValueOnce({ showDrawer: false, setShowDrawer });
    render(<NavigationDrawer />);
    fireEvent.click(screen.queryByTestId('scrim'));
    expect(setShowDrawer).toHaveBeenCalledWith(false);
  });

  test('is not visible when not set to show', async () => {
    useDrawer.mockReturnValue({ showDrawer: false, setShowDrawer });
    render(<NavigationDrawer />);
    expect(screen.queryByTestId('scrim')).not.toBeInTheDocument();
    expect(screen.queryByTestId('drawer').classList.contains('-translate-x-full')).toBe(true);
    expect(screen.queryByTestId('drawer').classList.contains('translate-x-0')).toBe(false);
  });
});

describe('Destination', () => {
  let setShowDrawer;

  beforeEach(() => {
    setShowDrawer = vi.fn();
    vi.spyOn(Context, 'useDrawer').mockImplementation(() => ({ showDrawer: true, setShowDrawer }));
  });

  // eslint-disable-next-line jest/no-disabled-tests
  test.skip('dismisses the drawer moments after being clicked', async () => {
    vi.useFakeTimers();
    render(
      <NavigationDrawer>
        <Destination href="/tacos" text="Tacos" />
      </NavigationDrawer>
    );
    fireEvent.click(screen.queryByText('Tacos'));
    vi.runAllTimers();
    expect(setShowDrawer).toHaveBeenCalledWith(false);
  });
});

import { h } from 'preact';
import { DrawerProvider }  from '../context';
import Sidebar from '../Sidebar';
import { render, screen } from 'testing-library';

describe('Sidebar', () => {
  test('does not render cameras by default', async () => {
    const { findByText } = render(<DrawerProvider><Sidebar /></DrawerProvider>);
    await findByText('Cameras');
    expect(screen.queryByRole('link', { name: 'front' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'side' })).not.toBeInTheDocument();
  });
});

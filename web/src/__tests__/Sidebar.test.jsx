import { h } from 'preact';
import * as Context from '../context';
import Sidebar from '../Sidebar';
import { render, screen } from 'testing-library';

describe('Sidebar', () => {
  beforeEach(() => {
    jest.spyOn(Context, 'useDrawer').mockImplementation(() => ({ showDrawer: true, setShowDrawer: () => {} }));
  });

  test('does not render cameras by default', async () => {
    const { findByText } = render(<Sidebar />);
    await findByText('Cameras');
    expect(screen.queryByRole('link', { name: 'front' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'side' })).not.toBeInTheDocument();
  });
});

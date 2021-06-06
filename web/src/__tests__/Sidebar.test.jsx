import { h } from 'preact';
import * as Api from '../api';
import * as Context from '../context';
import Sidebar from '../Sidebar';
import { render, screen } from '@testing-library/preact';

describe('Sidebar', () => {
  beforeEach(() => {
    jest.spyOn(Api, 'useConfig').mockImplementation(() => ({
      data: {
        cameras: {
          front: { name: 'front', objects: { track: ['taco', 'cat', 'dog'] }, record: { enabled: true } },
          side: { name: 'side', objects: { track: ['taco', 'cat', 'dog'] }, record: { enabled: false } },
        },
      },
    }));

    jest.spyOn(Context, 'useDrawer').mockImplementation(() => ({ showDrawer: true, setShowDrawer: () => {} }));
  });

  test('does not render cameras by default', async () => {
    render(<Sidebar />);
    expect(screen.queryByRole('link', { name: 'front' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'side' })).not.toBeInTheDocument();
  });

  test('render cameras if in camera route', async () => {
    window.history.replaceState({}, 'Cameras', '/cameras/front');
    render(<Sidebar />);
    expect(screen.queryByRole('link', { name: 'front' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'side' })).toBeInTheDocument();
  });

  test('render cameras if in camera route', async () => {
    window.history.replaceState({}, 'Front Recordings', '/recording/front');
    render(<Sidebar />);
    expect(screen.queryByRole('link', { name: 'front' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'side' })).not.toBeInTheDocument();
  });
});

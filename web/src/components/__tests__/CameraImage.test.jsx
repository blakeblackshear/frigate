import { h } from 'preact';
import * as Api from '../../api';
import * as Hooks from '../../hooks';
import CameraImage from '../CameraImage';
import { render, screen } from '@testing-library/preact';

jest.mock('../../api/baseUrl');

describe('CameraImage', () => {
  beforeEach(() => {
    jest.spyOn(Api, 'useConfig').mockImplementation(() => {
      return { data: { cameras: { front: { name: 'front', width: 1280, height: 720 } } } };
    });
    jest.spyOn(Api, 'useApiHost').mockReturnValue('http://base-url.local:5000');
    jest.spyOn(Hooks, 'useResizeObserver').mockImplementation(() => [{ width: 0 }]);
  });

  test('renders an activity indicator while loading', async () => {
    render(<CameraImage camera="front" />);
    expect(screen.queryByLabelText('Loading…')).toBeInTheDocument();
  });

  test('creates a scaled canvas using the available width & height, preserving camera aspect ratio', async () => {
    jest.spyOn(Hooks, 'useResizeObserver').mockReturnValueOnce([{ width: 720 }]);

    render(<CameraImage camera="front" />);
    expect(screen.queryByLabelText('Loading…')).toBeInTheDocument();
    expect(screen.queryByTestId('cameraimage-canvas')).toMatchInlineSnapshot(`
      <canvas
        data-testid="cameraimage-canvas"
        height="405"
        width="720"
      />
    `);
  });
});

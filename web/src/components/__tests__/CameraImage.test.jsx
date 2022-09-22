import { h } from 'preact';
import * as Hooks from '../../hooks';
import CameraImage from '../CameraImage';
import { render, screen } from 'testing-library';

describe('CameraImage', () => {
  beforeEach(() => {
    jest.spyOn(Hooks, 'useResizeObserver').mockImplementation(() => [{ width: 0 }]);
  });

  test('renders an activity indicator while loading', async () => {
    render(<CameraImage camera="front" />);
    expect(screen.queryByLabelText('Loading…')).toBeInTheDocument();
  });
});

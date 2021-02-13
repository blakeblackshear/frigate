import { h } from 'preact';
import * as Api from '../../api';
import Cameras from '../Cameras';
import * as CameraImage from '../../components/CameraImage';
import { render, screen } from '@testing-library/preact';

jest.mock('../../api/baseUrl');

describe('Cameras Route', () => {
  let useConfigMock;

  beforeEach(() => {
    useConfigMock = jest.spyOn(Api, 'useConfig').mockImplementation(() => ({
      data: {
        cameras: {
          front: { name: 'front', objects: { track: ['taco', 'cat', 'dog'] } },
          side: { name: 'side', objects: { track: ['taco', 'cat', 'dog'] } },
        },
      },
      status: 'loaded',
    }));
    jest.spyOn(Api, 'useApiHost').mockImplementation(() => 'http://base-url.local:5000');
    jest.spyOn(CameraImage, 'default').mockImplementation(() => <div data-testid="camera-image" />);
  });

  test('shows an ActivityIndicator if not yet loaded', async () => {
    useConfigMock.mockReturnValueOnce(() => ({ status: 'loading' }));
    render(<Cameras />);
    expect(screen.queryByLabelText('Loading…')).toBeInTheDocument();
  });

  test('shows cameras', async () => {
    render(<Cameras />);

    expect(screen.queryByLabelText('Loading…')).not.toBeInTheDocument();

    expect(screen.queryByText('front')).toBeInTheDocument();
    expect(screen.queryByText('front').closest('a')).toHaveAttribute('href', '/cameras/front');

    expect(screen.queryByText('side')).toBeInTheDocument();
    expect(screen.queryByText('side').closest('a')).toHaveAttribute('href', '/cameras/side');
  });
});

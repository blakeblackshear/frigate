import { h } from 'preact';
import * as AutoUpdatingCameraImage from '../../components/AutoUpdatingCameraImage';
import * as Api from '../../api';
import * as Context from '../../context';
import Camera from '../Camera';
import * as JSMpegPlayer from '../../components/JSMpegPlayer';
import { fireEvent, render, screen } from '@testing-library/preact';

describe('Camera Route', () => {
  let mockUsePersistence, mockSetOptions;

  beforeEach(() => {
    mockSetOptions = jest.fn();
    mockUsePersistence = jest.spyOn(Context, 'usePersistence').mockImplementation(() => [{}, mockSetOptions]);
    jest.spyOn(Api, 'useConfig').mockImplementation(() => ({
      data: { cameras: { front: { name: 'front', detect: {width: 1280, height: 720}, live: {height: 720}, objects: { track: ['taco', 'cat', 'dog'] } } } },
    }));
    jest.spyOn(Api, 'useApiHost').mockImplementation(() => 'http://base-url.local:5000');
    jest.spyOn(AutoUpdatingCameraImage, 'default').mockImplementation(({ searchParams }) => {
      return <div data-testid="mock-image">{searchParams.toString()}</div>;
    });
    jest.spyOn(JSMpegPlayer, 'default').mockImplementation(() => {
      return <div data-testid="mock-jsmpeg" />;
    });
  });

  test('reads camera feed options from persistence', async () => {
    mockUsePersistence.mockReturnValue([
      {
        bbox: true,
        timestamp: false,
        zones: true,
        mask: false,
        motion: true,
        regions: false,
      },
      mockSetOptions,
    ]);

    render(<Camera camera="front" />);

    fireEvent.click(screen.queryByText('Debug'));
    fireEvent.click(screen.queryByText('Show Options'));
    expect(screen.queryByTestId('mock-image')).toHaveTextContent(
      'bbox=1&timestamp=0&zones=1&mask=0&motion=1&regions=0'
    );
  });

  test('updates camera feed options to persistence', async () => {
    mockUsePersistence
      .mockReturnValueOnce([{}, mockSetOptions])
      .mockReturnValueOnce([{}, mockSetOptions])
      .mockReturnValueOnce([{ bbox: true }, mockSetOptions])
      .mockReturnValueOnce([{ bbox: true, timestamp: true }, mockSetOptions]);

    render(<Camera camera="front" />);

    fireEvent.click(screen.queryByText('Debug'));
    fireEvent.click(screen.queryByText('Show Options'));
    fireEvent.change(screen.queryByTestId('bbox-input'), { target: { checked: true } });
    fireEvent.change(screen.queryByTestId('timestamp-input'), { target: { checked: true } });
    fireEvent.click(screen.queryByText('Hide Options'));

    expect(mockUsePersistence).toHaveBeenCalledTimes(4);
    expect(mockSetOptions).toHaveBeenCalledTimes(2);
    expect(mockSetOptions).toHaveBeenCalledWith({ bbox: true, timestamp: true });
    expect(screen.queryByTestId('mock-image')).toHaveTextContent('bbox=1&timestamp=1');
  });
});

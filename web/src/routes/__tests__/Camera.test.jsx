import { h } from 'preact';
import * as AutoUpdatingCameraImage from '../../components/AutoUpdatingCameraImage';
import * as Api from '../../api';
import * as Context from '../../context';
import Camera from '../Camera';
import { fireEvent, render, screen } from '@testing-library/preact';

describe('Camera Route', () => {
  let mockUsePersistence, mockSetOptions;

  beforeEach(() => {
    mockSetOptions = jest.fn();
    mockUsePersistence = jest.spyOn(Context, 'usePersistence').mockImplementation(() => [{}, mockSetOptions]);
    jest.spyOn(Api, 'useConfig').mockImplementation(() => ({
      data: { cameras: { front: { name: 'front', objects: { track: ['taco', 'cat', 'dog'] } } } },
    }));
    jest.spyOn(Api, 'useApiHost').mockImplementation(() => 'http://base-url.local:5000');
    jest.spyOn(AutoUpdatingCameraImage, 'default').mockImplementation(({ searchParams }) => {
      return <div data-testid="mock-image">{searchParams.toString()}</div>;
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
    fireEvent.click(screen.queryByText('Show Options'));
    expect(screen.queryByTestId('mock-image')).toHaveTextContent(
      'bbox=1&timestamp=0&zones=1&mask=0&motion=1&regions=0'
    );
  });

  test('updates camera feed options to persistence', async () => {
    mockUsePersistence
      .mockReturnValueOnce([{}, mockSetOptions])
      .mockReturnValueOnce([{ bbox: true }, mockSetOptions])
      .mockReturnValueOnce([{ bbox: true, timestamp: true }, mockSetOptions]);

    render(<Camera camera="front" />);

    fireEvent.click(screen.queryByText('Show Options'));
    fireEvent.change(screen.queryByTestId('bbox-input'), { target: { checked: true } });
    fireEvent.change(screen.queryByTestId('timestamp-input'), { target: { checked: true } });
    fireEvent.click(screen.queryByText('Hide Options'));

    expect(mockSetOptions).toHaveBeenCalledWith({ bbox: true, timestamp: true });
    expect(screen.queryByTestId('mock-image')).toHaveTextContent('bbox=1&timestamp=1');
  });
});

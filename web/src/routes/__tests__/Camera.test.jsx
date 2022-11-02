import { h } from 'preact';
import * as AutoUpdatingCameraImage from '../../components/AutoUpdatingCameraImage';
import * as Context from '../../context';
import * as Mqtt from '../../api/mqtt';
import Camera from '../Camera';
import * as JSMpegPlayer from '../../components/JSMpegPlayer';
import { fireEvent, render, screen, waitForElementToBeRemoved } from 'testing-library';

describe('Camera Route', () => {
  let mockUsePersistence, mockSetOptions;

  beforeEach(() => {
    mockSetOptions = jest.fn();
    mockUsePersistence = jest.spyOn(Context, 'usePersistence').mockImplementation(() => [{}, mockSetOptions, true]);
    jest.spyOn(AutoUpdatingCameraImage, 'default').mockImplementation(({ searchParams }) => {
      return <div data-testid="mock-image">{searchParams.toString()}</div>;
    });
    jest.spyOn(JSMpegPlayer, 'default').mockImplementation(() => {
      return <div data-testid="mock-jsmpeg" />;
    });
    jest.spyOn(Mqtt, 'MqttProvider').mockImplementation(({ children }) => children);
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
      true,
    ]);

    render(<Camera camera="front" />);

    await waitForElementToBeRemoved(() => screen.queryByLabelText('Loading…'), { timeout: 10 });

    fireEvent.click(screen.queryByText('Debug'));
    fireEvent.click(screen.queryByText('Show Options'));
    expect(screen.queryByTestId('mock-image')).toHaveTextContent(
      'bbox=1&timestamp=0&zones=1&mask=0&motion=1&regions=0'
    );
  });

  test('updates camera feed options to persistence', async () => {
    mockUsePersistence
      .mockReturnValueOnce([{}, mockSetOptions, true])
      .mockReturnValueOnce([{}, mockSetOptions, true])
      .mockReturnValueOnce([{}, mockSetOptions, true])
      .mockReturnValueOnce([{}, mockSetOptions, true])
      .mockReturnValueOnce([{}, mockSetOptions, true])
      .mockReturnValueOnce([{}, mockSetOptions, true])
      .mockReturnValueOnce([{}, mockSetOptions, true])
      .mockReturnValueOnce([{}, mockSetOptions, true])
      .mockReturnValueOnce([{ bbox: true }, mockSetOptions, true])
      .mockReturnValueOnce([{ bbox: true, timestamp: true }, mockSetOptions, true]);

    render(<Camera camera="front" />);

    await waitForElementToBeRemoved(() => screen.queryByLabelText('Loading…'), { timeout: 10 });

    fireEvent.click(screen.queryByText('Debug'));
    fireEvent.click(screen.queryByText('Show Options'));
    fireEvent.change(screen.queryByTestId('bbox-input'), { target: { checked: true } });
    fireEvent.change(screen.queryByTestId('timestamp-input'), { target: { checked: true } });
    fireEvent.click(screen.queryByText('Hide Options'));

    expect(mockUsePersistence).toHaveBeenCalledTimes(10);
    expect(mockSetOptions).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId('mock-image')).toHaveTextContent('bbox=1&timestamp=1');
  });
});

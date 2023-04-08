import { h } from 'preact';
import * as AutoUpdatingCameraImage from '../../components/AutoUpdatingCameraImage';
import * as WS from '../../api/ws';
import Camera from '../Camera';
import { set as setData } from 'idb-keyval';
import * as JSMpegPlayer from '../../components/JSMpegPlayer';
import { fireEvent, render, screen, waitForElementToBeRemoved } from 'testing-library';

describe('Camera Route', () => {
  beforeEach(() => {
    vi.spyOn(AutoUpdatingCameraImage, 'default').mockImplementation(({ searchParams }) => {
      return <div data-testid="mock-image">{searchParams.toString()}</div>;
    });
    vi.spyOn(JSMpegPlayer, 'default').mockImplementation(() => {
      return <div data-testid="mock-jsmpeg" />;
    });
    vi.spyOn(WS, 'WsProvider').mockImplementation(({ children }) => children);
  });

  // eslint-disable-next-line jest/no-disabled-tests
  test.skip('reads camera feed options from persistence', async () => {
    setData('front-source', 'mse')
    setData('front-feed', {
      bbox: true,
      timestamp: false,
      zones: true,
      mask: false,
      motion: true,
      regions: false,
    });

    render(<Camera camera="front" />);
    await waitForElementToBeRemoved(() => screen.queryByLabelText('Loading…'), { timeout: 100 });

    fireEvent.click(screen.queryByText('Debug'));
    fireEvent.click(screen.queryByText('Show Options'));
    expect(screen.queryByTestId('mock-image')).toHaveTextContent(
      'bbox=1&timestamp=0&zones=1&mask=0&motion=1&regions=0'
    );
  });


  // eslint-disable-next-line jest/no-disabled-tests
  test.skip('updates camera feed options to persistence', async () => {
    setData('front-feed', {});

    render(<Camera camera="front" />);

    await waitForElementToBeRemoved(() => screen.queryByLabelText('Loading…'), { timeout: 100 });

    fireEvent.click(screen.queryByText('Debug'));
    fireEvent.click(screen.queryByText('Show Options'));
    fireEvent.change(screen.queryByTestId('bbox-input'), { target: { checked: true } });
    fireEvent.change(screen.queryByTestId('timestamp-input'), { target: { checked: true } });
    fireEvent.click(screen.queryByText('Hide Options'));

    expect(screen.queryByTestId('mock-image')).toHaveTextContent('bbox=1&timestamp=1');
  });
});

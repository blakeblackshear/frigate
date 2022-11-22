import { h } from 'preact';
import * as CameraImage from '../../components/CameraImage';
import * as WS from '../../api/ws';
import Cameras from '../Cameras';
import { fireEvent, render, screen, waitForElementToBeRemoved } from 'testing-library';

describe('Cameras Route', () => {
  beforeEach(() => {
    vi.spyOn(CameraImage, 'default').mockImplementation(() => <div data-testid="camera-image" />);
    vi.spyOn(WS, 'useWs').mockImplementation(() => ({ value: { payload: 'OFF' }, send: vi.fn() }));
  });

  test('shows an ActivityIndicator if not yet loaded', async () => {
    render(<Cameras />);
    expect(screen.queryByLabelText('Loading…')).toBeInTheDocument();
  });

  test('shows cameras', async () => {
    render(<Cameras />);

    await waitForElementToBeRemoved(() => screen.queryByLabelText('Loading…'));

    expect(screen.queryByText('front')).toBeInTheDocument();
    expect(screen.queryByText('front').closest('a')).toHaveAttribute('href', '/cameras/front');

    expect(screen.queryByText('side')).toBeInTheDocument();
    expect(screen.queryByText('side').closest('a')).toHaveAttribute('href', '/cameras/side');
  });

  test('shows recordings link', async () => {
    render(<Cameras />);

    await waitForElementToBeRemoved(() => screen.queryByLabelText('Loading…'));

    expect(screen.queryAllByText('Recordings')).toHaveLength(2);
  });

  test('buttons toggle detect, clips, and snapshots', async () => {
    const sendDetect = vi.fn();
    const sendRecordings = vi.fn();
    const sendSnapshots = vi.fn();
    vi.spyOn(WS, 'useDetectState').mockImplementation(() => {
      return { payload: 'ON', send: sendDetect };
    });
    vi.spyOn(WS, 'useRecordingsState').mockImplementation(() => {
      return { payload: 'OFF', send: sendRecordings };
    });
    vi.spyOn(WS, 'useSnapshotsState').mockImplementation(() => {
      return { payload: 'ON', send: sendSnapshots };
    });

    render(<Cameras />);

    await waitForElementToBeRemoved(() => screen.queryByLabelText('Loading…'));

    fireEvent.click(screen.getAllByLabelText('Toggle detect off')[0]);
    expect(sendDetect).toHaveBeenCalledWith('OFF', true);
    expect(sendDetect).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getAllByLabelText('Toggle snapshots off')[0]);
    expect(sendSnapshots).toHaveBeenCalledWith('OFF', true);

    fireEvent.click(screen.getAllByLabelText('Toggle recordings on')[0]);
    expect(sendRecordings).toHaveBeenCalledWith('ON', true);

    expect(sendDetect).toHaveBeenCalledTimes(1);
    expect(sendSnapshots).toHaveBeenCalledTimes(1);
    expect(sendRecordings).toHaveBeenCalledTimes(1);
  });
});

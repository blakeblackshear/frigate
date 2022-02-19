import { h } from 'preact';
import * as Api from '../../api';
import * as CameraImage from '../../components/CameraImage';
import * as Mqtt from '../../api/mqtt';
import Cameras from '../Cameras';
import { fireEvent, render, screen } from '@testing-library/preact';

describe('Cameras Route', () => {
  let useConfigMock;

  beforeEach(() => {
    useConfigMock = jest.spyOn(Api, 'useConfig').mockImplementation(() => ({
      data: {
        cameras: {
          front: { name: 'front', objects: { track: ['taco', 'cat', 'dog'] }, record: { enabled: true } },
          side: { name: 'side', objects: { track: ['taco', 'cat', 'dog'] }, record: { enabled: false } },
        },
      },
      status: 'loaded',
    }));
    jest.spyOn(Api, 'useApiHost').mockImplementation(() => 'http://base-url.local:5000');
    jest.spyOn(CameraImage, 'default').mockImplementation(() => <div data-testid="camera-image" />);
    jest.spyOn(Mqtt, 'useMqtt').mockImplementation(() => ({ value: { payload: 'OFF' }, send: jest.fn() }));
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

  test('shows recordings link', async () => {
    render(<Cameras />);

    expect(screen.queryByLabelText('Loading…')).not.toBeInTheDocument();

    expect(screen.queryAllByText('Recordings')).toHaveLength(2);
  });

  test('buttons toggle detect, clips, and snapshots', async () => {
    const sendDetect = jest.fn();
    const sendRecordings = jest.fn();
    const sendSnapshots = jest.fn();
    jest.spyOn(Mqtt, 'useDetectState').mockImplementation(() => {
      return { payload: 'ON', send: sendDetect };
    });
    jest.spyOn(Mqtt, 'useRecordingsState').mockImplementation(() => {
      return { payload: 'OFF', send: sendRecordings };
    });
    jest.spyOn(Mqtt, 'useSnapshotsState').mockImplementation(() => {
      return { payload: 'ON', send: sendSnapshots };
    });

    render(<Cameras />);

    fireEvent.click(screen.getAllByLabelText('Toggle detect off')[0]);
    expect(sendDetect).toHaveBeenCalledWith('OFF');
    expect(sendDetect).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getAllByLabelText('Toggle snapshots off')[0]);
    expect(sendSnapshots).toHaveBeenCalledWith('OFF');

    fireEvent.click(screen.getAllByLabelText('Toggle recordings on')[0]);
    expect(sendRecordings).toHaveBeenCalledWith('ON');

    expect(sendDetect).toHaveBeenCalledTimes(1);
    expect(sendSnapshots).toHaveBeenCalledTimes(1);
    expect(sendRecordings).toHaveBeenCalledTimes(1);
  });
});

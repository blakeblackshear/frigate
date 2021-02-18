import { h } from 'preact';
import * as Api from '../../api';
import * as Mqtt from '../../api/mqtt';
import Debug from '../Debug';
import { render, screen } from '@testing-library/preact';

describe('Debug Route', () => {
  let useStatsMock, useMqttMock;

  beforeEach(() => {
    jest.spyOn(Api, 'useConfig').mockImplementation(() => ({
      data: {
        service: {
          version: '0.8.3',
        },
        cameras: {
          front: { name: 'front', objects: { track: ['taco', 'cat', 'dog'] } },
          side: { name: 'side', objects: { track: ['taco', 'cat', 'dog'] } },
        },
        mqtt: {
          stats_interva: 60,
        },
      },
      status: 'loaded',
    }));
    useStatsMock = jest.spyOn(Api, 'useStats').mockImplementation(() => ({ data: statsMock }));
    useMqttMock = jest.spyOn(Mqtt, 'useMqtt').mockImplementation(() => ({ value: { payload: null } }));
  });

  test('shows an ActivityIndicator if stats are null', async () => {
    useStatsMock.mockReturnValue({ data: null });
    render(<Debug />);
    expect(screen.queryByLabelText('Loading…')).toBeInTheDocument();
  });

  test('shows stats and config', async () => {
    render(<Debug />);
    expect(screen.queryByLabelText('Loading…')).not.toBeInTheDocument();

    expect(screen.queryByTestId('detectors')).toBeInTheDocument();
    expect(screen.queryByText('coral')).toBeInTheDocument();

    expect(screen.queryByTestId('cameras')).toBeInTheDocument();
    expect(screen.queryByText('front')).toBeInTheDocument();
    expect(screen.queryByText('side')).toBeInTheDocument();

    expect(screen.queryByText('Config')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copy to Clipboard' })).toBeInTheDocument();
  });

  test('updates the stats from  mqtt', async () => {
    const { rerender } = render(<Debug />);
    expect(useMqttMock).toHaveBeenCalledWith('stats');
    useMqttMock.mockReturnValue({
      value: {
        payload: { ...statsMock, detectors: { coral: { ...statsMock.detectors.coral, inference_speed: 42.4242 } } },
      },
    });
    rerender(<Debug />);

    expect(screen.queryByText('42.4242')).toBeInTheDocument();
  });
});

const statsMock = {
  detection_fps: 0.0,
  detectors: { coral: { detection_start: 0.0, inference_speed: 8.94, pid: 52 } },
  front: { camera_fps: 5.0, capture_pid: 64, detection_fps: 0.0, pid: 54, process_fps: 0.0, skipped_fps: 0.0 },
  side: {
    camera_fps: 6.9,
    capture_pid: 71,
    detection_fps: 0.0,
    pid: 60,
    process_fps: 0.0,
    skipped_fps: 0.0,
  },
  service: { uptime: 34812, version: '0.8.1-d376f6b' },
};

import { h } from 'preact';
import * as Api from '../../api';
import * as Hooks from '../../hooks';
import Events from '../Events';
import { render, screen } from '@testing-library/preact';

describe('Events Route', () => {
  let useEventsMock, useIntersectionMock;

  beforeEach(() => {
    useEventsMock = jest.spyOn(Api, 'useEvents').mockImplementation(() => ({
      data: null,
      status: 'loading',
    }));
    jest.spyOn(Api, 'useConfig').mockImplementation(() => ({
      data: {
        cameras: {
          front: { name: 'front', objects: { track: ['taco', 'cat', 'dog'] }, zones: [] },
          side: { name: 'side', objects: { track: ['taco', 'cat', 'dog'] }, zones: [] },
        },
      },
    }));
    jest.spyOn(Api, 'useApiHost').mockImplementation(() => 'http://localhost:5000');
    useIntersectionMock = jest.spyOn(Hooks, 'useIntersectionObserver').mockImplementation(() => [null, jest.fn()]);
  });

  test('shows an ActivityIndicator if not yet loaded', async () => {
    render(<Events limit={5} path="/events" />);
    expect(screen.queryByLabelText('Loading…')).toBeInTheDocument();
  });

  test('does not show ActivityIndicator after loaded', async () => {
    useEventsMock.mockReturnValue({ data: mockEvents, status: 'loaded' });
    render(<Events limit={5} path="/events" />);
    expect(screen.queryByLabelText('Loading…')).not.toBeInTheDocument();
  });

  test('loads more when the intersectionObserver fires', async () => {
    const setIntersectionNode = jest.fn();
    useIntersectionMock.mockReturnValue([null, setIntersectionNode]);
    useEventsMock.mockImplementation((searchString) => {
      if (searchString.includes('before=')) {
        const params = new URLSearchParams(searchString);
        const before = parseFloat(params.get('before'));
        const index = mockEvents.findIndex((el) => el.start_time === before + 0.0001);
        return { data: mockEvents.slice(index, index + 5), status: 'loaded' };
      }

      return { data: mockEvents.slice(0, 5), status: 'loaded' };
    });

    const { rerender } = render(<Events limit={5} path="/events" />);
    expect(setIntersectionNode).toHaveBeenCalled();
    expect(useEventsMock).toHaveBeenCalledWith('include_thumbnails=0&limit=5&');
    expect(screen.queryAllByTestId(/event-\d+/)).toHaveLength(5);

    useIntersectionMock.mockReturnValue([
      {
        isIntersecting: true,
        target: { dataset: { startTime: mockEvents[4].start_time } },
      },
      setIntersectionNode,
    ]);
    rerender(<Events limit={5} path="/events" />);
    expect(useEventsMock).toHaveBeenCalledWith(
      `include_thumbnails=0&limit=5&before=${mockEvents[4].start_time - 0.0001}`
    );
    expect(screen.queryAllByTestId(/event-\d+/)).toHaveLength(10);
  });
});

const mockEvents = new Array(12).fill(null).map((v, i) => ({
  end_time: 1613257337 + i,
  false_positive: false,
  has_clip: true,
  has_snapshot: true,
  id: i,
  label: 'person',
  start_time: 1613257326 + i,
  top_score: Math.random(),
  zones: ['front_patio'],
  thumbnail: '/9j/4aa...',
}));

import { h } from 'preact';
import * as Api from '../../api';
import Event from '../Event';
import { render, screen } from '@testing-library/preact';

describe('Event Route', () => {
  let useEventMock;

  beforeEach(() => {
    useEventMock = jest.spyOn(Api, 'useEvent').mockImplementation(() => ({
      data: mockEvent,
      status: 'loaded',
    }));
    jest.spyOn(Api, 'useApiHost').mockImplementation(() => 'http://localhost:5000');
  });

  test('shows an ActivityIndicator if not yet loaded', async () => {
    useEventMock.mockReturnValueOnce(() => ({ status: 'loading' }));
    render(<Event eventId={mockEvent.id} scrollIntoView={mockEvent.scrollIntoView} />);
    expect(screen.queryByLabelText('Loading…')).toBeInTheDocument();
  });

  test('shows cameras', async () => {
    render(<Event eventId={mockEvent.id} scrollIntoView={mockEvent.scrollIntoView} />);

    expect(screen.queryByLabelText('Loading…')).not.toBeInTheDocument();

    expect(screen.queryByText('Clip')).toBeInTheDocument();
    expect(screen.queryByLabelText('Video Player')).toBeInTheDocument();
    expect(screen.queryByText('Best Image')).not.toBeInTheDocument();
    expect(screen.queryByText('Thumbnail')).not.toBeInTheDocument();
  });

  test('does not render a video if there is no clip', async () => {
    useEventMock.mockReturnValue({ data: { ...mockEvent, has_clip: false }, status: 'loaded' });
    render(<Event eventId={mockEvent.id} scrollIntoView={mockEvent.scrollIntoView} />);

    expect(screen.queryByText('Clip')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Video Player')).not.toBeInTheDocument();
    expect(screen.queryByText('Best Image')).toBeInTheDocument();
    expect(screen.queryByText('Thumbnail')).not.toBeInTheDocument();
  });

  test('shows the thumbnail if no snapshot available', async () => {
    useEventMock.mockReturnValue({ data: { ...mockEvent, has_clip: false, has_snapshot: false }, status: 'loaded' });
    render(<Event eventId={mockEvent.id} scrollIntoView={mockEvent.scrollIntoView} />);

    expect(screen.queryByText('Best Image')).not.toBeInTheDocument();
    expect(screen.queryByText('Thumbnail')).toBeInTheDocument();
    expect(screen.queryByAltText('person at 82.0% confidence')).toHaveAttribute(
      'src',
      'data:image/jpeg;base64,/9j/4aa...'
    );
  });
});

const mockEvent = {
  camera: 'front',
  end_time: 1613257337.841237,
  false_positive: false,
  has_clip: true,
  has_snapshot: true,
  id: '1613257326.237365-83cgl2',
  label: 'person',
  start_time: 1613257326.237365,
  top_score: 0.8203125,
  zones: ['front_patio'],
  thumbnail: '/9j/4aa...',
  scrollIntoView: jest.fn(),
};

import { h } from 'preact';
import { DrawerProvider } from '../../context';
import AppBar from '../AppBar';
import { fireEvent, render, screen } from '@testing-library/preact';
import { useRef } from 'preact/hooks';

function Title() {
  return <div>I am the title</div>;
}

describe('AppBar', () => {
  test('renders the title', async () => {
    render(
      <DrawerProvider>
        <AppBar title={Title} />
      </DrawerProvider>
    );
    expect(screen.getByText('I am the title')).toBeInTheDocument();
  });

  describe('overflow menu', () => {
    test('is not rendered if a ref is not provided', async () => {
      const handleOverflow = vi.fn();
      render(
        <DrawerProvider>
          <AppBar title={Title} onOverflowClick={handleOverflow} />
        </DrawerProvider>
      );
      expect(screen.queryByLabelText('More options')).not.toBeInTheDocument();
    });

    test('is not rendered if a click handler is not provided', async () => {
      function Wrapper() {
        const ref = useRef(null);
        return <AppBar title={Title} overflowRef={ref} />;
      }

      render(
        <DrawerProvider>
          <Wrapper />
        </DrawerProvider>
      );
      expect(screen.queryByLabelText('More options')).not.toBeInTheDocument();
    });

    test('is rendered with click handler and ref', async () => {
      const handleOverflow = vi.fn();

      function Wrapper() {
        const ref = useRef(null);
        return <AppBar title={Title} overflowRef={ref} onOverflowClick={handleOverflow} />;
      }

      render(
        <DrawerProvider>
          <Wrapper />
        </DrawerProvider>
      );
      expect(screen.queryByLabelText('More options')).toBeInTheDocument();
    });

    test('calls the handler when clicked', async () => {
      const handleOverflow = vi.fn();

      function Wrapper() {
        const ref = useRef(null);
        return <AppBar title={Title} overflowRef={ref} onOverflowClick={handleOverflow} />;
      }

      render(
        <DrawerProvider>
          <Wrapper />
        </DrawerProvider>
      );

      fireEvent.click(screen.queryByLabelText('More options'));

      expect(handleOverflow).toHaveBeenCalled();
    });
  });

  describe('scrolling', () => {
    test('is visible initially', async () => {
      render(
        <DrawerProvider>
          <AppBar title={Title} />
        </DrawerProvider>
      );

      const classes = screen.getByTestId('appbar').classList;

      expect(classes.contains('translate-y-0')).toBe(true);
      expect(classes.contains('-translate-y-full')).toBe(false);
    });

    test('hides when scrolled downward', async () => {
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => cb());
      render(
        <DrawerProvider>
          <AppBar title={Title} />
        </DrawerProvider>
      );

      window.scrollY = 300;
      await fireEvent.scroll(document, { target: { scrollY: 300 } });

      const classes = screen.getByTestId('appbar').classList;

      expect(classes.contains('translate-y-0')).toBe(false);
      expect(classes.contains('-translate-y-full')).toBe(true);
    });

    test('reappears when scrolled upward', async () => {
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => cb());
      render(
        <DrawerProvider>
          <AppBar title={Title} />
        </DrawerProvider>
      );

      window.scrollY = 300;
      await fireEvent.scroll(document, { target: { scrollY: 300 } });
      window.scrollY = 280;
      await fireEvent.scroll(document, { target: { scrollY: 280 } });

      const classes = screen.getByTestId('appbar').classList;

      expect(classes.contains('translate-y-0')).toBe(true);
      expect(classes.contains('-translate-y-full')).toBe(false);
    });
  });
});

import { h } from 'preact';
import { set as setData } from 'idb-keyval';
import { DarkModeProvider, useDarkMode, usePersistence } from '..';
import { fireEvent, render, screen } from 'testing-library';
import { useCallback } from 'preact/hooks';
import * as WS from '../../api/ws';

function DarkModeChecker() {
  const { currentMode } = useDarkMode();
  return <div data-testid={currentMode}>{currentMode}</div>;
}

describe('DarkMode', () => {
  beforeEach(() => {
    vi.spyOn(WS, 'WsProvider').mockImplementation(({ children }) => children);
  });

  test('uses media by default', async () => {
    render(
      <DarkModeProvider>
        <DarkModeChecker />
      </DarkModeProvider>
    );
    const el = await screen.findByTestId('media');
    expect(el).toBeInTheDocument();
  });

  test('uses the mode stored in idb - dark', async () => {
    setData('darkmode', 'dark');
    render(
      <DarkModeProvider>
        <DarkModeChecker />
      </DarkModeProvider>
    );
    const el = await screen.findByTestId('dark');
    expect(el).toBeInTheDocument();
    expect(document.body.classList.contains('dark')).toBe(true);
  });

  test('uses the mode stored in idb - light', async () => {
    setData('darkmode', 'light');
    render(
      <DarkModeProvider>
        <DarkModeChecker />
      </DarkModeProvider>
    );
    const el = await screen.findByTestId('light');
    expect(el).toBeInTheDocument();
    expect(document.body.classList.contains('dark')).toBe(false);
  });

  test('allows updating the mode', async () => {
    setData('darkmode', 'dark');

    function Updater() {
      const { setDarkMode } = useDarkMode();
      const handleClick = useCallback(() => {
        setDarkMode('light');
      }, [setDarkMode]);
      return <div onClick={handleClick}>click me</div>;
    }

    render(
      <DarkModeProvider>
        <DarkModeChecker />
        <Updater />
      </DarkModeProvider>
    );

    const dark = await screen.findByTestId('dark');
    expect(dark).toBeInTheDocument();
    expect(document.body.classList.contains('dark')).toBe(true);

    const button = await screen.findByText('click me');
    fireEvent.click(button);

    const light = await screen.findByTestId('light');
    expect(light).toBeInTheDocument();
    expect(document.body.classList.contains('dark')).toBe(false);
  });

  test('when using media, matches on preference', async () => {
    setData('darkmode', 'media');
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => {
      if (query === '(prefers-color-scheme: dark)') {
        return { matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() };
      }

      throw new Error(`Unexpected query to matchMedia: ${query}`);
    });
    render(
      <DarkModeProvider>
        <DarkModeChecker />
      </DarkModeProvider>
    );

    const el = await screen.findByTestId('dark');
    expect(el).toBeInTheDocument();
    expect(document.body.classList.contains('dark')).toBe(true);
  });
});

describe('usePersistence', () => {

  test('returns a defaultValue initially', async () => {

    function Component() {
      const [value, , loaded] = usePersistence('tacos', 'my-default');
      return (
        <div>
          <div data-testid="loaded">{loaded ? 'loaded' : 'not loaded'}</div>
          <div data-testid="value">{value}</div>
        </div>
      );
    }

    render(<Component />);

    expect(screen.getByTestId('loaded')).toMatchInlineSnapshot(`
      <div
        data-testid="loaded"
      >
        not loaded
      </div>
    `);
    expect(screen.getByTestId('value')).toMatchInlineSnapshot(`
      <div
        data-testid="value"
      >
        my-default
      </div>
    `);
  });

  test('updates with the previously-persisted value', async () => {
    setData('tacos', 'are delicious');

    function Component() {
      const [value, , loaded] = usePersistence('tacos', 'my-default');
      return (
        <div>
          <div data-testid="loaded">{loaded ? 'loaded' : 'not loaded'}</div>
          <div data-testid="value">{value}</div>
        </div>
      );
    }

    render(<Component />);

    await screen.findByText('loaded');

    expect(screen.getByTestId('loaded')).toMatchInlineSnapshot(`
      <div
        data-testid="loaded"
      >
        loaded
      </div>
    `);
    expect(screen.getByTestId('value')).toMatchInlineSnapshot(`
      <div
        data-testid="value"
      >
        are delicious
      </div>
    `);
  });

  test('can be updated manually', async () => {
    setData('darkmode', 'are delicious');

    function Component() {
      const [value, setValue] = usePersistence('tacos', 'my-default');
      const handleClick = useCallback(() => {
        setValue('super delicious');
      }, [setValue]);
      return (
        <div>
          <div onClick={handleClick}>click me</div>
          <div data-testid="value">{value}</div>
        </div>
      );
    }

    render(<Component />);

    const button = await screen.findByText('click me');
    fireEvent.click(button);

    expect(screen.getByTestId('value')).toMatchInlineSnapshot(`
      <div
        data-testid="value"
      >
        super delicious
      </div>
    `);
  });
});

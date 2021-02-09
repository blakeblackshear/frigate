import { h } from 'preact';
import * as IDB from 'idb-keyval';
import { DarkModeProvider, useDarkMode, usePersistence } from '..';
import { fireEvent, render, screen } from '@testing-library/preact';
import { useCallback } from 'preact/hooks';

function DarkModeChecker() {
  const { currentMode } = useDarkMode();
  return <div data-testid={currentMode}>{currentMode}</div>;
}

describe('DarkMode', () => {
  let MockIDB;
  beforeEach(() => {
    MockIDB = {
      get: jest.spyOn(IDB, 'get').mockImplementation(() => Promise.resolve(undefined)),
      set: jest.spyOn(IDB, 'set').mockImplementation(() => Promise.resolve(true)),
    };
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
    MockIDB.get.mockResolvedValue('dark');
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
    MockIDB.get.mockResolvedValue('light');
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
    MockIDB.get.mockResolvedValue('dark');

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
    MockIDB.get.mockResolvedValue('media');
    jest.spyOn(window, 'matchMedia').mockImplementation((query) => {
      if (query === '(prefers-color-scheme: dark)') {
        return { matches: true, addEventListener: jest.fn(), removeEventListener: jest.fn() };
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
  let MockIDB;
  beforeEach(() => {
    MockIDB = {
      get: jest.spyOn(IDB, 'get').mockImplementation(() => Promise.resolve(undefined)),
      set: jest.spyOn(IDB, 'set').mockImplementation(() => Promise.resolve(true)),
    };
  });

  test('returns a defaultValue initially', async () => {
    MockIDB.get.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve('foo');
          }, 1);
        })
    );

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

    jest.runAllTimers();
  });

  test('updates with the previously-persisted value', async () => {
    MockIDB.get.mockResolvedValue('are delicious');

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
    MockIDB.get.mockResolvedValue('are delicious');

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

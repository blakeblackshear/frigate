import { h } from 'preact';
import { render, screen, waitFor } from '@testing-library/preact';
import { set as setData } from 'idb-keyval';
import ViewOption from '../ViewOption';
import { ViewModeProvider } from '../../context';
import { ViewModeTypes } from '../ViewOptionEnum';
import * as WS from '../../api/ws';

describe('ViewOption', () => {
  beforeEach(() => {
    vi.spyOn(WS, 'WsProvider').mockImplementation(({ children }) => children);
  });

  test('make sure children are visible with same modes', async () => {
    const maxViewMode = (Object.keys(ViewModeTypes).filter(isNaN).length-1);
    const maxViewModeHR = ViewModeTypes[maxViewMode];
    setData('view-mode', maxViewMode);

    render(
      <ViewModeProvider>
        <ViewOption requiredmode={maxViewModeHR}>
          <div data-testid='children'>stuff</div>
        </ViewOption>
      </ViewModeProvider>
    );

    const el = await screen.findByTestId('children');
    expect(el).toBeInTheDocument();
  });

  test('make sure children are visible with max viewmode, and a small requiredmode', async () => {
    const maxViewMode = (Object.keys(ViewModeTypes).filter(isNaN).length-1);
    const lowViewModeHR = ViewModeTypes[1];
    setData('view-mode', maxViewMode);

    render(
      <ViewModeProvider>
        <ViewOption requiredmode={lowViewModeHR}>
          <div data-testid='children'>stuff</div>
        </ViewOption>
      </ViewModeProvider>
    );

    const el = await screen.findByTestId('children');
    expect(el).toBeInTheDocument();
  });

  test('make sure children are hidden, due to failed requiredmode', async () => {
    const maxViewMode = (Object.keys(ViewModeTypes).filter(isNaN).length-1);
    const maxViewModeHR = ViewModeTypes[maxViewMode];
    setData('view-mode', '0');

    render(
      <ViewModeProvider>
        <ViewOption requiredmode={maxViewModeHR}>
          <div data-testid='children'>stuff</div>
        </ViewOption>
        <div>bugfix</div>
      </ViewModeProvider>
    );

    //without this, the test will always pass, even if setData('view-mode', '2') ... really strange behavior
    await screen.findByText('bugfix');

    await waitFor(() => {
      expect(screen.queryByText('stuff')).not.toBeInTheDocument()
    }, { timeout: 100 });
    
  });

});
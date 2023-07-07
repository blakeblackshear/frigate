import { h } from 'preact';
import { render, screen, waitFor } from '@testing-library/preact';
import { set as setData } from 'idb-keyval';
import UserViewer from '../UserViewer';
import { UserViewProvider } from '../../context';
import { UserViewTypes } from '../../context/UserViewTypes';
import * as WS from '../../api/ws';

describe('UserViewer', () => {
  beforeEach(() => {
    vi.spyOn(WS, 'WsProvider').mockImplementation(({ children }) => children);
  });

  test('make sure children are visible with same modes', async () => {
    const maxViewMode = (Object.keys(UserViewTypes).filter(isNaN).length-1);
    const maxViewModeHR = UserViewTypes[maxViewMode];
    setData('view-mode', maxViewMode);

    render(
      <UserViewProvider>
        <UserViewer requiredmode={maxViewModeHR}>
          <div data-testid='children'>stuff</div>
        </UserViewer>
      </UserViewProvider>
    );

    const el = await screen.findByTestId('children');
    expect(el).toBeInTheDocument();
  });

  test('make sure children are visible with max viewmode, and a small requiredmode', async () => {
    const maxViewMode = (Object.keys(UserViewTypes).filter(isNaN).length-1);
    const lowViewModeHR = UserViewTypes[1];
    setData('view-mode', maxViewMode);

    render(
      <UserViewProvider>
        <UserViewer requiredmode={lowViewModeHR}>
          <div data-testid='children'>stuff</div>
        </UserViewer>
      </UserViewProvider>
    );

    const el = await screen.findByTestId('children');
    expect(el).toBeInTheDocument();
  });

  test('make sure children are hidden, due to failed requiredmode', async () => {
    const maxViewMode = (Object.keys(UserViewTypes).filter(isNaN).length-1);
    const maxViewModeHR = UserViewTypes[maxViewMode];
    setData('view-mode', '0');

    render(
      <UserViewProvider>
        <UserViewer requiredmode={maxViewModeHR}>
          <div data-testid='children'>stuff</div>
        </UserViewer>
        <div>bugfix</div>
      </UserViewProvider>
    );

    //without this, the test will always pass, even if setData('view-mode', '2') ... really strange behavior
    await screen.findByText('bugfix');

    await waitFor(() => {
      expect(screen.queryByText('stuff')).not.toBeInTheDocument()
    }, { timeout: 100 });
    
  });

});
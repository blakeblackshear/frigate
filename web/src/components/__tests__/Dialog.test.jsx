import { h } from 'preact';
import Dialog from '../Dialog';
import { render, screen } from '@testing-library/preact';

describe('Dialog', () => {
  let portal;

  beforeAll(() => {
    portal = document.createElement('div');
    portal.id = 'dialogs';
    document.body.appendChild(portal);
  });

  afterAll(() => {
    document.body.removeChild(portal);
  });

  test('renders to a portal', async () => {
    render(<Dialog>Sample</Dialog>);
    expect(screen.getByText('Sample')).toBeInTheDocument();
    expect(screen.getByRole('modal').closest('#dialogs')).not.toBeNull();
  });
});

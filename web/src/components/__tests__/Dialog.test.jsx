import { h } from 'preact';
import Dialog from '../Dialog';
import { fireEvent, render, screen } from '@testing-library/preact';

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
    render(<Dialog title="Tacos" text="This is the dialog" />);
    expect(screen.getByText('Tacos')).toBeInTheDocument();
    expect(screen.getByRole('modal').closest('#dialogs')).not.toBeNull();
  });

  test('renders action buttons', async () => {
    const handleClick = jest.fn();
    render(
      <Dialog
        actions={[
          { color: 'red', text: 'Delete' },
          { text: 'Okay', onClick: handleClick },
        ]}
        title="Tacos"
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Okay' }));
    expect(handleClick).toHaveBeenCalled();
  });
});

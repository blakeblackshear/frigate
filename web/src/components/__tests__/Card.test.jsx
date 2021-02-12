import { h } from 'preact';
import Card from '../Card';
import { render, screen } from '@testing-library/preact';

describe('Card', () => {
  test('renders a Card with media', async () => {
    render(<Card media={<img src="tacos.jpg" alt="tacos" />} />);
    expect(screen.queryByAltText('tacos')).toBeInTheDocument();
  });

  test('renders a Card with a link around media', async () => {
    render(<Card href="/tacos" media={<img src="tacos.jpg" alt="tacos" />} />);
    expect(screen.queryByAltText('tacos')).toBeInTheDocument();
    expect(screen.getByAltText('tacos').closest('a')).toHaveAttribute('href', '/tacos');
  });

  test('renders a Card with a header', async () => {
    render(<Card header="Tacos!" />);
    expect(screen.queryByText('Tacos!')).toBeInTheDocument();
  });

  test('renders a Card with a linked header', async () => {
    render(<Card href="/tacos" header="Tacos!" />);
    expect(screen.queryByText('Tacos!')).toBeInTheDocument();
    expect(screen.queryByText('Tacos!').closest('a')).toHaveAttribute('href', '/tacos');
  });

  test('renders content', async () => {
    const content = <div data-testid="content">hello</div>;
    render(<Card content={content} />);
    expect(screen.queryByTestId('content')).toBeInTheDocument();
  });

  test('renders buttons', async () => {
    const buttons = [
      { name: 'Tacos', href: '/tacos' },
      { name: 'Burritos', href: '/burritos' },
    ];
    render(<Card buttons={buttons} />);
    expect(screen.queryByText('Tacos')).toHaveAttribute('role', 'button');
    expect(screen.queryByText('Tacos')).toHaveAttribute('href', '/tacos');

    expect(screen.queryByText('Burritos')).toHaveAttribute('role', 'button');
    expect(screen.queryByText('Burritos')).toHaveAttribute('href', '/burritos');
  });
});

import { h, createRef } from 'preact';
import Tooltip from '../Tooltip';
import { render, screen } from '@testing-library/preact';

describe('Tooltip', () => {
  test('renders in a relative position', async () => {
    vi
      .spyOn(window.HTMLElement.prototype, 'getBoundingClientRect')
      // relativeTo
      .mockReturnValueOnce({
        x: 100,
        y: 100,
        width: 50,
        height: 10,
      })
      // tooltip
      .mockReturnValueOnce({ width: 40, height: 15 });

    const ref = createRef();
    render(
      <div>
        <div ref={ref} />
        <Tooltip relativeTo={ref} text="hello" />
      </div>
    );

    const tooltip = await screen.findByRole('tooltip');
    const style = window.getComputedStyle(tooltip);
    expect(style.left).toEqual('103px');
    expect(style.top).toEqual('68.5px');
  });

  test('if too far right, renders to the left', async () => {
    window.innerWidth = 1024;
    vi
      .spyOn(window.HTMLElement.prototype, 'getBoundingClientRect')
      // relativeTo
      .mockReturnValueOnce({
        x: 1000,
        y: 100,
        width: 24,
        height: 10,
      })
      // tooltip
      .mockReturnValueOnce({ width: 50, height: 15 });

    const ref = createRef();
    render(
      <div>
        <div ref={ref} />
        <Tooltip relativeTo={ref} text="hello" />
      </div>
    );

    const tooltip = await screen.findByRole('tooltip');
    const style = window.getComputedStyle(tooltip);
    expect(style.left).toEqual('937px');
    expect(style.top).toEqual('97px');
  });

  test('if too far left, renders to the right', async () => {
    vi
      .spyOn(window.HTMLElement.prototype, 'getBoundingClientRect')
      // relativeTo
      .mockReturnValueOnce({
        x: 0,
        y: 100,
        width: 24,
        height: 10,
      })
      // tooltip
      .mockReturnValueOnce({ width: 50, height: 15 });

    const ref = createRef();
    render(
      <div>
        <div ref={ref} />
        <Tooltip relativeTo={ref} text="hello" />
      </div>
    );

    const tooltip = await screen.findByRole('tooltip');
    const style = window.getComputedStyle(tooltip);
    expect(style.left).toEqual('32px');
    expect(style.top).toEqual('97px');
  });

  test('if too close to top, renders to the bottom', async () => {
    window.scrollY = 90;
    vi
      .spyOn(window.HTMLElement.prototype, 'getBoundingClientRect')
      // relativeTo
      .mockReturnValueOnce({
        x: 100,
        y: 100,
        width: 24,
        height: 10,
      })
      // tooltip
      .mockReturnValueOnce({ width: 50, height: 15 });

    const ref = createRef();
    render(
      <div>
        <div ref={ref} />
        <Tooltip relativeTo={ref} text="hello" />
      </div>
    );

    const tooltip = await screen.findByRole('tooltip');
    const style = window.getComputedStyle(tooltip);
    expect(style.left).toEqual('84px');
    expect(style.top).toEqual('158.5px');
  });
});

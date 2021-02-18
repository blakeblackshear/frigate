import { h, createRef } from 'preact';
import Tooltip from '../Tooltip';
import { render, screen } from '@testing-library/preact';

describe('Tooltip', () => {
  test('renders in a relative position', async () => {
    jest
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
    expect(style.left).toEqual('105px');
    expect(style.top).toEqual('70px');
  });

  test('if too far right, renders to the left', async () => {
    window.innerWidth = 1024;
    jest
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
    expect(style.left).toEqual('942px');
    expect(style.top).toEqual('97px');
  });

  test('if too far left, renders to the right', async () => {
    jest
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
    jest
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
    expect(style.left).toEqual('87px');
    expect(style.top).toEqual('160px');
  });
});

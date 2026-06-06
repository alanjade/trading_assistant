import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import CollapsiblePanel from '../CollapsiblePanel';
import CommandPalette from '../CommandPalette';
import DraggableResizablePanel from '../DraggableResizablePanel';

describe('responsive panel primitives', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 400,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 300,
    });
  });

  it('should collapse and expand panel content', () => {
    render(
      <CollapsiblePanel title="Risk Calculator">
        <div>Position size</div>
      </CollapsiblePanel>
    );

    expect(screen.getByText('Position size')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /risk calculator/i }));
    expect(screen.getByText('Position size').parentElement).toHaveClass('hidden');
    fireEvent.click(screen.getByRole('button', { name: /risk calculator/i }));
    expect(screen.getByText('Position size').parentElement).toHaveClass('block');
  });

  it('should clamp draggable panels to the viewport', () => {
    render(
      <DraggableResizablePanel
        title="Tools"
        initialFrame={{ x: 300, y: 200, width: 350, height: 250 }}
      >
        Panel body
      </DraggableResizablePanel>
    );

    const panel = screen.getByText('Panel body').closest('.fixed') as HTMLElement;
    const toolbar = screen.getByRole('toolbar', { name: /tools panel controls/i });
    toolbar.setPointerCapture = () => undefined;

    fireEvent.pointerDown(toolbar, { clientX: 10, clientY: 20, pointerId: 1 });
    fireEvent.pointerMove(toolbar, { clientX: 500, clientY: 400, pointerId: 1 });
    fireEvent.pointerUp(toolbar, { pointerId: 1 });

    expect(panel).toHaveStyle({ left: '50px', top: '50px' });
  });

  it('should clamp the command palette inside the viewport', () => {
    const anchorRef = { current: document.createElement('button') };
    anchorRef.current.getBoundingClientRect = () => ({
      bottom: 40,
      right: 280,
    } as DOMRect);

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 320,
    });

    render(<CommandPalette open onClose={() => undefined} anchorRef={anchorRef} />);

    const palette = screen.getByPlaceholderText('Search commands…').closest('.fixed');
    expect(palette).toHaveStyle({ right: '14px' });
  });

  it('should move and resize draggable panels with pointer input', () => {
    render(
      <DraggableResizablePanel title="Tools" initialFrame={{ x: 10, y: 20, width: 300, height: 200 }}>
        Panel body
      </DraggableResizablePanel>
    );

    const panel = screen.getByText('Panel body').closest('.fixed') as HTMLElement;
    const toolbar = screen.getByRole('toolbar', { name: /tools panel controls/i });
    toolbar.setPointerCapture = () => undefined;

    fireEvent.pointerDown(toolbar, { clientX: 10, clientY: 20, pointerId: 1 });
    fireEvent.pointerMove(toolbar, { clientX: 40, clientY: 55, pointerId: 1 });
    fireEvent.pointerUp(toolbar, { pointerId: 1 });

    expect(panel).toHaveStyle({ left: '40px', top: '55px' });

    const resizeHandle = screen.getByRole('separator', { name: /resize panel/i });
    resizeHandle.setPointerCapture = () => undefined;
    fireEvent.pointerDown(resizeHandle, { clientX: 0, clientY: 0, pointerId: 2 });
    fireEvent.pointerMove(resizeHandle, { clientX: 80, clientY: 60, pointerId: 2 });

    expect(panel).toHaveStyle({ width: '380px', height: '260px' });
  });
});

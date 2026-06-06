'use client';

import type React from 'react';
import { useRef, useState } from 'react';

interface PanelFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

function clampPanelFrame(frame: PanelFrame, minWidth: number, minHeight: number) {
  const viewportWidth = typeof window === 'undefined' ? frame.width : window.innerWidth;
  const viewportHeight = typeof window === 'undefined' ? frame.height : window.innerHeight;

  const width = Math.min(Math.max(frame.width, minWidth), viewportWidth);
  const height = Math.min(Math.max(frame.height, minHeight), viewportHeight);
  const x = Math.min(Math.max(frame.x, 0), Math.max(0, viewportWidth - width));
  const y = Math.min(Math.max(frame.y, 0), Math.max(0, viewportHeight - height));

  return { x, y, width, height };
}

export default function DraggableResizablePanel({
  title,
  children,
  initialFrame = { x: 24, y: 96, width: 360, height: 420 },
  minWidth = 260,
  minHeight = 180,
  className = '',
  actions,
}: {
  title: string;
  children: React.ReactNode;
  initialFrame?: PanelFrame;
  minWidth?: number;
  minHeight?: number;
  className?: string;
  actions?: React.ReactNode;
}) {
  const [frame, setFrame] = useState(() => clampPanelFrame(initialFrame, minWidth, minHeight));
  const dragStart = useRef<{ pointerX: number; pointerY: number; frame: PanelFrame } | null>(null);

  const startMove = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = { pointerX: event.clientX, pointerY: event.clientY, frame };
  };

  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = { pointerX: event.clientX, pointerY: event.clientY, frame };
  };

  const move = (event: React.PointerEvent<HTMLDivElement>, mode: 'move' | 'resize') => {
    if (!dragStart.current) return;
    const deltaX = event.clientX - dragStart.current.pointerX;
    const deltaY = event.clientY - dragStart.current.pointerY;
    const start = dragStart.current.frame;

    const nextFrame =
      mode === 'move'
        ? { ...start, x: start.x + deltaX, y: start.y + deltaY }
        : {
            ...start,
            width: start.width + deltaX,
            height: start.height + deltaY,
          };

    setFrame(clampPanelFrame(nextFrame, minWidth, minHeight));
  };

  const stop = () => {
    dragStart.current = null;
  };

  return (
    <div
      className={`fixed z-[140] overflow-hidden rounded border border-border bg-bg2 shadow-xl ${className}`}
      style={{ left: frame.x, top: frame.y, width: frame.width, height: frame.height }}
    >
      <div
        role="toolbar"
        aria-label={`${title} panel controls`}
        onPointerDown={startMove}
        onPointerMove={(event) => move(event, 'move')}
        onPointerUp={stop}
        onPointerCancel={stop}
        className="flex cursor-move select-none items-center justify-between border-b border-border bg-bg3 px-3 py-2 font-mono text-11px font-semibold text-text2"
      >
        <span>{title}</span>
        <div className="flex items-center gap-1.5">
          {actions}
          <span className="text-text3">drag</span>
        </div>
      </div>
      <div className="h-[calc(100%-34px)] overflow-auto p-3">{children}</div>
      <div
        role="separator"
        aria-orientation="horizontal"
        title="Resize panel"
        onPointerDown={startResize}
        onPointerMove={(event) => move(event, 'resize')}
        onPointerUp={stop}
        onPointerCancel={stop}
        className="absolute bottom-0 right-0 h-5 w-5 cursor-nwse-resize border-b-2 border-r-2 border-border2"
      />
    </div>
  );
}

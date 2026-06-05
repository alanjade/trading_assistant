'use client';

import type React from 'react';
import { useRef, useState } from 'react';

interface PanelFrame {
  x: number;
  y: number;
  width: number;
  height: number;
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
  const [frame, setFrame] = useState(initialFrame);
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

    setFrame(
      mode === 'move'
        ? { ...start, x: start.x + deltaX, y: Math.max(0, start.y + deltaY) }
        : {
            ...start,
            width: Math.max(minWidth, start.width + deltaX),
            height: Math.max(minHeight, start.height + deltaY),
          }
    );
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

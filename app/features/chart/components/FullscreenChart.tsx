'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { eventBus } from '@/lib/streamEvents';

interface FullscreenContextValue {
  isFullscreen: boolean;
  enterFullscreen: () => void;
  exitFullscreen: () => void;
  toggleFullscreen: () => void;
}

const FullscreenContext = createContext<FullscreenContextValue>({
  isFullscreen: false,
  enterFullscreen: () => {},
  exitFullscreen: () => {},
  toggleFullscreen: () => {},
});

export function useFullscreen() {
  return useContext(FullscreenContext);
}

interface FullscreenChartWrapperProps {
  children: ReactNode;
  className?: string;
}

export function FullscreenChartWrapper({ children, className = '' }: FullscreenChartWrapperProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const enterFullscreen = useCallback(() => {
    const el = wrapperRef.current;
    if (el?.requestFullscreen) {
      el.requestFullscreen().catch(() => setIsFullscreen(true));
    } else {
      setIsFullscreen(true);
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setIsFullscreen(false);
  }, []);

  const toggleFullscreen = useCallback(() => {
    isFullscreen ? exitFullscreen() : enterFullscreen();
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    const handler = () => toggleFullscreen();
    eventBus.on('chart:fullscreen', handler);
    return () => eventBus.off('chart:fullscreen', handler);
  }, [toggleFullscreen]);

  useEffect(() => {
    if (!isFullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement) setIsFullscreen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFullscreen]);

  const cssFullscreen = isFullscreen && !document.fullscreenElement;

  return (
    <FullscreenContext.Provider
      value={{ isFullscreen, enterFullscreen, exitFullscreen, toggleFullscreen }}
    >
      <div
        ref={wrapperRef}
        className={`${className} ${cssFullscreen ? 'fixed inset-0 z-[8500] bg-bg overflow-auto p-2' : ''}`}
      >
        {isFullscreen && (
          <div className="absolute top-2 right-2 z-[1] flex gap-1.5 items-center">
            <button
              type="button"
              onClick={exitFullscreen}
              title="Exit fullscreen (ESC)"
              className="px-2.5 py-1 text-11px font-mono font-semibold rounded-sm cursor-pointer border border-border2 bg-bg3 text-text2"
            >
              ⛶ Exit fullscreen
            </button>
          </div>
        )}
        {children}
      </div>
    </FullscreenContext.Provider>
  );
}

export function FullscreenToggleButton() {
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  return (
    <button
      type="button"
      onClick={toggleFullscreen}
      title={isFullscreen ? 'Exit fullscreen (ESC)' : 'Fullscreen chart (F)'}
      className={`px-2 py-1 text-[13px] rounded-sm cursor-pointer border border-border2 leading-none transition-all ${
        isFullscreen ? 'bg-bg4 text-accent' : 'bg-bg3 text-text3'
      }`}
      aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
    >
      {isFullscreen ? '⊠' : '⛶'}
    </button>
  );
}

export function ensureSharpCanvas(canvas: HTMLCanvasElement): {
  dpr: number;
  cssW: number;
  cssH: number;
  scale: (ctx: CanvasRenderingContext2D) => void;
} {
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;

  if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
  }

  return {
    dpr,
    cssW,
    cssH,
    scale: (ctx) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    },
  };
}

export interface VirtualView {
  viewStart: number;
  viewEnd: number;
  maxBars: number;
}

export function calcVirtualView(
  totalCandles: number,
  barWidth: number,
  cssW: number,
  panOffset: number = 0
): VirtualView {
  const maxBars = Math.max(1, Math.floor(cssW / barWidth));
  const viewEnd = Math.max(maxBars, totalCandles - panOffset);
  const viewStart = Math.max(0, viewEnd - maxBars);
  return {
    viewStart: Math.min(viewStart, Math.max(0, totalCandles - maxBars)),
    viewEnd: Math.min(viewEnd, totalCandles),
    maxBars,
  };
}

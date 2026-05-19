export function throttle<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delayMs: number
): (...args: Args) => void {
  let lastCall = 0;

  return (...args: Args) => {
    const now = Date.now();
    if (now - lastCall >= delayMs) {
      lastCall = now;
      fn(...args);
    }
  };
}

export function createThrottledQueue<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delayMs: number
): (...args: Args) => void {
  let lastCall = 0;
  let pendingArgs: Args | null = null;
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Args) => {
    const now = Date.now();
    pendingArgs = args;

    if (now - lastCall >= delayMs) {
      lastCall = now;
      fn(...args);
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = null;
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        if (pendingArgs) {
          lastCall = Date.now();
          fn(...pendingArgs);
        }
        timeoutId = null;
      }, delayMs - (now - lastCall));
    }
  };
}

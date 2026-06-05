export type AppTheme = 'dark' | 'light';

export const LIGHT_VARS: Record<string, string> = {
  '--bg': '#f0f2f7',
  '--bg2': '#e8eaf0',
  '--bg3': '#dde0ea',
  '--bg4': '#d0d4e0',
  '--border': 'rgba(0,0,0,0.08)',
  '--border2': 'rgba(0,0,0,0.14)',
  '--border3': 'rgba(0,0,0,0.22)',
  '--text': '#0f1117',
  '--text2': '#4a5068',
  '--text3': '#8890a8',
  '--green': '#00b87a',
  '--green-bg': 'rgba(0,184,122,0.1)',
  '--green-dim': 'rgba(0,184,122,0.2)',
  '--red': '#e8293f',
  '--red-bg': 'rgba(232,41,63,0.1)',
  '--red-dim': 'rgba(232,41,63,0.2)',
  '--amber': '#d4820a',
  '--blue': '#2577d4',
  '--purple': '#6b52d4',
  '--accent': '#00b87a',
};

export const DARK_VARS: Record<string, string> = {
  '--bg': '#080a0f',
  '--bg2': '#0d1017',
  '--bg3': '#131820',
  '--bg4': '#1a2030',
  '--border': 'rgba(255,255,255,0.06)',
  '--border2': 'rgba(255,255,255,0.11)',
  '--border3': 'rgba(255,255,255,0.18)',
  '--text': '#dde2ef',
  '--text2': '#6b7591',
  '--text3': '#3d4460',
  '--green': '#00e5a0',
  '--green-bg': 'rgba(0,229,160,0.08)',
  '--green-dim': 'rgba(0,229,160,0.16)',
  '--red': '#ff3d5a',
  '--red-bg': 'rgba(255,61,90,0.08)',
  '--red-dim': 'rgba(255,61,90,0.16)',
  '--amber': '#ffb82e',
  '--blue': '#4da6ff',
  '--purple': '#a78bff',
  '--accent': '#00e5a0',
};

export const CHART_THEME_COLORS = {
  dark: {
    grid: 'rgba(255,255,255,0.04)',
    axisText: 'rgba(255,255,255,0.22)',
    bull: '#00e5a0',
    bear: '#ff3d5a',
    livePrice: '#00e5a0',
    bbFill: 'rgba(255,184,46,0.05)',
    vwapBand1: 'rgba(0,212,255,0.15)',
    vwapBand2: 'rgba(0,212,255,0.07)',
    vpBull: 'rgba(0,229,160,0.5)',
    vpBear: 'rgba(255,61,90,0.4)',
  },
  light: {
    grid: 'rgba(0,0,0,0.07)',
    axisText: 'rgba(15,17,23,0.48)',
    bull: '#008f62',
    bear: '#d91f38',
    livePrice: '#008f62',
    bbFill: 'rgba(212,130,10,0.08)',
    vwapBand1: 'rgba(37,119,212,0.12)',
    vwapBand2: 'rgba(37,119,212,0.06)',
    vpBull: 'rgba(0,143,98,0.42)',
    vpBear: 'rgba(217,31,56,0.34)',
  },
} satisfies Record<AppTheme, Record<string, string>>;

export function applyTheme(theme: AppTheme, root: HTMLElement = document.documentElement): void {
  const vars = theme === 'light' ? LIGHT_VARS : DARK_VARS;
  Object.entries(vars).forEach(([key, value]) => root.style.setProperty(key, value));
  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme;
}

export function getChartThemeColors(theme: AppTheme): Record<string, string> {
  return CHART_THEME_COLORS[theme];
}

export function readPersistedTheme(storage: Pick<Storage, 'getItem'>, key = 'trading_assistant'): AppTheme | null {
  const raw = storage.getItem(key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { state?: { theme?: unknown } };
    return parsed.state?.theme === 'light' || parsed.state?.theme === 'dark' ? parsed.state.theme : null;
  } catch {
    return null;
  }
}

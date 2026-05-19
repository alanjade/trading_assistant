import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        bg2: 'var(--bg2)',
        bg3: 'var(--bg3)',
        bg4: 'var(--bg4)',
        text: 'var(--text)',
        text2: 'var(--text2)',
        text3: 'var(--text3)',
        border: 'var(--border)',
        border2: 'var(--border2)',
        border3: 'var(--border3)',
        green: 'var(--green)',
        'green-bg': 'var(--green-bg)',
        'green-dim': 'var(--green-dim)',
        red: 'var(--red)',
        'red-bg': 'var(--red-bg)',
        'red-dim': 'var(--red-dim)',
        amber: 'var(--amber)',
        blue: 'var(--blue)',
        purple: 'var(--purple)',
        accent: 'var(--accent)',
        ema9: 'var(--ema9)',
        ema20: 'var(--ema20)',
        ema50: 'var(--ema50)',
      },
      fontFamily: {
        mono: 'var(--mono)',
        sans: 'var(--sans)',
      },
      fontSize: {
        '9px': ['9px', { lineHeight: '1' }],
        '10px': ['10px', { lineHeight: '1' }],
        '11px': ['11px', { lineHeight: '1' }],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius)',
      },
      spacing: {
        'col-gap': 'var(--col-gap)',
        'nav-w': 'var(--nav-w)',
        'content-px': 'var(--content-px)',
        '0.75': '3px', // for py-0.75
        '1.25': '5px', // for px-1.25
      },
    },
  },
  plugins: [],
} satisfies Config;

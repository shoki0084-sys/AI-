import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      keyframes: {
        'row-in': {
          '0%': { opacity: '0', transform: 'translateY(-8px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'tap-pop': {
          '0%': { transform: 'scale(1)' },
          '45%': { transform: 'scale(0.92)' },
          '100%': { transform: 'scale(1)' },
        },
        'chip-flash': {
          '0%': { backgroundColor: '#eff6ff', borderColor: '#60a5fa' },
          '100%': { backgroundColor: '#ffffff', borderColor: '#e5e7eb' },
        },
      },
      animation: {
        'row-in': 'row-in 0.3s ease-out',
        'tap-pop': 'tap-pop 0.25s ease-out',
        'chip-flash': 'chip-flash 0.45s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;

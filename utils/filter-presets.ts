import type { FilterPattern } from './types';

export interface FilterPreset {
  label: string;
  filter: FilterPattern;
}

export const FILTER_PRESETS: FilterPreset[] = [
  {
    label: 'Exclude tests',
    filter: {
      include: [],
      exclude: [
        '**/test/**', '**/tests/**', '**/__tests__/**',
        '**/*.test.*', '**/*.spec.*', '**/*_test.*',
      ],
    },
  },
  {
    label: 'Exclude vendor',
    filter: {
      include: [],
      exclude: [
        '**/vendor/**', '**/node_modules/**', '**/third_party/**',
        '**/third-party/**', '**/external/**', '**/deps/**',
      ],
    },
  },
  {
    label: 'Source only',
    filter: {
      include: ['src/**', 'lib/**', 'app/**', 'packages/**'],
      exclude: [],
    },
  },
  {
    label: 'Exclude docs',
    filter: {
      include: [],
      exclude: ['**/docs/**', '**/doc/**', '**/documentation/**'],
    },
  },
];

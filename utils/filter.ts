import picomatch from 'picomatch';
import type { FilterPattern } from './types';

export function filterFiles(
  files: Record<string, string>,
  filter: FilterPattern,
): Record<string, string> {
  const { include, exclude } = filter;

  const includeMatchers = include
    .filter((p) => p.trim())
    .map((p) => picomatch(p.trim(), { dot: true }));
  const excludeMatchers = exclude
    .filter((p) => p.trim())
    .map((p) => picomatch(p.trim(), { dot: true }));

  const result: Record<string, string> = {};

  for (const path of Object.keys(files)) {
    if (includeMatchers.length > 0 && !includeMatchers.some((m) => m(path))) {
      continue;
    }
    if (excludeMatchers.length > 0 && excludeMatchers.some((m) => m(path))) {
      continue;
    }
    result[path] = files[path];
  }

  return result;
}

import type { AnalyzeRequest } from './types';

const GITHUB_RESERVED = new Set([
  'settings', 'organizations', 'orgs', 'about', 'features',
  'security', 'pricing', 'enterprise', 'team', 'customer-stories',
  'readme', 'explore', 'topics', 'trending', 'collections',
  'events', 'sponsors', 'login', 'join', 'new', 'notifications',
  'marketplace', 'codespaces', 'issues', 'pulls', 'discussions',
  'search', 'stars', 'dashboard', 'watching', 'account',
]);

export function isRepoPage(): boolean {
  const match = window.location.pathname.match(/^\/([^/]+)\/[^/]+$/);
  return !!match && !GITHUB_RESERVED.has(match[1]);
}

export function getRepoInfo(): AnalyzeRequest | null {
  const match = window.location.pathname.match(/^\/([^/]+)\/([^/]+)$/);
  if (!match || GITHUB_RESERVED.has(match[1])) return null;
  return { owner: match[1], repo: match[2] };
}

export function findCodeButton(): HTMLButtonElement | null {
  const scope = document.querySelector('main') ?? document;

  // Try precise selectors first (fast, no JS iteration)
  const precise = scope.querySelector<HTMLButtonElement>(
    'get-repo button, button[aria-label="Code"]',
  );
  if (precise) return precise;

  // Fallback: text scan within <main> only
  return Array.from(scope.querySelectorAll<HTMLButtonElement>('button')).find(
    (el) => el.textContent?.trim() === 'Code',
  ) ?? null;
}

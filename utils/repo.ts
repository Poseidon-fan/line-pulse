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

export function detectDefaultBranch(): string | undefined {
  // GitHub's branch selector button shows the current (default) branch name
  const branchEl =
    document.querySelector<HTMLElement>('#branch-select-menu summary .css-truncate-target') ??
    document.querySelector<HTMLElement>('[data-hotkey="w"] .css-truncate-target') ??
    document.querySelector<HTMLElement>('.react-branch-picker-button .css-truncate-target');
  const text = branchEl?.textContent?.trim();
  // Sanity check: branch names shouldn't contain spaces or be too long
  if (!text || text.includes(' ') || text.length > 100) return undefined;
  return text;
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

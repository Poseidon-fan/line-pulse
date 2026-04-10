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
  return Array.from(document.querySelectorAll('button')).find((el) => {
    const text = el.textContent?.trim();
    return text === 'Code' || el.getAttribute('aria-label') === 'Code';
  }) ?? null;
}

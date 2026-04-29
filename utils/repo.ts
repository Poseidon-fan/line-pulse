import type { AnalyzeRequest, RepoRef, RepoRefType } from './types';

const GITHUB_RESERVED = new Set([
  'settings', 'organizations', 'orgs', 'about', 'features',
  'security', 'pricing', 'enterprise', 'team', 'customer-stories',
  'readme', 'explore', 'topics', 'trending', 'collections',
  'events', 'sponsors', 'login', 'join', 'new', 'notifications',
  'marketplace', 'codespaces', 'issues', 'pulls', 'discussions',
  'search', 'stars', 'dashboard', 'watching', 'account',
]);

const SUPPORTED_REPO_ROUTES = new Set(['tree']);

interface EmbeddedRefInfo {
  name?: unknown;
  refType?: unknown;
  currentOid?: unknown;
}

interface EmbeddedRepoInfo {
  defaultBranch?: unknown;
}

function getRepoPathInfo() {
  const match = window.location.pathname.match(/^\/([^/]+)\/([^/]+)(?:\/([^/]+)(?:\/.*)?)?\/?$/);
  if (!match || GITHUB_RESERVED.has(match[1])) return null;

  const route = match[3];
  if (route && !SUPPORTED_REPO_ROUTES.has(route)) return null;

  return {
    owner: match[1],
    repo: match[2],
  };
}

function getEmbeddedPayload(): Record<string, unknown> | null {
  const script = document.querySelector<HTMLScriptElement>('script[data-target="react-app.embeddedData"]');
  if (!script?.textContent) return null;

  try {
    const data = JSON.parse(script.textContent) as { payload?: unknown };
    return typeof data.payload === 'object' && data.payload !== null
      ? data.payload as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function getNestedRecord(parent: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const value = parent[key];
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
}

function getEmbeddedRefInfo(payload: Record<string, unknown>): EmbeddedRefInfo | null {
  const candidates = [
    getNestedRecord(payload, 'codeViewTreeRoute')?.refInfo,
    getNestedRecord(payload, 'codeViewLayoutRoute')?.refInfo,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'object' && candidate !== null) {
      return candidate as EmbeddedRefInfo;
    }
  }

  return null;
}

function getEmbeddedRepoInfo(payload: Record<string, unknown>): EmbeddedRepoInfo | null {
  const layoutRoute = getNestedRecord(payload, 'codeViewLayoutRoute');
  if (!layoutRoute) return null;

  const repo = layoutRoute.repo;
  return typeof repo === 'object' && repo !== null ? repo as EmbeddedRepoInfo : null;
}

function normalizeRefType(
  refType: unknown,
  refName: string,
  currentOid?: string,
  defaultBranch?: string,
): RepoRefType {
  if (refType === 'tag') return 'tag';
  if (refType === 'tree' || refType === 'commit') return 'commit';
  if (refType === 'branch') return 'branch';
  if (currentOid && refName === currentOid) return 'commit';
  if (defaultBranch && refName === defaultBranch) return 'branch';
  return 'branch';
}

function getRefFromEmbeddedData(): RepoRef | undefined {
  const payload = getEmbeddedPayload();
  if (!payload) return undefined;

  const refInfo = getEmbeddedRefInfo(payload);
  if (!refInfo || typeof refInfo.name !== 'string' || !refInfo.name) {
    return undefined;
  }

  const repoInfo = getEmbeddedRepoInfo(payload);
  const currentOid = typeof refInfo.currentOid === 'string' ? refInfo.currentOid : undefined;
  const defaultBranch = typeof repoInfo?.defaultBranch === 'string' ? repoInfo.defaultBranch : undefined;

  return {
    name: refInfo.name,
    type: normalizeRefType(refInfo.refType, refInfo.name, currentOid, defaultBranch),
  };
}

function getRefFromUrl(): RepoRef | undefined {
  const match = window.location.pathname.match(/^\/[^/]+\/[^/]+\/tree\/([^/]+)/);
  if (!match) return undefined;

  const name = decodeURIComponent(match[1]);
  const type: RepoRefType = /^[0-9a-f]{40}$/i.test(name) ? 'commit' : 'branch';
  return { name, type };
}

function getCurrentRef(): RepoRef | undefined {
  return getRefFromEmbeddedData() ?? getRefFromUrl();
}

export function isRepoPage(): boolean {
  return getRepoPathInfo() !== null;
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

export function getRepoInfo(): AnalyzeRequest | null {
  const pathInfo = getRepoPathInfo();
  if (!pathInfo) return null;

  const ref = getCurrentRef();
  return ref
    ? { owner: pathInfo.owner, repo: pathInfo.repo, ref }
    : { owner: pathInfo.owner, repo: pathInfo.repo };
}


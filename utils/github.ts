import type { RepoRef } from './types';

export type DownloadResult =
  | { data: Uint8Array }
  | { error: string };

export type DefaultBranchResult =
  | { defaultBranch: string }
  | { error: string };

function getApiHeaders(token: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

function getArchiveHeaders(token: string): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/zip' };
  if (token) headers['Authorization'] = `token ${token}`;
  return headers;
}

export async function getDefaultBranch(
  owner: string,
  repo: string,
  token: string,
  signal?: AbortSignal,
): Promise<DefaultBranchResult> {
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      cache: 'no-store',
      headers: getApiHeaders(token),
      signal,
    });

    if (response.ok) {
      const data = await response.json() as { default_branch?: unknown };
      if (typeof data.default_branch === 'string' && data.default_branch) {
        return { defaultBranch: data.default_branch };
      }
      return { error: 'Could not determine default branch from GitHub API.' };
    }

    if (response.status === 401 || response.status === 403) {
      return token
        ? { error: 'Access denied. Please check your GitHub token permissions or rate limit.' }
        : { error: 'GitHub API access denied or rate limited. Set your GitHub token in the extension popup and try again.' };
    }

    if (response.status === 404) {
      return token
        ? { error: 'Repository not found or access denied.' }
        : { error: 'Repository not found. If this is a private repo, set your GitHub token in the extension popup.' };
    }

    return { error: 'Could not determine default branch.' };
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { error: 'Request cancelled' };
    }
    return { error: 'Failed to contact GitHub API.' };
  }
}

export type DownloadProgress = {
  loaded: number;
  total?: number;
};

export async function downloadRepoZip(
  owner: string,
  repo: string,
  ref: RepoRef,
  token: string,
  signal?: AbortSignal,
  onProgress?: (p: DownloadProgress) => void,
): Promise<DownloadResult> {
  const archivePath = ref.type === 'branch'
    ? `refs/heads/${ref.name}`
    : ref.type === 'tag'
      ? `refs/tags/${ref.name}`
      : ref.name;

  try {
    const url = `https://codeload.github.com/${owner}/${repo}/zip/${archivePath}`;
    const response = await fetch(url, {
      cache: 'no-store',
      headers: getArchiveHeaders(token),
      redirect: 'follow',
      signal,
    });

    if (response.ok) {
      return { data: await readBodyWithProgress(response, onProgress, signal) };
    }

    if (response.status === 401 || response.status === 403) {
      return { error: 'Access denied. Please set your GitHub token in the extension popup for private repositories.' };
    }
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { error: 'Request cancelled' };
    }
  }

  if (!token) {
    return { error: 'Repository not found. If this is a private repo, set your GitHub token in the extension popup.' };
  }
  return { error: 'Could not download repository.' };
}

// Throttle progress callbacks so we don't flood the message port.
const PROGRESS_INTERVAL_MS = 100;

async function readBodyWithProgress(
  response: Response,
  onProgress?: (p: DownloadProgress) => void,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  // codeload sometimes does chunked encoding without Content-Length.
  const contentLengthHeader = response.headers.get('Content-Length');
  const total = contentLengthHeader ? Number(contentLengthHeader) : undefined;
  const knownTotal = Number.isFinite(total) && total! > 0 ? total : undefined;

  if (!response.body || !onProgress) {
    return new Uint8Array(await response.arrayBuffer());
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  let lastReport = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        loaded += value.byteLength;

        const now = Date.now();
        if (now - lastReport >= PROGRESS_INTERVAL_MS) {
          lastReport = now;
          onProgress({ loaded, total: knownTotal });
        }
      }
    }
  } catch (err) {
    try { reader.cancel(); } catch { /* noop */ }
    throw err;
  }

  // Final progress event so the UI lands at 100%.
  onProgress({ loaded, total: knownTotal });

  // Concat chunks into a single Uint8Array.
  const out = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }

  // If the caller was aborted between reads, surface it.
  signal?.throwIfAborted?.();
  return out;
}

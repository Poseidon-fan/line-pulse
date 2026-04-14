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

export async function downloadRepoZip(
  owner: string,
  repo: string,
  branches: string[],
  token: string,
  signal?: AbortSignal,
): Promise<DownloadResult> {
  let accessDenied = false;

  for (const branch of branches) {
    try {
      const url = `https://codeload.github.com/${owner}/${repo}/zip/refs/heads/${branch}`;
      const response = await fetch(url, {
        cache: 'no-store',
        headers: getArchiveHeaders(token),
        redirect: 'follow',
        signal,
      });

      if (response.ok) {
        return { data: new Uint8Array(await response.arrayBuffer()) };
      }

      if (response.status === 401 || response.status === 403) {
        accessDenied = true;
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return { error: 'Request cancelled' };
      }
      // Try next branch
    }
  }

  if (accessDenied) {
    return { error: 'Access denied. Please set your GitHub token in the extension popup for private repositories.' };
  }
  if (!token) {
    return { error: 'Repository not found. If this is a private repo, set your GitHub token in the extension popup.' };
  }
  return { error: 'Could not download repository.' };
}

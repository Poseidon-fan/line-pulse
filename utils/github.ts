export type DownloadResult =
  | { data: Uint8Array }
  | { error: string };

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
      const headers: Record<string, string> = { Accept: 'application/zip' };
      if (token) headers['Authorization'] = `token ${token}`;

      const response = await fetch(url, { headers, redirect: 'follow', signal });

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
  return { error: 'Could not download repository. The default branch may not be main or master.' };
}

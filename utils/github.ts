export type DownloadResult =
  | { data: Uint8Array }
  | { error: string };

export async function downloadRepoZip(
  owner: string,
  repo: string,
  branches: string[],
  token: string,
): Promise<DownloadResult> {
  let hasAuthError = false;

  for (const branch of branches) {
    try {
      const url = `https://codeload.github.com/${owner}/${repo}/zip/refs/heads/${branch}`;
      const headers: Record<string, string> = { Accept: 'application/zip' };
      if (token) headers['Authorization'] = `token ${token}`;

      const response = await fetch(url, { headers, redirect: 'follow' });

      if (response.ok) {
        return { data: new Uint8Array(await response.arrayBuffer()) };
      }

      if (response.status === 404 || response.status === 403) {
        hasAuthError = true;
      }
    } catch (_: unknown) { /* try next branch */ }
  }

  if (hasAuthError) {
    return { error: 'Access denied. Please set your GitHub token in the extension popup for private repositories.' };
  }
  return { error: 'Could not download repository' };
}

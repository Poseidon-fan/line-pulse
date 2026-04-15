import { unzipSync } from 'fflate';

export function unzip(data: Uint8Array): Record<string, string> {
  const entries = unzipSync(data);
  const files: Record<string, string> = {};
  const decoder = new TextDecoder();

  for (const [fullPath, content] of Object.entries(entries)) {
    if (content.length === 0) continue;

    // Strip top-level directory (GitHub ZIP always has one)
    const path = fullPath.split('/').slice(1).join('/');
    if (!path || path.startsWith('.') || path.includes('/.')) continue;

    try {
      const text = decoder.decode(content);
      if (!text.includes('\0')) {
        files[path] = text;
      }
    } catch (_: unknown) { /* skip binary files */ }
  }

  return files;
}

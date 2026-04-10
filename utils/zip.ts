import { unzipSync } from 'fflate';

const MAX_FILE_SIZE = 500_000;

export function unzip(data: Uint8Array): Record<string, string> {
  const entries = unzipSync(data);
  const files: Record<string, string> = {};
  const decoder = new TextDecoder();

  for (const [fullPath, content] of Object.entries(entries)) {
    if (content.length === 0 || content.length > MAX_FILE_SIZE) continue;

    // Strip top-level directory (GitHub ZIP always has one)
    const path = fullPath.split('/').slice(1).join('/');
    if (!path || path.startsWith('.') || path.includes('/.')) continue;

    try {
      const text = decoder.decode(content);
      if (!text.includes('\0')) {
        files[path] = text;
      }
    } catch { /* skip binary files */ }
  }

  return files;
}

import pako from 'pako';

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(async (message, _sender, sendResponse) => {
    if (message.type === 'ANALYZE_REPO') {
      browser.storage.local.set({ pendingAnalysis: message.payload })
        .then(() => browser.action.openPopup());
      sendResponse({ success: true });
      return true;
    }

    if (message.type === 'ANALYZE_REPO_FULL') {
      const requestId = Date.now().toString();

      // Send immediate acknowledgment
      sendResponse({ success: true, requestId });

      // New: do full analysis in background and store result
      const { owner, repo, branch } = message.payload;
      const branches = branch ? [branch, 'main', 'master'] : ['main', 'master'];

      const stored = await browser.storage.local.get('githubToken');
      const token = stored.githubToken || '';

      try {
        // Step 1: Download
        let zipData: string | null = null;
        for (const br of branches) {
          try {
            const url = `https://codeload.github.com/${owner}/${repo}/zip/refs/heads/${br}`;
            const headers: Record<string, string> = { 'Accept': 'application/zip' };
            if (token) headers['Authorization'] = `token ${token}`;

            const response = await fetch(url, { headers, redirect: 'follow' });
            if (response.ok) {
              const buffer = await response.arrayBuffer();
              const bytes = new Uint8Array(buffer);
              let binary = '';
              for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
              zipData = btoa(binary);
              break;
            }
          } catch { /* continue */ }
        }

        if (!zipData) {
          await browser.storage.local.set({ [`result_${requestId}`]: { success: false, error: 'Could not download repository' } });
          return true;
        }

        // Step 2: Unzip
        const files = await unzip(zipData);
        if (Object.keys(files).length === 0) {
          await browser.storage.local.set({ [`result_${requestId}`]: { success: false, error: 'No files extracted' } });
          return true;
        }

        // Step 3: Analyze - we'll do a simple line count per extension
        const stats = analyzeFiles(files);
        await browser.storage.local.set({ [`result_${requestId}`]: { success: true, data: { owner, repo, stats } } });
      } catch (err) {
        await browser.storage.local.set({ [`result_${requestId}`]: { success: false, error: err instanceof Error ? err.message : 'Unknown error' } });
      }
      return true;
    }

    if (message.type === 'DOWNLOAD_REPO') {
      const { owner, repo, branch } = message.payload;
      const branches = branch ? [branch, 'main', 'master'] : ['main', 'master'];

      const stored = await browser.storage.local.get('githubToken');
      const token = stored.githubToken || '';

      const download = async (): Promise<{ success: boolean; data?: string; error?: string }> => {
        for (const br of branches) {
          try {
            const url = `https://codeload.github.com/${owner}/${repo}/zip/refs/heads/${br}`;
            const headers: Record<string, string> = { 'Accept': 'application/zip' };
            if (token) headers['Authorization'] = `token ${token}`;

            const response = await fetch(url, { headers, redirect: 'follow' });

            if (response.ok) {
              const buffer = await response.arrayBuffer();
              const bytes = new Uint8Array(buffer);
              let binary = '';
              for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
              return { success: true, data: btoa(binary) };
            }
          } catch { /* continue */ }
        }
        return { success: false, error: 'Could not download repository' };
      };

      download().then(sendResponse);
      return true;
    }
  });
});

async function unzip(base64Data: string): Promise<Record<string, string>> {
  const binary = atob(base64Data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const files: Record<string, string> = {};
  let offset = 0;
  const localSig = [0x50, 0x4b, 0x03, 0x04];

  while (offset < bytes.length - 30) {
    if (bytes[offset] !== localSig[0] || bytes[offset + 1] !== localSig[1] ||
        bytes[offset + 2] !== localSig[2] || bytes[offset + 3] !== localSig[3]) {
      offset++;
      continue;
    }

    const view = new DataView(bytes.buffer, bytes.byteOffset);
    const compMethod = view.getUint16(offset + 8, true);
    const compSize = view.getUint32(offset + 18, true);
    const uncompSize = view.getUint32(offset + 22, true);
    const nameLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);

    const filename = new TextDecoder().decode(bytes.slice(offset + 30, offset + 30 + nameLen));
    const dataStart = offset + 30 + nameLen + extraLen;
    const dataEnd = dataStart + compSize;

    if (dataEnd > bytes.length || compSize === 0 || uncompSize === 0) {
      offset = dataEnd;
      continue;
    }

    let content: Uint8Array;
    if (compMethod === 0) {
      content = bytes.slice(dataStart, dataEnd);
    } else if (compMethod === 8) {
      try {
        let decompressed: Uint8Array;
        try {
          decompressed = pako.inflateRaw(bytes.slice(dataStart, dataEnd));
        } catch {
          decompressed = pako.inflate(bytes.slice(dataStart, dataEnd));
        }
        content = new Uint8Array(decompressed);
      } catch {
        offset = dataEnd;
        continue;
      }
    } else {
      offset = dataEnd;
      continue;
    }

    if (uncompSize > 500000) {
      offset = dataEnd;
      continue;
    }

    try {
      const text = new TextDecoder().decode(content);
      if (text.includes('\0')) {
        offset = dataEnd;
        continue;
      }
      const path = filename.split('/').slice(1).join('/');
      if (path && !path.startsWith('.') && !path.includes('/.')) {
        files[path] = text;
      }
    } catch { /* skip */ }

    offset = dataEnd;
  }

  return files;
}

interface LanguageStats { name: string; lines: number; color: string; }
interface Stats { total: number; files: number; languages: LanguageStats[]; }

const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a', TypeScript: '#2b7489', Python: '#3572A5', Java: '#b07219',
  Go: '#00ADD8', Rust: '#dea584', C: '#555555', 'CPlusPlus': '#f34b7d', 'CSharp': '#178600',
  Ruby: '#701516', PHP: '#4F5D95', Swift: '#F05138', Kotlin: '#A97BFF',
  Vue: '#41b883', HTML: '#e34c26', CSS: '#563d7c', JSON: '#292929',
  Markdown: '#083fa1', YAML: '#cb171e', Shell: '#89e051', SQL: '#e38c00',
};

const EXT_TO_LANG: Record<string, string> = {
  js: 'JavaScript', jsx: 'JavaScript', ts: 'TypeScript', tsx: 'TypeScript',
  py: 'Python', java: 'Java', go: 'Go', rs: 'Rust', c: 'C', cpp: 'CPlusPlus', cc: 'CPlusPlus',
  cxx: 'CPlusPlus', h: 'C', hpp: 'CPlusPlus', cs: 'CSharp', rb: 'Ruby', php: 'PHP', swift: 'Swift',
  kt: 'Kotlin', kts: 'Kotlin', vue: 'Vue', html: 'HTML', htm: 'HTML',
  css: 'CSS', scss: 'CSS', sass: 'CSS', less: 'CSS', json: 'JSON', md: 'Markdown',
  mdx: 'Markdown', yaml: 'YAML', yml: 'YAML', sh: 'Shell', bash: 'Shell',
  sql: 'SQL', xml: 'XML', toml: 'TOML', dockerfile: 'Dockerfile',
};

function analyzeFiles(files: Record<string, string>): Stats {
  const langLines: Record<string, number> = {};
  let totalLines = 0;
  let fileCount = 0;

  for (const [path, content] of Object.entries(files)) {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const lang = EXT_TO_LANG[ext] || 'Other';

    const lines = content.split('\n').length;
    langLines[lang] = (langLines[lang] || 0) + lines;
    totalLines += lines;
    fileCount++;
  }

  const languages: LanguageStats[] = Object.entries(langLines)
    .map(([name, lines]) => ({
      name,
      lines,
      color: LANGUAGE_COLORS[name] || '#6e7681',
    }))
    .sort((a, b) => b.lines - a.lines)
    .slice(0, 10);

  return { total: totalLines, files: fileCount, languages };
}
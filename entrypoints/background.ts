import pako from 'pako';

interface AnalyzeRequest {
  owner: string;
  repo: string;
  branch: string;
}

interface AnalyzeResponse {
  success: boolean;
  requestId?: string;
  data?: {
    owner: string;
    repo: string;
    stats: any;
  };
  error?: string;
}

interface LanguageStats { name: string; lines: number; color: string; }
interface Stats { total: number; files: number; languages: LanguageStats[]; }

// WASM module reference
let wasmModule: any = null;

// Initialize WASM module
async function initWasm(): Promise<void> {
  if (wasmModule) return;

  // @ts-ignore - wasm_bindgen is loaded globally
  const wasm = await import('/wasm/pkg/line_pulse_wasm.js');
  // @ts-ignore
  await wasm.default('/wasm/pkg/line_pulse_wasm_bg.wasm');
  // @ts-ignore
  wasmModule = { analyze_code: wasm.analyze_code };
}

// Analyze using Rust WASM
function analyzeWithWasm(files: Record<string, string>): Stats {
  const json = JSON.stringify(files);
  const result = JSON.parse(wasmModule.analyze_code(json));

  return {
    total: result.total,
    files: result.files,
    languages: result.languages.map((l: any) => ({
      name: l.name,
      lines: l.lines,
      color: l.color
    }))
  };
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(async (message: { type: string; payload?: AnalyzeRequest }, _sender: any, sendResponse: (response: AnalyzeResponse) => void) => {
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

      const payload = message.payload;
      if (!payload) {
        await browser.storage.local.set({ [`result_${requestId}`]: { success: false, error: 'Invalid request' } });
        return true;
      }

      const { owner, repo, branch } = payload;
      const branches = branch ? [branch, 'main', 'master'] : ['main', 'master'];

      const stored = await browser.storage.local.get('githubToken') as { githubToken?: string };
      const token = stored.githubToken || '';

      try {
        const debug = import.meta.env.DEV;
        const t0 = debug ? performance.now() : 0;

        // Step 1: Download
        let zipData: string | null = null;
        let lastStatus: number | null = null;
        let hasAuthError = false;

        for (const br of branches) {
          try {
            const url = `https://codeload.github.com/${owner}/${repo}/zip/refs/heads/${br}`;
            const headers: Record<string, string> = { 'Accept': 'application/zip' };
            if (token) headers['Authorization'] = `token ${token}`;

            const response = await fetch(url, { headers, redirect: 'follow' });
            lastStatus = response.status;

            if (response.ok) {
              const buffer = await response.arrayBuffer();
              const bytes = new Uint8Array(buffer);
              let binary = '';
              for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
              zipData = btoa(binary);
              break;
            } else if (response.status === 404 || response.status === 403) {
              hasAuthError = true;
            }
          } catch { /* continue */ }
        }

        if (!zipData) {
          let errorMessage = 'Could not download repository';
          if (hasAuthError || lastStatus === 404 || lastStatus === 403) {
            errorMessage = 'Access denied. Please set your GitHub token in the extension popup for private repositories.';
          }
          await browser.storage.local.set({ [`result_${requestId}`]: { success: false, error: errorMessage } });
          return true;
        }

        const t1 = debug ? performance.now() : 0;
        if (debug) console.log(`[Line Pulse] Download: ${(t1 - t0).toFixed(0)}ms`);

        // Step 2: Unzip
        const files = await unzip(zipData);
        const fileCount = Object.keys(files).length;

        const t2 = debug ? performance.now() : 0;
        if (debug) console.log(`[Line Pulse] Unzip: ${(t2 - t1).toFixed(0)}ms (${fileCount} files)`);

        if (fileCount === 0) {
          await browser.storage.local.set({ [`result_${requestId}`]: { success: false, error: 'No files extracted' } });
          return true;
        }

        // Step 3: Analyze with Rust WASM
        await initWasm();
        const stats = analyzeWithWasm(files);

        const t3 = debug ? performance.now() : 0;
        if (debug) console.log(`[Line Pulse] WASM analyze: ${(t3 - t2).toFixed(0)}ms`);
        if (debug) console.log(`[Line Pulse] Total: ${(t3 - t0).toFixed(0)}ms`);

        await browser.storage.local.set({ [`result_${requestId}`]: { success: true, data: { owner, repo, stats } } });
      } catch (err) {
        await browser.storage.local.set({ [`result_${requestId}`]: { success: false, error: err instanceof Error ? err.message : 'Unknown error' } });
      }
      return true;
    }

    if (message.type === 'DOWNLOAD_REPO') {
      const payload = message.payload;
      if (!payload) {
        sendResponse({ success: false, error: 'Invalid request' });
        return true;
      }
      const { owner, repo, branch } = payload;
      const branches = branch ? [branch, 'main', 'master'] : ['main', 'master'];

      const stored = await browser.storage.local.get('githubToken') as { githubToken?: string };
      const token = stored.githubToken || '';

      const download = async (): Promise<{ success: boolean; data?: string; error?: string }> => {
        let lastStatus: number | null = null;
        let hasAuthError = false;

        for (const br of branches) {
          try {
            const url = `https://codeload.github.com/${owner}/${repo}/zip/refs/heads/${br}`;
            const headers: Record<string, string> = { 'Accept': 'application/zip' };
            if (token) headers['Authorization'] = `token ${token}`;

            const response = await fetch(url, { headers, redirect: 'follow' });
            lastStatus = response.status;

            if (response.ok) {
              const buffer = await response.arrayBuffer();
              const bytes = new Uint8Array(buffer);
              let binary = '';
              for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
              return { success: true, data: btoa(binary) };
            } else if (response.status === 404 || response.status === 403) {
              hasAuthError = true;
            }
          } catch { /* continue */ }
        }

        if (hasAuthError || lastStatus === 404 || lastStatus === 403) {
          return { success: false, error: 'Access denied. Please set your GitHub token in the extension popup for private repositories.' };
        }
        return { success: false, error: 'Could not download repository' };
      };

      download().then((result) => sendResponse(result as any));
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
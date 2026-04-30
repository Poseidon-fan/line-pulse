import type {
  AnalyzePortMessage,
  AnalyzePortRequest,
  AnalyzeProgress,
  AnalyzeRequest,
  AnalyzeResponse,
  FilterAnalyzeRequest,
  RepoRef,
} from '@/utils/types';
import { githubToken } from '@/utils/storage';
import { downloadRepoZip, getDefaultBranch } from '@/utils/github';
import { unzip } from '@/utils/zip';
import { analyzeWithWasm } from '@/utils/wasm';
import { filterFiles } from '@/utils/filter';
import { getCache, setCache } from '@/utils/cache';

const inFlightRequests = new Map<string, AbortController>();

const rawFileCache = new Map<string, { files: Record<string, string>; timestamp: number }>();
const MAX_RAW_CACHE = 10;

function setRawFileCache(key: string, files: Record<string, string>): void {
  rawFileCache.set(key, { files, timestamp: Date.now() });
  if (rawFileCache.size > MAX_RAW_CACHE) {
    const oldest = rawFileCache.keys().next().value;
    if (oldest) rawFileCache.delete(oldest);
  }
}

function getRequestKey(owner: string, repo: string, ref?: RepoRef): string {
  return ref
    ? `${owner}/${repo}@${ref.type}:${ref.name}`
    : `${owner}/${repo}@default`;
}

export default defineBackground(() => {
  // Streaming analyze: long-lived port with progress events.
  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== 'analyze-repo') return;

    let controller: AbortController | null = null;
    let active = true;

    const send = (msg: AnalyzePortMessage) => {
      if (!active) return;
      try {
        port.postMessage(msg);
      } catch { /* port already closed */ }
    };

    port.onDisconnect.addListener(() => {
      active = false;
      controller?.abort();
    });

    port.onMessage.addListener(async (raw: AnalyzePortRequest) => {
      if (raw?.type !== 'start') return;
      const payload = raw.payload;
      const requestKey = getRequestKey(payload.owner, payload.repo, payload.ref);

      // Cancel any other in-flight request for the same repo/ref.
      inFlightRequests.get(requestKey)?.abort();
      controller = new AbortController();
      inFlightRequests.set(requestKey, controller);

      const onProgress = (progress: AnalyzeProgress) => send({ type: 'progress', progress });

      try {
        const response = await handleAnalyze(payload, controller.signal, onProgress);
        send({ type: 'result', response });
      } catch (err: unknown) {
        send({
          type: 'result',
          response: {
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          },
        });
      } finally {
        if (inFlightRequests.get(requestKey) === controller) {
          inFlightRequests.delete(requestKey);
        }
        if (active) {
          try { port.disconnect(); } catch { /* noop */ }
        }
      }
    });
  });

  // Filter re-analysis: simple request/response, runs on already-cached files.
  browser.runtime.onMessage.addListener(
    (msg: { type: string; payload: FilterAnalyzeRequest }, _sender, sendResponse) => {
      if (msg?.type === 'filter-analyze') {
        handleFilterAnalyze(msg.payload).then(sendResponse);
        return true;
      }
      return false;
    },
  );
});

async function handleAnalyze(
  payload: AnalyzeRequest,
  signal: AbortSignal,
  onProgress: (p: AnalyzeProgress) => void,
): Promise<AnalyzeResponse> {
  const { owner, repo } = payload;

  const debug = import.meta.env.DEV;
  const t0 = debug ? performance.now() : 0;

  try {
    const token = await githubToken.getValue();

    let ref = payload.ref;
    if (!ref) {
      onProgress({ stage: 'resolving' });
      const branchResult = await getDefaultBranch(owner, repo, token, signal);
      if ('error' in branchResult) {
        return { success: false, error: branchResult.error };
      }

      ref = {
        name: branchResult.defaultBranch,
        type: 'branch',
      };
    }

    const cacheKey = getRequestKey(owner, repo, ref);
    if (!payload.force) {
      const cached = await getCache(cacheKey);
      if (cached) {
        if (debug) console.log(`[Line Pulse] Cache hit for ${cacheKey}`);
        return cached;
      }
    }

    // Download
    onProgress({ stage: 'downloading', loaded: 0 });
    const downloadResult = await downloadRepoZip(
      owner,
      repo,
      ref,
      token,
      signal,
      ({ loaded, total }) => onProgress({ stage: 'downloading', loaded, total }),
    );
    if ('error' in downloadResult) {
      return { success: false, error: downloadResult.error };
    }
    if (debug) console.log(`[Line Pulse] Download: ${(performance.now() - t0).toFixed(0)}ms`);

    // Unzip
    onProgress({ stage: 'unzipping' });
    const files = unzip(downloadResult.data);
    const fileCount = Object.keys(files).length;
    if (fileCount === 0) {
      return { success: false, error: 'No files extracted' };
    }
    setRawFileCache(cacheKey, files);
    if (debug) console.log(`[Line Pulse] Unzip: ${(performance.now() - t0).toFixed(0)}ms (${fileCount} files)`);

    // Analyze
    onProgress({ stage: 'analyzing', fileCount });
    const stats = await analyzeWithWasm(files);
    if (debug) console.log(`[Line Pulse] Total: ${(performance.now() - t0).toFixed(0)}ms`);

    const response: AnalyzeResponse & { success: true } = {
      success: true,
      data: { owner, repo, ref, stats },
    };

    await setCache(cacheKey, response);
    return response;
  } catch (err: unknown) {
    if (signal.aborted) {
      return { success: false, error: 'Request cancelled' };
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

async function handleFilterAnalyze(payload: FilterAnalyzeRequest): Promise<AnalyzeResponse> {
  const { owner, repo, ref, filter } = payload;
  const cacheKey = getRequestKey(owner, repo, ref);

  const cached = rawFileCache.get(cacheKey);
  if (!cached) {
    return { success: false, error: 'Raw files not in memory. Please re-analyze the repository.' };
  }

  try {
    const filtered = filterFiles(cached.files, filter);
    const fileCount = Object.keys(filtered).length;
    if (fileCount === 0) {
      return { success: false, error: 'No files match the current filter.' };
    }

    const stats = await analyzeWithWasm(filtered);
    return { success: true, data: { owner, repo, ref, stats } };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Filter analysis failed',
    };
  }
}

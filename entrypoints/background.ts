import type { AnalyzeRequest, AnalyzeResponse, FilterAnalyzeRequest, RepoRef } from '@/utils/types';
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
  browser.runtime.onMessage.addListener(
    (msg: { type: string; payload: AnalyzeRequest | FilterAnalyzeRequest }, _sender, sendResponse) => {
      if (msg?.type === 'analyze-repo') {
        const payload = msg.payload as AnalyzeRequest;
        const { owner, repo, ref } = payload;
        const requestKey = getRequestKey(owner, repo, ref);

        // Cancel any in-flight request for the same repo/ref
        inFlightRequests.get(requestKey)?.abort();

        const controller = new AbortController();
        inFlightRequests.set(requestKey, controller);

        handleAnalyze(payload, controller.signal)
          .finally(() => {
            if (inFlightRequests.get(requestKey) === controller) {
              inFlightRequests.delete(requestKey);
            }
          })
          .then(sendResponse);

        return true;
      }

      if (msg?.type === 'filter-analyze') {
        handleFilterAnalyze(msg.payload as FilterAnalyzeRequest).then(sendResponse);
        return true;
      }

      return false;
    },
  );
});

async function handleAnalyze(payload: AnalyzeRequest, signal: AbortSignal): Promise<AnalyzeResponse> {
  const { owner, repo } = payload;

  const debug = import.meta.env.DEV;
  const t0 = debug ? performance.now() : 0;

  try {
    const token = await githubToken.getValue();

    let ref = payload.ref;
    if (!ref) {
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
    const downloadResult = await downloadRepoZip(
      owner,
      repo,
      ref,
      token,
      signal,
    );
    if ('error' in downloadResult) {
      return { success: false, error: downloadResult.error };
    }
    if (debug) console.log(`[Line Pulse] Download: ${(performance.now() - t0).toFixed(0)}ms`);

    // Unzip
    const files = unzip(downloadResult.data);
    const fileCount = Object.keys(files).length;
    if (fileCount === 0) {
      return { success: false, error: 'No files extracted' };
    }
    setRawFileCache(cacheKey, files);
    if (debug) console.log(`[Line Pulse] Unzip: ${(performance.now() - t0).toFixed(0)}ms (${fileCount} files)`);

    // Analyze
    const stats = await analyzeWithWasm(files);
    if (debug) console.log(`[Line Pulse] Total: ${(performance.now() - t0).toFixed(0)}ms`);

    const response: AnalyzeResponse & { success: true } = {
      success: true,
      data: { owner, repo, ref, stats },
    };

    // Cache successful result
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

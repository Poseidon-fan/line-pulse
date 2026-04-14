import type { AnalyzeRequest, AnalyzeResponse } from '@/utils/types';
import { githubToken } from '@/utils/storage';
import { downloadRepoZip, getDefaultBranch } from '@/utils/github';
import { unzip } from '@/utils/zip';
import { analyzeWithWasm } from '@/utils/wasm';
import { getCache, setCache } from '@/utils/cache';

const inFlightRequests = new Map<string, AbortController>();

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(
    (msg: { type: string; payload: AnalyzeRequest }, _sender, sendResponse) => {
      if (msg?.type !== 'analyze-repo') return false;

      const { owner, repo } = msg.payload;
      const cacheKey = `${owner}/${repo}`;

      // Cancel any in-flight request for the same repo
      inFlightRequests.get(cacheKey)?.abort();

      const controller = new AbortController();
      inFlightRequests.set(cacheKey, controller);

      handleAnalyze(msg.payload, controller.signal)
        .finally(() => {
          if (inFlightRequests.get(cacheKey) === controller) {
            inFlightRequests.delete(cacheKey);
          }
        })
        .then(sendResponse);

      return true; // Keep message channel open for async response
    },
  );
});

async function handleAnalyze(payload: AnalyzeRequest, signal: AbortSignal): Promise<AnalyzeResponse> {
  const { owner, repo } = payload;
  const cacheKey = `${owner}/${repo}`;

  const debug = import.meta.env.DEV;
  const t0 = debug ? performance.now() : 0;

  try {
    // Check cache first
    const cached = await getCache(cacheKey);
    if (cached) {
      if (debug) console.log(`[Line Pulse] Cache hit for ${cacheKey}`);
      return cached;
    }

    const token = await githubToken.getValue();
    const branchResult = await getDefaultBranch(owner, repo, token, signal);
    if ('error' in branchResult) {
      return { success: false, error: branchResult.error };
    }

    // Download
    const downloadResult = await downloadRepoZip(
      owner,
      repo,
      [branchResult.defaultBranch],
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
    if (debug) console.log(`[Line Pulse] Unzip: ${(performance.now() - t0).toFixed(0)}ms (${fileCount} files)`);

    // Analyze
    const stats = await analyzeWithWasm(files);
    if (debug) console.log(`[Line Pulse] Total: ${(performance.now() - t0).toFixed(0)}ms`);

    const response: AnalyzeResponse & { success: true } = {
      success: true,
      data: { owner, repo, stats },
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

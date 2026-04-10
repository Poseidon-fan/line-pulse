import type { BackgroundMessage, ContentMessage, AnalyzeRequest } from '@/utils/types';
import { githubToken } from '@/utils/storage';
import { downloadRepoZip } from '@/utils/github';
import { unzip } from '@/utils/zip';
import { analyzeWithWasm } from '@/utils/wasm';

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(
    (message: BackgroundMessage, sender: Browser.runtime.MessageSender) => {
      if (message.type === 'analyze-repo') {
        const tabId = sender.tab?.id;
        if (!tabId) return;
        handleAnalyze(message.payload, tabId);
        return true;
      }
    },
  );
});

async function handleAnalyze(payload: AnalyzeRequest, tabId: number): Promise<void> {
  const { owner, repo } = payload;
  const branches = ['main', 'master'];
  const token = await githubToken.getValue();

  const debug = import.meta.env.DEV;
  const t0 = debug ? performance.now() : 0;

  try {
    // Download
    const downloadResult = await downloadRepoZip(owner, repo, branches, token);
    if ('error' in downloadResult) {
      return sendResult(tabId, { type: 'analysis-result', success: false, error: downloadResult.error });
    }
    if (debug) console.log(`[Line Pulse] Download: ${(performance.now() - t0).toFixed(0)}ms`);

    // Unzip
    const files = unzip(downloadResult.data);
    const fileCount = Object.keys(files).length;
    if (fileCount === 0) {
      return sendResult(tabId, { type: 'analysis-result', success: false, error: 'No files extracted' });
    }
    if (debug) console.log(`[Line Pulse] Unzip: ${(performance.now() - t0).toFixed(0)}ms (${fileCount} files)`);

    // Analyze
    const stats = await analyzeWithWasm(files);
    if (debug) console.log(`[Line Pulse] Total: ${(performance.now() - t0).toFixed(0)}ms`);

    sendResult(tabId, { type: 'analysis-result', success: true, data: { owner, repo, stats } });
  } catch (err) {
    sendResult(tabId, {
      type: 'analysis-result',
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

function sendResult(tabId: number, message: ContentMessage): void {
  browser.tabs.sendMessage(tabId, message).catch((err) => {
    console.warn('[Line Pulse] Could not send result to tab:', err);
  });
}

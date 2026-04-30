import type {
  AnalyzePortMessage,
  AnalyzeProgress,
  AnalyzeRequest,
  AnalyzeResponse,
  FilterAnalyzeRequest,
} from '@/utils/types';

/**
 * Send an analyze request and stream progress events back via a long-lived
 * port. Resolves with the final AnalyzeResponse.
 */
export function streamAnalyzeRequest(
  request: AnalyzeRequest,
  onProgress: (p: AnalyzeProgress) => void,
): Promise<AnalyzeResponse> {
  return new Promise((resolve, reject) => {
    const port = browser.runtime.connect({ name: 'analyze-repo' });
    let settled = false;

    const finish = (r: AnalyzeResponse) => {
      if (settled) return;
      settled = true;
      try { port.disconnect(); } catch { /* noop */ }
      resolve(r);
    };

    port.onMessage.addListener((msg: AnalyzePortMessage) => {
      if (!msg) return;
      if (msg.type === 'progress') {
        onProgress(msg.progress);
      } else if (msg.type === 'result') {
        finish(msg.response);
      }
    });

    port.onDisconnect.addListener(() => {
      if (settled) return;
      settled = true;
      reject(new Error('Connection closed before result'));
    });

    port.postMessage({ type: 'start', payload: request });
  });
}

export function sendFilterAnalyzeRequest(request: FilterAnalyzeRequest): Promise<AnalyzeResponse> {
  return browser.runtime.sendMessage({ type: 'filter-analyze', payload: request });
}

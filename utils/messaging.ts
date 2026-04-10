import type { AnalyzeRequest, AnalyzeResponse } from './types';

export function sendAnalyzeRequest(request: AnalyzeRequest): Promise<AnalyzeResponse> {
  return browser.runtime.sendMessage({ type: 'analyze-repo', payload: request });
}

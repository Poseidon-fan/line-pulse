import type { AnalyzeRequest, AnalyzeResponse, FilterAnalyzeRequest } from '@/utils/types';

export function sendAnalyzeRequest(request: AnalyzeRequest): Promise<AnalyzeResponse> {
  return browser.runtime.sendMessage({ type: 'analyze-repo', payload: request });
}

export function sendFilterAnalyzeRequest(request: FilterAnalyzeRequest): Promise<AnalyzeResponse> {
  return browser.runtime.sendMessage({ type: 'filter-analyze', payload: request });
}

export interface LanguageStats {
  name: string;
  lines: number;
  color: string;
}

export interface Stats {
  total: number;
  files: number;
  languages: LanguageStats[];
}

export interface AnalyzeRequest {
  owner: string;
  repo: string;
}

// Content script -> Background
export type BackgroundMessage =
  | { type: 'analyze-repo'; payload: AnalyzeRequest };

// Background -> Content script (via browser.tabs.sendMessage)
export type ContentMessage =
  | { type: 'analysis-result'; success: true; data: { owner: string; repo: string; stats: Stats } }
  | { type: 'analysis-result'; success: false; error: string };

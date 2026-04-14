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

export type AnalyzeResponse =
  | { success: true; data: { owner: string; repo: string; stats: Stats } }
  | { success: false; error: string };

export interface CacheEntry {
  response: AnalyzeResponse & { success: true };
  timestamp: number;
}

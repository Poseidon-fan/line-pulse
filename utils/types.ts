export interface LanguageStats {
  name: string;
  lines: number;
  color: string;
}

export type RepoRefType = 'branch' | 'tag' | 'commit';

export interface RepoRef {
  name: string;
  type: RepoRefType;
}

export interface Stats {
  total: number;
  files: number;
  languages: LanguageStats[];
}

export interface AnalyzeRequest {
  owner: string;
  repo: string;
  ref?: RepoRef;
}

export type AnalyzeResponse =
  | { success: true; data: { owner: string; repo: string; ref: RepoRef; stats: Stats } }
  | { success: false; error: string };

export interface CacheEntry {
  response: AnalyzeResponse & { success: true };
  timestamp: number;
}

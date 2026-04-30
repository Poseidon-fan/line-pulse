export interface LanguageStats {
  name: string;
  color: string;
  files: number;
  code: number;
  comments: number;
  blanks: number;
  /** Derived: code + comments + blanks. */
  lines: number;
}

export type RepoRefType = 'branch' | 'tag' | 'commit';

export interface RepoRef {
  name: string;
  type: RepoRefType;
}

export interface Stats {
  files: number;
  totalCode: number;
  totalComments: number;
  totalBlanks: number;
  /** Derived: totalCode + totalComments + totalBlanks. */
  totalLines: number;
  languages: LanguageStats[];
}

export interface AnalyzeRequest {
  owner: string;
  repo: string;
  ref?: RepoRef;
  force?: boolean;
}

export type AnalyzeProgress =
  | { stage: 'resolving' }
  | { stage: 'downloading'; loaded: number; total?: number }
  | { stage: 'unzipping' }
  | { stage: 'analyzing'; fileCount: number };

/** Messages sent from background → content over the analyze port. */
export type AnalyzePortMessage =
  | { type: 'progress'; progress: AnalyzeProgress }
  | { type: 'result'; response: AnalyzeResponse };

/** Messages sent from content → background over the analyze port. */
export type AnalyzePortRequest = { type: 'start'; payload: AnalyzeRequest };

export type AnalyzeResponse =
  | { success: true; data: { owner: string; repo: string; ref: RepoRef; stats: Stats } }
  | { success: false; error: string };

export interface CacheEntry {
  response: AnalyzeResponse & { success: true };
  timestamp: number;
}

export interface FilterPattern {
  include: string[];
  exclude: string[];
}

export interface FilterAnalyzeRequest {
  owner: string;
  repo: string;
  ref: RepoRef;
  filter: FilterPattern;
}

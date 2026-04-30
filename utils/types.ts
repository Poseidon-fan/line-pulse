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

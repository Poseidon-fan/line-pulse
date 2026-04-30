import type { HistoryEntry, RepoRef, Stats } from './types';

const MAX_ENTRIES = 20;
const TOP_LANGUAGES = 4;

const historyStore = storage.defineItem<HistoryEntry[]>('local:analysisHistory', {
  fallback: [],
});

function entryKey(owner: string, repo: string, ref: RepoRef): string {
  return `${owner.toLowerCase()}/${repo.toLowerCase()}@${ref.type}:${ref.name}`;
}

/** Build a compact history snapshot from a full analysis result. */
export function buildHistoryEntry(
  owner: string,
  repo: string,
  ref: RepoRef,
  stats: Stats,
): HistoryEntry {
  const topLanguages = stats.languages.slice(0, TOP_LANGUAGES).map((l) => ({
    name: l.name,
    color: l.color,
    code: l.code,
  }));

  return {
    owner,
    repo,
    ref,
    files: stats.files,
    totalCode: stats.totalCode,
    totalLines: stats.totalLines,
    totalLanguages: stats.languages.length,
    topLanguages,
    timestamp: Date.now(),
  };
}

export async function getHistory(): Promise<HistoryEntry[]> {
  return historyStore.getValue();
}

/**
 * Insert (or refresh) an entry. Newer wins on `owner/repo/ref` collisions and
 * is moved to the front of the list. List is capped at {@link MAX_ENTRIES}.
 */
export async function addHistory(entry: HistoryEntry): Promise<void> {
  const list = await historyStore.getValue();
  const key = entryKey(entry.owner, entry.repo, entry.ref);
  const filtered = list.filter(
    (e) => entryKey(e.owner, e.repo, e.ref) !== key,
  );
  filtered.unshift(entry);
  await historyStore.setValue(filtered.slice(0, MAX_ENTRIES));
}

export async function removeHistory(
  owner: string,
  repo: string,
  ref: RepoRef,
): Promise<void> {
  const list = await historyStore.getValue();
  const key = entryKey(owner, repo, ref);
  const filtered = list.filter((e) => entryKey(e.owner, e.repo, e.ref) !== key);
  if (filtered.length !== list.length) {
    await historyStore.setValue(filtered);
  }
}

export async function clearHistory(): Promise<void> {
  await historyStore.setValue([]);
}

/** Subscribe to history changes (used by popup to react to background writes). */
export function watchHistory(
  cb: (entries: HistoryEntry[]) => void,
): () => void {
  return historyStore.watch((value) => cb(value ?? []));
}

/**
 * Build the GitHub URL we should open for a given history entry. Default
 * branches go to the repo root; everything else goes to the explicit
 * `/tree/<ref>` view so the user lands on the same code they analyzed.
 */
export function historyEntryUrl(entry: HistoryEntry): string {
  const { owner, repo, ref } = entry;
  if (ref.type === 'branch') {
    return `https://github.com/${owner}/${repo}/tree/${encodeURIComponent(ref.name)}`;
  }
  if (ref.type === 'tag') {
    return `https://github.com/${owner}/${repo}/releases/tag/${encodeURIComponent(ref.name)}`;
  }
  return `https://github.com/${owner}/${repo}/tree/${encodeURIComponent(ref.name)}`;
}

/** Human-readable "x minutes ago" / "yesterday" / absolute date for old entries. */
export function formatRelativeTime(timestamp: number, now = Date.now()): string {
  const diff = Math.max(0, now - timestamp);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return 'just now';
  if (diff < hour) {
    const m = Math.floor(diff / minute);
    return `${m}m ago`;
  }
  if (diff < day) {
    const h = Math.floor(diff / hour);
    return `${h}h ago`;
  }
  if (diff < 7 * day) {
    const d = Math.floor(diff / day);
    return d === 1 ? 'yesterday' : `${d}d ago`;
  }

  const date = new Date(timestamp);
  const year = date.getFullYear();
  const currentYear = new Date(now).getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day2 = date.getDate().toString().padStart(2, '0');
  return year === currentYear
    ? `${month}-${day2}`
    : `${year}-${month}-${day2}`;
}

import { ref, computed } from 'vue';
import type {
  AnalyzeProgress,
  AnalyzeRequest,
  AnalyzeResponse,
  FilterPattern,
  RepoRef,
  Stats,
} from '@/utils/types';
import { sendFilterAnalyzeRequest, streamAnalyzeRequest } from '@/utils/messaging';
import { analysisTimeout } from '@/utils/storage';

export type AnalysisStatus = 'idle' | 'loading' | 'success' | 'error';

export function useAnalysis() {
  const status = ref<AnalysisStatus>('idle');
  const stats = ref<Stats | null>(null);
  const repoInfo = ref<{ owner: string; repo: string; ref?: RepoRef } | null>(null);
  const error = ref<string | null>(null);
  const panelOpen = ref(false);
  const progress = ref<AnalyzeProgress | null>(null);
  const activeFilter = ref<FilterPattern | null>(null);
  const isFiltered = computed(() => activeFilter.value !== null);

  let requestId = 0;

  async function startAnalysis(request: AnalyzeRequest, force = false) {
    const currentId = ++requestId;
    const { owner, repo, ref: requestedRef } = request;

    repoInfo.value = { owner, repo, ref: requestedRef };
    stats.value = null;
    error.value = null;
    activeFilter.value = null;
    progress.value = { stage: 'resolving' };
    status.value = 'loading';
    panelOpen.value = true;

    const timeoutMs = (await analysisTimeout.getValue()) * 1000;
    let timeoutTimer: ReturnType<typeof setTimeout> | undefined;

    try {
      const result: AnalyzeResponse = await Promise.race([
        streamAnalyzeRequest({ ...request, force }, (p) => {
          // Drop late progress events from a stale request.
          if (currentId === requestId) progress.value = p;
        }),
        new Promise<never>((_, reject) => {
          timeoutTimer = setTimeout(() => reject(new Error('Analysis timed out')), timeoutMs);
        }),
      ]);

      clearTimeout(timeoutTimer);

      if (currentId !== requestId) return;

      if (result.success) {
        repoInfo.value = {
          owner: result.data.owner,
          repo: result.data.repo,
          ref: result.data.ref,
        };
        stats.value = result.data.stats;
        status.value = 'success';
      } else {
        error.value = result.error;
        status.value = 'error';
      }
    } catch (err: unknown) {
      clearTimeout(timeoutTimer);
      if (currentId !== requestId) return;
      error.value = err instanceof Error ? err.message : 'Unknown error';
      status.value = 'error';
    } finally {
      if (currentId === requestId) progress.value = null;
    }
  }

  async function applyFilter(filter: FilterPattern | null) {
    const info = repoInfo.value;
    if (!info?.ref) return;

    const currentId = ++requestId;
    status.value = 'loading';

    if (filter === null) {
      activeFilter.value = null;
      progress.value = { stage: 'resolving' };
      try {
        const result = await streamAnalyzeRequest(
          { owner: info.owner, repo: info.repo, ref: info.ref },
          (p) => {
            if (currentId === requestId) progress.value = p;
          },
        );
        if (currentId !== requestId) return;
        if (result.success) {
          stats.value = result.data.stats;
          status.value = 'success';
        } else {
          error.value = result.error;
          status.value = 'error';
        }
      } catch (err: unknown) {
        if (currentId !== requestId) return;
        error.value = err instanceof Error ? err.message : 'Unknown error';
        status.value = 'error';
      } finally {
        if (currentId === requestId) progress.value = null;
      }
      return;
    }

    activeFilter.value = filter;
    progress.value = { stage: 'analyzing', fileCount: 0 };
    try {
      const result = await sendFilterAnalyzeRequest({
        owner: info.owner,
        repo: info.repo,
        ref: info.ref,
        filter,
      });
      if (currentId !== requestId) return;
      if (result.success) {
        stats.value = result.data.stats;
        status.value = 'success';
      } else {
        error.value = result.error;
        status.value = 'error';
      }
    } catch (err: unknown) {
      if (currentId !== requestId) return;
      error.value = err instanceof Error ? err.message : 'Unknown error';
      status.value = 'error';
    } finally {
      if (currentId === requestId) progress.value = null;
    }
  }

  function closePanel() {
    panelOpen.value = false;
    status.value = 'idle';
    stats.value = null;
    error.value = null;
    progress.value = null;
  }

  return {
    status,
    stats,
    repoInfo,
    error,
    panelOpen,
    progress,
    activeFilter,
    isFiltered,
    startAnalysis,
    applyFilter,
    closePanel,
  };
}

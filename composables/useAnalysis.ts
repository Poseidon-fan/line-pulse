import { ref, computed } from 'vue';
import type { AnalyzeRequest, FilterPattern, RepoRef, Stats, AnalyzeResponse } from '@/utils/types';
import { sendAnalyzeRequest, sendFilterAnalyzeRequest } from '@/utils/messaging';
import { analysisTimeout } from '@/utils/storage';

export type AnalysisStatus = 'idle' | 'loading' | 'success' | 'error';

export function useAnalysis() {
  const status = ref<AnalysisStatus>('idle');
  const stats = ref<Stats | null>(null);
  const repoInfo = ref<{ owner: string; repo: string; ref?: RepoRef } | null>(null);
  const error = ref<string | null>(null);
  const panelOpen = ref(false);
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
    status.value = 'loading';
    panelOpen.value = true;

    const timeoutMs = (await analysisTimeout.getValue()) * 1000;

    let timeoutTimer: ReturnType<typeof setTimeout> | undefined;

    try {
      const result: AnalyzeResponse = await Promise.race([
        sendAnalyzeRequest({ ...request, force }),
        new Promise<never>((_, reject) => {
          timeoutTimer = setTimeout(() => reject(new Error('Analysis timed out')), timeoutMs);
        }),
      ]);

      clearTimeout(timeoutTimer);

      // Ignore stale results from a previous request
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
    }
  }

  async function applyFilter(filter: FilterPattern | null) {
    const info = repoInfo.value;
    if (!info?.ref) return;

    const currentId = ++requestId;
    status.value = 'loading';

    if (filter === null) {
      activeFilter.value = null;
      try {
        const result = await sendAnalyzeRequest({
          owner: info.owner,
          repo: info.repo,
          ref: info.ref,
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
      }
      return;
    }

    activeFilter.value = filter;
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
    }
  }

  function closePanel() {
    panelOpen.value = false;
    status.value = 'idle';
    stats.value = null;
    error.value = null;
  }

  return {
    status,
    stats,
    repoInfo,
    error,
    panelOpen,
    activeFilter,
    isFiltered,
    startAnalysis,
    applyFilter,
    closePanel,
  };
}

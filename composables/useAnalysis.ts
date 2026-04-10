import { ref, onUnmounted } from 'vue';
import type { Stats, ContentMessage } from '@/utils/types';
import { sendToBackground, onMessage } from '@/utils/messaging';
import { analysisTimeout } from '@/utils/storage';

export type AnalysisStatus = 'idle' | 'loading' | 'success' | 'error';

export function useAnalysis() {
  const status = ref<AnalysisStatus>('idle');
  const stats = ref<Stats | null>(null);
  const repoInfo = ref<{ owner: string; repo: string } | null>(null);
  const error = ref<string | null>(null);
  const panelOpen = ref(false);

  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  function handleResult(message: ContentMessage) {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    if (message.success) {
      repoInfo.value = { owner: message.data.owner, repo: message.data.repo };
      stats.value = message.data.stats;
      status.value = 'success';
    } else {
      error.value = message.error;
      status.value = 'error';
    }
  }

  const cleanup = onMessage('analysis-result', handleResult);

  async function startAnalysis(owner: string, repo: string) {
    repoInfo.value = { owner, repo };
    stats.value = null;
    error.value = null;
    status.value = 'loading';
    panelOpen.value = true;

    const timeoutSeconds = await analysisTimeout.getValue();
    timeoutId = setTimeout(() => {
      if (status.value === 'loading') {
        error.value = 'Analysis timed out';
        status.value = 'error';
      }
    }, timeoutSeconds * 1000);

    sendToBackground({ type: 'analyze-repo', payload: { owner, repo } });
  }

  function closePanel() {
    panelOpen.value = false;
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    // Reset state after close
    status.value = 'idle';
    stats.value = null;
    error.value = null;
  }

  onUnmounted(() => {
    cleanup();
    if (timeoutId) clearTimeout(timeoutId);
  });

  return {
    status,
    stats,
    repoInfo,
    error,
    panelOpen,
    startAnalysis,
    closePanel,
  };
}

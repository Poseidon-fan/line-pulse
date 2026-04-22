<script setup lang="ts">
import { onUnmounted } from 'vue';
import { useAnalysis } from '@/composables/useAnalysis';
import { useClickOutside } from '@/composables/useClickOutside';
import { getRepoInfo } from '@/utils/repo';
import LinePulseButton from './LinePulseButton.vue';
import ResultsPanel from './ResultsPanel.vue';
import '@/assets/tailwind.css';

const props = defineProps<{
  shadowHost: HTMLElement;
}>();

const { status, stats, repoInfo, error, panelOpen, startAnalysis, closePanel } = useAnalysis();

const { register: registerClickOutside, unregister: unregisterClickOutside } =
  useClickOutside(() => props.shadowHost, closePanel);

function onAnalyze() {
  const repo = getRepoInfo();
  if (!repo) return;
  startAnalysis(repo);
  registerClickOutside();
}

function onRefresh() {
  const repo = getRepoInfo();
  if (!repo) return;
  startAnalysis(repo, true);
}

onUnmounted(() => {
  unregisterClickOutside();
});
</script>

<template>
  <div class="relative inline-flex">
    <LinePulseButton
      :loading="status === 'loading'"
      @analyze="onAnalyze"
    />
    <ResultsPanel
      v-if="panelOpen"
      :status="status"
      :stats="stats"
      :error="error"
      :owner="repoInfo?.owner ?? ''"
      :repo="repoInfo?.repo ?? ''"
      :ref-name="repoInfo?.ref?.name ?? ''"
      :ref-type="repoInfo?.ref?.type ?? 'branch'"
      @refresh="onRefresh"
    />
  </div>
</template>

<style>
@keyframes lp-slide-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes lp-spin {
  to { transform: rotate(360deg); }
}
</style>

<script setup lang="ts">
import { computed } from 'vue';
import type { AnalyzeProgress } from '@/utils/types';

const props = defineProps<{
  progress: AnalyzeProgress | null;
}>();

interface StageView {
  title: string;
  detail: string;
  /** 0–1 when known (download with content-length), otherwise null. */
  ratio: number | null;
}

const view = computed<StageView>(() => {
  const p = props.progress;
  if (!p) {
    return { title: 'Starting…', detail: '', ratio: null };
  }
  switch (p.stage) {
    case 'resolving':
      return { title: 'Resolving branch…', detail: 'Fetching repository metadata', ratio: null };
    case 'downloading': {
      const loadedMb = p.loaded / (1024 * 1024);
      if (p.total && p.total > 0) {
        const totalMb = p.total / (1024 * 1024);
        return {
          title: 'Downloading archive…',
          detail: `${loadedMb.toFixed(1)} / ${totalMb.toFixed(1)} MB`,
          ratio: Math.min(1, p.loaded / p.total),
        };
      }
      return {
        title: 'Downloading archive…',
        detail: `${loadedMb.toFixed(1)} MB received`,
        ratio: null,
      };
    }
    case 'unzipping':
      return { title: 'Extracting archive…', detail: 'Reading files', ratio: null };
    case 'analyzing': {
      if (p.total > 0) {
        const processed = Math.min(p.processed, p.total);
        return {
          title: 'Analyzing code…',
          detail: `${processed.toLocaleString()} / ${p.total.toLocaleString()} files`,
          ratio: processed / p.total,
        };
      }
      return {
        title: 'Analyzing code…',
        detail: 'Counting lines',
        ratio: null,
      };
    }
  }
});

const stages = ['resolving', 'downloading', 'unzipping', 'analyzing'] as const;
const stageIndex = computed(() => {
  if (!props.progress) return 0;
  return stages.indexOf(props.progress.stage);
});
</script>

<template>
  <div class="text-center py-7 px-5">
    <!-- Spinner / progress ring -->
    <div class="w-10 h-10 mx-auto mb-4 relative">
      <div class="absolute inset-0 border-3 border-lp-bar-bg rounded-full" />
      <!-- Spinner falls back when ratio is unknown -->
      <div
        v-if="view.ratio === null"
        class="absolute inset-0 border-3 border-lp-accent rounded-full border-t-transparent animate-[lp-spin_0.8s_linear_infinite]"
      />
      <!-- Determinate ring (download with content-length) -->
      <svg
        v-else
        viewBox="0 0 36 36"
        class="absolute inset-0 -rotate-90"
      >
        <circle
          cx="18"
          cy="18"
          r="16"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
          class="text-lp-accent"
          :stroke-dasharray="`${view.ratio * 100}, 100`"
          stroke-linecap="round"
          style="transition: stroke-dasharray 0.2s ease-out;"
        />
      </svg>
    </div>

    <p class="m-0 text-lp-fg text-sm font-medium">{{ view.title }}</p>
    <p
      v-if="view.detail"
      class="mt-1 text-lp-fg-secondary text-xs tabular-nums"
    >
      {{ view.detail }}
    </p>

    <!-- Step dots -->
    <div class="flex items-center justify-center gap-1.5 mt-4">
      <span
        v-for="(s, i) in stages"
        :key="s"
        class="rounded-full transition-all duration-300"
        :class="
          i < stageIndex
            ? 'w-1.5 h-1.5 bg-lp-accent'
            : i === stageIndex
              ? 'w-2 h-2 bg-lp-accent animate-[lp-pulse_1.2s_ease-in-out_infinite]'
              : 'w-1.5 h-1.5 bg-lp-border'
        "
      />
    </div>
  </div>
</template>

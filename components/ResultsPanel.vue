<script setup lang="ts">
import { CircleAlert, RefreshCw } from 'lucide-vue-next';
import type { RepoRefType, Stats } from '@/utils/types';
import type { AnalysisStatus } from '@/composables/useAnalysis';
import StatsGrid from './StatsGrid.vue';
import LanguageBar from './LanguageBar.vue';

const props = defineProps<{
  status: AnalysisStatus;
  stats: Stats | null;
  error: string | null;
  owner: string;
  repo: string;
  refName: string;
  refType: RepoRefType;
}>();

const emit = defineEmits<{
  refresh: [];
}>();

function getRefLabel(refName: string, refType: RepoRefType): string {
  if (!refName) return '';
  return refType === 'commit' ? refName.slice(0, 7) : refName;
}
</script>

<template>
  <div
    class="absolute top-full left-0 z-[9999] w-[340px] font-lp-sans bg-lp-bg border border-lp-border rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.2),0_0_0_1px_rgba(0,0,0,0.05)] p-5 mt-3 text-lp-fg animate-[lp-slide-up_0.3s_ease]"
  >
    <!-- Loading -->
    <div v-if="status === 'loading'" class="text-center py-8 px-5">
      <div class="w-9 h-9 mx-auto mb-4 relative">
        <div class="absolute inset-0 border-3 border-lp-bar-bg rounded-full" />
        <div class="absolute inset-0 border-3 border-lp-accent rounded-full border-t-transparent animate-[lp-spin_0.8s_linear_infinite]" />
      </div>
      <p class="m-0 text-lp-fg-secondary text-sm font-medium">Analyzing repository...</p>
      <p class="mt-2 text-lp-fg-secondary text-xs opacity-70">Downloading &amp; processing code</p>
    </div>

    <!-- Error -->
    <div v-else-if="status === 'error'" class="text-center p-5 bg-lp-error/10 rounded-[10px] border border-lp-error/25">
      <CircleAlert :size="32" class="mx-auto mb-3 text-lp-error" />
      <p class="text-lp-error m-0 mb-2 text-sm font-medium">Analysis Failed</p>
      <p class="text-lp-fg-secondary m-0 text-[13px]">{{ error }}</p>
      <button
        class="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-lp-fg-secondary bg-lp-card-bg border border-lp-border rounded-lg cursor-pointer transition-colors hover:text-lp-fg hover:border-lp-fg-secondary"
        @click.prevent.stop="$emit('refresh')"
      >
        <RefreshCw :size="12" />
        Retry
      </button>
    </div>

    <!-- Success -->
    <template v-else-if="status === 'success' && stats">
      <div class="mb-4 flex items-center justify-between">
        <div class="flex items-center gap-2 min-w-0">
          <span
            class="min-w-0 truncate text-[13px] text-lp-fg-secondary"
            :title="`${owner}/${repo}`"
          >
            <strong class="text-lp-fg font-semibold">{{ owner }}</strong>/{{ repo }}
          </span>
          <span
            v-if="refName"
            class="shrink-0 px-2 py-0.5 rounded-md bg-lp-card-bg border border-lp-border text-[11px] uppercase tracking-wide"
            :title="`${refType}: ${refName}`"
          >
            {{ refType }}: {{ getRefLabel(props.refName, props.refType) }}
          </span>
        </div>
        <button
          class="shrink-0 p-1.5 text-lp-fg-secondary bg-transparent border-none rounded-md cursor-pointer transition-colors hover:text-lp-fg hover:bg-lp-card-bg"
          title="Refresh"
          @click.prevent.stop="$emit('refresh')"
        >
          <RefreshCw :size="14" />
        </button>
      </div>

      <StatsGrid :stats="stats" />

      <div class="flex flex-col gap-3.5">
        <LanguageBar
          v-for="lang in stats.languages.slice(0, 8)"
          :key="lang.name"
          :name="lang.name"
          :lines="lang.lines"
          :total="stats.total"
          :color="lang.color"
        />
      </div>
    </template>
  </div>
</template>

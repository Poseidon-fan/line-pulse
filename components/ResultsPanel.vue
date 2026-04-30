<script setup lang="ts">
import { ref } from 'vue';
import { CircleAlert, RefreshCw, Filter, ChevronDown, ChevronUp } from 'lucide-vue-next';
import type { AnalyzeProgress, RepoRefType, Stats, FilterPattern } from '@/utils/types';
import type { AnalysisStatus } from '@/composables/useAnalysis';
import { FILTER_PRESETS } from '@/utils/filter-presets';
import StatsGrid from './StatsGrid.vue';
import LanguageBar from './LanguageBar.vue';
import ProgressIndicator from './ProgressIndicator.vue';

const props = defineProps<{
  status: AnalysisStatus;
  stats: Stats | null;
  error: string | null;
  progress: AnalyzeProgress | null;
  owner: string;
  repo: string;
  refName: string;
  refType: RepoRefType;
  isFiltered: boolean;
}>();

const emit = defineEmits<{
  refresh: [];
  filter: [filter: FilterPattern | null];
}>();

const filterOpen = ref(false);
const includeInput = ref('');
const excludeInput = ref('');
const activePreset = ref<string | null>(null);

function getRefLabel(refName: string, refType: RepoRefType): string {
  if (!refName) return '';
  return refType === 'commit' ? refName.slice(0, 7) : refName;
}

function applyPreset(preset: typeof FILTER_PRESETS[number]) {
  if (activePreset.value === preset.label) {
    activePreset.value = null;
    includeInput.value = '';
    excludeInput.value = '';
    emit('filter', null);
    return;
  }
  activePreset.value = preset.label;
  includeInput.value = preset.filter.include.join(', ');
  excludeInput.value = preset.filter.exclude.join(', ');
  emit('filter', preset.filter);
}

function applyFilter() {
  activePreset.value = null;
  const include = includeInput.value.split(',').map((s) => s.trim()).filter(Boolean);
  const exclude = excludeInput.value.split(',').map((s) => s.trim()).filter(Boolean);
  if (include.length === 0 && exclude.length === 0) {
    emit('filter', null);
  } else {
    emit('filter', { include, exclude });
  }
}

function clearFilter() {
  includeInput.value = '';
  excludeInput.value = '';
  activePreset.value = null;
  emit('filter', null);
}
</script>

<template>
  <div
    class="absolute top-full left-0 z-[9999] w-[340px] font-lp-sans bg-lp-bg border border-lp-border rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.2),0_0_0_1px_rgba(0,0,0,0.05)] p-5 mt-3 text-lp-fg animate-[lp-slide-up_0.3s_ease]"
  >
    <!-- Loading -->
    <ProgressIndicator
      v-if="status === 'loading'"
      :progress="progress"
    />

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

      <!-- Filter Section -->
      <div class="mb-4 border border-lp-border rounded-lg overflow-hidden">
        <!-- Toggle bar -->
        <button
          class="w-full flex items-center gap-2 px-3 py-2 bg-lp-card-bg border-none cursor-pointer text-left transition-colors hover:bg-lp-border/50"
          @click.prevent.stop="filterOpen = !filterOpen"
        >
          <Filter :size="13" class="text-lp-fg-secondary shrink-0" />
          <span class="text-xs font-medium text-lp-fg-secondary flex-1">Filter paths</span>
          <span
            v-if="isFiltered"
            class="w-1.5 h-1.5 rounded-full bg-lp-accent shrink-0"
          />
          <component :is="filterOpen ? ChevronUp : ChevronDown" :size="13" class="text-lp-fg-secondary shrink-0" />
        </button>

        <!-- Expanded content -->
        <div v-if="filterOpen" class="px-3 pb-3 pt-2 flex flex-col gap-2 border-t border-lp-border">
          <div>
            <label class="block text-[11px] text-lp-fg-secondary mb-1">Include</label>
            <input
              v-model="includeInput"
              type="text"
              placeholder="e.g. src/**, lib/**"
              class="w-full py-1.5 px-2.5 text-xs bg-lp-card-bg border border-lp-border rounded-md text-lp-fg placeholder:text-lp-fg-secondary/50 outline-none transition-colors focus:border-lp-accent"
            />
          </div>
          <div>
            <label class="block text-[11px] text-lp-fg-secondary mb-1">Exclude</label>
            <input
              v-model="excludeInput"
              type="text"
              placeholder="e.g. **/test/**, docs/**"
              class="w-full py-1.5 px-2.5 text-xs bg-lp-card-bg border border-lp-border rounded-md text-lp-fg placeholder:text-lp-fg-secondary/50 outline-none transition-colors focus:border-lp-accent"
            />
          </div>
          <p class="text-[10px] text-lp-fg-secondary/60 m-0">Comma-separated globs. Use ** for recursive match.</p>

          <!-- Presets -->
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="preset in FILTER_PRESETS"
              :key="preset.label"
              class="px-2 py-1 text-[11px] rounded-full border cursor-pointer transition-colors"
              :class="activePreset === preset.label
                ? 'border-lp-accent bg-lp-accent/10 text-lp-accent'
                : 'border-lp-border bg-lp-card-bg text-lp-fg-secondary hover:border-lp-accent hover:text-lp-accent'"
              @click.prevent.stop="applyPreset(preset)"
            >
              {{ preset.label }}
            </button>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-2 mt-1">
            <button
              v-if="isFiltered"
              class="px-2.5 py-1 text-[11px] text-lp-fg-secondary bg-transparent border-none cursor-pointer transition-colors hover:text-lp-fg"
              @click.prevent.stop="clearFilter"
            >
              Clear
            </button>
            <button
              class="px-3 py-1 text-[11px] font-medium text-white bg-lp-accent border-none rounded-md cursor-pointer transition-colors hover:bg-lp-accent-hover"
              @click.prevent.stop="applyFilter"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      <StatsGrid :stats="stats" />

      <div class="flex flex-col gap-3.5">
        <LanguageBar
          v-for="lang in stats.languages.slice(0, 8)"
          :key="lang.name"
          :name="lang.name"
          :code="lang.code"
          :comments="lang.comments"
          :blanks="lang.blanks"
          :total-lines="stats.totalLines"
          :color="lang.color"
        />
      </div>
    </template>
  </div>
</template>

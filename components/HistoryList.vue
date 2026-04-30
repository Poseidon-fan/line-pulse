<script setup lang="ts">
import { computed } from 'vue';
import { Trash2, ExternalLink, History as HistoryIcon } from 'lucide-vue-next';
import type { HistoryEntry } from '@/utils/types';
import { formatRelativeTime, historyEntryUrl } from '@/utils/history';
import { formatNumber } from '@/utils/format';

const props = defineProps<{
  entries: HistoryEntry[];
}>();

const emit = defineEmits<{
  remove: [entry: HistoryEntry];
  clear: [];
}>();

interface DisplayEntry {
  raw: HistoryEntry;
  url: string;
  relTime: string;
  totalCodeLabel: string;
  filesLabel: string;
  /** Pre-computed widths (in %) for the mini language bar. */
  segments: { color: string; widthPct: number; name: string }[];
}

const displayEntries = computed<DisplayEntry[]>(() => {
  const now = Date.now();
  return props.entries.map((entry) => {
    const topTotal = entry.topLanguages.reduce((s, l) => s + l.code, 0);
    const segments = topTotal > 0
      ? entry.topLanguages.map((l) => ({
          color: l.color,
          widthPct: (l.code / topTotal) * 100,
          name: l.name,
        }))
      : [];

    return {
      raw: entry,
      url: historyEntryUrl(entry),
      relTime: formatRelativeTime(entry.timestamp, now),
      totalCodeLabel: formatNumber(entry.totalCode),
      filesLabel: formatNumber(entry.files),
      segments,
    };
  });
});

function refLabel(entry: HistoryEntry): string {
  const { type, name } = entry.ref;
  return type === 'commit' ? name.slice(0, 7) : name;
}

function openEntry(entry: DisplayEntry) {
  browser.tabs.create({ url: entry.url });
}

function onRemove(event: MouseEvent, entry: HistoryEntry) {
  event.stopPropagation();
  emit('remove', entry);
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <!-- Header -->
    <div class="flex items-center justify-between px-1">
      <div class="flex items-center gap-1.5">
        <HistoryIcon :size="13" class="text-lp-fg-secondary" />
        <span class="text-[11px] font-semibold uppercase tracking-wide text-lp-fg-secondary">
          Recent
        </span>
        <span class="text-[10px] text-lp-fg-secondary/60 tabular-nums">
          ({{ entries.length }})
        </span>
      </div>
      <button
        class="text-[11px] text-lp-fg-secondary bg-transparent border-none cursor-pointer transition-colors hover:text-lp-error"
        @click="$emit('clear')"
      >
        Clear all
      </button>
    </div>

    <!-- List -->
    <div class="flex flex-col gap-1.5 max-h-[360px] overflow-y-auto pr-0.5 -mr-0.5">
      <div
        v-for="entry in displayEntries"
        :key="`${entry.raw.owner}/${entry.raw.repo}@${entry.raw.ref.type}:${entry.raw.ref.name}`"
        class="group relative p-2.5 bg-lp-card-bg border border-lp-border rounded-lg cursor-pointer transition-all duration-150 hover:border-lp-accent/50 hover:bg-lp-card-bg/80"
        @click="openEntry(entry)"
      >
        <!-- Title row -->
        <div class="flex items-center gap-1.5 mb-1.5 min-w-0">
          <span class="min-w-0 truncate text-[12px] text-lp-fg-secondary">
            <strong class="text-lp-fg font-semibold">{{ entry.raw.owner }}</strong>/{{ entry.raw.repo }}
          </span>
          <span
            class="shrink-0 px-1.5 py-px rounded bg-lp-bg border border-lp-border text-[9px] uppercase tracking-wide text-lp-fg-secondary"
            :title="`${entry.raw.ref.type}: ${entry.raw.ref.name}`"
          >
            {{ refLabel(entry.raw) }}
          </span>
          <ExternalLink :size="11" class="shrink-0 text-lp-fg-secondary/40 group-hover:text-lp-accent transition-colors" />
          <button
            class="shrink-0 ml-auto p-1 rounded text-lp-fg-secondary/60 bg-transparent border-none cursor-pointer opacity-0 group-hover:opacity-100 transition-all hover:text-lp-error hover:bg-lp-error/10"
            title="Remove from history"
            @click="onRemove($event, entry.raw)"
          >
            <Trash2 :size="11" />
          </button>
        </div>

        <!-- Stats row -->
        <div class="flex items-center gap-2 text-[10px] text-lp-fg-secondary mb-1.5 tabular-nums">
          <span>
            <span class="font-semibold text-lp-fg">{{ entry.totalCodeLabel }}</span> lines
          </span>
          <span class="opacity-50">·</span>
          <span>{{ entry.filesLabel }} files</span>
          <span class="opacity-50">·</span>
          <span>{{ entry.raw.totalLanguages }} langs</span>
          <span class="ml-auto opacity-60">{{ entry.relTime }}</span>
        </div>

        <!-- Mini language bar -->
        <div
          v-if="entry.segments.length"
          class="flex h-1 rounded-[2px] overflow-hidden bg-lp-bar-bg"
        >
          <div
            v-for="seg in entry.segments"
            :key="seg.name"
            class="h-full"
            :style="{ width: `${seg.widthPct}%`, background: seg.color }"
            :title="seg.name"
          />
        </div>
      </div>
    </div>
  </div>
</template>

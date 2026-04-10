<script setup lang="ts">
import type { Stats } from '@/utils/types';
import { formatNumber } from '@/utils/format';

defineProps<{ stats: Stats }>();

const cards = [
  { key: 'total', label: 'Lines' },
  { key: 'files', label: 'Files' },
  { key: 'languages', label: 'Languages' },
] as const;

function getValue(stats: Stats, key: 'total' | 'files' | 'languages'): string {
  if (key === 'languages') return formatNumber(stats.languages.length);
  return formatNumber(stats[key]);
}
</script>

<template>
  <div class="grid grid-cols-3 gap-2.5 mb-5">
    <div
      v-for="card in cards"
      :key="card.key"
      class="text-center py-3.5 px-2 bg-lp-card-bg rounded-[10px] border border-lp-border"
    >
      <span class="block text-[22px] font-bold text-lp-fg leading-tight">
        {{ getValue(stats, card.key) }}
      </span>
      <span class="block text-[11px] text-lp-fg-secondary mt-1 uppercase tracking-wide">
        {{ card.label }}
      </span>
    </div>
  </div>
</template>

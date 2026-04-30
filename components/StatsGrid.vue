<script setup lang="ts">
import type { Stats } from '@/utils/types';
import { formatNumber } from '@/utils/format';

const props = defineProps<{ stats: Stats }>();

interface Card {
  key: 'lines' | 'files' | 'languages';
  label: string;
}

const cards: Card[] = [
  { key: 'lines', label: 'Lines' },
  { key: 'files', label: 'Files' },
  { key: 'languages', label: 'Languages' },
];

function getValue(key: Card['key']): string {
  switch (key) {
    case 'lines': return formatNumber(props.stats.totalLines);
    case 'files': return formatNumber(props.stats.files);
    case 'languages': return formatNumber(props.stats.languages.length);
  }
}
</script>

<template>
  <div class="grid grid-cols-3 gap-2.5 mb-5">
    <div
      v-for="card in cards"
      :key="card.key"
      class="text-center py-3.5 px-2 bg-lp-card-bg rounded-[10px] border border-lp-border"
    >
      <span class="block text-[22px] font-bold text-lp-fg leading-tight tabular-nums">
        {{ getValue(card.key) }}
      </span>
      <span class="block text-[11px] text-lp-fg-secondary mt-1 uppercase tracking-wide">
        {{ card.label }}
      </span>
    </div>
  </div>
</template>

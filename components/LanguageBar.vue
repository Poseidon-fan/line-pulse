<script setup lang="ts">
import { getPct } from '@/utils/format';

defineProps<{
  name: string;
  lines: number;
  total: number;
  color: string;
}>();
</script>

<template>
  <div>
    <div class="flex items-center gap-2 mb-1.5">
      <span
        class="w-2.5 h-2.5 rounded-[3px] shrink-0"
        :style="{ background: color }"
      />
      <span class="text-[13px] font-medium text-lp-fg flex-1">{{ name }}</span>
      <span class="text-[13px] font-semibold text-lp-fg">{{ getPct(lines, total) }}</span>
    </div>
    <div class="h-1.5 bg-lp-bar-bg rounded-[3px] overflow-hidden">
      <div
        class="h-full rounded-[3px] transition-[width] duration-500 ease-out"
        :style="{ width: getPct(lines, total), background: color }"
      />
    </div>
    <div class="text-[11px] text-lp-fg-secondary mt-1">
      {{ lines.toLocaleString() }} lines
    </div>
  </div>
</template>

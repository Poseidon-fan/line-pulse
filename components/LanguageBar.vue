<script setup lang="ts">
import { computed } from 'vue';
import { getPct } from '@/utils/format';

const props = defineProps<{
  name: string;
  code: number;
  comments: number;
  blanks: number;
  /** Total lines across the whole repo, used for the right-hand percentage label. */
  totalLines: number;
  color: string;
}>();

const lines = computed(() => props.code + props.comments + props.blanks);

function pctOfLanguage(value: number): string {
  return lines.value > 0 ? `${(value / lines.value) * 100}%` : '0%';
}
</script>

<template>
  <div>
    <div class="flex items-center gap-2 mb-1.5">
      <span
        class="w-2.5 h-2.5 rounded-[3px] shrink-0"
        :style="{ background: color }"
      />
      <span class="text-[13px] font-medium text-lp-fg flex-1 truncate">{{ name }}</span>
      <span class="text-[12px] text-lp-fg-secondary tabular-nums">
        {{ getPct(lines, totalLines) }}
      </span>
    </div>

    <div
      class="flex h-1.5 bg-lp-bar-bg rounded-[3px] overflow-hidden"
      :title="`${code.toLocaleString()} code · ${comments.toLocaleString()} comments · ${blanks.toLocaleString()} blanks`"
    >
      <div
        class="h-full transition-[width] duration-500 ease-out"
        :style="{ width: pctOfLanguage(code), background: color, opacity: 1 }"
      />
      <div
        class="h-full transition-[width] duration-500 ease-out"
        :style="{ width: pctOfLanguage(comments), background: color, opacity: 0.5 }"
      />
      <div
        class="h-full transition-[width] duration-500 ease-out"
        :style="{ width: pctOfLanguage(blanks), background: color, opacity: 0.22 }"
      />
    </div>

    <div class="flex items-center gap-2 text-[11px] text-lp-fg-secondary mt-1 tabular-nums">
      <span>
        <span class="font-medium text-lp-fg">{{ code.toLocaleString() }}</span>
        code
      </span>
      <span class="opacity-60">·</span>
      <span>{{ comments.toLocaleString() }} cmt</span>
      <span class="opacity-60">·</span>
      <span>{{ blanks.toLocaleString() }} blank</span>
    </div>
  </div>
</template>

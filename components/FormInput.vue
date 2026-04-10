<script setup lang="ts">
defineProps<{
  label: string;
  hint?: string;
  type?: string;
  placeholder?: string;
  min?: number;
  max?: number;
}>();

const model = defineModel<string | number>();
</script>

<template>
  <div class="mb-4">
    <label class="block text-[13px] font-medium text-lp-fg mb-2">{{ label }}</label>
    <input
      v-model="model"
      :type="type ?? 'text'"
      :placeholder="placeholder"
      :min="min"
      :max="max"
      class="w-full py-2.5 px-3 text-sm border border-lp-border rounded-lg bg-lp-input-bg text-lp-fg transition-[border-color,box-shadow] duration-200 outline-none focus:border-lp-accent focus:shadow-[0_0_0_3px_rgba(35,134,54,0.15)]"
    />
    <p v-if="hint" class="text-xs text-lp-fg-secondary mt-1.5">{{ hint }}</p>
  </div>
</template>

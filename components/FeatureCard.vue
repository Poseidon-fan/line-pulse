<script setup lang="ts">
import type { Component } from 'vue';

defineProps<{
  icon: Component;
  title: string;
  description: string;
  highlight?: string;
}>();
</script>

<template>
  <div class="flex gap-3 p-3.5 bg-lp-card-bg rounded-xl border border-lp-border">
    <div class="shrink-0 w-10 h-10 flex items-center justify-center bg-gradient-to-br from-lp-accent/10 to-lp-accent-hover/10 rounded-[10px] text-lp-accent">
      <component :is="icon" :size="24" />
    </div>
    <div>
      <h3 class="text-sm font-semibold text-lp-fg mb-1">{{ title }}</h3>
      <p class="text-xs text-lp-fg-secondary leading-relaxed">
        <slot>
          <template v-if="highlight">
            {{ description.split(highlight)[0] }}<strong class="text-lp-accent">{{ highlight }}</strong>{{ description.split(highlight)[1] }}
          </template>
          <template v-else>{{ description }}</template>
        </slot>
      </p>
    </div>
  </div>
</template>

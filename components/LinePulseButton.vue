<script setup lang="ts">
import { Clock, Loader2 } from 'lucide-vue-next';

defineProps<{
  loading: boolean;
}>();

defineEmits<{
  analyze: [];
}>();
</script>

<template>
  <button
    class="inline-flex items-center py-1.5 px-3.5 text-[13px] font-semibold text-white bg-gradient-to-br from-lp-accent to-lp-accent-hover border-none rounded-lg cursor-pointer mr-2 transition-all duration-200 shadow-sm hover:not-disabled:-translate-y-px hover:not-disabled:shadow-[0_4px_12px_rgba(35,134,54,0.4)] disabled:cursor-not-allowed disabled:opacity-70"
    :disabled="loading"
    @click.prevent.stop="$emit('analyze')"
  >
    <Clock v-if="!loading" :size="16" class="mr-1.5" />
    <Loader2 v-else :size="16" class="mr-1.5 animate-[lp-spin_0.8s_linear_infinite]" />
    <span>{{ loading ? 'Analyzing...' : 'Line Pulse' }}</span>
  </button>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { Settings, BarChart3, LayoutGrid, Clock, Activity } from 'lucide-vue-next';
import { githubToken, analysisTimeout } from '@/utils/storage';
import {
  clearHistory,
  getHistory,
  removeHistory,
  watchHistory,
} from '@/utils/history';
import type { HistoryEntry } from '@/utils/types';
import FeatureCard from '@/components/FeatureCard.vue';
import FormInput from '@/components/FormInput.vue';
import HistoryList from '@/components/HistoryList.vue';
import '@/assets/tailwind.css';

const showSettings = ref(false);
const token = ref('');
const timeout = ref(15);
const saved = ref(false);
const history = ref<HistoryEntry[]>([]);
let savedTimer: ReturnType<typeof setTimeout> | null = null;
let unwatchHistory: (() => void) | null = null;

onMounted(async () => {
  token.value = await githubToken.getValue();
  timeout.value = await analysisTimeout.getValue();
  history.value = await getHistory();
  unwatchHistory = watchHistory((entries) => {
    history.value = entries;
  });
});

onUnmounted(() => {
  if (savedTimer) clearTimeout(savedTimer);
  unwatchHistory?.();
});

async function saveSettings() {
  await githubToken.setValue(token.value);
  await analysisTimeout.setValue(timeout.value);
  saved.value = true;
  if (savedTimer) clearTimeout(savedTimer);
  savedTimer = setTimeout(() => { saved.value = false; }, 2000);
}

async function onRemoveHistory(entry: HistoryEntry) {
  await removeHistory(entry.owner, entry.repo, entry.ref);
}

async function onClearHistory() {
  if (history.value.length === 0) return;
  const ok = confirm('Clear all history?');
  if (!ok) return;
  await clearHistory();
}
</script>

<template>
  <div class="w-80 p-5 font-lp-sans bg-lp-bg text-lp-fg">
    <!-- Header -->
    <div class="flex justify-between items-center mb-5">
      <div class="flex items-center gap-2.5">
        <Activity :size="28" class="text-lp-accent" />
        <span class="text-lg font-semibold bg-gradient-to-br from-lp-accent to-lp-accent-hover bg-clip-text text-transparent">Line Pulse</span>
      </div>
      <button
        class="bg-transparent border-none cursor-pointer p-2 rounded-lg text-lp-fg-secondary transition-all duration-200 hover:bg-lp-border hover:text-lp-fg"
        @click="showSettings = !showSettings"
        title="Settings"
      >
        <Settings :size="18" />
      </button>
    </div>

    <!-- Settings Panel -->
    <div v-if="showSettings" class="animate-[slideDown_0.2s_ease]">
      <FormInput
        v-model="token"
        label="GitHub Token"
        type="password"
        placeholder="ghp_xxxxxxxxxxxx"
        hint="Required for private repos or higher rate limits"
      />
      <FormInput
        v-model.number="timeout"
        label="Timeout (seconds)"
        type="number"
        :min="5"
        :max="120"
        hint="Max time to wait for analysis (default: 30s)"
      />
      <button
        class="w-full py-2.5 px-4 text-sm font-medium text-white bg-gradient-to-br from-lp-accent to-lp-accent-hover border-none rounded-lg cursor-pointer transition-all duration-200 hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(35,134,54,0.3)]"
        :class="{ 'opacity-90': saved }"
        @click="saveSettings"
      >
        {{ saved ? 'Saved' : 'Save Settings' }}
      </button>
    </div>

    <!-- Main Content: History (when present) or Onboarding (empty state) -->
    <div v-else>
      <HistoryList
        v-if="history.length > 0"
        :entries="history"
        @remove="onRemoveHistory"
        @clear="onClearHistory"
      />

      <div v-else class="flex flex-col gap-3">
        <FeatureCard
          :icon="BarChart3"
          title="Code Analysis"
          description="Click the Line Pulse button on any GitHub repo to analyze code lines"
          highlight="Line Pulse"
        />
        <FeatureCard
          :icon="LayoutGrid"
          title="Language Stats"
          description="View breakdown by language with beautiful visualizations"
        />
        <FeatureCard
          :icon="Clock"
          title="Fast & Private"
          description="Analysis runs locally in your browser, no data sent to servers"
        />

        <div class="flex items-center gap-2 p-3 bg-lp-accent/8 rounded-lg mt-1">
          <span class="text-[11px] font-semibold py-0.5 px-2 bg-lp-accent text-white rounded">Tip</span>
          <span class="text-xs text-lp-fg-secondary">Results appear below the button on GitHub</span>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="mt-4 pt-3 border-t border-lp-border text-center">
      <span class="text-[11px] text-lp-fg-secondary">v1.0.0</span>
    </div>
  </div>
</template>

<style>
body {
  background: var(--color-lp-bg);
  width: 320px;
  overflow: hidden;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>

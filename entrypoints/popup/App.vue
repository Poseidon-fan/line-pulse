<script setup lang="ts">
import { ref, onMounted } from 'vue';

const showSettings = ref(false);
const token = ref('');
const saved = ref(false);

onMounted(async () => {
  const stored = await browser.storage.local.get('githubToken');
  if (stored.githubToken) token.value = stored.githubToken;
});

async function saveToken() {
  await browser.storage.local.set({ githubToken: token.value });
  saved.value = true;
  setTimeout(() => saved.value = false, 2000);
}
</script>

<template>
  <div class="container">
    <div class="header">
      <h1>Line Pulse</h1>
      <button class="settings-btn" @click="showSettings = !showSettings" title="Settings">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/><path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/></svg>
      </button>
    </div>

    <div v-if="showSettings" class="settings">
      <label>GitHub Token</label>
      <input v-model="token" type="password" placeholder="ghp_xxxx" />
      <p class="hint">Required for private repos or higher rate limits</p>
      <button class="save-btn" @click="saveToken">{{ saved ? 'Saved!' : 'Save' }}</button>
    </div>

    <div v-else class="info">
      <p>Click the <strong>Line Pulse</strong> button on any GitHub repository page to analyze its code.</p>
      <p class="hint">Results appear below the button.</p>
    </div>
  </div>
</template>

<style scoped>
:root {
  --bg: #ffffff;
  --fg: #24292f;
  --fg-secondary: #57606a;
  --border: #d0d7de;
  --input-bg: #ffffff;
  --btn-bg: #238636;
  --btn-fg: #ffffff;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0d1117;
    --fg: #c9d1d9;
    --fg-secondary: #8b949e;
    --border: #30363d;
    --input-bg: #0d1117;
    --btn-bg: #238636;
    --btn-fg: #ffffff;
  }
}

.container {
  width: 320px;
  padding: 16px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  background: var(--bg);
  color: var(--fg);
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.header h1 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: var(--fg);
}
.settings-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: var(--fg-secondary);
  border-radius: 4px;
}
.settings-btn:hover {
  background: var(--border);
  color: var(--fg);
}
.settings {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.settings label {
  font-size: 14px;
  font-weight: 500;
  color: var(--fg);
}
.settings input {
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 14px;
  background: var(--input-bg);
  color: var(--fg);
}
.settings .hint {
  font-size: 12px;
  color: var(--fg-secondary);
  margin: 0;
}
.settings .save-btn {
  background: var(--btn-bg);
  color: var(--btn-fg);
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}
.info {
  color: var(--fg-secondary);
  font-size: 14px;
  line-height: 1.6;
}
.info strong {
  color: var(--fg);
}
.info .hint {
  font-size: 12px;
}
</style>
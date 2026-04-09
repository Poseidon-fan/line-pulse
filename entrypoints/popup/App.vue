<script setup lang="ts">
import { ref, onMounted } from 'vue';

const showSettings = ref(false);
const token = ref('');
const saved = ref(false);

onMounted(async () => {
  const stored = await browser.storage.local.get('githubToken') as { githubToken?: string };
  if (stored.githubToken) token.value = stored.githubToken;
});

async function saveToken() {
  await browser.storage.local.set({ githubToken: token.value });
  saved.value = true;
  setTimeout(() => saved.value = false, 2000);
}
</script>

<template>
  <div class="popup">
    <!-- Header -->
    <div class="header">
      <div class="logo">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="14" fill="url(#gradient)"/>
          <path d="M8 14h12M14 8v12" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
          <defs>
            <linearGradient id="gradient" x1="0" y1="0" x2="28" y2="28">
              <stop offset="0" stop-color="#238636"/>
              <stop offset="1" stop-color="#2ea043"/>
            </linearGradient>
          </defs>
        </svg>
        <span class="title">Line Pulse</span>
      </div>
      <button class="icon-btn" @click="showSettings = !showSettings" title="Settings">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
          <path d="M9 5.254a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
          <path d="M10.296 1.843c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 2.445 9.43l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 4.56 5.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/>
        </svg>
      </button>
    </div>

    <!-- Settings Panel -->
    <div v-if="showSettings" class="settings-panel">
      <div class="setting-item">
        <label class="setting-label">GitHub Token</label>
        <input
          v-model="token"
          type="password"
          placeholder="ghp_xxxxxxxxxxxx"
          class="setting-input"
        />
        <p class="setting-hint">Required for private repos or higher rate limits</p>
      </div>
      <button class="save-btn" :class="{ saved }" @click="saveToken">
        {{ saved ? '✓ Saved' : 'Save Token' }}
      </button>
    </div>

    <!-- Main Content -->
    <div v-else class="main-content">
      <div class="feature-card">
        <div class="feature-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 3v18h18"/>
            <path d="M7 16l4-4 4 4 5-6"/>
          </svg>
        </div>
        <div class="feature-text">
          <h3>Code Analysis</h3>
          <p>Click the <strong>Line Pulse</strong> button on any GitHub repo to analyze code lines</p>
        </div>
      </div>

      <div class="feature-card">
        <div class="feature-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M3 9h18M9 21V9"/>
          </svg>
        </div>
        <div class="feature-text">
          <h3>Language Stats</h3>
          <p>View breakdown by language with beautiful visualizations</p>
        </div>
      </div>

      <div class="feature-card">
        <div class="feature-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
        </div>
        <div class="feature-text">
          <h3>Fast & Private</h3>
          <p>Analysis runs locally in your browser, no data sent to servers</p>
        </div>
      </div>

      <div class="usage-hint">
        <span class="hint-badge">Tip</span>
        <span>Results appear below the button on GitHub</span>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <span>v1.0.0</span>
    </div>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.popup {
  width: 320px;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  background: var(--bg);
  color: var(--fg);
}

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title {
  font-size: 18px;
  font-weight: 600;
  background: linear-gradient(135deg, #238636, #2ea043);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  color: var(--fg-secondary);
  transition: all 0.2s ease;
}

.icon-btn:hover {
  background: var(--border);
  color: var(--fg);
}

/* Settings Panel */
.settings-panel {
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.setting-item {
  margin-bottom: 16px;
}

.setting-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--fg);
  margin-bottom: 8px;
}

.setting-input {
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--input-bg);
  color: var(--fg);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.setting-input:focus {
  outline: none;
  border-color: #238636;
  box-shadow: 0 0 0 3px rgba(35, 134, 54, 0.15);
}

.setting-hint {
  font-size: 12px;
  color: var(--fg-secondary);
  margin-top: 6px;
}

.save-btn {
  width: 100%;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
  color: white;
  background: linear-gradient(135deg, #238636, #2ea043);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.save-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(35, 134, 54, 0.3);
}

.save-btn.saved {
  background: linear-gradient(135deg, #1a7f37, #238636);
}

/* Main Content */
.main-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.feature-card {
  display: flex;
  gap: 12px;
  padding: 14px;
  background: var(--card-bg);
  border-radius: 12px;
  border: 1px solid var(--border);
}

.feature-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(35, 134, 54, 0.1), rgba(46, 160, 67, 0.1));
  border-radius: 10px;
  color: #238636;
}

.feature-text h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--fg);
  margin-bottom: 4px;
}

.feature-text p {
  font-size: 12px;
  color: var(--fg-secondary);
  line-height: 1.4;
}

.feature-text strong {
  color: #238636;
}

.usage-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: rgba(35, 134, 54, 0.08);
  border-radius: 8px;
  margin-top: 4px;
}

.hint-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  background: #238636;
  color: white;
  border-radius: 4px;
}

.usage-hint span:last-child {
  font-size: 12px;
  color: var(--fg-secondary);
}

/* Footer */
.footer {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
  text-align: center;
}

.footer span {
  font-size: 11px;
  color: var(--fg-secondary);
}

/* Theme Variables */
:root {
  --bg: #ffffff;
  --fg: #1f2328;
  --fg-secondary: #656d76;
  --border: #d1d9e0;
  --input-bg: #ffffff;
  --card-bg: #f6f8fa;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0d1117;
    --fg: #e6edf3;
    --fg-secondary: #8b949e;
    --border: #30363d;
    --input-bg: #161b22;
    --card-bg: #161b22;
  }
}
</style>
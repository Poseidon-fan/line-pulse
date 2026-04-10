import type { ContentMessage, Stats, LanguageStats } from '@/utils/types';
import { analysisTimeout } from '@/utils/storage';
import { formatNumber, getPct } from '@/utils/format';
import {
  isRepoPage,
  getRepoInfo,
  createLinePulseButton,
  injectButton,
  setButtonLoading,
  resetButton,
} from '@/ui/button';

export default defineContentScript({
  matches: ['*://github.com/*'],

  async main() {
    let activeButton: HTMLButtonElement | null = null;
    let activeTimeout: ReturnType<typeof setTimeout> | null = null;
    let outsideClickHandler: ((e: MouseEvent) => void) | null = null;

    // Listen for results pushed from background
    browser.runtime.onMessage.addListener((message: ContentMessage) => {
      if (message.type !== 'analysis-result') return;

      if (activeTimeout) {
        clearTimeout(activeTimeout);
        activeTimeout = null;
      }

      const container = document.getElementById('line-pulse-results');
      if (!container) return;

      if (message.success) {
        const { owner, repo, stats } = message.data;
        showResults(container, owner, repo, stats);
      } else {
        showError(container, message.error);
      }

      if (activeButton) resetButton(activeButton);
      activeButton = null;
    });

    function isDarkMode(): boolean {
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    }

    function getTheme() {
      const dark = isDarkMode();
      return {
        bg: dark ? '#0d1117' : '#ffffff',
        border: dark ? '#30363d' : '#d0d7de',
        fg: dark ? '#e6edf3' : '#1f2328',
        fgSecondary: dark ? '#8b949e' : '#656d76',
        cardBg: dark ? '#161b22' : '#f6f8fa',
        barBg: dark ? '#30363d' : '#e8eaed',
        accent: '#238636',
        isDark: dark,
      };
    }

    function createResultsContainer(btn: HTMLButtonElement): HTMLElement {
      // Clean up previous
      document.getElementById('line-pulse-results')?.remove();
      if (outsideClickHandler) {
        document.removeEventListener('click', outsideClickHandler);
        outsideClickHandler = null;
      }

      const theme = getTheme();

      const container = document.createElement('div');
      container.id = 'line-pulse-results';
      container.dataset.theme = JSON.stringify(theme);
      container.style.cssText = `
        position: absolute;
        top: 100%;
        left: 0;
        z-index: 9999;
        width: 340px;
        background: ${theme.bg};
        border: 1px solid ${theme.border};
        border-radius: 12px;
        box-shadow: 0 16px 48px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05);
        padding: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
        margin-top: 12px;
        color: ${theme.fg};
        animation: lp-slide-up 0.3s ease;
      `;

      const style = document.createElement('style');
      style.textContent = `
        @keyframes lp-slide-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `;
      container.appendChild(style);

      btn.parentElement!.style.position = 'relative';
      btn.parentElement!.appendChild(container);

      // Click-outside to close
      outsideClickHandler = (e: MouseEvent) => {
        const target = e.target as Node;
        if (!container.contains(target) && target !== btn && !btn.contains(target)) {
          container.remove();
          if (outsideClickHandler) {
            document.removeEventListener('click', outsideClickHandler);
            outsideClickHandler = null;
          }
        }
      };
      setTimeout(() => {
        if (outsideClickHandler) document.addEventListener('click', outsideClickHandler);
      }, 0);

      return container;
    }

    function showLoading(container: HTMLElement): void {
      const theme = JSON.parse(container.dataset.theme || '{}');
      container.innerHTML += `
        <div style="text-align: center; padding: 32px 20px;">
          <div style="width: 36px; height: 36px; margin: 0 auto 16px; position: relative;">
            <div style="position: absolute; inset: 0; border: 3px solid ${theme.barBg}; border-radius: 50%;"></div>
            <div style="position: absolute; inset: 0; border: 3px solid ${theme.accent}; border-radius: 50%; border-top-color: transparent; animation: lp-spin 0.8s linear infinite;"></div>
          </div>
          <p style="margin: 0; color: ${theme.fgSecondary}; font-size: 14px; font-weight: 500;">Analyzing repository...</p>
          <p style="margin: 8px 0 0; color: ${theme.fgSecondary}; font-size: 12px; opacity: 0.7;">Downloading & processing code</p>
        </div>
        <style>@keyframes lp-spin { to { transform: rotate(360deg); } }</style>
      `;
    }

    function showError(container: HTMLElement, error: string): void {
      const theme = JSON.parse(container.dataset.theme || '{}');
      const dark = theme.isDark;
      container.innerHTML = `
        <div style="text-align: center; padding: 20px; background: ${dark ? 'rgba(248,81,73,0.1)' : 'rgba(248,81,73,0.08)'}; border-radius: 10px; border: 1px solid ${dark ? 'rgba(248,81,73,0.3)' : 'rgba(248,81,73,0.2)'};">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f85149" stroke-width="2" style="margin-bottom: 12px;">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4M12 16h.01"/>
          </svg>
          <p style="color: #f85149; margin: 0 0 8px; font-size: 14px; font-weight: 500;">Analysis Failed</p>
          <p style="color: ${theme.fgSecondary}; margin: 0; font-size: 13px;">${error}</p>
        </div>
      `;
    }

    function showResults(container: HTMLElement, owner: string, repo: string, stats: Stats): void {
      const theme = JSON.parse(container.dataset.theme || '{}');

      const langRows = stats.languages.slice(0, 8).map((lang: LanguageStats) => `
        <div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            <span style="width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; background: ${lang.color};"></span>
            <span style="font-size: 13px; font-weight: 500; color: ${theme.fg}; flex: 1;">${lang.name}</span>
            <span style="font-size: 13px; font-weight: 600; color: ${theme.fg};">${getPct(lang.lines, stats.total)}</span>
          </div>
          <div style="height: 6px; background: ${theme.barBg}; border-radius: 3px; overflow: hidden;">
            <div style="height: 100%; border-radius: 3px; width: ${getPct(lang.lines, stats.total)}; background: ${lang.color}; transition: width 0.5s ease;"></div>
          </div>
          <div style="font-size: 11px; color: ${theme.fgSecondary}; margin-top: 4px;">${lang.lines.toLocaleString()} lines</div>
        </div>
      `).join('');

      container.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <span style="font-size: 13px; color: ${theme.fgSecondary};"><strong style="color: ${theme.fg}; font-weight: 600;">${owner}</strong>/${repo}</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px;">
          <div style="text-align: center; padding: 14px 8px; background: ${theme.cardBg}; border-radius: 10px; border: 1px solid ${theme.border};">
            <span style="display: block; font-size: 22px; font-weight: 700; color: ${theme.fg}; line-height: 1.2;">${formatNumber(stats.total)}</span>
            <span style="display: block; font-size: 11px; color: ${theme.fgSecondary}; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Lines</span>
          </div>
          <div style="text-align: center; padding: 14px 8px; background: ${theme.cardBg}; border-radius: 10px; border: 1px solid ${theme.border};">
            <span style="display: block; font-size: 22px; font-weight: 700; color: ${theme.fg}; line-height: 1.2;">${formatNumber(stats.files)}</span>
            <span style="display: block; font-size: 11px; color: ${theme.fgSecondary}; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Files</span>
          </div>
          <div style="text-align: center; padding: 14px 8px; background: ${theme.cardBg}; border-radius: 10px; border: 1px solid ${theme.border};">
            <span style="display: block; font-size: 22px; font-weight: 700; color: ${theme.fg}; line-height: 1.2;">${formatNumber(stats.languages.length)}</span>
            <span style="display: block; font-size: 11px; color: ${theme.fgSecondary}; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Languages</span>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 14px;">
          ${langRows}
        </div>
      `;
    }

    async function handleClick(btn: HTMLButtonElement): Promise<void> {
      const repo = getRepoInfo();
      if (!repo) return;

      const container = createResultsContainer(btn);
      showLoading(container);

      setButtonLoading(btn);
      activeButton = btn;

      // Client-side timeout fallback
      const timeoutSeconds = await analysisTimeout.getValue();
      activeTimeout = setTimeout(() => {
        const el = document.getElementById('line-pulse-results');
        if (el) showError(el, 'Analysis timed out');
        if (activeButton) resetButton(activeButton);
        activeButton = null;
      }, timeoutSeconds * 1000);

      // Send to background
      browser.runtime.sendMessage({ type: 'analyze-repo', payload: repo });
    }

    function addButton(): void {
      if (document.getElementById('line-pulse-btn')) return;
      if (!isRepoPage()) return;

      const btn = createLinePulseButton();
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleClick(btn);
      });

      injectButton(btn);
    }

    // Debounced observer for GitHub SPA navigation
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    function debouncedAddButton(): void {
      if (debounceTimer) return;
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        addButton();
      }, 200);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', addButton);
    } else {
      addButton();
    }
    new MutationObserver(debouncedAddButton).observe(document.body, { childList: true, subtree: true });
  },
});

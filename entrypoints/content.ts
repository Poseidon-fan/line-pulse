interface LanguageStats { name: string; lines: number; color: string; }
interface Stats { total: number; files: number; languages: LanguageStats[]; }

export default defineContentScript({
  matches: ['*://github.com/*'],
  main() {
    function isRepoPage(): boolean {
      const path = window.location.pathname;
      return !!path.match(/^\/[^/]+\/[^/]+$/);
    }

    function getRepoInfo(): { owner: string; repo: string; branch: string } | null {
      const path = window.location.pathname;
      const match = path.match(/^\/([^/]+)\/([^/]+)$/);
      if (!match) return null;

      let branch = 'main';
      const urlMatch = window.location.href.match(/github\.com\/[^/]+\/[^/]+\/tree\/([^/]+)/);
      if (urlMatch) branch = urlMatch[1];

      return { owner: match[1], repo: match[2], branch };
    }

    function getPct(lines: number, total: number): string {
      return total > 0 ? ((lines / total) * 100).toFixed(1) + '%' : '0%';
    }

    function isDarkMode(): boolean {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    function createResultsContainer(btn: HTMLButtonElement) {
      let container = document.getElementById('line-pulse-results');
      if (container) container.remove();

      // Remove any existing outside click handler
      document.removeEventListener('click', handleOutsideClick);

      const dark = isDarkMode();
      const theme = {
        bg: dark ? '#0d1117' : '#ffffff',
        border: dark ? '#30363d' : '#d0d7de',
        fg: dark ? '#e6edf3' : '#1f2328',
        fgSecondary: dark ? '#8b949e' : '#656d76',
        cardBg: dark ? '#161b22' : '#f6f8fa',
        barBg: dark ? '#30363d' : '#e8eaed',
        accent: '#238636',
      };

      container = document.createElement('div');
      container.id = 'line-pulse-results';
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

      // Add animation keyframes
      const style = document.createElement('style');
      style.textContent = `
        @keyframes lp-slide-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lp-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `;
      container.appendChild(style);

      container.dataset.theme = JSON.stringify(theme);
      btn.parentElement!.style.position = 'relative';
      btn.parentElement!.appendChild(container);

      // Add click outside handler to close popup
      function handleOutsideClick(e: MouseEvent) {
        const target = e.target as HTMLElement;
        if (!container?.contains(target) && target !== btn && !btn.contains(target)) {
          container?.remove();
          document.removeEventListener('click', handleOutsideClick);
        }
      }
      // Use setTimeout to avoid immediate trigger
      setTimeout(() => {
        document.addEventListener('click', handleOutsideClick);
      }, 0);

      return container;
    }

    function showLoading(container: HTMLElement) {
      const theme = JSON.parse(container.dataset.theme || '{}');
      container.innerHTML = `
        <div style="text-align: center; padding: 32px 20px;">
          <div class="lp-loader" style="width: 36px; height: 36px; margin: 0 auto 16px; position: relative;">
            <div style="position: absolute; inset: 0; border: 3px solid ${theme.barBg}; border-radius: 50%;"></div>
            <div style="position: absolute; inset: 0; border: 3px solid ${theme.accent}; border-radius: 50%; border-top-color: transparent; animation: lp-spin 0.8s linear infinite;"></div>
          </div>
          <p style="margin: 0; color: ${theme.fgSecondary}; font-size: 14px; font-weight: 500;">Analyzing repository...</p>
          <p style="margin: 8px 0 0; color: ${theme.fgSecondary}; font-size: 12px; opacity: 0.7;">Downloading & processing code</p>
        </div>
        <style>@keyframes lp-spin { to { transform: rotate(360deg); } }</style>
      `;
    }

    function showError(container: HTMLElement, error: string) {
      const theme = JSON.parse(container.dataset.theme || '{}');
      container.innerHTML = `
        <div style="text-align: center; padding: 20px; background: ${darkMode ? 'rgba(248,81,73,0.1)' : 'rgba(248,81,73,0.08)'}; border-radius: 10px; border: 1px solid ${darkMode ? 'rgba(248,81,73,0.3)' : 'rgba(248,81,73,0.2)'};">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f85149" stroke-width="2" style="margin-bottom: 12px;">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4M12 16h.01"/>
          </svg>
          <p style="color: #f85149; margin: 0 0 8px; font-size: 14px; font-weight: 500;">Analysis Failed</p>
          <p style="color: ${theme.fgSecondary}; margin: 0; font-size: 13px;">${error}</p>
        </div>
      `;
    }

    function showResults(container: HTMLElement, owner: string, repo: string, stats: Stats) {
      const theme = JSON.parse(container.dataset.theme || '{}');
      const darkMode = isDarkMode();

      const langRows = stats.languages.slice(0, 8).map((lang: LanguageStats) => `
        <div class="lp-lang-row">
          <div class="lp-lang-header">
            <span class="lp-lang-dot" style="background: ${lang.color};"></span>
            <span class="lp-lang-name">${lang.name}</span>
            <span class="lp-lang-pct">${getPct(lang.lines, stats.total)}</span>
          </div>
          <div class="lp-lang-bar">
            <div class="lp-lang-fill" style="width: ${getPct(lang.lines, stats.total)}; background: ${lang.color};"></div>
          </div>
          <div class="lp-lang-lines">${lang.lines.toLocaleString()} lines</div>
        </div>
      `).join('');

      container.innerHTML = `
        <style>
          .lp-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
          .lp-repo { font-size: 13px; color: ${theme.fgSecondary}; }
          .lp-repo strong { color: ${theme.fg}; font-weight: 600; }
          .lp-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
          .lp-stat { text-align: center; padding: 14px 8px; background: ${theme.cardBg}; border-radius: 10px; border: 1px solid ${theme.border}; }
          .lp-stat-value { display: block; font-size: 22px; font-weight: 700; color: ${theme.fg}; line-height: 1.2; }
          .lp-stat-label { display: block; font-size: 11px; color: ${theme.fgSecondary}; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
          .lp-languages { display: flex; flex-direction: column; gap: 14px; }
          .lp-lang-row { }
          .lp-lang-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
          .lp-lang-dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
          .lp-lang-name { font-size: 13px; font-weight: 500; color: ${theme.fg}; flex: 1; }
          .lp-lang-pct { font-size: 13px; font-weight: 600; color: ${theme.fg}; }
          .lp-lang-bar { height: 6px; background: ${theme.barBg}; border-radius: 3px; overflow: hidden; }
          .lp-lang-fill { height: 100%; border-radius: 3px; transition: width 0.5s ease; }
          .lp-lang-lines { font-size: 11px; color: ${theme.fgSecondary}; margin-top: 4px; }
        </style>

        <div class="lp-header">
          <span class="lp-repo"><strong>${owner}</strong>/${repo}</span>
        </div>

        <div class="lp-stats">
          <div class="lp-stat">
            <span class="lp-stat-value">${stats.total.toLocaleString()}</span>
            <span class="lp-stat-label">Lines</span>
          </div>
          <div class="lp-stat">
            <span class="lp-stat-value">${stats.files.toLocaleString()}</span>
            <span class="lp-stat-label">Files</span>
          </div>
          <div class="lp-stat">
            <span class="lp-stat-value">${stats.languages.length}</span>
            <span class="lp-stat-label">Languages</span>
          </div>
        </div>

        <div class="lp-languages">
          ${langRows}
        </div>
      `;
    }

    function addButton() {
      if (document.getElementById('line-pulse-btn')) return;
      if (!isRepoPage()) return;

      const codeButton = Array.from(document.querySelectorAll('button')).find(btn => {
        const text = btn.textContent?.trim();
        const aria = btn.getAttribute('aria-label');
        return text === 'Code' || aria === 'Code';
      });

      if (!codeButton) return;

      const container = codeButton.parentElement;
      if (!container) return;

      const btn = document.createElement('button');
      btn.id = 'line-pulse-btn';
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="margin-right: 6px;">
          <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" fill="none"/>
          <path d="M8 4v4l3 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>Line Pulse</span>
      `;
      btn.style.cssText = `
        display: inline-flex;
        align-items: center;
        padding: 6px 14px;
        font-size: 13px;
        font-weight: 600;
        color: #ffffff;
        background: linear-gradient(135deg, #238636, #2ea043);
        border: none;
        border-radius: 8px;
        cursor: pointer;
        margin-right: 8px;
        transition: all 0.2s ease;
        box-shadow: 0 1px 2px rgba(0,0,0,0.1);
      `;

      btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'translateY(-1px)';
        btn.style.boxShadow = '0 4px 12px rgba(35, 134, 54, 0.4)';
      });

      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translateY(0)';
        btn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
      });

      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const repo = getRepoInfo();
        if (!repo) return;

        const existingResults = document.getElementById('line-pulse-results');
        if (existingResults) existingResults.remove();

        const resultsContainer = createResultsContainer(btn);
        showLoading(resultsContainer);

        btn.disabled = true;
        btn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="margin-right: 6px; animation: lp-spin 0.8s linear infinite;">
            <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" stroke-opacity="0.25"/>
            <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span>Analyzing...</span>
        `;

        try {
          const response = await new Promise<{ success: boolean; requestId?: string }>((resolve, reject) => {
            browser.runtime.sendMessage({
              type: 'ANALYZE_REPO_FULL',
              payload: repo
            }, (response: any) => {
              if (browser.runtime.lastError) {
                reject(new Error(browser.runtime.lastError.message));
              } else {
                resolve(response);
              }
            });
          });

          if (!response || !response.requestId) {
            showError(resultsContainer, 'Failed to start analysis');
            return;
          }

          let result: { success: boolean; data?: any; error?: string } | null = null;
          const resultKey = `result_${response.requestId}`;
          for (let i = 0; i < 50; i++) {
            await new Promise(r => setTimeout(r, 200));
            const stored = await browser.storage.local.get(resultKey);
            if (stored[resultKey]) {
              result = stored[resultKey] as { success: boolean; data?: any; error?: string };
              await browser.storage.local.remove(resultKey);
              break;
            }
          }

          if (!result) {
            showError(resultsContainer, 'Analysis timeout');
            return;
          }

          if (result.success && result.data) {
            showResults(resultsContainer, result.data.owner, result.data.repo, result.data.stats);
          } else {
            showError(resultsContainer, result.error || 'Analysis failed');
          }
        } catch (err) {
          showError(resultsContainer, err instanceof Error ? err.message : 'Unknown error');
        } finally {
          btn.disabled = false;
          btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="margin-right: 6px;">
              <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" fill="none"/>
              <path d="M8 4v4l3 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Line Pulse</span>
          `;
        }
      });

      container.insertBefore(btn, codeButton);
    }

    const darkMode = isDarkMode();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', addButton);
    } else {
      addButton();
    }

    setTimeout(addButton, 1000);
    setTimeout(addButton, 2000);

    new MutationObserver(addButton).observe(document.body, { childList: true, subtree: true });
  },
});
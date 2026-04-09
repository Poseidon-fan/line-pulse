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

      const dark = isDarkMode();
      const bg = dark ? '#0d1117' : '#ffffff';
      const border = dark ? '#30363d' : '#d0d7de';
      const fg = dark ? '#c9d1d9' : '#24292f';
      const fgSecondary = dark ? '#8b949e' : '#57606a';
      const cardBg = dark ? '#161b22' : '#f6f8fa';
      const barBg = dark ? '#30363d' : '#eeeeee';

      container = document.createElement('div');
      container.id = 'line-pulse-results';
      container.style.cssText = `
        position: absolute; top: 100%; left: 0; z-index: 9999;
        width: 320px; background: ${bg}; border: 1px solid ${border};
        border-radius: 6px; box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        padding: 16px; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
        margin-top: 8px; color: ${fg};
      `;
      container.dataset.dark = dark ? 'true' : 'false';
      container.dataset.cardBg = cardBg;
      container.dataset.barBg = barBg;
      container.dataset.fg = fg;
      container.dataset.fgSecondary = fgSecondary;

      btn.parentElement!.style.position = 'relative';
      btn.parentElement!.appendChild(container);
      return container;
    }

    function showLoading(container: HTMLElement) {
      const fgSecondary = container.dataset.fgSecondary || '#57606a';
      container.innerHTML = `
        <div style="text-align:center;padding:20px;">
          <div style="width:24px;height:24px;border:3px solid ${fgSecondary};border-top-color:#238636;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 12px;"></div>
          <p style="margin:0;color:${fgSecondary};font-size:14px;">Analyzing...</p>
        </div>
        <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
      `;
    }

    function showError(container: HTMLElement, error: string) {
      container.innerHTML = `
        <div style="text-align:center;padding:16px;background:#ffebe9;border-radius:6px;">
          <p style="color:#cf222e;margin:0 0 12px;font-size:14px;">${error}</p>
        </div>
      `;
    }

    function showResults(container: HTMLElement, owner: string, repo: string, stats: Stats) {
      const cardBg = container.dataset.cardBg || '#f6f8fa';
      const barBg = container.dataset.barBg || '#eeeeee';
      const fg = container.dataset.fg || '#24292f';
      const fgSecondary = container.dataset.fgSecondary || '#57606a';

      const langRows = stats.languages.map((lang: LanguageStats) => `
        <div style="display:flex;flex-direction:column;gap:4px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="width:12px;height:12px;border-radius:3px;background:${lang.color};"></span>
            <span style="font-size:14px;color:${fg};">${lang.name}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:12px;color:${fgSecondary};">
            <span>${lang.lines.toLocaleString()} lines</span>
            <span>${getPct(lang.lines, stats.total)}</span>
          </div>
          <div style="height:6px;background:${barBg};border-radius:3px;overflow:hidden;">
            <div style="height:100%;width:${getPct(lang.lines, stats.total)};background:${lang.color};border-radius:3px;"></div>
          </div>
        </div>
      `).join('');

      container.innerHTML = `
        <div style="font-size:14px;color:${fgSecondary};margin-bottom:12px;">${owner}/${repo}</div>
        <div style="display:flex;gap:12px;margin-bottom:16px;">
          <div style="flex:1;text-align:center;padding:10px;background:${cardBg};border-radius:6px;">
            <span style="display:block;font-size:18px;font-weight:600;color:${fg};">${stats.total.toLocaleString()}</span>
            <span style="font-size:12px;color:${fgSecondary};">Lines</span>
          </div>
          <div style="flex:1;text-align:center;padding:10px;background:${cardBg};border-radius:6px;">
            <span style="display:block;font-size:18px;font-weight:600;color:${fg};">${stats.files}</span>
            <span style="font-size:12px;color:${fgSecondary};">Files</span>
          </div>
          <div style="flex:1;text-align:center;padding:10px;background:${cardBg};border-radius:6px;">
            <span style="display:block;font-size:18px;font-weight:600;color:${fg};">${stats.languages.length}</span>
            <span style="font-size:12px;color:${fgSecondary};">Languages</span>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px;">
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
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="margin-right:6px"><path d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z"/></svg>Line Pulse`;
      btn.style.cssText = `
        display: inline-flex; align-items: center; padding: 5px 12px;
        font-size: 14px; font-weight: 500; color: #fff; background: #238636;
        border: none; border-radius: 6px; cursor: pointer; margin-right: 8px;
      `;

      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const repo = getRepoInfo();
        if (!repo) return;

        // Remove existing results container
        const existingResults = document.getElementById('line-pulse-results');
        if (existingResults) existingResults.remove();

        const resultsContainer = createResultsContainer(btn);
        showLoading(resultsContainer);

        btn.disabled = true;
        btn.innerHTML = `<svg class="spinner" width="16" height="16" viewBox="0 0 16 16" fill="none" style="margin-right:6px"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" stroke-opacity="0.25"/><path d="M14 8a6 6 0 00-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>Analyzing...`;

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

          // Poll for result
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
          btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="margin-right:6px"><path d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z"/></svg>Line Pulse`;
        }
      });

      container.insertBefore(btn, codeButton);
    }

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
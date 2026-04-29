import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import { createApp, type App } from 'vue';
import ContentApp from '@/components/ContentApp.vue';
import { isRepoPage, findCodeButton } from '@/utils/repo';

export default defineContentScript({
  matches: ['*://github.com/*'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    let ui: Awaited<ReturnType<typeof createShadowRootUi<App>>> | null = null;
    let mounting = false;

    async function tryMount() {
      if (mounting || ui) return;
      if (!isRepoPage()) return;

      const codeButton = findCodeButton();
      if (!codeButton?.parentElement) return;

      mounting = true;
      try {
        const shadowUi = await createShadowRootUi(ctx, {
          name: 'line-pulse-ui',
          position: 'inline',
          anchor: codeButton,
          append: 'before',
          onMount(container, _shadow, host) {
            tuneToolbarLayout(codeButton, host);
            const app = createApp(ContentApp, { shadowHost: host });
            app.mount(container);
            return app;
          },
          onRemove(app) {
            app?.unmount();
          },
        });
        shadowUi.mount();
        ui = shadowUi;
      } finally {
        mounting = false;
      }
    }

    function cleanup() {
      if (ui) {
        ui.remove();
        ui = null;
      }
    }

    // Wait for the Code button to appear via MutationObserver.
    // Resolves immediately if the button already exists.
    function waitForCodeButton(signal: AbortSignal): Promise<void> {
      if (findCodeButton()) return Promise.resolve();

      return new Promise<void>((resolve) => {
        const observer = new MutationObserver(() => {
          if (findCodeButton()) {
            observer.disconnect();
            resolve();
          }
        });

        signal.addEventListener('abort', () => {
          observer.disconnect();
          resolve();
        });

        observer.observe(document.body, { childList: true, subtree: true });
      });
    }

    // On SPA navigation: clean up old UI, wait for Code button, then mount
    ctx.addEventListener(window, 'wxt:locationchange', () => {
      cleanup();
      const abortController = new AbortController();

      // Abort the observer if another navigation happens before mount
      const onNextNav = () => {
        abortController.abort();
        window.removeEventListener('wxt:locationchange', onNextNav);
      };
      window.addEventListener('wxt:locationchange', onNextNav);

      waitForCodeButton(abortController.signal).then(() => {
        window.removeEventListener('wxt:locationchange', onNextNav);
        if (!abortController.signal.aborted) {
          tryMount();
        }
      });
    });

    // Initial mount
    if (document.readyState === 'loading') {
      await new Promise<void>((r) => document.addEventListener('DOMContentLoaded', () => r()));
    }
    await waitForCodeButton(ctx.signal);
    tryMount();
  },
});

function tuneToolbarLayout(codeButton: HTMLButtonElement, host: HTMLElement) {
  host.style.display = 'inline-flex';
  host.style.flex = '0 0 auto';
  host.style.minWidth = 'max-content';
  host.style.maxWidth = 'max-content';
  host.style.whiteSpace = 'nowrap';

  const toolbar = codeButton.parentElement;
  if (!toolbar) return;

  toolbar.style.flexWrap = 'nowrap';
  toolbar.style.minWidth = '0';

  const searchArea = host.previousElementSibling;
  if (searchArea instanceof HTMLElement) {
    searchArea.style.flex = '1 1 auto';
    searchArea.style.minWidth = '0';
  }
}

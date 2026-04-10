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
            host.style.display = 'inline';
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

    // WXT built-in SPA navigation detection (patches history.pushState/replaceState)
    ctx.addEventListener(window, 'wxt:locationchange', () => {
      cleanup();
      // GitHub renders progressively after navigation — the Code button
      // may not exist yet. Retry a few times with increasing delays.
      let attempts = 0;
      const maxAttempts = 5;
      function retryMount() {
        if (ui || attempts >= maxAttempts) return;
        attempts++;
        tryMount().then(() => {
          if (!ui) setTimeout(retryMount, attempts * 200);
        });
      }
      retryMount();
    });

    // Initial mount
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => tryMount());
    } else {
      tryMount();
    }
  },
});

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
    let lastUrl = location.href;

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

    function checkNavigation() {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        cleanup();
      }
    }

    // Debounced MutationObserver for GitHub SPA navigation
    let timer: ReturnType<typeof setTimeout> | null = null;
    new MutationObserver(() => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        checkNavigation();
        if (!ui) tryMount();
      }, 200);
    }).observe(document.body, { childList: true, subtree: true });

    // Initial mount
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => tryMount());
    } else {
      tryMount();
    }
  },
});

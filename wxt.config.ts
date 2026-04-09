import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    name: 'GitHub Line Pulse',
    description: 'Quickly count GitHub repo lines of code',
    permissions: ['activeTab', 'storage'],
    host_permissions: [
      'https://codeload.github.com/*',
    ],
  },
});
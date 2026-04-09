import { createApp } from 'vue';
import App from './App.vue';

// Initialize the app
createApp(App).mount('#app');

// Declare WASM module
declare global {
  interface Window {
    linePulseWasm: {
      analyze_code: (filesJson: string) => string;
    };
  }
}
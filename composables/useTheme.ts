import { ref, onMounted, onUnmounted } from 'vue';

/**
 * Reactive dark-mode detection.
 * Theme colors are defined in assets/tailwind.css via @theme and
 * dark-mode overrides, so components simply use `bg-lp-bg`, `text-lp-fg`, etc.
 * This composable only exposes `isDark` for the rare case a component
 * needs to branch logic (not styles) on the theme.
 */
export function useTheme() {
  const isDark = ref(window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);

  let mql: MediaQueryList | null = null;
  const handler = (e: MediaQueryListEvent) => { isDark.value = e.matches; };

  onMounted(() => {
    mql = window.matchMedia('(prefers-color-scheme: dark)');
    mql.addEventListener('change', handler);
  });

  onUnmounted(() => {
    mql?.removeEventListener('change', handler);
  });

  return { isDark };
}

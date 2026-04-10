import { onUnmounted } from 'vue';

/**
 * Manages click-outside detection for Shadow DOM elements.
 * Uses `composedPath()` to correctly detect clicks that cross the shadow boundary.
 */
export function useClickOutside(
  getHost: () => HTMLElement,
  onClickOutside: () => void,
) {
  let handler: ((e: MouseEvent) => void) | null = null;

  function register() {
    if (handler) return;
    handler = (e: MouseEvent) => {
      const path = e.composedPath();
      if (!path.includes(getHost())) {
        onClickOutside();
      }
    };
    // Defer to avoid catching the triggering click in the same event loop tick
    setTimeout(() => {
      if (handler) document.addEventListener('click', handler);
    }, 0);
  }

  function unregister() {
    if (handler) {
      document.removeEventListener('click', handler);
      handler = null;
    }
  }

  onUnmounted(unregister);

  return { register, unregister };
}

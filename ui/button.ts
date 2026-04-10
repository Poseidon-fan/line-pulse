import type { AnalyzeRequest } from '@/utils/types';

let styleInjected = false;

function injectGlobalStyles(): void {
  if (styleInjected) return;
  styleInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes lp-spin { to { transform: rotate(360deg); } }
    #line-pulse-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(35, 134, 54, 0.4) !important;
    }
  `;
  document.head.appendChild(style);
}

const BUTTON_SVG = `
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="margin-right: 6px;">
    <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" fill="none"/>
    <path d="M8 4v4l3 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`;

const SPINNER_SVG = `
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="margin-right: 6px; animation: lp-spin 0.8s linear infinite;">
    <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" stroke-opacity="0.25"/>
    <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>
`;

// GitHub reserved top-level paths that aren't user/org names
const GITHUB_RESERVED = new Set([
  'settings', 'organizations', 'orgs', 'about', 'features',
  'security', 'pricing', 'enterprise', 'team', 'customer-stories',
  'readme', 'explore', 'topics', 'trending', 'collections',
  'events', 'sponsors', 'login', 'join', 'new', 'notifications',
  'marketplace', 'codespaces', 'issues', 'pulls', 'discussions',
  'search', 'stars', 'dashboard', 'watching', 'account',
]);

export function isRepoPage(): boolean {
  const match = window.location.pathname.match(/^\/([^/]+)\/[^/]+$/);
  return !!match && !GITHUB_RESERVED.has(match[1]);
}

export function getRepoInfo(): AnalyzeRequest | null {
  const match = window.location.pathname.match(/^\/([^/]+)\/([^/]+)$/);
  if (!match || GITHUB_RESERVED.has(match[1])) return null;
  return { owner: match[1], repo: match[2] };
}

export function createLinePulseButton(): HTMLButtonElement {
  injectGlobalStyles();

  const btn = document.createElement('button');
  btn.id = 'line-pulse-btn';
  btn.innerHTML = `${BUTTON_SVG}<span>Line Pulse</span>`;
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

  return btn;
}

export function injectButton(btn: HTMLButtonElement): boolean {
  const codeButton = Array.from(document.querySelectorAll('button')).find((el) => {
    const text = el.textContent?.trim();
    return text === 'Code' || el.getAttribute('aria-label') === 'Code';
  });

  const container = codeButton?.parentElement;
  if (!container) return false;

  container.insertBefore(btn, codeButton);
  return true;
}

export function setButtonLoading(btn: HTMLButtonElement): void {
  btn.disabled = true;
  btn.innerHTML = `${SPINNER_SVG}<span>Analyzing...</span>`;
}

export function resetButton(btn: HTMLButtonElement): void {
  btn.disabled = false;
  btn.innerHTML = `${BUTTON_SVG}<span>Line Pulse</span>`;
}

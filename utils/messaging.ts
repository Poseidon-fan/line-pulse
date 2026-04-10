import type { BackgroundMessage, ContentMessage } from './types';

type MessageType = BackgroundMessage['type'] | ContentMessage['type'];

type MessageByType<T extends MessageType> =
  T extends 'analyze-repo' ? BackgroundMessage :
  T extends 'analysis-result' ? ContentMessage :
  never;

export function sendToBackground(message: BackgroundMessage): void {
  browser.runtime.sendMessage(message);
}

export function sendToTab(tabId: number, message: ContentMessage): void {
  browser.tabs.sendMessage(tabId, message).catch((err) => {
    console.warn('[Line Pulse] Could not send result to tab:', err);
  });
}

export function onMessage<T extends MessageType>(
  type: T,
  handler: (message: MessageByType<T>, tabId?: number) => void,
): () => void {
  const listener = (
    msg: BackgroundMessage | ContentMessage,
    sender: Browser.runtime.MessageSender,
  ) => {
    if (msg?.type === type) {
      handler(msg as MessageByType<T>, sender?.tab?.id);
    }
    return true;
  };
  browser.runtime.onMessage.addListener(listener);
  return () => browser.runtime.onMessage.removeListener(listener);
}

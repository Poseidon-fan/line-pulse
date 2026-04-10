export const githubToken = storage.defineItem<string>('local:githubToken', {
  fallback: '',
});

export const analysisTimeout = storage.defineItem<number>('local:analysisTimeout', {
  fallback: 30,
});

export type KraiteAppState = 'active' | 'background' | 'inactive' | 'unknown' | 'extension';

export function shouldAutoRefresh(enabled: boolean, appState: KraiteAppState, focused = true): boolean {
  return enabled && appState === 'active' && focused;
}

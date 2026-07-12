import { useEffect } from 'react';
import { installSafeAreaListeners } from '../lib/safeArea';

export function useSafeAreaInsets() {
  useEffect(() => installSafeAreaListeners(), []);
}

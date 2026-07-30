import { createNavigationContainerRef } from '@react-navigation/native';

import { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

let dashboardPending = false;

export function openDashboard(): void {
  if (!navigationRef.isReady()) {
    dashboardPending = true;
    return;
  }

  dashboardPending = false;
  navigationRef.navigate('Tabs', { screen: 'Dashboard' });
}

export function flushPendingDashboardNavigation(): void {
  if (dashboardPending) openDashboard();
}

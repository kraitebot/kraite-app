import { createNavigationContainerRef } from '@react-navigation/native';

import { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

type PendingDestination = 'Dashboard' | 'Notifications';

let pendingDestination: PendingDestination | null = null;

function navigate(destination: PendingDestination): void {
  if (!navigationRef.isReady()) {
    pendingDestination = destination;
    return;
  }

  pendingDestination = null;

  if (destination === 'Dashboard') {
    navigationRef.navigate('Tabs', { screen: 'Dashboard' });
    return;
  }

  navigationRef.navigate('Notifications');
}

export function openDashboard(): void {
  navigate('Dashboard');
}

export function openNotifications(): void {
  navigate('Notifications');
}

export function flushPendingNavigation(): void {
  if (pendingDestination) navigate(pendingDestination);
}

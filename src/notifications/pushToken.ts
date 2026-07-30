import * as SecureStore from 'expo-secure-store';

const EXPO_PUSH_TOKEN_KEY = 'kraite.expoPushToken';

export async function getStoredExpoPushToken(): Promise<string | null> {
  return SecureStore.getItemAsync(EXPO_PUSH_TOKEN_KEY);
}

export async function storeExpoPushToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(EXPO_PUSH_TOKEN_KEY, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function clearStoredExpoPushToken(): Promise<void> {
  await SecureStore.deleteItemAsync(EXPO_PUSH_TOKEN_KEY);
}

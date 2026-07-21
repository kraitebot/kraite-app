import { Platform } from 'react-native';

export const fonts = {
  display: 'SpaceGrotesk_700Bold',
  medium: 'SpaceGrotesk_600SemiBold',
  regular: 'SpaceGrotesk_400Regular',
  mono: 'IBMPlexMono_500Medium',
  monoBold: 'IBMPlexMono_600SemiBold',
  fallbackMono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
};

export const spacing = (n: number): number => n * 8;

export const radius = {
  hero: 30,
  card: 22,
  control: 16,
  pill: 999,
};

import { Image, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/tokens';

export function Logo({ compact = false, inverse = false }: { compact?: boolean; inverse?: boolean }) {
  const { palette } = useTheme();
  return (
    <View style={styles.row} accessibilityLabel="Kraite">
      <Image source={require('../../assets/mark.png')} style={[styles.mark, compact && styles.markCompact]} />
      {!compact ? <Text style={[styles.word, { color: inverse ? '#FFFFFF' : palette.text }]}>Kraite</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { width: 38, height: 38, resizeMode: 'contain' },
  markCompact: { width: 31, height: 31 },
  word: { fontFamily: fonts.display, fontSize: 24, letterSpacing: -0.8 },
});

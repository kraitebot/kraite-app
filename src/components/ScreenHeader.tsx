import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../auth/AuthContext';
import { traderInitials } from '../auth/identity';
import { useTheme } from '../theme/ThemeContext';
import { fonts, spacing } from '../theme/tokens';
import { Logo } from './Logo';

/**
 * The bar every trader surface opens with: brand, theme toggle, and the
 * signed-in trader's initials. Each screen previously carried its own identical
 * copy of this markup and its five style rules, so a change to the avatar or
 * toggle had to be repeated four times to stay consistent.
 */
export function ScreenHeader() {
  const { palette, toggle } = useTheme();
  const { user } = useAuth();

  return (
    <View style={styles.topbar}>
      <Logo />
      <View style={styles.topActions}>
        <Pressable
          onPress={toggle}
          accessibilityRole="button"
          accessibilityLabel="Toggle color theme"
          style={[styles.iconButton, { backgroundColor: palette.panel, borderColor: palette.line }]}
        >
          <Ionicons name={palette.dark ? 'sunny-outline' : 'moon-outline'} size={19} color={palette.text} />
        </Pressable>
        <View style={[styles.avatar, { backgroundColor: palette.greenSoft }]}>
          <Text style={[styles.avatarText, { color: palette.green }]}>{traderInitials(user?.name)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: spacing(1) },
  iconButton: { width: 42, height: 42, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.monoBold, fontSize: 12 },
});

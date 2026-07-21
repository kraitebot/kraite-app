import { Ionicons } from '@expo/vector-icons';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../auth/AuthContext';
import { PASSKEYS_ENABLED } from '../auth/passkeys';
import { Logo } from '../components/Logo';
import { RootStackParamList, TabParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, spacing } from '../theme/tokens';
import { useScreenTransition } from '../transitions/ScreenTransitionContext';

type MoreNavigation = CompositeNavigationProp<BottomTabNavigationProp<TabParamList, 'More'>, NativeStackNavigationProp<RootStackParamList>>;

export function MoreScreen() {
  const navigation = useNavigation<MoreNavigation>();
  const insets = useSafeAreaInsets();
  const { palette, toggle } = useTheme();
  const { user, logout } = useAuth();
  const { runTransition } = useScreenTransition();

  const row = (title: string, subtitle: string, icon: keyof typeof Ionicons.glyphMap, onPress: () => void) => (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, { borderColor: palette.line, backgroundColor: palette.panel }, pressed && { opacity: 0.72 }]}>
      <View style={[styles.rowIcon, { backgroundColor: palette.greenSoft }]}><Ionicons name={icon} size={21} color={palette.green} /></View>
      <View style={styles.rowCopy}><Text style={[styles.rowTitle, { color: palette.text }]}>{title}</Text><Text style={[styles.rowSubtitle, { color: palette.textSoft }]}>{subtitle}</Text></View>
      <Ionicons name="chevron-forward" size={18} color={palette.textFaint} />
    </Pressable>
  );

  return (
    <View style={[styles.screen, { backgroundColor: palette.canvas, paddingTop: insets.top + spacing(2) }]}>
      <Logo />
      <Text style={[styles.eyebrow, { color: palette.green }]}>TRADER CONTROL</Text>
      <Text style={[styles.title, { color: palette.text }]}>More</Text>
      <Text style={[styles.identity, { color: palette.textSoft }]}>{user?.name ?? 'Trader'} · {user?.email || 'Secure session'}</Text>
      <View style={styles.rows}>
        {row('Billing', 'Wallet and subscription', 'card-outline', () => { void runTransition(() => navigation.navigate('Billing')); })}
        {row('Profile', 'Identity and security', 'person-outline', () => { void runTransition(() => navigation.navigate('Profile')); })}
        {PASSKEYS_ENABLED ? row('Passkeys', 'Face ID and passwordless sign-in', 'finger-print-outline', () => { void runTransition(() => navigation.navigate('Passkeys')); }) : null}
        {row('Appearance', palette.dark ? 'Switch to light theme' : 'Switch to dark theme', palette.dark ? 'sunny-outline' : 'moon-outline', toggle)}
      </View>
      <Pressable onPress={() => { void runTransition(logout); }} style={[styles.logout, { borderColor: palette.redSoft }]}>
        <Ionicons name="log-out-outline" size={20} color={palette.red} />
        <Text style={[styles.logoutText, { color: palette.red }]}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: spacing(2.5) },
  eyebrow: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 2, marginTop: spacing(3.5) },
  title: { fontFamily: fonts.display, fontSize: 39, letterSpacing: -1.6, marginTop: 3 },
  identity: { fontFamily: fonts.regular, fontSize: 14, marginTop: spacing(0.5) },
  rows: { gap: spacing(1), marginTop: spacing(3) },
  row: { borderWidth: 1, borderRadius: radius.card, padding: spacing(1.5), minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: spacing(1.25) },
  rowIcon: { width: 43, height: 43, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: fonts.medium, fontSize: 16 },
  rowSubtitle: { fontFamily: fonts.regular, fontSize: 13 },
  logout: { borderWidth: 1, borderRadius: radius.control, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing(1), marginTop: spacing(2) },
  logoutText: { fontFamily: fonts.medium, fontSize: 15 },
});

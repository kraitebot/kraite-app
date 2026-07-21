import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '../components/Logo';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, spacing } from '../theme/tokens';
import { useScreenTransition } from '../transitions/ScreenTransitionContext';

type IconName = keyof typeof Ionicons.glyphMap;

export function PlaceholderScreen({ title, icon, onBack }: { title: string; icon: IconName; onBack?: () => void }) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { backgroundColor: palette.canvas, paddingTop: insets.top + spacing(2) }]}>
      <View style={styles.topbar}>
        <Logo />
        {onBack ? <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Go back" style={[styles.back, { backgroundColor: palette.panel, borderColor: palette.line }]}><Ionicons name="arrow-back" size={20} color={palette.text} /></Pressable> : null}
      </View>
      <View style={styles.content}>
        <View style={[styles.icon, { backgroundColor: palette.greenSoft }]}><Ionicons name={icon} size={29} color={palette.green} /></View>
        <Text style={[styles.eyebrow, { color: palette.green }]}>NEXT MODULE</Text>
        <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
        <Text style={[styles.body, { color: palette.textSoft }]}>Structure ready. This area joins the live Kraite data flow in the next focused build.</Text>
        <View style={[styles.rule, { backgroundColor: palette.line }]}><View style={[styles.ruleActive, { backgroundColor: palette.green }]} /></View>
      </View>
    </View>
  );
}

export function StackPlaceholder({ route }: NativeStackScreenProps<RootStackParamList, 'Billing' | 'Profile'>) {
  const { runTransition } = useScreenTransition();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return <PlaceholderScreen title={route.name} icon={route.name === 'Billing' ? 'card-outline' : 'person-outline'} onBack={() => { void runTransition(() => navigation.goBack()); }} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: spacing(2.5) },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 42, height: 42, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, justifyContent: 'center', paddingBottom: spacing(9) },
  icon: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: spacing(2.5) },
  eyebrow: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 2 },
  title: { fontFamily: fonts.display, fontSize: 42, letterSpacing: -1.8, marginTop: spacing(0.75) },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, marginTop: spacing(1.25), maxWidth: 330 },
  rule: { height: 5, borderRadius: radius.pill, overflow: 'hidden', marginTop: spacing(3), width: 180 },
  ruleActive: { width: 54, height: '100%' },
});

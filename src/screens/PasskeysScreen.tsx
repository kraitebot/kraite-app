import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '../api/client';
import { PasskeySummary } from '../api/types';
import { deletePasskey, listPasskeys, registerPasskey } from '../auth/passkeys';
import { isPasskeyCancellation, passkeyErrorMessage } from '../auth/passkeyPresentation';
import { Logo } from '../components/Logo';
import { NoticeOverlay } from '../components/ScreenState';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, spacing } from '../theme/tokens';
import { useScreenTransition } from '../transitions/ScreenTransitionContext';

function passkeyDate(value: string | null): string {
  if (!value) return 'Never used';
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

export function PasskeysScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const { runTransition } = useScreenTransition();
  const [passkeys, setPasskeys] = useState<PasskeySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'error' | 'success'; title: string; message: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await listPasskeys();
      setPasskeys(response.data);
    } catch (caught) {
      setNotice({
        tone: 'error',
        title: 'Passkeys unavailable',
        message: caught instanceof ApiError ? caught.message : 'Kraite could not load your passkeys.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    void load();
  }, [load]));

  const create = async () => {
    setBusy(true);
    try {
      const response = await registerPasskey();
      setPasskeys((current) => [response.data, ...current]);
      setNotice({ tone: 'success', title: 'Passkey ready', message: 'You can now sign in to Kraite without your password.' });
    } catch (caught) {
      if (!isPasskeyCancellation(caught)) {
        setNotice({ tone: 'error', title: 'Passkey not created', message: passkeyErrorMessage(caught) });
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = (passkey: PasskeySummary) => {
    Alert.alert(
      'Remove passkey?',
      `${passkey.name} will no longer sign in to Kraite.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void deletePasskey(passkey.id)
              .then(() => {
                setPasskeys((current) => current.filter(({ id }) => id !== passkey.id));
                setNotice({ tone: 'success', title: 'Passkey removed', message: `${passkey.name} can no longer sign in.` });
              })
              .catch((caught) => setNotice({
                tone: 'error',
                title: 'Could not remove passkey',
                message: caught instanceof ApiError ? caught.message : 'Please try again.',
              }));
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: palette.canvas, paddingTop: insets.top + spacing(2) }]}>
      <View style={styles.topbar}>
        <Logo />
        <Pressable
          onPress={() => { void runTransition(() => navigation.goBack()); }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={[styles.back, { backgroundColor: palette.panel, borderColor: palette.line }]}
        >
          <Ionicons name="arrow-back" size={20} color={palette.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing(3) }]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.eyebrow, { color: palette.green }]}>IDENTITY · SECURITY</Text>
        <Text style={[styles.title, { color: palette.text }]}>Passkeys</Text>
        <Text style={[styles.intro, { color: palette.textSoft }]}>Sign in securely with Face ID, your device passcode, or another trusted passkey. No password required.</Text>

        <Pressable
          disabled={busy}
          onPress={() => { void create(); }}
          style={({ pressed }) => [styles.add, { backgroundColor: palette.green }, (pressed || busy) && styles.pressed]}
        >
          {busy ? <ActivityIndicator color="#07100D" /> : <Ionicons name="add" size={22} color="#07100D" />}
          <Text style={styles.addText}>{busy ? 'Creating passkey…' : 'Add passkey'}</Text>
        </Pressable>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionLabel, { color: palette.textSoft }]}>YOUR PASSKEYS</Text>
          <Text style={[styles.count, { color: palette.textFaint }]}>{passkeys.length}</Text>
        </View>

        {loading ? (
          <View style={styles.loading}><ActivityIndicator color={palette.green} /></View>
        ) : passkeys.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: palette.panel, borderColor: palette.line }]}>
            <Ionicons name="key-outline" size={30} color={palette.textFaint} />
            <Text style={[styles.emptyTitle, { color: palette.text }]}>No passkeys yet</Text>
            <Text style={[styles.emptyBody, { color: palette.textSoft }]}>Add one above to make your next sign-in faster.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {passkeys.map((passkey) => (
              <View key={passkey.id} style={[styles.item, { backgroundColor: palette.panel, borderColor: palette.line }]}>
                <View style={[styles.itemIcon, { backgroundColor: palette.greenSoft }]}><Ionicons name="finger-print-outline" size={24} color={palette.green} /></View>
                <View style={styles.itemCopy}>
                  <Text style={[styles.itemTitle, { color: palette.text }]}>{passkey.name}</Text>
                  <Text style={[styles.itemMeta, { color: palette.textSoft }]}>Added {passkeyDate(passkey.created_at)} · {passkey.last_used_at ? `Used ${passkeyDate(passkey.last_used_at)}` : 'Never used'}</Text>
                </View>
                <Pressable
                  onPress={() => remove(passkey)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${passkey.name}`}
                  style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
                >
                  <Ionicons name="trash-outline" size={19} color={palette.red} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.note, { backgroundColor: palette.canvasRaised }]}>
          <Ionicons name="lock-closed-outline" size={18} color={palette.green} />
          <Text style={[styles.noteText, { color: palette.textSoft }]}>Kraite stores only the public credential. Face ID and biometric data never leave your device.</Text>
        </View>
      </ScrollView>

      {notice ? <NoticeOverlay {...notice} onDismiss={() => setNotice(null)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: spacing(2.5) },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 42, height: 42, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingTop: spacing(3.5) },
  eyebrow: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 2 },
  title: { fontFamily: fonts.display, fontSize: 40, letterSpacing: -1.7, marginTop: 3 },
  intro: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 23, maxWidth: 360, marginTop: spacing(1) },
  add: { minHeight: 56, borderRadius: radius.control, marginTop: spacing(2.5), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing(1) },
  addText: { fontFamily: fonts.medium, color: '#07100D', fontSize: 15 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing(3), marginBottom: spacing(1.25) },
  sectionLabel: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 1.6 },
  count: { fontFamily: fonts.monoBold, fontSize: 11 },
  loading: { minHeight: 140, alignItems: 'center', justifyContent: 'center' },
  empty: { minHeight: 180, borderWidth: 1, borderRadius: radius.card, alignItems: 'center', justifyContent: 'center', padding: spacing(2) },
  emptyTitle: { fontFamily: fonts.medium, fontSize: 17, marginTop: spacing(1) },
  emptyBody: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, marginTop: 4, textAlign: 'center' },
  list: { gap: spacing(1) },
  item: { minHeight: 82, borderWidth: 1, borderRadius: radius.card, padding: spacing(1.25), flexDirection: 'row', alignItems: 'center', gap: spacing(1.25) },
  itemIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  itemCopy: { flex: 1, gap: 3 },
  itemTitle: { fontFamily: fonts.medium, fontSize: 15 },
  itemMeta: { fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 17 },
  remove: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  note: { borderRadius: radius.control, flexDirection: 'row', gap: spacing(1), padding: spacing(1.5), marginTop: spacing(2.5) },
  noteText: { flex: 1, fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 18 },
  pressed: { opacity: 0.62 },
});

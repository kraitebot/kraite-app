import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '../api/client';
import { PasskeySummary } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { traderInitials } from '../auth/identity';
import { deletePasskey, isPasskeySupported, listPasskeys, registerPasskey } from '../auth/passkeys';
import {
  isPasskeyCancellation,
  passkeyDate,
  passkeyErrorMessage,
  passkeyUsage,
} from '../auth/passkeyPresentation';
import { FaceIdIcon } from '../components/FaceIdIcon';
import { Logo } from '../components/Logo';
import { NoticeOverlay } from '../components/ScreenState';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, spacing } from '../theme/tokens';
import { useScreenTransition } from '../transitions/ScreenTransitionContext';

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const { runTransition } = useScreenTransition();
  const { user, completePasskeyInvite } = useAuth();
  const [supported] = useState(() => isPasskeySupported());
  const [passkeys, setPasskeys] = useState<PasskeySummary[]>([]);
  const [loading, setLoading] = useState(supported);
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
    // A device that cannot hold passkeys has nothing to fetch, and asking would
    // only surface a failure the trader can do nothing about.
    if (!supported) return;
    setLoading(true);
    void load();
  }, [load, supported]));

  const create = async () => {
    setBusy(true);
    try {
      const response = await registerPasskey();
      setPasskeys((current) => [response.data, ...current]);
      setNotice({ tone: 'success', title: 'Face ID ready', message: 'You can now sign in to Kraite without your password.' });
      // Keeps the post-login upsell from reappearing for someone who already set
      // one up here. Deliberately not awaited into the catch below: the passkey
      // already exists on the server, so a failure to record the dismissal must
      // not report back as "Passkey not created".
      void completePasskeyInvite().catch(() => undefined);
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
        <Text style={[styles.eyebrow, { color: palette.green }]}>TRADER · IDENTITY</Text>
        <Text style={[styles.title, { color: palette.text }]}>Profile</Text>

        <View style={[styles.identity, { backgroundColor: palette.panel, borderColor: palette.line }]}>
          <View style={[styles.avatar, { backgroundColor: palette.greenSoft }]}>
            <Text style={[styles.avatarText, { color: palette.green }]}>{traderInitials(user?.name)}</Text>
          </View>
          <View style={styles.identityCopy}>
            <Text style={[styles.identityName, { color: palette.text }]}>{user?.name ?? 'Trader'}</Text>
            <Text style={[styles.identityEmail, { color: palette.textSoft }]}>{user?.email || 'Secure session'}</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionLabel, { color: palette.textSoft }]}>FACE ID & PASSKEYS</Text>
          {supported ? <Text style={[styles.count, { color: palette.textFaint }]}>{passkeys.length}</Text> : null}
        </View>

        {supported ? (
          <>
            <Text style={[styles.intro, { color: palette.textSoft }]}>Sign in with Face ID, your device passcode, or another trusted passkey. No password required.</Text>

            <Pressable
              disabled={busy}
              onPress={() => { void create(); }}
              style={({ pressed }) => [styles.add, { backgroundColor: palette.green }, (pressed || busy) && styles.pressed]}
            >
              {busy ? <ActivityIndicator color="#07100D" /> : <Ionicons name="add" size={22} color="#07100D" />}
              <Text style={styles.addText}>{busy ? 'Creating passkey…' : 'Add passkey'}</Text>
            </Pressable>

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
                    <View style={[styles.itemIcon, { backgroundColor: palette.greenSoft }]}>
                      <FaceIdIcon size={24} color={palette.green} />
                    </View>
                    <View style={styles.itemCopy}>
                      <Text style={[styles.itemTitle, { color: palette.text }]}>{passkey.name}</Text>
                      <Text style={[styles.itemMeta, { color: palette.textSoft }]}>Added {passkeyDate(passkey.created_at)} · {passkeyUsage(passkey.last_used_at)}</Text>
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
          </>
        ) : (
          <View style={[styles.empty, { backgroundColor: palette.panel, borderColor: palette.line }]}>
            <Ionicons name="phone-portrait-outline" size={30} color={palette.textFaint} />
            <Text style={[styles.emptyTitle, { color: palette.text }]}>Face ID isn’t available here</Text>
            <Text style={[styles.emptyBody, { color: palette.textSoft }]}>This iPhone can’t create Kraite passkeys. Your email and password still sign you in.</Text>
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
  identity: { minHeight: 88, borderWidth: 1, borderRadius: radius.card, padding: spacing(1.5), marginTop: spacing(2), flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) },
  avatar: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.monoBold, fontSize: 15 },
  identityCopy: { flex: 1, gap: 4 },
  identityName: { fontFamily: fonts.display, fontSize: 20, letterSpacing: -0.5 },
  identityEmail: { fontFamily: fonts.regular, fontSize: 13.5 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing(3), marginBottom: spacing(1) },
  sectionLabel: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 1.6 },
  count: { fontFamily: fonts.monoBold, fontSize: 11 },
  intro: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, marginBottom: spacing(1.5) },
  add: { minHeight: 56, borderRadius: radius.control, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing(1) },
  addText: { fontFamily: fonts.medium, color: '#07100D', fontSize: 15 },
  loading: { minHeight: 140, alignItems: 'center', justifyContent: 'center' },
  empty: { minHeight: 180, borderWidth: 1, borderRadius: radius.card, alignItems: 'center', justifyContent: 'center', padding: spacing(2), marginTop: spacing(1.5) },
  emptyTitle: { fontFamily: fonts.medium, fontSize: 17, marginTop: spacing(1), textAlign: 'center' },
  emptyBody: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, marginTop: 4, textAlign: 'center' },
  list: { gap: spacing(1), marginTop: spacing(1.5) },
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

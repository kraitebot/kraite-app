import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import { useAuth } from '../auth/AuthContext';
import { registerPasskey } from '../auth/passkeys';
import { isPasskeyCancellation, passkeyErrorMessage } from '../auth/passkeyPresentation';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, spacing } from '../theme/tokens';

export function PasskeyInvite() {
  const { palette } = useTheme();
  const { passkeyInvitePending, dismissPasskeyInvite, completePasskeyInvite } = useAuth();
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    try {
      await registerPasskey();
      await completePasskeyInvite();
    } catch (caught) {
      if (!isPasskeyCancellation(caught)) {
        Alert.alert('Passkey not created', passkeyErrorMessage(caught));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent
      statusBarTranslucent
      visible={passkeyInvitePending}
      onRequestClose={() => { if (!busy) void dismissPasskeyInvite(); }}
    >
      <View style={styles.layer}>
        <View style={[styles.card, { backgroundColor: palette.panel, borderColor: palette.lineStrong }]}>
          <View style={[styles.icon, { backgroundColor: palette.greenSoft }]}>
            <Ionicons name="finger-print-outline" size={34} color={palette.green} />
          </View>
          <Text style={[styles.eyebrow, { color: palette.green }]}>FASTER · PASSWORDLESS</Text>
          <Text style={[styles.title, { color: palette.text }]}>Use Face ID next time</Text>
          <Text style={[styles.body, { color: palette.textSoft }]}>Create a Kraite passkey for faster sign-in with Face ID, your device passcode, or another trusted passkey.</Text>

          <View style={[styles.privacy, { backgroundColor: palette.canvasRaised }]}>
            <Ionicons name="shield-checkmark-outline" size={18} color={palette.green} />
            <Text style={[styles.privacyText, { color: palette.textSoft }]}>Your biometric data stays on your device. Kraite never receives it.</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Set up a Kraite passkey"
            disabled={busy}
            onPress={() => { void create(); }}
            style={({ pressed }) => [styles.primary, { backgroundColor: palette.green }, (pressed || busy) && styles.pressed]}
          >
            {busy ? <ActivityIndicator color="#07100D" /> : <Ionicons name="finger-print" size={22} color="#07100D" />}
            <Text style={styles.primaryText}>{busy ? 'Creating passkey…' : 'Set up passkey'}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => { void dismissPasskeyInvite(); }}
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
          >
            <Text style={[styles.secondaryText, { color: palette.textSoft }]}>Not now</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  layer: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.72)', justifyContent: 'flex-end', padding: spacing(2) },
  card: { borderWidth: 1, borderRadius: radius.hero, padding: spacing(2.5), paddingTop: spacing(3), alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.4, shadowRadius: 35 },
  icon: { width: 68, height: 68, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginBottom: spacing(2) },
  eyebrow: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 1.8 },
  title: { fontFamily: fonts.display, fontSize: 29, letterSpacing: -1, textAlign: 'center', marginTop: spacing(0.75) },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: spacing(1), maxWidth: 350 },
  privacy: { width: '100%', borderRadius: radius.control, flexDirection: 'row', alignItems: 'center', gap: spacing(1), padding: spacing(1.25), marginTop: spacing(2) },
  privacyText: { flex: 1, fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 18 },
  primary: { width: '100%', minHeight: 56, borderRadius: radius.control, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing(1), marginTop: spacing(2) },
  primaryText: { fontFamily: fonts.medium, color: '#07100D', fontSize: 15 },
  secondary: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing(2) },
  secondaryText: { fontFamily: fonts.medium, fontSize: 14 },
  pressed: { opacity: 0.62 },
});

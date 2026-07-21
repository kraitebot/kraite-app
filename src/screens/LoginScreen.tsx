import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { authenticateWithPasskey, isPasskeySupported } from '../auth/passkeys';
import { isPasskeyCancellation, passkeyErrorMessage } from '../auth/passkeyPresentation';
import { legalLinks } from '../components/legalLinks';
import { Logo } from '../components/Logo';
import { NoticeOverlay } from '../components/ScreenState';
import { SwipeAuthenticate } from '../components/SwipeAuthenticate';
import { fonts, radius, spacing } from '../theme/tokens';
import { useScreenTransition } from '../transitions/ScreenTransitionContext';

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { authenticate, activateSession } = useAuth();
  const { runTransition } = useScreenTransition();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passkeySupported] = useState(() => isPasskeySupported());

  const submit = async (): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      const session = await authenticate(email, password);
      await runTransition(() => activateSession(session, true));
      return true;
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to connect to Kraite.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const usePasskey = async () => {
    setPasskeyBusy(true);
    setError(null);
    try {
      const session = await authenticateWithPasskey();
      await runTransition(() => activateSession(session));
    } catch (caught) {
      if (!isPasskeyCancellation(caught)) {
        setError(caught instanceof ApiError ? caught.message : passkeyErrorMessage(caught));
      }
    } finally {
      setPasskeyBusy(false);
    }
  };

  const disabled = busy || passkeyBusy || !email.includes('@') || password.length === 0;
  const openSupport = () => {
    void Linking.openURL('mailto:support@kraite.com').catch(() => undefined);
  };
  const openLegalPage = (url: string) => {
    void Linking.openURL(url).catch(() => undefined);
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <LinearGradient colors={['#06110D', '#0A251A', '#07100D']} style={StyleSheet.absoluteFill} />
      <View style={styles.glowTop} />
      <View style={styles.grid} pointerEvents="none">
        {Array.from({ length: 9 }).map((_, index) => <View key={index} style={styles.gridLine} />)}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView
          bounces={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing(2.5), paddingBottom: spacing(2.5) }]}
        >
          <View>
            <Logo inverse />
            <Text style={styles.eyebrow}>QUANTUM CRYPTO BOT</Text>
            <Text style={styles.hero}>Your engine.{`\n`}In your pocket.</Text>
            <Text style={styles.intro}>A precise, read-only view of live portfolio health and every open position.</Text>
          </View>

          <View style={styles.panelGroup}>
            <Pressable
              onPress={openSupport}
              hitSlop={8}
              accessibilityRole="link"
              accessibilityLabel="Email Kraite support"
              accessibilityHint="Opens an email addressed to support@kraite.com"
              style={({ pressed }) => [styles.supportLink, pressed && styles.supportLinkPressed]}
            >
              <Ionicons name="mail-outline" size={14} color="#27E58A" />
              <Text style={styles.supportText}>Support</Text>
            </Pressable>

            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <View>
                  <Text style={styles.panelEyebrow}>TRADER ACCESS</Text>
                  <Text style={styles.panelTitle}>Sign in to Kraite</Text>
                </View>
                <View style={styles.securityBadge}><Ionicons name="shield-checkmark" size={19} color="#27E58A" /></View>
              </View>

              <View style={styles.fields}>
                <View style={styles.inputShell}>
                  <Ionicons name="mail-outline" size={19} color="#71877E" />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Email"
                    placeholderTextColor="#71877E"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    textContentType="username"
                    style={styles.input}
                  />
                </View>
                <View style={styles.inputShell}>
                  <Ionicons name="lock-closed-outline" size={19} color="#71877E" />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Password"
                    placeholderTextColor="#71877E"
                    secureTextEntry={!showPassword}
                    textContentType="password"
                    autoCapitalize="none"
                    returnKeyType="done"
                    style={styles.input}
                  />
                  <Pressable onPress={() => setShowPassword((visible) => !visible)} hitSlop={10} accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#71877E" />
                  </Pressable>
                </View>
              </View>

              <SwipeAuthenticate disabled={disabled} busy={busy} onAuthenticate={submit} />

              {passkeySupported ? <>
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Sign in with Face ID or a passkey"
                  disabled={busy || passkeyBusy}
                  onPress={() => { void usePasskey(); }}
                  style={({ pressed }) => [styles.passkey, (pressed || passkeyBusy) && styles.passkeyPressed]}
                >
                  {passkeyBusy ? <ActivityIndicator color="#10221B" /> : <Ionicons name="finger-print-outline" size={23} color="#10221B" />}
                  <Text style={styles.passkeyText}>{passkeyBusy ? 'Checking passkey…' : 'Use Face ID or passkey'}</Text>
                </Pressable>
              </> : null}

              <View style={styles.footerLinks}>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel="Terms of Service"
                  accessibilityHint="Opens the Kraite Terms of Service"
                  hitSlop={8}
                  onPress={() => openLegalPage(legalLinks.termsOfService)}
                  style={({ pressed }) => pressed && styles.footerLinkPressed}
                >
                  <Text style={styles.footerLinkText}>Terms of Service</Text>
                </Pressable>
                <View style={styles.footerSeparator} />
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel="Privacy Policy"
                  accessibilityHint="Opens the Kraite Privacy Policy"
                  hitSlop={8}
                  onPress={() => openLegalPage(legalLinks.privacyPolicy)}
                  style={({ pressed }) => pressed && styles.footerLinkPressed}
                >
                  <Text style={styles.footerLinkText}>Privacy Policy</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {error ? <NoticeOverlay
        tone="error"
        title="Sign-in failed"
        message={error}
        onDismiss={() => setError(null)}
      /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#07100D', overflow: 'hidden' },
  keyboard: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: spacing(2.5), justifyContent: 'space-between' },
  glowTop: { position: 'absolute', width: 360, height: 360, borderRadius: 180, backgroundColor: 'rgba(39,229,138,0.12)', top: -170, right: -120 },
  grid: { ...StyleSheet.absoluteFill, paddingHorizontal: 20, justifyContent: 'space-around', transform: [{ rotate: '-12deg' }], opacity: 0.2 },
  gridLine: { height: 1, backgroundColor: '#2C5A45' },
  eyebrow: { fontFamily: fonts.monoBold, color: '#27E58A', fontSize: 10, letterSpacing: 2.2, marginTop: spacing(3) },
  hero: { fontFamily: fonts.display, color: '#F4F8F6', fontSize: 43, lineHeight: 50, letterSpacing: -2.1, marginTop: spacing(1.5) },
  intro: { fontFamily: fonts.regular, color: '#91A69D', fontSize: 15, lineHeight: 24, maxWidth: 340, marginTop: spacing(2) },
  panelGroup: { gap: spacing(0.75) },
  supportLink: { minHeight: 28, alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 6 },
  supportLinkPressed: { opacity: 0.55 },
  supportText: { fontFamily: fonts.monoBold, color: '#B3C4BD', fontSize: 10, letterSpacing: 0.8, textDecorationLine: 'underline' },
  panel: { backgroundColor: '#F7FAF8', borderRadius: radius.hero, padding: spacing(2.25), gap: spacing(1.5), shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.35, shadowRadius: 35, elevation: 14 },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panelEyebrow: { fontFamily: fonts.monoBold, fontSize: 9, color: '#73877F', letterSpacing: 1.8 },
  panelTitle: { fontFamily: fonts.display, fontSize: 24, color: '#10221B', letterSpacing: -0.7, marginTop: 3 },
  securityBadge: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#DDF6E9', alignItems: 'center', justifyContent: 'center' },
  fields: { gap: spacing(1) },
  inputShell: { minHeight: 54, backgroundColor: '#EDF3F0', borderRadius: radius.control, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing(1.5), gap: spacing(1) },
  input: { flex: 1, fontFamily: fonts.medium, color: '#10221B', fontSize: 15, paddingVertical: 14 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing(1) },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: '#CEDBD5' },
  dividerText: { fontFamily: fonts.monoBold, color: '#81938C', fontSize: 8, letterSpacing: 1.3 },
  passkey: { minHeight: 52, borderRadius: radius.control, borderWidth: 1, borderColor: '#C4D2CC', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing(1), backgroundColor: '#FFFFFF' },
  passkeyPressed: { opacity: 0.56 },
  passkeyText: { fontFamily: fonts.medium, color: '#10221B', fontSize: 14.5 },
  footerLinks: { minHeight: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing(1) },
  footerLinkText: { fontFamily: fonts.medium, fontSize: 11.5, color: '#647A71', textDecorationLine: 'underline' },
  footerLinkPressed: { opacity: 0.5 },
  footerSeparator: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#A4B4AD' },
});

import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, spacing } from '../theme/tokens';
import { NOTICE_OVERLAY_PLACEMENT, NOTICE_TONE_ICONS, NoticeTone } from './noticePresentation';

export function LoadingScreen() {
  const { palette } = useTheme();
  return <View style={[styles.full, { backgroundColor: palette.canvas }]}><ActivityIndicator size="large" color={palette.green} /></View>;
}

export function NoticeOverlay({ tone = 'info', title, message, icon, actionLabel, actionIcon = 'arrow-forward', onAction, onDismiss }: {
  tone?: NoticeTone;
  title: string;
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  actionIcon?: keyof typeof Ionicons.glyphMap;
  onAction?: () => void;
  onDismiss?: () => void;
}) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const toneColor = tone === 'error'
    ? palette.red
    : tone === 'warning'
      ? palette.amber
      : tone === 'success'
        ? palette.green
        : palette.textSoft;
  const toneBackground = tone === 'error'
    ? palette.redSoft
    : tone === 'warning'
      ? palette.amberSoft
      : tone === 'success'
        ? palette.greenSoft
        : palette.panelStrong;

  return (
    <View pointerEvents="box-none" style={[styles.noticeLayer, { top: insets.top + spacing(1.25) }]}>
      <View
        accessibilityRole="alert"
        accessibilityLiveRegion={tone === 'error' ? 'assertive' : 'polite'}
        style={[styles.notice, { backgroundColor: palette.panel, borderColor: toneColor }]}
      >
        <View style={[styles.noticeIcon, { backgroundColor: toneBackground }]}>
          <Ionicons name={icon ?? NOTICE_TONE_ICONS[tone]} size={22} color={toneColor} />
        </View>
        <View style={styles.noticeCopy}>
          <Text style={[styles.noticeTitle, { color: palette.text }]}>{title}</Text>
          <Text style={[styles.noticeBody, { color: palette.textSoft }]}>{message}</Text>
        </View>
        <View style={styles.noticeActions}>
          {onAction ? <Pressable onPress={onAction} style={[styles.noticeButton, { borderColor: palette.lineStrong }]} accessibilityRole="button" accessibilityLabel={actionLabel ?? 'Open notification action'}>
            <Ionicons name={actionIcon} size={18} color={palette.text} />
          </Pressable> : null}
          {onDismiss ? <Pressable onPress={onDismiss} style={styles.dismissButton} accessibilityRole="button" accessibilityLabel="Dismiss notification">
            <Ionicons name="close" size={19} color={palette.textSoft} />
          </Pressable> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  noticeLayer: NOTICE_OVERLAY_PLACEMENT,
  notice: { width: '100%', maxWidth: 540, alignSelf: 'center', minHeight: 74, borderWidth: 1, borderRadius: radius.card, padding: spacing(1.25), flexDirection: 'row', alignItems: 'center', gap: spacing(1), shadowColor: '#000000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.28, shadowRadius: 22 },
  noticeIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  noticeCopy: { flex: 1, gap: 3 },
  noticeTitle: { fontFamily: fonts.medium, fontSize: 15 },
  noticeBody: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  noticeActions: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  noticeButton: { width: 38, height: 38, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dismissButton: { width: 32, height: 38, alignItems: 'center', justifyContent: 'center' },
});

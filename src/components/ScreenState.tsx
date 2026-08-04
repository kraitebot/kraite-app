import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, spacing } from '../theme/tokens';
import {
  NOTICE_OVERLAY_PLACEMENT,
  NOTICE_SWIPE_ACTIVATION_DISTANCE,
  NOTICE_TONE_ICONS,
  noticeSwipeShouldDismiss,
  NoticeTone,
} from './noticePresentation';

export function LoadingScreen() {
  const { palette } = useTheme();
  return <View style={[styles.full, { backgroundColor: palette.canvas }]}><ActivityIndicator size="large" color={palette.green} /></View>;
}

export function NoticeOverlay({ tone = 'info', title, message, icon, actionLabel, actionIcon = 'arrow-forward', onAction, onDismiss, swipeToDismiss = false }: {
  tone?: NoticeTone;
  title: string;
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  actionIcon?: keyof typeof Ionicons.glyphMap;
  onAction?: () => void;
  onDismiss?: () => void;
  swipeToDismiss?: boolean;
}) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const translate = useRef(new Animated.ValueXY()).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const dismissing = useRef(false);
  const onDismissRef = useRef(onDismiss);
  const swipeToDismissRef = useRef(swipeToDismiss);
  const reduceMotionRef = useRef(false);
  onDismissRef.current = onDismiss;
  swipeToDismissRef.current = swipeToDismiss;

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      reduceMotionRef.current = enabled;
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      reduceMotionRef.current = enabled;
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    dismissing.current = false;
    translate.stopAnimation();
    opacity.stopAnimation();
    translate.setValue({ x: 0, y: 0 });
    opacity.setValue(1);
  }, [message, opacity, title, translate]);

  const resetPosition = useCallback(() => {
    if (reduceMotionRef.current) {
      translate.setValue({ x: 0, y: 0 });
      opacity.setValue(1);
      dismissing.current = false;
      return;
    }

    Animated.parallel([
      Animated.spring(translate, {
        toValue: { x: 0, y: 0 },
        damping: 19,
        stiffness: 210,
        mass: 0.78,
        useNativeDriver: true,
      }),
      Animated.spring(opacity, {
        toValue: 1,
        damping: 19,
        stiffness: 210,
        mass: 0.78,
        useNativeDriver: true,
      }),
    ]).start(() => {
      dismissing.current = false;
    });
  }, [opacity, translate]);

  const dismissWithMotion = useCallback((dx: number, dy: number, vx: number, vy: number) => {
    if (!onDismissRef.current || dismissing.current) return;
    dismissing.current = true;

    const directionX = dx !== 0 || dy !== 0 ? dx : vx;
    const directionY = dx !== 0 || dy !== 0 ? dy : vy || -1;
    const magnitude = Math.hypot(directionX, directionY) || 1;
    const { width, height } = Dimensions.get('window');
    const exitDistance = Math.max(width, height) * 1.15;
    const duration = reduceMotionRef.current ? 0 : 180;

    Animated.parallel([
      Animated.timing(translate, {
        toValue: {
          x: directionX / magnitude * exitDistance,
          y: directionY / magnitude * exitDistance,
        },
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onDismissRef.current?.();
      else resetPosition();
    });
  }, [opacity, resetPosition, translate]);

  const dismissWithMotionRef = useRef(dismissWithMotion);
  const resetPositionRef = useRef(resetPosition);
  dismissWithMotionRef.current = dismissWithMotion;
  resetPositionRef.current = resetPosition;

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => swipeToDismissRef.current
      && Boolean(onDismissRef.current)
      && !dismissing.current
      && Math.hypot(gesture.dx, gesture.dy) >= NOTICE_SWIPE_ACTIVATION_DISTANCE,
    onMoveShouldSetPanResponderCapture: (_, gesture) => swipeToDismissRef.current
      && Boolean(onDismissRef.current)
      && !dismissing.current
      && Math.hypot(gesture.dx, gesture.dy) >= NOTICE_SWIPE_ACTIVATION_DISTANCE,
    onPanResponderMove: (_, gesture) => {
      const distance = Math.hypot(gesture.dx, gesture.dy);
      translate.setValue({ x: gesture.dx, y: gesture.dy });
      opacity.setValue(Math.max(0.38, 1 - distance / 190));
    },
    onPanResponderRelease: (_, gesture) => {
      if (noticeSwipeShouldDismiss(gesture.dx, gesture.dy, gesture.vx, gesture.vy)) {
        dismissWithMotionRef.current(gesture.dx, gesture.dy, gesture.vx, gesture.vy);
      } else {
        resetPositionRef.current();
      }
    },
    onPanResponderTerminate: () => resetPositionRef.current(),
    onPanResponderTerminationRequest: () => false,
  }), [opacity, translate]);
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
      <Animated.View
        {...panResponder.panHandlers}
        accessibilityRole="alert"
        accessibilityLiveRegion={tone === 'error' ? 'assertive' : 'polite'}
        accessibilityHint={swipeToDismiss && onDismiss ? 'Swipe in any direction or use the close button to dismiss' : undefined}
        accessibilityActions={swipeToDismiss && onDismiss ? [{ name: 'dismiss', label: 'Dismiss notification' }] : undefined}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'dismiss') dismissWithMotion(0, -1, 0, -1);
        }}
        style={[
          styles.notice,
          { backgroundColor: palette.panel, borderColor: toneColor, opacity, transform: translate.getTranslateTransform() },
        ]}
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
          {onDismiss ? <Pressable onPress={swipeToDismiss ? () => dismissWithMotion(0, -1, 0, -1) : onDismiss} style={styles.dismissButton} accessibilityRole="button" accessibilityLabel="Dismiss notification">
            <Ionicons name="close" size={19} color={palette.textSoft} />
          </Pressable> : null}
        </View>
      </Animated.View>
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

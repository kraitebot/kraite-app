import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppNotification } from '../api/types';
import { Logo } from '../components/Logo';
import { RootStackParamList } from '../navigation/types';
import { useNotifications } from '../notifications/NotificationContext';
import { notificationTone } from '../notifications/notificationState';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, spacing } from '../theme/tokens';
import { useScreenTransition } from '../transitions/ScreenTransitionContext';

function sentAtLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function NotificationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  const { runTransition } = useScreenTransition();
  const {
    notifications,
    readIds,
    loading,
    refreshing,
    hasNextPage,
    markVisible,
    refresh,
    loadNext,
  } = useNotifications();
  const read = useMemo(() => new Set(readIds), [readIds]);
  const markVisibleRef = useRef(markVisible);
  markVisibleRef.current = markVisible;
  const onViewableItemsChanged = useRef((event: { viewableItems: ViewToken<AppNotification>[] }) => {
    markVisibleRef.current(
      event.viewableItems
        .map(({ item }) => item.id)
        .filter((id): id is string => typeof id === 'string'),
    );
  }).current;

  useFocusEffect(useCallback(() => {
    void refresh();
  }, [refresh]));

  const renderItem = ({ item }: { item: AppNotification }) => {
    const tone = notificationTone(item.severity);
    const toneColor = tone === 'error'
      ? palette.red
      : tone === 'warning'
        ? palette.amber
        : palette.green;
    const isUnread = !read.has(item.id);

    return (
      <View
        style={[
          styles.item,
          {
            backgroundColor: palette.panel,
            borderColor: isUnread ? toneColor : palette.line,
          },
        ]}
      >
        <View style={[styles.icon, { backgroundColor: palette.canvasRaised }]}>
          <Ionicons
            name={tone === 'error' ? 'alert-circle-outline' : tone === 'warning' ? 'warning-outline' : 'notifications-outline'}
            size={21}
            color={toneColor}
          />
        </View>
        <View style={styles.itemCopy}>
          <View style={styles.itemHeading}>
            <Text numberOfLines={2} style={[styles.itemTitle, { color: palette.text }]}>{item.title}</Text>
            {isUnread ? <View style={[styles.unreadDot, { backgroundColor: toneColor }]} /> : null}
          </View>
          <Text style={[styles.itemBody, { color: palette.textSoft }]}>{item.body}</Text>
          <Text style={[styles.itemMeta, { color: palette.textFaint }]}>
            {sentAtLabel(item.sent_at)} · {item.canonical.replaceAll('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>
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

      <Text style={[styles.eyebrow, { color: palette.green }]}>TRADER · EVENT LOG</Text>
      <Text style={[styles.title, { color: palette.text }]}>Notifications</Text>
      <Text style={[styles.intro, { color: palette.textSoft }]}>Trading events and system protection changes, newest first.</Text>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.list,
          notifications.length === 0 && styles.emptyList,
          { paddingBottom: insets.bottom + spacing(3) },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={palette.green} />}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60, minimumViewTime: 120 }}
        onEndReached={() => { if (hasNextPage) void loadNext(); }}
        onEndReachedThreshold={0.35}
        ListEmptyComponent={loading ? (
          <View style={styles.empty}>
            <ActivityIndicator color={palette.green} />
            <Text style={[styles.emptyBody, { color: palette.textSoft }]}>Loading notification history</Text>
          </View>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: palette.panel, borderColor: palette.line }]}>
            <View style={[styles.emptyIcon, { backgroundColor: palette.greenSoft }]}>
              <Ionicons name="notifications-off-outline" size={28} color={palette.green} />
            </View>
            <Text style={[styles.emptyTitle, { color: palette.text }]}>No notifications yet</Text>
            <Text style={[styles.emptyBody, { color: palette.textSoft }]}>Trading events will appear here once Kraite sends them.</Text>
          </View>
        )}
        ListFooterComponent={hasNextPage && notifications.length > 0
          ? <ActivityIndicator style={styles.footer} color={palette.green} />
          : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: spacing(2.5) },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 42, height: 42, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 2, marginTop: spacing(3.5) },
  title: { fontFamily: fonts.display, fontSize: 39, letterSpacing: -1.6, marginTop: 3 },
  intro: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, marginTop: 4, marginBottom: spacing(2) },
  list: { gap: spacing(1) },
  emptyList: { flexGrow: 1 },
  item: { borderWidth: 1, borderRadius: radius.card, padding: spacing(1.4), flexDirection: 'row', alignItems: 'flex-start', gap: spacing(1.25) },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  itemCopy: { flex: 1, gap: 5 },
  itemHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemTitle: { flex: 1, fontFamily: fonts.medium, fontSize: 15.5, lineHeight: 20 },
  itemBody: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  itemMeta: { fontFamily: fonts.monoBold, fontSize: 8.5, lineHeight: 12, letterSpacing: 0.7 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing(1) },
  emptyCard: { minHeight: 220, borderWidth: 1, borderRadius: radius.card, alignItems: 'center', justifyContent: 'center', padding: spacing(3) },
  emptyIcon: { width: 58, height: 58, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: fonts.display, fontSize: 20, marginTop: spacing(1.5) },
  emptyBody: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 4 },
  footer: { marginVertical: spacing(2) },
});

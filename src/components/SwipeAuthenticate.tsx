import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { fonts, radius } from '../theme/tokens';

const HANDLE_SIZE = 48;
const TRACK_INSET = 4;
const COMPLETION_RATIO = 0.72;

type SwipeAuthenticateProps = {
  disabled: boolean;
  busy: boolean;
  onAuthenticate: () => Promise<boolean>;
};

export function SwipeAuthenticate({ disabled, busy, onAuthenticate }: SwipeAuthenticateProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const disabledRef = useRef(disabled);
  const authenticateRef = useRef(onAuthenticate);
  const maxTravelRef = useRef(0);
  const dragStart = useRef(0);
  const triggered = useRef(false);
  const [trackWidth, setTrackWidth] = useState(0);
  const [committed, setCommitted] = useState(false);

  const maxTravel = Math.max(0, trackWidth - HANDLE_SIZE - TRACK_INSET * 2);
  disabledRef.current = disabled;
  authenticateRef.current = onAuthenticate;
  maxTravelRef.current = maxTravel;

  const reset = () => {
    triggered.current = true;
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        damping: 18,
        stiffness: 180,
        mass: 0.8,
        useNativeDriver: false,
      }),
      Animated.spring(progress, {
        toValue: 0,
        damping: 18,
        stiffness: 180,
        mass: 0.8,
        useNativeDriver: false,
      }),
    ]).start(() => {
      triggered.current = false;
      setCommitted(false);
    });
  };

  const complete = () => {
    if (disabledRef.current || triggered.current || maxTravelRef.current <= 0) return;
    triggered.current = true;
    setCommitted(true);

    Animated.parallel([
      Animated.timing(translateX, {
        toValue: maxTravelRef.current,
        duration: 180,
        useNativeDriver: false,
      }),
      Animated.timing(progress, {
        toValue: 1,
        duration: 180,
        useNativeDriver: false,
      }),
    ]).start(({ finished }) => {
      if (!finished) {
        reset();
        return;
      }

      void authenticateRef.current()
        .then((authenticated) => {
          if (!authenticated) reset();
        })
        .catch(reset);
    });
  };

  const completeRef = useRef(complete);
  completeRef.current = complete;

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !disabledRef.current && !triggered.current && maxTravelRef.current > 0,
    onMoveShouldSetPanResponder: (_, gesture) => !disabledRef.current && Math.abs(gesture.dx) > 3,
    onPanResponderGrant: () => {
      translateX.stopAnimation((value) => { dragStart.current = value; });
    },
    onPanResponderMove: (_, gesture) => {
      const next = Math.max(0, Math.min(maxTravelRef.current, dragStart.current + gesture.dx));
      translateX.setValue(next);
      progress.setValue(maxTravelRef.current > 0 ? next / maxTravelRef.current : 0);
    },
    onPanResponderRelease: () => {
      translateX.stopAnimation((value) => {
        if (value >= maxTravelRef.current * COMPLETION_RATIO) completeRef.current();
        else reset();
      });
    },
    onPanResponderTerminate: reset,
  }), [progress, translateX]);

  const labelOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.22] });
  const trackBackground = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['#86EABF', '#27C980', '#08734B'],
  });
  const labelColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['#173329', '#E9FFF5'],
  });
  const handleBackground = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(6,17,13,0.12)', 'rgba(233,255,245,0.78)'],
  });

  const onLayout = (event: LayoutChangeEvent) => setTrackWidth(event.nativeEvent.layout.width);

  return (
    <Animated.View
      {...panResponder.panHandlers}
      onLayout={onLayout}
      style={[
        styles.track,
        { backgroundColor: trackBackground },
        disabled && !busy && !committed && styles.trackDisabled,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Authenticate"
      accessibilityHint="Swipe the arrow to the right to authenticate"
      accessibilityState={{ disabled, busy }}
      accessibilityActions={[{ name: 'activate', label: 'Authenticate' }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'activate') complete();
      }}
    >
      <Animated.Text style={[styles.label, { color: labelColor, opacity: labelOpacity }]}>
        {busy || committed ? 'VERIFYING ACCESS' : 'SWIPE TO AUTHENTICATE'}
      </Animated.Text>
      <Animated.View style={[styles.handle, { backgroundColor: handleBackground, transform: [{ translateX }] }]}>
        {busy || committed
          ? <ActivityIndicator size="small" color="#06110D" />
          : <Ionicons name="arrow-forward" size={21} color="#06110D" />}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 56,
    borderRadius: radius.control,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  trackDisabled: { opacity: 0.5 },
  label: {
    position: 'absolute',
    alignSelf: 'center',
    fontFamily: fonts.monoBold,
    fontSize: 10,
    letterSpacing: 1.15,
  },
  handle: {
    position: 'absolute',
    left: TRACK_INSET,
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

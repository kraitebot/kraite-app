import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';

import { SCREEN_TRANSITION_MS } from './timing';

type TransitionAction = () => void | Promise<void>;
type ScreenTransitionValue = {
  runTransition: (action: TransitionAction) => Promise<void>;
};

const ScreenTransitionContext = createContext<ScreenTransitionValue | undefined>(undefined);

function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export function ScreenTransitionProvider({ children }: { children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const active = useRef(false);
  const [blocking, setBlocking] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  const fade = useCallback((toValue: number, duration: number) => new Promise<void>((resolve) => {
    Animated.timing(opacity, {
      toValue,
      duration: reduceMotion ? 0 : duration,
      easing: toValue === 1 ? Easing.out(Easing.cubic) : Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(() => resolve());
  }), [opacity, reduceMotion]);

  const runTransition = useCallback(async (action: TransitionAction): Promise<void> => {
    if (active.current) return;
    active.current = true;
    setBlocking(true);

    let failed = false;
    let failure: unknown;

    try {
      await fade(1, SCREEN_TRANSITION_MS.cover);
      await action();
      await nextPaint();
    } catch (caught) {
      failed = true;
      failure = caught;
    }

    await fade(0, SCREEN_TRANSITION_MS.reveal);
    setBlocking(false);
    active.current = false;

    if (failed) throw failure;
  }, [fade]);

  return (
    <ScreenTransitionContext.Provider value={{ runTransition }}>
      <View style={styles.root}>
        {children}
        <Animated.View
          pointerEvents={blocking ? 'auto' : 'none'}
          style={[styles.blackout, { opacity }]}
        />
      </View>
    </ScreenTransitionContext.Provider>
  );
}

export function useScreenTransition(): ScreenTransitionValue {
  const value = useContext(ScreenTransitionContext);
  if (!value) throw new Error('useScreenTransition must be used within ScreenTransitionProvider');
  return value;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  blackout: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#000000',
    zIndex: 1000,
    elevation: 1000,
  },
});

import {
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
} from '@expo-google-fonts/ibm-plex-mono';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { PasskeyInvite } from './src/components/PasskeyInvite';
import { LoadingScreen } from './src/components/ScreenState';
import { RootStackParamList, TabParamList } from './src/navigation/types';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { MoreScreen } from './src/screens/MoreScreen';
import { PasskeysScreen } from './src/screens/PasskeysScreen';
import { PositionsScreen } from './src/screens/PositionsScreen';
import { PlaceholderScreen, StackPlaceholder } from './src/screens/PlaceholderScreen';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { fonts } from './src/theme/tokens';
import { ScreenTransitionProvider, useScreenTransition } from './src/transitions/ScreenTransitionContext';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const tabIcons: Record<keyof TabParamList, keyof typeof Ionicons.glyphMap> = {
  Dashboard: 'grid-outline',
  Positions: 'layers-outline',
  Projections: 'trending-up-outline',
  Accounts: 'link-outline',
  More: 'ellipsis-horizontal',
};

function Tabs() {
  const { palette } = useTheme();
  const { runTransition } = useScreenTransition();
  return (
    <Tab.Navigator
      screenListeners={({ navigation, route }) => ({
        tabPress: (event) => {
          const state = navigation.getState();
          if (state.routes[state.index]?.key === route.key) return;
          event.preventDefault();
          void runTransition(() => navigation.navigate(route.name));
        },
      })}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: palette.green,
        tabBarInactiveTintColor: palette.textFaint,
        tabBarStyle: {
          position: 'absolute',
          height: 78,
          paddingTop: 9,
          paddingBottom: 8,
          backgroundColor: palette.nav,
          borderTopColor: palette.line,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
        tabBarLabelStyle: { fontFamily: fonts.monoBold, fontSize: 8, letterSpacing: 0.15 },
        tabBarIcon: ({ focused, color }) => (
          <View style={[styles.tabIcon, focused && { backgroundColor: palette.greenSoft }]}>
            <Ionicons name={tabIcons[route.name]} size={21} color={color} />
          </View>
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Positions" component={PositionsScreen} />
      <Tab.Screen name="Projections">{() => <PlaceholderScreen title="Projections" icon="trending-up-outline" />}</Tab.Screen>
      <Tab.Screen name="Accounts">{() => <PlaceholderScreen title="Accounts" icon="link-outline" />}</Tab.Screen>
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
}

function RootNavigation() {
  const { user, booting } = useAuth();
  const { palette } = useTheme();

  if (booting) return <LoadingScreen />;
  if (!user) return <LoginScreen />;

  const base = palette.dark ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: palette.canvas,
      card: palette.panel,
      text: palette.text,
      border: palette.line,
      primary: palette.green,
      notification: palette.red,
    },
  };

  return <>
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'none', gestureEnabled: false, contentStyle: { backgroundColor: palette.canvas } }}>
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen name="Billing" component={StackPlaceholder} />
        <Stack.Screen name="Profile" component={StackPlaceholder} />
        <Stack.Screen name="Passkeys" component={PasskeysScreen} />
      </Stack.Navigator>
    </NavigationContainer>
    <PasskeyInvite />
  </>;
}

function KraiteApp() {
  const { palette } = useTheme();
  return (
    <AuthProvider>
      <StatusBar style={palette.dark ? 'light' : 'dark'} />
      <RootNavigation />
    </AuthProvider>
  );
}

export default function App() {
  const [loaded, error] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
  });

  if (!loaded && !error) return null;
  if (error) return <View style={styles.fontError}><Text>Unable to load Kraite.</Text></View>;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ScreenTransitionProvider>
          <KraiteApp />
        </ScreenTransitionProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabIcon: { width: 38, height: 31, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  fontError: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

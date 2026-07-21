import { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Dashboard: undefined;
  Positions: undefined;
  Projections: undefined;
  Accounts: undefined;
  More: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  Billing: undefined;
  Profile: undefined;
  Passkeys: undefined;
};

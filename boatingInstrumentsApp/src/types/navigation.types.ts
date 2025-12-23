/**
 * Navigation types for Expo Router
 */

export type RootStackParamList = {
  index: undefined;
  settings: undefined;
  'widget-selector': undefined;
  '+not-found': undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

export type NavigationScreens = keyof RootStackParamList;

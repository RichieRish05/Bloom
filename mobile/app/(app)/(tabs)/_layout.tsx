import { Tabs } from "expo-router";
import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  InteractiveMenu,
  InteractiveMenuItem,
} from "../../../components/ui/interactive-menu";
import {
  CompassGlyph,
  HomeGlyph,
  UserGlyph,
} from "../../../components/ui/nav-icons";

const ICON_INK = "#2A241B";

const ICON_BY_ROUTE: Record<string, ReactNode> = {
  explore: <CompassGlyph color={ICON_INK} />,
  home: <HomeGlyph color={ICON_INK} />,
  profile: <UserGlyph color={ICON_INK} />,
};

const LABEL_BY_ROUTE: Record<string, string> = {
  explore: "explore",
  home: "home",
  profile: "you",
};

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigation }) => {
        const items: InteractiveMenuItem[] = state.routes.map(
          (route, index) => ({
            id: route.key,
            label: LABEL_BY_ROUTE[route.name] ?? route.name,
            icon: ICON_BY_ROUTE[route.name] ?? null,
            onPress: () => {
              const isFocused = state.index === index;
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            },
          }),
        );

        return (
          <View
            style={[
              styles.dock,
              { paddingBottom: Math.max(insets.bottom, 16) },
            ]}
          >
            <InteractiveMenu items={items} activeIndex={state.index} />
          </View>
        );
      }}
    >
      <Tabs.Screen name="explore" />
      <Tabs.Screen name="home" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  dock: {
    alignItems: "center",
    paddingTop: 12,
    paddingHorizontal: 20,
    backgroundColor: "transparent",
  },
});

import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

export type InteractiveMenuItem = {
  id: string | number;
  label: string;
  icon: ReactNode;
  onPress?: () => void;
};

type InteractiveMenuProps = {
  items: InteractiveMenuItem[];
  activeIndex?: number;
  defaultActiveIndex?: number;
  onTabChange?: (index: number) => void;
  accentColor?: string;
  style?: ViewStyle | ViewStyle[];
};

const PAPER = "#FFFDF8";
const SAND = "#F5EFE3";
const INK = "#2A241B";
const MUTED = "#7A6F5E";
const ACCENT_DEFAULT = "#C8841C";
const BORDER = "#E5DCC9";

const COLLAPSED_WIDTH = 56;
const LABEL_PADDING = 18;
const ICON_GAP = 10;
const BAR_HEIGHT = 64;

export function InteractiveMenu({
  items,
  activeIndex,
  defaultActiveIndex = 0,
  onTabChange,
  accentColor = ACCENT_DEFAULT,
  style,
}: InteractiveMenuProps) {
  const [internal, setInternal] = useState(defaultActiveIndex);
  const isControlled = activeIndex !== undefined;
  const current = isControlled ? (activeIndex as number) : internal;

  const safeIndex = Math.min(Math.max(current, 0), Math.max(items.length - 1, 0));

  const labelWidthsRef = useRef<number[]>([]);
  const [, force] = useState(0);
  const expansions = useRef<Animated.Value[]>([]).current;
  const bounces = useRef<Animated.Value[]>([]).current;

  // Keep parallel animation values in sync with item count.
  while (expansions.length < items.length) {
    expansions.push(new Animated.Value(expansions.length === safeIndex ? 1 : 0));
  }
  while (bounces.length < items.length) {
    bounces.push(new Animated.Value(0));
  }

  useEffect(() => {
    items.forEach((_, i) => {
      Animated.spring(expansions[i], {
        toValue: i === safeIndex ? 1 : 0,
        useNativeDriver: false,
        tension: 110,
        friction: 16,
      }).start();
    });

    const b = bounces[safeIndex];
    if (b) {
      b.setValue(0);
      Animated.timing(b, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [safeIndex, items.length]);

  const handleLabelLayout = (i: number) => (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (labelWidthsRef.current[i] !== w) {
      labelWidthsRef.current[i] = w;
      force((n) => n + 1);
    }
  };

  const handlePress = (i: number, fn?: () => void) => {
    if (!isControlled) setInternal(i);
    onTabChange?.(i);
    fn?.();
  };

  if (items.length === 0) return null;

  return (
    <View style={[styles.bar, style]}>
      {items.map((item, i) => {
        const labelW = labelWidthsRef.current[i] ?? 0;
        const expandedWidth = COLLAPSED_WIDTH + ICON_GAP + labelW + LABEL_PADDING;

        const widthAnim = expansions[i].interpolate({
          inputRange: [0, 1],
          outputRange: [COLLAPSED_WIDTH, expandedWidth],
        });

        const labelOpacity = expansions[i].interpolate({
          inputRange: [0, 0.55, 1],
          outputRange: [0, 0, 1],
        });

        const labelTranslate = expansions[i].interpolate({
          inputRange: [0, 1],
          outputRange: [-6, 0],
        });

        const underlineWidth = expansions[i].interpolate({
          inputRange: [0, 1],
          outputRange: [0, labelW],
        });

        const isActive = i === safeIndex;
        const iconTranslateY = isActive
          ? bounces[i].interpolate({
              inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
              outputRange: [0, -6, 0, -2, 0, 0],
            })
          : 0;

        return (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: isActive }}
            onPress={() => handlePress(i, item.onPress)}
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <Animated.View
              style={[
                styles.item,
                isActive && { backgroundColor: SAND },
                { width: widthAnim },
              ]}
            >
              <Animated.View
                style={[
                  styles.iconWrap,
                  { opacity: isActive ? 1 : 0.6, transform: [{ translateY: iconTranslateY }] },
                ]}
              >
                {item.icon}
              </Animated.View>

              <Animated.View
                style={[
                  styles.labelWrap,
                  {
                    opacity: labelOpacity,
                    transform: [{ translateX: labelTranslate }],
                  },
                ]}
              >
                <Text
                  style={[styles.label, { color: INK }]}
                  onLayout={handleLabelLayout(i)}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
                <Animated.View
                  style={[
                    styles.underline,
                    { width: underlineWidth, backgroundColor: accentColor },
                  ]}
                />
              </Animated.View>
            </Animated.View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: BAR_HEIGHT,
    paddingHorizontal: 8,
    borderRadius: BAR_HEIGHT / 2,
    backgroundColor: PAPER,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    shadowColor: INK,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.07,
    shadowRadius: 24,
    elevation: 6,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    paddingHorizontal: 4,
    borderRadius: 24,
    overflow: "hidden",
  },
  pressed: {
    opacity: 0.75,
  },
  iconWrap: {
    width: COLLAPSED_WIDTH - 16,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  labelWrap: {
    height: 28,
    justifyContent: "center",
    alignItems: "flex-start",
    marginLeft: ICON_GAP,
    paddingRight: LABEL_PADDING,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "lowercase",
  },
  underline: {
    position: "absolute",
    bottom: 2,
    left: 0,
    height: 2,
    borderRadius: 1,
  },
  // Kept for export discoverability.
  ink: { color: INK },
  muted: { color: MUTED },
});

export const interactiveMenuColors = { PAPER, SAND, INK, MUTED, ACCENT_DEFAULT, BORDER };

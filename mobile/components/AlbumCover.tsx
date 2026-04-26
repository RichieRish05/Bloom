import { StyleSheet, Text, View } from "react-native";

const COVER_BG = "#E8E1D5";
const COVER_INK = "#7A6F5E";

type Props = {
  name: string;
  size?: number;
};

export function AlbumCover({ name, size = 120 }: Props) {
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <View
      style={[
        styles.cover,
        { width: size, height: size, borderRadius: size * 0.12 },
      ]}
    >
      <Text style={[styles.initial, { fontSize: size * 0.4 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    backgroundColor: COVER_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    color: COVER_INK,
    fontWeight: "600",
  },
});

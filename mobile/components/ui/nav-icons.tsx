import { View } from "react-native";

type Props = {
  color?: string;
  size?: number;
};

const STROKE = 1.8;

export function HomeGlyph({ color = "#2A241B", size = 22 }: Props) {
  const roofW = size * 0.92;
  const roofH = size * 0.5;
  const bodyW = size * 0.68;
  const bodyH = size * 0.42;
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: roofW / 2,
          borderRightWidth: roofW / 2,
          borderBottomWidth: roofH,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderBottomColor: color,
        }}
      />
      <View
        style={{
          width: bodyW,
          height: bodyH,
          backgroundColor: color,
          marginTop: -1,
          borderBottomLeftRadius: 2,
          borderBottomRightRadius: 2,
        }}
      />
    </View>
  );
}

export function CompassGlyph({ color = "#2A241B", size = 22 }: Props) {
  const diamond = size * 0.34;
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: STROKE,
          borderColor: color,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: diamond,
            height: diamond,
            backgroundColor: color,
            transform: [{ rotate: "45deg" }],
          }}
        />
      </View>
    </View>
  );
}

export function UserGlyph({ color = "#2A241B", size = 22 }: Props) {
  const head = size * 0.44;
  const shoulders = size * 0.88;
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "flex-start",
        paddingTop: size * 0.05,
      }}
    >
      <View
        style={{
          width: head,
          height: head,
          borderRadius: head / 2,
          borderWidth: STROKE,
          borderColor: color,
        }}
      />
      <View
        style={{
          width: shoulders,
          height: shoulders / 2,
          borderTopLeftRadius: shoulders / 2,
          borderTopRightRadius: shoulders / 2,
          borderTopWidth: STROKE,
          borderLeftWidth: STROKE,
          borderRightWidth: STROKE,
          borderColor: color,
          marginTop: 3,
        }}
      />
    </View>
  );
}

import { ScrollView, StyleSheet, Text, View } from "react-native";

const PAPER = "#FFFDF8";
const INK = "#2A241B";
const MUTED = "#7A6F5E";
const ACCENT = "#C8841C";
const SAND = "#F5EFE3";

const FEATURED = [
  { tag: "01", title: "Summer in Lisbon", subtitle: "32 photos · 4 people" },
  { tag: "02", title: "Backyard Wedding", subtitle: "120 photos · 18 people" },
  { tag: "03", title: "Mom's 60th", subtitle: "48 photos · 9 people" },
];

export default function Explore() {
  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>Discover</Text>
        <Text style={styles.title}>From the{"\n"}community</Text>

        {FEATURED.map((item) => (
          <View key={item.tag} style={styles.card}>
            <View style={styles.cardLeft}>
              <Text style={styles.tag}>{item.tag}</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
            </View>
            <View style={styles.cardRule} />
          </View>
        ))}

        <View style={styles.note}>
          <View style={styles.noteMark} />
          <Text style={styles.noteText}>
            Public albums coming soon. Until then, this space holds a few
            curated examples.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: PAPER,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 28,
    paddingTop: 72,
    paddingBottom: 160,
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: MUTED,
    marginBottom: 12,
  },
  title: {
    fontSize: 44,
    lineHeight: 48,
    fontWeight: "700",
    color: INK,
    letterSpacing: -1,
    marginBottom: 36,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SAND,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 14,
  },
  cardLeft: {
    width: 48,
  },
  tag: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: ACCENT,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: INK,
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: MUTED,
  },
  cardRule: {
    width: 18,
    height: StyleSheet.hairlineWidth,
    backgroundColor: INK,
    opacity: 0.3,
  },
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5DCC9",
  },
  noteMark: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ACCENT,
    marginTop: 6,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: MUTED,
  },
});

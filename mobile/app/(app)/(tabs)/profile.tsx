import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../../lib/auth-context";
import { supabase } from "../../../lib/supabase";

const PAPER = "#FFFDF8";
const INK = "#2A241B";
const MUTED = "#7A6F5E";
const ACCENT = "#C8841C";
const SAND = "#F5EFE3";
const BORDER = "#E5DCC9";

export default function Profile() {
  const { session } = useAuth();
  const email = session?.user?.email ?? "—";
  const initial = email.trim().charAt(0).toUpperCase() || "·";

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>Account</Text>
        <Text style={styles.title}>You</Text>

        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.cardLabel}>Signed in as</Text>
          <Text style={styles.cardEmail} numberOfLines={1}>
            {email}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <Row label="Notifications" value="On" />
          <Row label="Default album style" value="Editorial" />
          <Row label="Storage" value="2.4 GB of 15" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Session</Text>
          <Pressable
            style={({ pressed }) => [
              styles.signOut,
              pressed && styles.signOutPressed,
            ]}
            onPress={() => supabase.auth.signOut()}
          >
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
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
    backgroundColor: SAND,
    borderRadius: 22,
    padding: 28,
    alignItems: "center",
    marginBottom: 32,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: INK,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  avatarText: {
    color: SAND,
    fontSize: 28,
    fontWeight: "600",
  },
  cardLabel: {
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: MUTED,
    marginBottom: 6,
  },
  cardEmail: {
    fontSize: 16,
    fontWeight: "500",
    color: INK,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    color: ACCENT,
    fontWeight: "700",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  rowLabel: {
    fontSize: 15,
    color: INK,
  },
  rowValue: {
    fontSize: 14,
    color: MUTED,
  },
  signOut: {
    borderWidth: 1,
    borderColor: INK,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  signOutPressed: {
    backgroundColor: INK,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: "600",
    color: INK,
    letterSpacing: 0.4,
  },
});

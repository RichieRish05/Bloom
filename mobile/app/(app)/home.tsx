import { Pressable, StyleSheet, Text, View } from "react-native";
import { supabase } from "../../lib/supabase";

export default function Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>
      <Text style={styles.body}>You're in! This is the main app.</Text>

      <Pressable
        style={styles.signOut}
        onPress={() => supabase.auth.signOut()}
      >
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  body: {
    fontSize: 16,
    color: "#666",
    marginBottom: 32,
  },
  signOut: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  signOutText: {
    fontSize: 14,
    color: "#666",
  },
});

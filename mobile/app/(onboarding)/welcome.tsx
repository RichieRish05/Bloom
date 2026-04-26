import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../lib/auth-context";

export default function Welcome() {
  const router = useRouter();
  const { completeOnboarding } = useAuth();

  async function handleComplete() {
    await completeOnboarding();
    router.replace("/(app)/(tabs)/home");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Bloom</Text>
      <Text style={styles.body}>
        We're glad you're here. Let's get you set up.
      </Text>

      <Pressable style={styles.button} onPress={handleComplete}>
        <Text style={styles.buttonText}>Get Started</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  body: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 24,
  },
  button: {
    backgroundColor: "#000",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

import { useRef, useState } from "react";
import { useRouter } from "expo-router";
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../../lib/auth-context";

const { width } = Dimensions.get("window");
const TOTAL_PAGES = 3;
const HANDLE_MIN = 3;
const HANDLE_MAX = 20;
const HANDLE_REGEX = /^[a-zA-Z0-9_]+$/;

function validateHandle(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Handle is required";
  if (trimmed.length < HANDLE_MIN) return `At least ${HANDLE_MIN} characters`;
  if (trimmed.length > HANDLE_MAX) return `No more than ${HANDLE_MAX} characters`;
  if (!HANDLE_REGEX.test(trimmed)) return "Letters, numbers, and underscores only";
  return null;
}

export default function Welcome() {
  const router = useRouter();
  const { completeOnboarding } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

  const [currentPage, setCurrentPage] = useState(0);
  const [handle, setHandle] = useState("");
  const [handleError, setHandleError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function goToPage(page: number) {
    scrollRef.current?.scrollTo({ x: page * width, animated: true });
    setCurrentPage(page);
  }

  function handleNext() {
    if (currentPage === 1) {
      const error = validateHandle(handle);
      if (error) {
        setHandleError(error);
        return;
      }
    }
    if (currentPage < TOTAL_PAGES - 1) {
      goToPage(currentPage + 1);
    }
  }

  function handleBack() {
    if (currentPage > 0) {
      goToPage(currentPage - 1);
    }
  }

  async function handleComplete() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await completeOnboarding(handle.trim().toLowerCase());
      router.replace("/(app)/(tabs)/home");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not finish onboarding.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.container}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={styles.flex}
        >
          {/* Page 1: Welcome */}
          <View style={[styles.page, { width }]}>
            <View style={styles.illustrationPlaceholder}>
              <Text style={styles.illustrationText}>Bloom</Text>
            </View>
            <Text style={styles.title}>Welcome to Bloom</Text>
            <Text style={styles.body}>
              We're glad you're here. Let's get you set up in just a moment.
            </Text>
          </View>

          {/* Page 2: Handle */}
          <View style={[styles.page, { width }]}>
            <Text style={styles.title}>Choose a handle</Text>
            <Text style={styles.body}>This is how others will find you.</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputPrefix}>@</Text>
              <TextInput
                style={styles.handleInput}
                value={handle}
                onChangeText={(t) => {
                  setHandle(t.toLowerCase());
                  setHandleError("");
                }}
                placeholder="yourhandle"
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={HANDLE_MAX}
              />
            </View>
            {handleError ? (
              <Text style={styles.errorText}>{handleError}</Text>
            ) : null}
            <Text style={styles.hint}>
              3-20 characters. Letters, numbers, underscores.
            </Text>
          </View>

          {/* Page 3: Confirmation */}
          <View style={[styles.page, { width }]}>
            <Text style={styles.title}>You're all set</Text>
            <Text style={styles.body}>
              Welcome, @{handle.trim().toLowerCase() || "..."}. Let's go.
            </Text>
          </View>
        </ScrollView>

        {/* Dot indicators */}
        <View style={styles.dots}>
          {Array.from({ length: TOTAL_PAGES }).map((_, i) => (
            <View
              key={i}
              style={[styles.dot, currentPage === i && styles.dotActive]}
            />
          ))}
        </View>

        {/* Footer navigation */}
        <View style={styles.footer}>
          {currentPage > 0 ? (
            <Pressable onPress={handleBack} style={styles.backButton}>
              <Text style={styles.backText}>Back</Text>
            </Pressable>
          ) : (
            <View style={styles.backButton} />
          )}

          {currentPage < TOTAL_PAGES - 1 ? (
            <Pressable style={styles.button} onPress={handleNext}>
              <Text style={styles.buttonText}>Next</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.button, submitting && styles.buttonDisabled]}
              onPress={handleComplete}
              disabled={submitting}
            >
              <Text style={styles.buttonText}>
                {submitting ? "Saving..." : "Get Started"}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  page: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  illustrationPlaceholder: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#f0f0f0",
    alignSelf: "center",
    marginBottom: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  illustrationText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#999",
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
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  inputPrefix: {
    fontSize: 18,
    color: "#999",
    marginRight: 4,
  },
  handleInput: {
    flex: 1,
    fontSize: 18,
    paddingVertical: 16,
  },
  errorText: {
    color: "#e00",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 4,
  },
  hint: {
    color: "#999",
    fontSize: 13,
    textAlign: "center",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ddd",
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: "#000",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  backButton: {
    minWidth: 60,
  },
  backText: {
    color: "#666",
    fontSize: 16,
  },
  button: {
    backgroundColor: "#000",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AlbumCover } from "../../components/AlbumCover";
import { useAuth } from "../../lib/auth-context";
import { supabase } from "../../lib/supabase";

export default function CreateAlbum() {
  const router = useRouter();
  const { session } = useAuth();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const trimmed = name.trim();
  const canCreate = trimmed.length > 0 && !loading;

  async function handleCreate() {
    if (!session) return;
    setLoading(true);
    const { error } = await supabase
      .from("albums")
      .insert({ name: trimmed, created_by: session.user.id });

    if (error) {
      Alert.alert("Error", error.message);
      setLoading(false);
      return;
    }
    router.back();
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.inner}>
        <View style={styles.coverWrap}>
          <AlbumCover name={trimmed} size={140} />
        </View>

        <TextInput
          style={styles.input}
          placeholder="Album name"
          value={name}
          onChangeText={setName}
          autoFocus
          maxLength={80}
          placeholderTextColor="#999"
          returnKeyType="done"
          onSubmitEditing={() => {
            if (canCreate) handleCreate();
          }}
        />

        <Pressable
          style={[styles.button, !canCreate && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={!canCreate}
        >
          <Text style={styles.buttonText}>Create</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  coverWrap: {
    alignItems: "center",
    marginBottom: 32,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#000",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

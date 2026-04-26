// Dev-only screen for smoke-testing the Cloudinary upload flow end-to-end.
// Safe to delete once the real upload UI exists.

import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  commitUploads,
  getUploadContext,
  toCommitInput,
  uploadToCloudinary,
  type CloudinaryUploadResult,
  type UploadContext,
} from "../../lib/uploads";
import { supabase } from "../../lib/supabase";

type Status = "pending" | "uploading" | "done" | "error";

type UploadItem = {
  id: string;
  localUri: string;
  fileName: string;
  mimeType: string;
  status: Status;
  result?: CloudinaryUploadResult;
  error?: string;
};

const CONCURRENCY = 3;

export default function DevUploads() {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [running, setRunning] = useState(false);
  const [albumId, setAlbumId] = useState("");

  useEffect(() => {
    supabase
      .from("albums")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.id) setAlbumId(data.id);
      });
  }, []);

  async function onPickAndUpload() {
    if (running) return;
    if (!albumId) {
      Alert.alert("Album required", "Enter an album UUID before uploading.");
      return;
    }

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo access to upload.");
      return;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 20,
      quality: 1,
    });
    if (picked.canceled || picked.assets.length === 0) return;

    const newItems: UploadItem[] = picked.assets.map((a, i) => ({
      id: `${Date.now()}-${i}-${a.assetId ?? a.uri}`,
      localUri: a.uri,
      fileName: a.fileName ?? `upload-${i}.jpg`,
      mimeType: a.mimeType ?? "image/jpeg",
      status: "pending",
    }));
    setItems((prev) => [...newItems, ...prev]);

    setRunning(true);
    const results: CloudinaryUploadResult[] = [];
    try {
      const ctx = await getUploadContext(albumId);
      await runWithLimit(newItems, CONCURRENCY, async (item) => {
        const r = await uploadOne(ctx, item);
        if (r) results.push(r);
      });
    } catch (e: any) {
      Alert.alert(
        "Could not get upload context",
        e?.message ?? "Unknown error",
      );
      setItems((prev) =>
        prev.map((it) =>
          newItems.find((n) => n.id === it.id)
            ? { ...it, status: "error", error: e?.message ?? "Auth failed" }
            : it,
        ),
      );
      setRunning(false);
      return;
    }

    if (results.length > 0) {
      try {
        const res = await commitUploads(albumId, results.map(toCommitInput));
        Alert.alert("Committed", `${res.committed.length} image(s) saved.`);
      } catch (e: any) {
        Alert.alert("Commit failed", e?.message ?? "Unknown error");
      }
    }
    setRunning(false);
  }

  async function uploadOne(
    ctx: UploadContext,
    item: UploadItem,
  ): Promise<CloudinaryUploadResult | null> {
    setItems((prev) =>
      prev.map((it) =>
        it.id === item.id ? { ...it, status: "uploading" } : it,
      ),
    );
    try {
      const result = await uploadToCloudinary(
        ctx,
        item.localUri,
        item.fileName,
        item.mimeType,
      );
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id ? { ...it, status: "done", result } : it,
        ),
      );
      return result;
    } catch (e: any) {
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? { ...it, status: "error", error: e?.message ?? "Upload failed" }
            : it,
        ),
      );
      return null;
    }
  }

  const total = items.length;
  const done = items.filter((i) => i.status === "done").length;
  const failed = items.filter((i) => i.status === "error").length;
  const inFlight = items.filter(
    (i) => i.status === "uploading" || i.status === "pending",
  ).length;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload tester</Text>
      <Text style={styles.body}>Multi-select photos to upload via Cloudinary.</Text>

      <TextInput
        style={styles.albumInput}
        placeholder="Album UUID"
        value={albumId}
        onChangeText={setAlbumId}
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor="#999"
      />

      <Pressable
        style={[styles.button, running && styles.buttonDisabled]}
        onPress={onPickAndUpload}
        disabled={running}
      >
        {running ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Pick & Upload</Text>
        )}
      </Pressable>

      {total > 0 && (
        <Text style={styles.progress}>
          {inFlight > 0
            ? `Uploading ${done + failed + 1} of ${total}…`
            : `${done} uploaded${failed > 0 ? `, ${failed} failed` : ""}`}
        </Text>
      )}

      <FlatList
        style={styles.list}
        data={items}
        keyExtractor={(it) => it.id}
        renderItem={({ item }) => <Row item={item} />}
      />
    </View>
  );
}

function Row({ item }: { item: UploadItem }) {
  const tags = item.result?.tags?.slice(0, 3).join(", ");
  const quality =
    item.result?.quality_analysis?.aggregate ??
    item.result?.quality_analysis?.focus;
  return (
    <View style={styles.row}>
      <Image source={{ uri: item.localUri }} style={styles.thumb} />
      <View style={styles.rowText}>
        <View style={styles.statusRow}>
          <View style={[styles.dot, dotStyle(item.status)]} />
          <Text style={styles.statusLabel}>{statusLabel(item.status)}</Text>
        </View>
        {item.status === "done" && (
          <Text style={styles.meta} numberOfLines={2}>
            {item.result?.public_id}
            {tags ? `\ntags: ${tags}` : ""}
            {quality !== undefined ? `  |  q: ${quality.toFixed(2)}` : ""}
          </Text>
        )}
        {item.status === "error" && (
          <Text style={styles.error} numberOfLines={2}>
            {item.error}
          </Text>
        )}
      </View>
    </View>
  );
}

function statusLabel(s: Status): string {
  switch (s) {
    case "pending":
      return "Queued";
    case "uploading":
      return "Uploading…";
    case "done":
      return "Done";
    case "error":
      return "Failed";
  }
}

function dotStyle(s: Status) {
  switch (s) {
    case "pending":
      return { backgroundColor: "#bbb" };
    case "uploading":
      return { backgroundColor: "#f5a623" };
    case "done":
      return { backgroundColor: "#2ecc71" };
    case "error":
      return { backgroundColor: "#e74c3c" };
  }
}

async function runWithLimit<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<unknown>,
) {
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 64,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
    textAlign: "center",
  },
  body: {
    fontSize: 13,
    color: "#666",
    marginBottom: 16,
    textAlign: "center",
  },
  albumInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#000",
    borderRadius: 12,
    paddingVertical: 14,
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
  progress: {
    marginTop: 12,
    fontSize: 13,
    color: "#444",
    textAlign: "center",
  },
  list: {
    flex: 1,
    marginTop: 12,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
    alignItems: "center",
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: "#f2f2f2",
  },
  rowText: {
    flex: 1,
    marginLeft: 12,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusLabel: {
    fontSize: 13,
    color: "#333",
    fontWeight: "600",
  },
  meta: {
    fontSize: 11,
    color: "#666",
    marginTop: 2,
  },
  error: {
    fontSize: 11,
    color: "#e74c3c",
    marginTop: 2,
  },
});

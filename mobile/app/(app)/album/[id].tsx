import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "expo-router";
import {
  commitUploads,
  getUploadContext,
  toCommitInput,
  uploadToCloudinary,
  type CloudinaryUploadResult,
} from "../../../lib/uploads";
import { supabase } from "../../../lib/supabase";

const PAPER = "#FFFDF8";
const INK = "#2A241B";
const MUTED = "#7A6F5E";

const CONCURRENCY = 3;
const GUTTER = 8;
const COLUMNS = 3;

type ImageRow = {
  id: string;
  uri: string;
  pending?: boolean;
};

export default function AlbumDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [albumName, setAlbumName] = useState("");
  const [images, setImages] = useState<ImageRow[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    const [albumRes, imagesRes] = await Promise.all([
      supabase.from("albums").select("name").eq("id", id).maybeSingle(),
      supabase
        .from("album_images")
        .select("image_id, images(id, secure_url)")
        .eq("album_id", id),
    ]);
    if (albumRes.data) setAlbumName(albumRes.data.name);
    const rows: ImageRow[] = (imagesRes.data ?? [])
      .map((r: any) => r.images)
      .filter(Boolean)
      .map((img: any) => ({ id: img.id, uri: img.secure_url }));
    setImages(rows);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function onPickAndUpload() {
    if (!id) return;

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo access to upload.");
      return;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 30,
      quality: 1,
    });
    if (picked.canceled || picked.assets.length === 0) return;

    const batchKey = Date.now();
    const pending: ImageRow[] = picked.assets.map((a, i) => ({
      id: `pending-${batchKey}-${i}`,
      uri: a.uri,
      pending: true,
    }));
    setImages((prev) => [...prev, ...pending]);

    try {
      const ctx = await getUploadContext(id);
      const results: CloudinaryUploadResult[] = [];
      let i = 0;
      const worker = async () => {
        while (i < picked.assets.length) {
          const idx = i++;
          const a = picked.assets[idx];
          const tempId = pending[idx].id;
          try {
            const r = await uploadToCloudinary(
              ctx,
              a.uri,
              a.fileName ?? "upload.jpg",
              a.mimeType ?? "image/jpeg",
            );
            results.push(r);
            setImages((prev) =>
              prev.map((row) =>
                row.id === tempId
                  ? { ...row, uri: r.secure_url, pending: false }
                  : row,
              ),
            );
          } catch {
            setImages((prev) => prev.filter((row) => row.id !== tempId));
          }
        }
      };
      await Promise.all(
        Array.from(
          { length: Math.min(CONCURRENCY, picked.assets.length) },
          worker,
        ),
      );

      if (results.length > 0) {
        await commitUploads(id, results.map(toCommitInput));
      }
      await load();
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message ?? "Unknown error");
      await load();
    }
  }

  const tileSize =
    (Dimensions.get("window").width - 28 * 2 - GUTTER * (COLUMNS - 1)) /
    COLUMNS;

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Albums</Text>
        </Pressable>

        <Text style={styles.title}>{albumName || "Album"}</Text>
        <Text style={styles.eyebrow}>
          {images.length} photo{images.length === 1 ? "" : "s"}
        </Text>

        <Pressable
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          onPress={onPickAndUpload}
        >
          <Text style={styles.ctaText}>+  Add photos</Text>
        </Pressable>

        {images.length === 0 ? (
          <Text style={styles.empty}>
            No photos yet. Tap “Add photos” to upload.
          </Text>
        ) : (
          <View style={styles.grid}>
            {images.map((img) => (
              <Image
                key={img.id}
                source={{ uri: img.uri }}
                style={[
                  styles.tile,
                  { width: tileSize, height: tileSize },
                  img.pending && styles.tilePending,
                ]}
              />
            ))}
          </View>
        )}
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
    paddingTop: 64,
    paddingBottom: 160,
  },
  back: {
    marginBottom: 24,
  },
  backText: {
    fontSize: 14,
    color: MUTED,
    fontWeight: "600",
  },
  title: {
    fontSize: 36,
    lineHeight: 40,
    fontWeight: "700",
    color: INK,
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: MUTED,
    marginBottom: 24,
  },
  cta: {
    backgroundColor: INK,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  ctaPressed: {
    opacity: 0.85,
  },
  ctaText: {
    color: "#F5EFE3",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  empty: {
    marginTop: 32,
    fontSize: 14,
    color: MUTED,
  },
  grid: {
    marginTop: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GUTTER,
  },
  tile: {
    backgroundColor: "#E8E1D5",
    borderRadius: 6,
  },
  tilePending: {
    opacity: 0.6,
  },
});

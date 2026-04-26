import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
const SAND = "#F5EFE3";
const BORDER = "#E5DCC9";
const ACCENT = "#C8841C";

const CONCURRENCY = 3;
const GUTTER = 8;
const COLUMNS = 3;
const QUALITY_THRESHOLD = 0.5;
const SOCIAL_THRESHOLD = 60;
const PHASH_DISTANCE = 10;

type ImageRow = {
  id: string;
  uri: string;
  pending?: boolean;
  quality_score?: number | null;
  tags?: string[];
  phash?: string | null;
  social_score?: number | null;
};

type Filters = {
  quality: boolean;
  dedupe: boolean;
  social: boolean;
  query: string;
};

const NIBBLE_BITS = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];

function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) return Infinity;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    const xor = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    if (Number.isNaN(xor)) return Infinity;
    dist += NIBBLE_BITS[xor];
  }
  return dist;
}

function dedupeByPhash(images: ImageRow[]): ImageRow[] {
  const clusters: ImageRow[][] = [];
  for (const img of images) {
    if (!img.phash) {
      clusters.push([img]);
      continue;
    }
    const target = clusters.find((c) => {
      const rep = c.find((x) => x.phash);
      return rep && hammingDistance(rep.phash!, img.phash!) <= PHASH_DISTANCE;
    });
    if (target) target.push(img);
    else clusters.push([img]);
  }
  return clusters.map((c) =>
    c.reduce((best, cur) =>
      (cur.quality_score ?? 0) > (best.quality_score ?? 0) ? cur : best,
    ),
  );
}

export default function AlbumDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [albumName, setAlbumName] = useState("");
  const [images, setImages] = useState<ImageRow[]>([]);
  const [filters, setFilters] = useState<Filters>({
    quality: false,
    dedupe: false,
    social: false,
    query: "",
  });
  const [scoring, setScoring] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const [albumRes, imagesRes] = await Promise.all([
      supabase.from("albums").select("name").eq("id", id).maybeSingle(),
      supabase
        .from("album_images")
        .select(
          "image_id, images(id, secure_url, quality_score, tags, phash, social_score)",
        )
        .eq("album_id", id),
    ]);
    if (albumRes.data) setAlbumName(albumRes.data.name);
    const rows: ImageRow[] = (imagesRes.data ?? [])
      .map((r: any) => r.images)
      .filter(Boolean)
      .map((img: any) => ({
        id: img.id,
        uri: img.secure_url,
        quality_score: img.quality_score,
        tags: img.tags ?? [],
        phash: img.phash,
        social_score: img.social_score,
      }));
    setImages(rows);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const visibleImages = useMemo(() => {
    let out = images;
    if (filters.quality) {
      out = out.filter(
        (img) => img.pending || (img.quality_score ?? 0) >= QUALITY_THRESHOLD,
      );
    }
    if (filters.social) {
      out = out.filter(
        (img) => img.pending || (img.social_score ?? 0) >= SOCIAL_THRESHOLD,
      );
    }
    const q = filters.query.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (img) =>
          img.pending ||
          (img.tags ?? []).some((t) => t.toLowerCase().includes(q)),
      );
    }
    if (filters.dedupe) {
      const pending = out.filter((i) => i.pending);
      const settled = out.filter((i) => !i.pending);
      out = [...pending, ...dedupeByPhash(settled)];
    }
    return out;
  }, [images, filters]);

  const filtersActive =
    filters.quality || filters.dedupe || filters.social || filters.query.trim();

  async function toggleSocial() {
    if (!id) return;
    if (filters.social) {
      setFilters((f) => ({ ...f, social: false }));
      return;
    }
    const needsScore = images.some(
      (img) => !img.pending && (img.social_score ?? null) === null,
    );
    if (!needsScore) {
      setFilters((f) => ({ ...f, social: true }));
      return;
    }
    setScoring(true);
    try {
      await supabase.functions.invoke("curate-social-score", {
        body: { album_id: id },
      });
      await load();
      setFilters((f) => ({ ...f, social: true }));
    } catch (e: any) {
      Alert.alert("Scoring failed", e?.message ?? "Unknown error");
    } finally {
      setScoring(false);
    }
  }

  function resetFilters() {
    setFilters({ quality: false, dedupe: false, social: false, query: "" });
  }

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
      const failures: string[] = [];
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
          } catch (e: any) {
            console.warn("[upload] image failed", a.fileName ?? a.uri, e?.message);
            failures.push(e?.message ?? "Unknown error");
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

      if (failures.length > 0) {
        Alert.alert(
          `${failures.length} of ${picked.assets.length} uploads failed`,
          failures[0],
        );
      }
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

        {images.length > 0 && (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              <FilterChip
                label="Quality"
                active={filters.quality}
                onPress={() =>
                  setFilters((f) => ({ ...f, quality: !f.quality }))
                }
              />
              <FilterChip
                label="No duplicates"
                active={filters.dedupe}
                onPress={() =>
                  setFilters((f) => ({ ...f, dedupe: !f.dedupe }))
                }
              />
              <FilterChip
                label="Social-ready"
                active={filters.social}
                loading={scoring}
                onPress={toggleSocial}
              />
            </ScrollView>

            <View style={styles.searchRow}>
              <TextInput
                value={filters.query}
                onChangeText={(text) =>
                  setFilters((f) => ({ ...f, query: text }))
                }
                placeholder="Search tags (e.g. beach, person, food)"
                placeholderTextColor={MUTED}
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {filtersActive ? (
              <View style={styles.counterRow}>
                <Text style={styles.counter}>
                  Showing {visibleImages.length} of {images.length}
                </Text>
                <Pressable onPress={resetFilters} hitSlop={8}>
                  <Text style={styles.resetLink}>Reset</Text>
                </Pressable>
              </View>
            ) : null}
          </>
        )}

        {images.length === 0 ? (
          <Text style={styles.empty}>
            No photos yet. Tap “Add photos” to upload.
          </Text>
        ) : visibleImages.length === 0 ? (
          <Text style={styles.empty}>
            No photos match these filters.
          </Text>
        ) : (
          <View style={styles.grid}>
            {visibleImages.map((img) => (
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

function FilterChip({
  label,
  active,
  loading,
  onPress,
}: {
  label: string;
  active: boolean;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={[styles.chip, active && styles.chipActive]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={active ? PAPER : INK} />
      ) : (
        <Text style={[styles.chipText, active && styles.chipTextActive]}>
          {label}
        </Text>
      )}
    </Pressable>
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
    color: SAND,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  chipRow: {
    paddingTop: 16,
    paddingBottom: 4,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: PAPER,
    minWidth: 64,
    alignItems: "center",
  },
  chipActive: {
    backgroundColor: INK,
    borderColor: INK,
  },
  chipText: {
    fontSize: 13,
    color: INK,
    fontWeight: "600",
  },
  chipTextActive: {
    color: PAPER,
  },
  searchRow: {
    marginTop: 12,
  },
  searchInput: {
    backgroundColor: SAND,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: INK,
  },
  counterRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  counter: {
    fontSize: 12,
    color: MUTED,
    letterSpacing: 0.4,
  },
  resetLink: {
    fontSize: 12,
    color: ACCENT,
    fontWeight: "700",
    letterSpacing: 0.4,
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

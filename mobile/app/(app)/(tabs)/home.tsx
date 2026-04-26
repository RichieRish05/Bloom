import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AlbumCover } from "../../../components/AlbumCover";
import { useAuth } from "../../../lib/auth-context";
import { supabase } from "../../../lib/supabase";

const PAPER = "#FFFDF8";
const INK = "#2A241B";
const MUTED = "#7A6F5E";
const ACCENT = "#C8841C";

type Album = {
  id: string;
  name: string;
};

export default function Home() {
  const router = useRouter();
  const { session } = useAuth();
  const [albums, setAlbums] = useState<Album[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      supabase
        .from("albums")
        .select("id, name")
        .eq("created_by", session.user.id)
        .order("created_at", { ascending: false })
        .then(({ data }) => setAlbums(data ?? []));
    }, [session])
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>Today</Text>
        <Text style={styles.title}>Your{"\n"}albums</Text>

        <Pressable
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          onPress={() => router.push("/(app)/create-album")}
        >
          <Text style={styles.ctaText}>+  Create new album</Text>
        </Pressable>

        {albums.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyMark} />
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptyBody}>
              Start an album above to gather photos, notes, and the people who
              were there.
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {albums.map((album) => (
              <Pressable
                key={album.id}
                style={({ pressed }) => [
                  styles.gridItem,
                  pressed && styles.gridItemPressed,
                ]}
                onPress={() => router.push(`/(app)/album/${album.id}`)}
              >
                <AlbumCover name={album.name} size={150} />
                <Text style={styles.albumName} numberOfLines={1}>
                  {album.name}
                </Text>
              </Pressable>
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
    marginBottom: 36,
    letterSpacing: -1,
  },
  cta: {
    backgroundColor: INK,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 40,
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
    alignItems: "flex-start",
    paddingTop: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5DCC9",
  },
  emptyMark: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT,
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: INK,
    marginBottom: 6,
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 21,
    color: MUTED,
    maxWidth: 320,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 24,
  },
  gridItem: {
    width: "48%",
  },
  gridItemPressed: {
    opacity: 0.7,
  },
  albumName: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: "600",
    color: INK,
  },
});

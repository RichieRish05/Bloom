import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="create-album"
        options={{
          presentation: "modal",
          headerShown: true,
          title: "New album",
        }}
      />
    </Stack>
  );
}

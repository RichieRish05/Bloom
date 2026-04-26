import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "../lib/auth-context";

function RootLayoutNav() {
  const { session, isLoading, isNewUser } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inOnboardingGroup = segments[0] === "(onboarding)";
    const inAppGroup = segments[0] === "(app)";

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    } else if (session && isNewUser && !inOnboardingGroup) {
      router.replace("/(onboarding)/welcome");
    } else if (session && !isNewUser && !inAppGroup) {
      router.replace("/(app)/(tabs)/home");
    }
  }, [session, isLoading, isNewUser, segments]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
